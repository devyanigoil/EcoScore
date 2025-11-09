import json
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
from pathlib import Path
import sys

from ocr import (
    ocr_from_bytes,
    energy_from_image_bytes,
    energy_from_pdf_bytes,
    transport_from_image_bytes,
    transport_from_pdf_bytes,
)

from db import add_receipt, add_energy, add_rides


# REPO_ROOT = Path(__file__).resolve().parents[1]
# SCORECAL_PARENT = REPO_ROOT / "-LLM_Score"
# if SCORECAL_PARENT.exists():
#     sys.path.insert(0, str(SCORECAL_PARENT))
REPO_ROOT = Path(__file__).resolve().parents[1]   # .../CarbonScoreCalculator
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))
from LLM_Score.ScoreCal import score_receipt


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

EMISSION_FACTOR_KG_PER_KWH = 0.42
EMISSIONS_PER_MILE = {
    "gasoline": 0.404,   # tailpipe avg per mile
    "hybrid":   0.25,    # rougher, lower
    "electric": 0.10,    # ~0.30 kWh/mi * ~0.33 kg/kWh; tune by ZIP if you want
}

def compute_transport_carbon(vehicle_type: str, distance_miles: float) -> float:
    vt = (vehicle_type or "").lower()
    factor = EMISSIONS_PER_MILE.get(vt, EMISSIONS_PER_MILE["gasoline"])
    return round((distance_miles or 0.0) * factor, 3)

def make_min_response(energy_dict: dict) -> JSONResponse:
    start = energy_dict.get("energy").get("billing_period_start")
    end   = energy_dict.get("energy").get("billing_period_end")
    kwh   = energy_dict.get("energy").get("total_kwh")

    if kwh is None:
        raise HTTPException(status_code=422, detail="Could not extract total_kwh from the bill")

    carbon = round(float(kwh) * EMISSION_FACTOR_KG_PER_KWH, 2)

    return JSONResponse({
        "startDate": start,
        "endDate": end,
        "energy": kwh,
        "carbonFootPrint": carbon
    })


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
        result = ocr_from_bytes(data, return_cleaned=bool(return_cleaned))  # if this is slow CPU, consider to_thread
        print("Response from OCR Success")
        response = await score_receipt(result)   # <-- IMPORTANT: await

        # Add the receipt to the database
        add_receipt(user="Aashnna Soni", items=response)

        print("Response from LLM Success")
        return JSONResponse(content={"items": response})
    except ValueError as e:
        raise HTTPException(status_code=413, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=f"Vision/LLM: {e}")
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
        resp = make_min_response(result)
        resp_json =json.loads(resp.body.decode("utf-8"))
        add_energy(user="Aashnna Soni", bill=resp_json)
        return resp
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
        resp = make_min_response(result)
        resp_json =json.loads(resp.body.decode("utf-8"))
        add_energy(user="Aashnna Soni", bill=resp_json)
        return resp
    except ValueError as e:
        raise HTTPException(status_code=413, detail=str(e))
    except RuntimeError as e:
        # Common: "pdfminer.six not installed" or "empty PDF text" (scanned PDF)
        raise HTTPException(status_code=502, detail=f"PDF processing: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"unexpected: {e}")


# -------- Transport (images) --------
@app.post("/ocr/transport/upload")
async def ocr_transport_upload(
    vehicle_type: str = Form(..., description="gasoline | hybrid | electric"),
    image: UploadFile = File(..., description="Trip screenshot / receipt (jpg/png/webp)"),
    return_cleaned: bool = Form(False),
):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="file must be an image/*")
    data = await image.read()
    try:
        result = transport_from_image_bytes(data)          # <-- OCR in ocr.py
        t = result.get("transport", {})
        dist = t.get("distance_miles")
        carbon = compute_transport_carbon(vehicle_type, dist if dist is not None else 0.0)

        out = {
            "provider": t.get("provider"),
            "date": t.get("date"),
            "startTime": t.get("startTime"),
            "endTime": t.get("endTime"),
            "pickup": t.get("pickup"),
            "dropoff": t.get("dropoff"),
            "distance_miles": dist,
            "duration_min": t.get("duration_min"),
            "price_total": t.get("price_total"),
            "vehicle_type": vehicle_type,
            "carbonFootPrint": carbon,
        }
        if return_cleaned:
            out["cleaned_text"] = t.get("cleaned_text")

        add_rides(user="Aashnna Soni", bill=out)
        return JSONResponse(out)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Transport OCR failed: {e}")

# -------- Transport (PDFs: text-based) --------
@app.post("/ocr/transport/pdf")
async def ocr_transport_pdf(
    vehicle_type: str = Form(..., description="gasoline | hybrid | electric"),
    pdf: UploadFile = File(..., description="Transport receipt PDF (text-based, not scanned)"),
    return_cleaned: bool = Form(False),
):
    if not pdf.content_type or pdf.content_type not in ("application/pdf", "application/octet-stream"):
        raise HTTPException(status_code=400, detail="file must be a PDF")
    data = await pdf.read()
    try:
        result = transport_from_pdf_bytes(data)            # <-- OCR in ocr.py
        t = result.get("transport", {})
        dist = t.get("distance_miles")
        carbon = compute_transport_carbon(vehicle_type, dist if dist is not None else 0.0)

        out = {
            "provider": t.get("provider"),
            "date": t.get("date"),
            "startTime": t.get("startTime"),
            "endTime": t.get("endTime"),
            "pickup": t.get("pickup"),
            "dropoff": t.get("dropoff"),
            "distance_miles": dist,
            "duration_min": t.get("duration_min"),
            "price_total": t.get("price_total"),
            "vehicle_type": vehicle_type,
            "carbonFootPrint": carbon,
        }
        if return_cleaned:
            out["cleaned_text"] = t.get("cleaned_text")

        add_rides(user="Aashnna Soni", bill=out)
        return JSONResponse(out)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Transport PDF OCR failed: {e}")


@app.get("/user/{user_id}")
async def get_user(user_id: str):
    # Load users from JSON file
    try:
        with open("data/user.json", "r", encoding="utf-8") as f:
            users = json.load(f)
    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="user.json not found")

    # Look up user name
    name = users.get(user_id)
    if not name:
        raise HTTPException(status_code=404, detail="User not found")

    # Return simple response
    return {
        "user_id": user_id,
        "user_name": name
    }