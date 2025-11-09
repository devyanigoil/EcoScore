from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from jose import jwt
from datetime import datetime, timedelta
from pymongo import MongoClient
import os
from dotenv import load_dotenv
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from ocr import (
    ocr_from_bytes,
    energy_from_image_bytes,
    energy_from_pdf_bytes,
)

app = FastAPI(title="EcoScore Upload API", version="3.0.0")

# CORS for dev; tighten for prod
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
load_dotenv()

# app = FastAPI()

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")  # From your Google Cloud OAuth
JWT_SECRET = os.getenv("JWT_SECRET", "supersecret")
JWT_ALGORITHM = "HS256"

# MongoDB setup
client = MongoClient(os.getenv("MONGO_URI"))
db = client["myapp_db"]
users = db.users

class GoogleAuthModel(BaseModel):
    id_token: str       # ID token for authentication
    access_token: str   # Access token for Gmail API

@app.post("/auth/google")
async def google_auth(data: GoogleAuthModel):
    try:
        # Verify ID token
        idinfo = id_token.verify_oauth2_token(
            data.id_token,
            requests.Request(),
            GOOGLE_CLIENT_ID
        )
        
        # Check if token is from the correct audience
        if idinfo['aud'] not in [GOOGLE_CLIENT_ID]:
            raise HTTPException(status_code=401, detail="Invalid audience")

        google_id = idinfo["sub"]
        email = idinfo.get("email")
        name = idinfo.get("name")
        picture = idinfo.get("picture")

        # Store/retrieve user
        user = users.find_one({"google_id": google_id})
        if not user:
            user = {
                "google_id": google_id,
                "email": email,
                "name": name,
                "picture": picture,
                "created_at": datetime.utcnow()
            }
            users.insert_one(user)
        else:
            # Update existing user
            users.update_one(
                {"google_id": google_id},
                {"$set": {"last_login": datetime.utcnow()}}
            )

        # For now, skip Gmail API calls until basic auth works
        labels = []
        try:
            # Only attempt Gmail API if access token is provided and scopes are granted
            if data.access_token:
                credentials = Credentials(token=data.access_token)
                service = build("gmail", "v1", credentials=credentials)
                gmail_labels = service.users().labels().list(userId="me").execute()
                labels = gmail_labels.get("labels", [])
        except Exception as gmail_error:
            print("Gmail API error (non-critical):", gmail_error)
            # Don't fail the entire auth process if Gmail API fails

        # Create JWT
        payload = {
            "user_id": google_id,
            "email": email,
            "exp": datetime.utcnow() + timedelta(days=7)
        }
        token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

        return {
            "token": token,
            "user": {
                "google_id": google_id,
                "email": email,
                "name": name,
                "picture": picture
            },
            "gmail_labels": labels
        }

    except ValueError as e:
        print("Token verification error:", e)
        raise HTTPException(status_code=401, detail="Invalid Google token")
    except Exception as e:
        print("Google Auth Error:", e)
        raise HTTPException(status_code=401, detail="Authentication failed")
# backend/main.py
# Multipart upload API:
#   - /ocr/upload                  (receipt image -> full receipt JSON; unchanged)
#   - /ocr/energy/upload           (energy bill image -> full structured JSON)
#   - /ocr/energy/pdf              (energy bill PDF -> full structured JSON; text-based PDFs)
#
# Notes on PDFs:
#   - This /ocr/energy/pdf route uses pdfminer.six for TEXT-based PDFs.
#   - For scanned PDFs (images), either:
#       (a) convert pages to images on the server (e.g., pdf2image + poppler) and pass to Vision, or
#       (b) upload PDF to GCS and call Vision async batch (needs a GCS bucket).
#
# Requires:
#   fastapi, uvicorn[standard], python-multipart
#   google-cloud-vision
#   pdfminer.six   (for /ocr/energy/pdf)
#   GOOGLE_APPLICATION_CREDENTIALS set in the shell running uvicorn

@app.get("/healthz")
def healthz():
    return {"ok": True}

# -------- Receipts (unchanged) --------
@app.post("/ocr/upload")
async def ocr_upload(
    image: UploadFile = File(..., description="Receipt image (jpg/png/webp)"),
    return_cleaned: bool = Form(False),
):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="file must be an image/*")
    data = await image.read()
    try:
        result = ocr_from_bytes(data, return_cleaned=bool(return_cleaned))
        return JSONResponse(result)
    except ValueError as e:
        raise HTTPException(status_code=413, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=f"Vision API: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"unexpected: {e}")

# -------- Energy bills (images) --------
@app.post("/ocr/energy/upload")
async def ocr_energy_upload(
    image: UploadFile = File(..., description="Energy bill image (jpg/png/webp)"),
    return_cleaned: bool = Form(False),
):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="file must be an image/*")
    data = await image.read()
    try:
        result = energy_from_image_bytes(data, return_cleaned=bool(return_cleaned))
        return JSONResponse(result)
    except ValueError as e:
        raise HTTPException(status_code=413, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=f"Vision API: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"unexpected: {e}")

# -------- Energy bills (PDFs: text-based) --------
@app.post("/ocr/energy/pdf")
async def ocr_energy_pdf(
    pdf: UploadFile = File(..., description="Energy bill PDF (text-based, not scanned)"),
    return_cleaned: bool = Form(False),
):
    if not pdf.content_type or pdf.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="file must be a PDF")
    data = await pdf.read()
    try:
        result = energy_from_pdf_bytes(data, return_cleaned=bool(return_cleaned))
        return JSONResponse(result)
    except ValueError as e:
        raise HTTPException(status_code=413, detail=str(e))
    except RuntimeError as e:
        # Common: "pdfminer.six not installed" or "empty PDF text" (scanned PDF)
        raise HTTPException(status_code=502, detail=f"PDF processing: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"unexpected: {e}")
