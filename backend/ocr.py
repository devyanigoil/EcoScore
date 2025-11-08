# ocr.py
# EcoScore OCR core: base64/bytes → Google Vision → cleaned text → likely item lines
# - Reusable function: ocr_from_bytes(bytes, return_cleaned=False) -> dict
# - FastAPI endpoint: POST /ocr/b64  (accepts base64 or data URI)
# Auth: set env var GOOGLE_APPLICATION_CREDENTIALS to your service-account JSON.

from __future__ import annotations
import base64
import re
from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from google.cloud import vision

# ----------------------------
# Regex utilities / heuristics
# ----------------------------

NEWLINES_RE = re.compile(r"\r\n?")                     # \r\n or \r -> \n
SPACES_RE   = re.compile(r"[ \t]+")                    # collapse spaces/tabs
NL3_RE      = re.compile(r"\n{3,}")                    # collapse 3+ newlines
HYPHEN_BRK  = re.compile(r"-\n")                       # join hyphen-linebreaks

BAD_LINE_RE = re.compile(
    r"(subtotal|total|balance|items in transaction|tax|gst|pst|hst|change|cash|visa|mastercard|amex|debit|tender|rounding|purchase transaction)",
    re.I,
)
PRICE_RE    = re.compile(r"(^|[^0-9])\d+\.\d{2}(\b|[^0-9])")

DATAURI_RE  = re.compile(r"^data:[^;]+;base64,(.*)$", re.S)

# parsing helpers
PRICE_ONLY_RE   = re.compile(r"^\$?\s*(\d+\.\d{2})\s*$")
QTY_AT_PRICE_RE = re.compile(r"^\s*(\d+)\s*@\s*\$?\s*(\d+\.\d{2})\s*$")

MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB guard


def _money(x: str | float) -> float:
    """Round to 2dp safely using Decimal, return as float for JSON."""
    return float(Decimal(str(x)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


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
    """
    Very simple heuristic:
      - keep lines that look like they contain a price (12.99)
      - drop common summary/payment lines
    """
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
    """Accept raw base64 or data URI like 'data:image/jpeg;base64,....'."""
    m = DATAURI_RE.match(s)
    payload = m.group(1) if m else s
    # remove whitespace/newlines so multi-line base64 decodes cleanly
    return "".join(payload.split())


def _is_summary_line(l: str) -> bool:
    return bool(BAD_LINE_RE.search(l))


def _detect_currency(lines: List[str]) -> str:
    # naive currency detection; default USD
    joined = " ".join(lines)
    if "$" in joined:
        return "USD"
    return "USD"


def extract_items_structured(cleaned_text: str, limit: int = 60) -> List[Dict[str, Any]]:
    """
    Parse cleaned receipt text into structured items:
      - pairs a description line with subsequent price-only line
      - handles "N @ $x.xx" quantity patterns updating unit/total
    """
    lines = [l.strip() for l in cleaned_text.split("\n") if l.strip()]
    currency = _detect_currency(lines)

    items: List[Dict[str, Any]] = []
    prev_desc: Optional[str] = None

    for i, l in enumerate(lines):
        # ignore obvious summary/payment/total lines
        if _is_summary_line(l):
            continue

        # quantity pattern like "2 @ $3.99"
        m_qty = QTY_AT_PRICE_RE.match(l)
        if m_qty:
            qty  = int(m_qty.group(1))
            unit = _money(m_qty.group(2))
            total = _money(qty * unit)
            if items:
                # update the last item if it looks like the same line item
                last = items[-1]
                # if last item has no qty or unit_price or the totals match a previous price line, enrich it
                last["qty"] = qty
                last["unit_price"] = unit
                last["total"] = total
            else:
                # if we somehow see qty before a price-only line, create a stub using prev_desc
                items.append({
                    "name": prev_desc or "",
                    "qty": qty,
                    "unit_price": unit,
                    "total": total,
                    "currency": currency,
                })
            continue

        # price-only line like "$7.98" or "7.98"
        m_price = PRICE_ONLY_RE.match(l)
        if m_price:
            amount = _money(m_price.group(1))
            # create an item; name from the most recent non-summary, non-price-only line
            items.append({
                "name": (prev_desc or "").strip(),
                "qty": 1,
                "unit_price": amount,
                "total": amount,
                "currency": currency,
            })
            if len(items) >= limit:
                break
            continue

        # otherwise treat as a potential description line for the next price
        prev_desc = l

    # drop empty-name items if they look like totals accidentally captured
    items = [it for it in items if it.get("name") and not _is_summary_line(it["name"])]

    return items[:limit]


# ----------------------------
# Vision client
# ----------------------------
# Auth: set env var GOOGLE_APPLICATION_CREDENTIALS to your service-account JSON.
#   export GOOGLE_APPLICATION_CREDENTIALS="$HOME/keys/vision.json"
vision_client = vision.ImageAnnotatorClient()


# ----------------------------
# Reusable function (imported by main.py multipart endpoint)
# ----------------------------

def ocr_from_bytes(img_bytes: bytes, return_cleaned: bool = False) -> dict:
    """
    Run Google Vision Document Text Detection on image bytes,
    return a dict with likely item lines, parsed items, and optional cleaned text.
    """
    if not img_bytes:
        raise ValueError("empty image")
    if len(img_bytes) > MAX_IMAGE_BYTES:
        raise ValueError(f"image too large (>{MAX_IMAGE_BYTES // (1024*1024)}MB)")

    image = vision.Image(content=img_bytes)
    # python client uses snake_case 'language_hints'
    response = vision_client.document_text_detection(
        image=image,
        image_context={"language_hints": ["en"]},
    )

    if response.error.message:
        # Surface Vision API errors clearly to the caller
        raise RuntimeError(response.error.message)

    full = response.full_text_annotation.text if response.full_text_annotation else ""
    cleaned = basic_clean(full)
    items_lines = extract_likely_items(cleaned)
    items_parsed = extract_items_structured(cleaned)

    result = {
        "ok": True,
        "method": "vision+bytes",
        "bytes": len(img_bytes),
        "items": items_lines,                 # legacy: raw price-like lines
        "items_parsed": items_parsed,         # NEW: structured items
        "charCount": len(cleaned),
    }
    if return_cleaned:
        result["cleaned_text"] = cleaned
    return result


# ----------------------------
# FastAPI app for base64 intake
# ----------------------------

app = FastAPI(title="EcoScore OCR (base64 → Vision → items)", version="1.1.0")


class OCRRequest(BaseModel):
    image_b64: str                  # raw base64 OR data URI
    return_cleaned: bool = False    # include cleaned_text in response


class OCRResponse(BaseModel):
    ok: bool
    method: str
    bytes: int
    items: List[str]
    items_parsed: Optional[List[Dict[str, Any]]] = None
    charCount: int
    cleaned_text: Optional[str] = None


@app.get("/healthz")
def healthz():
    return {"ok": True}


@app.post("/ocr/b64", response_model=OCRResponse)
def ocr_b64(req: OCRRequest):
    raw = (req.image_b64 or "").strip()
    if not raw:
        raise HTTPException(status_code=400, detail="empty image_b64")

    # Extract + validate base64
    b64 = extract_base64_payload(raw)
    try:
        img_bytes = base64.b64decode(b64, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid base64 payload")

    if len(img_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail=f"image too large (>{MAX_IMAGE_BYTES // (1024*1024)}MB)")

    # Run OCR core
    try:
        result = ocr_from_bytes(img_bytes, return_cleaned=req.return_cleaned)
    except ValueError as e:
        # size/empty problems
        raise HTTPException(status_code=413, detail=str(e))
    except RuntimeError as e:
        # Vision API errors (billing/api/perm)
        raise HTTPException(status_code=502, detail=f"Vision API: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"unexpected: {e}")

    return OCRResponse(**result)
