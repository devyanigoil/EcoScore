import firebase_admin
from firebase_admin import credentials, auth
from fastapi import HTTPException
from dotenv import load_dotenv
import os
import base64
import json
from pathlib import Path

# Load keys.env from project root
project_root = Path(__file__).parent.parent
keys_env_path = project_root / "keys.env"
load_dotenv(keys_env_path)
# Also try loading from current directory as fallback
load_dotenv()


def _maybe_bool(value):
    return str(value).lower() in {"1", "true", "yes"}


SKIP_AUTH = _maybe_bool(os.getenv("SKIP_AUTH"))

# Initialize Firebase once
if not SKIP_AUTH and not firebase_admin._apps:
    try:
        encoded_cred = os.getenv("GOOGLE_SERVICE_ACCOUNT_B64")
        if not encoded_cred:
            raise ValueError("Missing GOOGLE_SERVICE_ACCOUNT_B64 environment variable")

        decoded_json = base64.b64decode(encoded_cred).decode("utf-8")
        service_account_info = json.loads(decoded_json)

        cred = credentials.Certificate(service_account_info)
        firebase_admin.initialize_app(cred)

    except Exception as e:
        print("❌ Failed to initialize Firebase:", str(e))
        raise e

def verify_firebase_token(id_token: str):
    if SKIP_AUTH:
        return {"uid": "skip-auth"}
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
