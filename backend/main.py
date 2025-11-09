# from fastapi import FastAPI, HTTPException
# from fastapi.middleware.cors import CORSMiddleware
# from pydantic import BaseModel
# from google.oauth2 import id_token
# from google.auth.transport import requests
# from google.oauth2.credentials import Credentials
# from googleapiclient.discovery import build
# from jose import jwt
# from datetime import datetime, timedelta
# from pymongo import MongoClient
# import os
# from dotenv import load_dotenv

# load_dotenv()

# app = FastAPI()

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # For development only
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")  # From your Google Cloud OAuth
# JWT_SECRET = os.getenv("JWT_SECRET", "supersecret")
# JWT_ALGORITHM = "HS256"

# # MongoDB setup
# client = MongoClient(os.getenv("MONGO_URI"))
# db = client["myapp_db"]
# users = db.users

# class GoogleAuthModel(BaseModel):
#     id_token: str       # ID token for authentication
#     access_token: str   # Access token for Gmail API

# @app.post("/auth/google")
# async def google_auth(data: GoogleAuthModel):
#     try:
#         # Verify ID token
#         idinfo = id_token.verify_oauth2_token(
#             data.id_token,
#             requests.Request(),
#             GOOGLE_CLIENT_ID
#         )
        
#         # Check if token is from the correct audience
#         if idinfo['aud'] not in [GOOGLE_CLIENT_ID]:
#             raise HTTPException(status_code=401, detail="Invalid audience")

#         google_id = idinfo["sub"]
#         email = idinfo.get("email")
#         name = idinfo.get("name")
#         picture = idinfo.get("picture")

#         # Store/retrieve user
#         user = users.find_one({"google_id": google_id})
#         if not user:
#             user = {
#                 "google_id": google_id,
#                 "email": email,
#                 "name": name,
#                 "picture": picture,
#                 "created_at": datetime.utcnow()
#             }
#             users.insert_one(user)
#         else:
#             # Update existing user
#             users.update_one(
#                 {"google_id": google_id},
#                 {"$set": {"last_login": datetime.utcnow()}}
#             )

#         # For now, skip Gmail API calls until basic auth works
#         labels = []
#         try:
#             # Only attempt Gmail API if access token is provided and scopes are granted
#             if data.access_token:
#                 credentials = Credentials(token=data.access_token)
#                 service = build("gmail", "v1", credentials=credentials)
#                 gmail_labels = service.users().labels().list(userId="me").execute()
#                 labels = gmail_labels.get("labels", [])
#         except Exception as gmail_error:
#             print("Gmail API error (non-critical):", gmail_error)
#             # Don't fail the entire auth process if Gmail API fails

#         # Create JWT
#         payload = {
#             "user_id": google_id,
#             "email": email,
#             "exp": datetime.utcnow() + timedelta(days=7)
#         }
#         token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

#         return {
#             "token": token,
#             "user": {
#                 "google_id": google_id,
#                 "email": email,
#                 "name": name,
#                 "picture": picture
#             },
#             "gmail_labels": labels
#         }

#     except ValueError as e:
#         print("Token verification error:", e)
#         raise HTTPException(status_code=401, detail="Invalid Google token")
#     except Exception as e:
#         print("Google Auth Error:", e)
#         raise HTTPException(status_code=401, detail="Authentication failed")


# main.py or auth.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests
import jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM")

class GoogleLoginRequest(BaseModel):
    id_token: str

def create_jwt_token(user_data: dict):
    """Create a JWT token for the authenticated user"""
    payload = {
        "sub": user_data["email"],
        "user_id": user_data["user_id"],
        "name": user_data["name"],
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

@app.post("/auth/google")
async def google_login(request: GoogleLoginRequest):
    try:
        # Verify the Google ID token
        idinfo = id_token.verify_oauth2_token(
            request.id_token, 
            requests.Request(), 
            GOOGLE_CLIENT_ID
        )
        
        # Extract user information
        user_email = idinfo['email']
        user_name = idinfo.get('name', '')
        google_user_id = idinfo['sub']
        picture = idinfo.get('picture', '')
        
        # Here you would typically:
        # 1. Check if user exists in your database
        # 2. Create new user if they don't exist
        # 3. Update last login time, etc.
        
        user_data = {
            "user_id": google_user_id,
            "email": user_email,
            "name": user_name,
            "picture": picture
        }
        
        # Create JWT token for your app
        jwt_token = create_jwt_token(user_data)
        
        return {
            "success": True,
            "token": jwt_token,
            "user": user_data
        }
        
    except ValueError as e:
        raise HTTPException(status_code=401, detail="Invalid Google token")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
async def root():
    return {"message": "Google Auth API is running"}
