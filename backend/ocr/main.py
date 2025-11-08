from __future__ import annotations
import base64
import os
import re
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from google.cloud import vision

app = FastAPI(title="EcoScore OCR (base64 → Vision → items)", version="1.0.0")

# ---------- Text utilities (ported from your JS) ----------

NEWLINES_RE = re.compile(r"\r\n?")                     # \r\n or \r -> \n
SPACES_RE   = re.compile(r"[ \t]+")                    # collapse spaces/tabs
NL3_RE      = re.compile(r"\n{3,}")                    # collapse 3+ newlines
HYPHEN_BRK  = re.compile(r"-\n")                       # join hyphen-linebreaks

BAD_LINE_RE = re.compile(
    r"(subtotal|total|tax|gst|pst|hst|change|cash|visa|mastercard|debit|tender|balance|rounding)",
    re.I,
)
PRICE_RE    = re.compile(r"(^|[^0-9])\d+\.\d{2}(\b|[^0-9])")

DATAURI_RE  = re.compile(r"^data:[^;]+;base64,(.*)$", re.S)

def normalize_whitespace(s: str) -> str:
    s = NEWLINES_RE.sub("\n", s)
    s = SPACES_RE.sub(" ", s)
    s = NL3_RE.sub("\n\n", s)
    return s.strip()

def basic_clean(s: str) -> str:
    t = normalize_whitespace(s)
    t = HYPHEN_BRK.sub("", t)
    return t

def extract_likely_items(text: str, limit: int = 60) -> List[str]:
    out: List[str] = []
    for line in text.split("\n"):
        l = line.strip()
        if not l:
            continue
        if not PRICE_RE.search(l):
            continue
        if BAD_LINE_RE.search(l):
            continue
        out.append(l)
        if len(out) >= limit:
            break
    return out

def extract_base64_payload(s: str) -> str:
    """
    Accepts raw base64 or data URI like 'data:image/jpeg;base64,....'
    Strips whitespace so multi-line base64 also works.
    """
    m = DATAURI_RE.match(s)
    payload = m.group(1) if m else s
    return "".join(payload.split())


# ---------- Request/Response models ----------

class OCRRequest(BaseModel):
    image_b64: str                  # raw base64 OR data URI
    return_cleaned: bool = False    # include cleaned_text in response

class OCRResponse(BaseModel):
    ok: bool
    method: str
    bytes: int
    items: List[str]
    charCount: int
    cleaned_text: Optional[str] = None


# ---------- Vision client (uses GOOGLE_APPLICATION_CREDENTIALS) ----------

# Expect env var GOOGLE_APPLICATION_CREDENTIALS to point to your JSON key.
# Example:
# export GOOGLE_APPLICATION_CREDENTIALS="$HOME/keys/ecoscore-friend.json"
vision_client = vision.ImageAnnotatorClient()


# ---------- Routes ----------

@app.get("/healthz")
def healthz():
    return {"ok": True}

@app.post("/ocr/b64", response_model=OCRResponse)
def ocr_b64(req: OCRRequest):
    raw = (req.image_b64 or "").strip()
    if not raw:
        raise HTTPException(status_code=400, detail="empty image_b64")

    # Extract/validate base64
    b64 = extract_base64_payload(raw)
    try:
        img_bytes = base64.b64decode(b64, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid base64 payload")

    # 10 MB cap (same as your JS)
    if len(img_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="image too large (>10MB)")

    # Call Vision
    image = vision.Image(content=img_bytes)
    try:
        response = vision_client.document_text_detection(
            image=image,
            image_context={"languageHints": ["en"]},
        )
    except Exception as e:
        # Common causes:
        # - UNAUTHENTICATED: missing/wrong GOOGLE_APPLICATION_CREDENTIALS
        # - PERMISSION_DENIED / BILLING_NOT_ENABLED
        raise HTTPException(status_code=502, detail=f"Vision error: {str(e)}")

    if response.error.message:
        # Surface Vision API errors clearly
        raise HTTPException(status_code=502, detail=f"Vision API: {response.error.message}")

    full = response.full_text_annotation.text if response.full_text_annotation else ""
    cleaned = basic_clean(full)
    items = extract_likely_items(cleaned)

    return OCRResponse(
        ok=True,
        method="vision+base64",
        bytes=len(img_bytes),
        items=items,
        charCount=len(cleaned),
        cleaned_text=cleaned if req.return_cleaned else None,
    )
