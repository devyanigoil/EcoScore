# backend/ocr.py
# EcoScore OCR:
#   - Receipts (base64):   POST /ocr/b64            → items + parsed lines (legacy receipt behavior)
#   - Energy (base64):     POST /ocr/energy/b64     → full structured energy JSON
#   - Helpers used by multipart endpoints in main.py:
#         ocr_from_bytes(img_bytes, return_cleaned=False)
#         energy_from_image_bytes(img_bytes, return_cleaned=False)
#         energy_from_pdf_bytes(pdf_bytes, return_cleaned=False)
#
# Auth required:
#   export GOOGLE_APPLICATION_CREDENTIALS="$HOME/keys/vision.json"

from __future__ import annotations

import base64
import re
from datetime import datetime
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple 

from fastapi import FastAPI, HTTPException
from google.cloud import vision
from pydantic import BaseModel

# ----------------------------
# Shared cleaners & limits
# ----------------------------

NEWLINES_RE = re.compile(r"\r\n?")   # \r\n or \r -> \n
SPACES_RE   = re.compile(r"[ \t]+")  # collapse spaces/tabs
NL3_RE      = re.compile(r"\n{3,}")  # collapse 3+ newlines
HYPHEN_BRK  = re.compile(r"-\n")     # join hyphen-linebreaks
DATAURI_RE  = re.compile(r"^data:[^;]+;base64,(.*)$", re.S)

MAX_IMAGE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_PDF_BYTES   = 20 * 1024 * 1024  # 20 MB

def normalize_whitespace(s: str) -> str:
    s = NEWLINES_RE.sub("\n", s)
    s = SPACES_RE.sub(" ", s)
    s = NL3_RE.sub("\n\n", s)
    return s.strip()

def basic_clean(s: str) -> str:
    t = normalize_whitespace(s)
    t = HYPHEN_BRK.sub("", t)
    return t

def extract_base64_payload(s: str) -> str:
    """Accept raw base64 or data URI like 'data:image/jpeg;base64,...'."""
    m = DATAURI_RE.match(s)
    payload = m.group(1) if m else s
    return "".join(payload.split())

# ----------------------------
# Transport parsing helpers
# ----------------------------
DIST_RE = re.compile(r'(\d+(?:\.\d+)?)\s*(?:mi|miles)\b', re.I)
DUR_RE  = re.compile(r'(\d+(?:\.\d+)?)\s*(?:min|mins|minutes)\b', re.I)
TIME_RE = re.compile(r'\b(\d{1,2}:\d{2}\s*[AP]M)\b', re.I)
DATE_RE_MDY = re.compile(r'\b([A-Z][a-z]{2,9}\s+\d{1,2},\s*\d{4})\b')  # e.g., Jun 16, 2025
DATE_RE_NUM = re.compile(r'\b(\d{1,2}/\d{1,2}/\d{2,4})\b')             # e.g., 7/4/25

def _guess_provider(txt: str) -> Optional[str]:
    low = txt.lower()
    if "lyft" in low: return "Lyft"
    if "uber" in low: return "Uber"
    return None

def _first_match(regex, txt: str) -> Optional[str]:
    m = regex.search(txt)
    return m.group(1) if m else None

def _find_date(txt: str) -> Optional[str]:
    m = DATE_RE_MDY.search(txt)
    if m:
        for fmt in ("%b %d, %Y", "%B %d, %Y"):
            try:
                return datetime.strptime(m.group(1), fmt).strftime("%Y-%m-%d")
            except Exception:
                pass
    m = DATE_RE_NUM.search(txt)
    if m:
        for fmt in ("%m/%d/%Y", "%m/%d/%y"):
            try:
                return datetime.strptime(m.group(1), fmt).strftime("%Y-%m-%d")
            except Exception:
                pass
    return None

def _find_pick_drop(txt: str) -> Tuple[Optional[str], Optional[str]]:
    pickup = drop = None
    lines = [l.strip() for l in txt.split("\n") if l.strip()]
    for i, line in enumerate(lines):
        low = line.lower()
        if "pickup" in low and i > 0:
            pickup = lines[i-1]
        if ("drop-off" in low or "drop off" in low) and i > 0:
            drop = lines[i-1]
    return pickup, drop

def parse_transport_text(full_text: str) -> dict:
    cleaned = basic_clean(full_text)
    provider = _guess_provider(cleaned)
    date = _find_date(cleaned)
    distance = _first_match(DIST_RE, cleaned)
    duration = _first_match(DUR_RE, cleaned)
    time_matches = TIME_RE.findall(cleaned)
    start_time = time_matches[0] if time_matches else None
    end_time   = time_matches[1] if len(time_matches) > 1 else None

    # best-effort total price
    price_total = None
    m_price = re.search(r'\$\s*(\d+(?:\.\d{2})?)', cleaned)
    if m_price:
        try: price_total = float(m_price.group(1))
        except Exception: pass

    pickup, dropoff = _find_pick_drop(cleaned)
    distance_miles = float(distance) if distance else None
    duration_min   = float(duration) if duration else None

    return {
        "provider": provider,
        "date": date,
        "startTime": start_time,
        "endTime": end_time,
        "pickup": pickup,
        "dropoff": dropoff,
        "distance_miles": distance_miles,
        "duration_min": duration_min,
        "price_total": price_total,
        "charCount": len(cleaned),
        "cleaned_text": cleaned,
    }


# ----------------------------
# Receipt helpers (unchanged legacy behavior)
# ----------------------------

BAD_LINE_RE = re.compile(
    r"(subtotal|total|balance|items in transaction|tax|gst|pst|hst|change|cash|visa|mastercard|amex|debit|tender|rounding|purchase transaction)",
    re.I,
)
PRICE_RE        = re.compile(r"(^|[^0-9])\d+\.\d{2}(\b|[^0-9])")
PRICE_ONLY_RE   = re.compile(r"^\$?\s*(\d+\.\d{2})\s*$")
QTY_AT_PRICE_RE = re.compile(r"^\s*(\d+)\s*@\s*\$?\s*(\d+\.\d{2})\s*$")

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

def _is_summary_line(l: str) -> bool:
    return bool(BAD_LINE_RE.search(l))

def _detect_currency(lines: List[str]) -> str:
    return "USD" if "$" in " ".join(lines) else "USD"

def extract_items_structured(cleaned_text: str, limit: int = 60) -> List[Dict[str, Any]]:
    lines = [l.strip() for l in cleaned_text.split("\n") if l.strip()]
    currency = _detect_currency(lines)

    items: List[Dict[str, Any]] = []
    prev_desc: Optional[str] = None

    for l in lines:
        if _is_summary_line(l):
            continue

        m_qty = QTY_AT_PRICE_RE.match(l)
        if m_qty:
            qty  = int(m_qty.group(1))
            unit = float(m_qty.group(2))
            total = round(qty * unit, 2)
            if items:
                last = items[-1]
                last["qty"] = qty
                last["unit_price"] = unit
                last["total"] = total
                last["currency"] = currency
            else:
                items.append({
                    "name": prev_desc or "",
                    "qty": qty,
                    "unit_price": unit,
                    "total": total,
                    "currency": currency,
                })
            continue

        m_price = PRICE_ONLY_RE.match(l)
        if m_price:
            amount = float(m_price.group(1))
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

        prev_desc = l

    items = [it for it in items if it.get("name") and not _is_summary_line(it["name"])]
    return items[:limit]

# ----------------------------
# Energy bill parsing (full structured)
# ----------------------------

# Dates like "09/30/25 - 10/29/25"
DATE_RANGE_RE = re.compile(
    r"(?P<d1>\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\s*(?:to|-|through|thru|–|—)\s*(?P<d2>\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4})",
    re.I,
)
PERIOD_HINT_RE = re.compile(r"(billing|service)\s*(period|dates|from)", re.I)

# kWh
KWH_RE = re.compile(r"\b([\d,]+(?:\.\d+)?)\s*kwh\b", re.I)
TOTAL_KWH_HINT_RE = re.compile(r"(total\s*(usage|kwh|electric(ity)?\s*usage)|kwh\s*used|usage\s*this\s*period)", re.I)

# TOU
PEAK_RE     = re.compile(r"\b(on[-\s]*peak|peak)\b", re.I)
OFFPEAK_RE  = re.compile(r"\b(off[-\s]*peak|offpeak)\b", re.I)
MIDPEAK_RE  = re.compile(r"\b(mid[-\s]*peak|shoulder)\b", re.I)

# Supplier/plan/green
SUPPLIER_LINE_RE = re.compile(r"(supplier|provider|generation\s+service|supply|plan|tariff|rate)\s*[:\-]?\s*(.+)", re.I)
GREEN_HINT_RE    = re.compile(r"(green|renewable|100%\s*(wind|solar|renewable)|rec[s]?\b|class\s*i)", re.I)

# Location / utility
SERVICE_ADDR_HINT_RE = re.compile(r"(svc\s*addr|service\s*(addr|address|location)|service\s*provided\s*to)", re.I)
ZIP_RE               = re.compile(r"\b\d{5}(?:-\d{4})?\b")
UTILITY_NAME_HINT_RE = re.compile(r"(electric|power|energy|utilities|utility|company|co-op|cooperative|public service|eversource|pg&e|coned|duke|dominion|aps|sdge|sce)", re.I)

# On-site generation (imports/exports)
EXPORT_RE = re.compile(r"(export(ed)?|delivered\s+to\s+grid|to\s+grid|sent\s+to\s+grid)\D{0,40}([\d,]+(?:\.\d+)?)\s*kwh", re.I)
IMPORT_RE = re.compile(r"(import(ed)?|received\s+from\s+grid|from\s+grid|delivered\s+from\s+grid)\D{0,40}([\d,]+(?:\.\d+)?)\s*kwh", re.I)
NET_METER_HINT_RE = re.compile(r"(net\s*meter|net\s*metering)", re.I)

# Home share & T&D loss
HOME_SHARE_RE = re.compile(r"(your|tenant|apartment|unit)\s*(share|portion|allocation)\D{0,20}(\d{1,2}(?:\.\d+)?\s*%)", re.I)
TD_LOSS_RE    = re.compile(r"(t&d|transmission\s+and\s+distribution|loss\s*factor|line\s*loss(?:es)?)\D{0,20}(\d{1,2}(?:\.\d+)?\s*%)", re.I)

def _parse_date_iso(s: str) -> Optional[str]:
    for fmt in ("%m/%d/%Y", "%m/%d/%y", "%m-%d-%Y", "%m-%d-%y"):
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except Exception:
            pass
    return None

def _to_float(s: str) -> Optional[float]:
    try:
        return float(s.replace(",", ""))
    except Exception:
        return None

def extract_energy_structured(cleaned: str) -> Dict[str, Any]:
    """
    Return a structured dict with:
      utility_name, zip_code, service_address,
      billing_period_start, billing_period_end, days, total_kwh,
      tou{peak_kwh,offpeak_kwh,midpeak_kwh},
      supplier{name,plan,green_attributes},
      onsite{import_kwh,export_kwh,net_metering},
      home_share_percent, td_loss_percent, accounting_method
    """
    lines = [l.strip() for l in cleaned.split("\n") if l.strip()]
    lower = [l.lower() for l in lines]

    # Utility name
    utility_name = None
    for l in lines[:15]:
        if UTILITY_NAME_HINT_RE.search(l):
            utility_name = l
            break
    if not utility_name and lines:
        utility_name = lines[0]

    # Address & ZIP
    service_address = None
    zip_code = None
    for i, l in enumerate(lower[:200]):
        if SERVICE_ADDR_HINT_RE.search(l):
            addr = lines[i]
            if i + 1 < len(lines):
                addr = f"{addr} {lines[i+1]}"
            service_address = addr
            z = ZIP_RE.search(addr) or (ZIP_RE.search(lines[i+2]) if i + 2 < len(lines) else None)
            if z:
                zip_code = z.group(0)
            break
    if not zip_code:
        z = ZIP_RE.search(" ".join(lines))
        if z:
            zip_code = z.group(0)

    # Billing period
    start_iso = end_iso = None
    for l in lines[:250]:
        if PERIOD_HINT_RE.search(l) or DATE_RANGE_RE.search(l):
            m = DATE_RANGE_RE.search(l)
            if m:
                start_iso = _parse_date_iso(m.group("d1"))
                end_iso   = _parse_date_iso(m.group("d2"))
                break

    days = None
    if start_iso and end_iso:
        try:
            d1 = datetime.fromisoformat(start_iso).date()
            d2 = datetime.fromisoformat(end_iso).date()
            days = (d2 - d1).days or None
        except Exception:
            pass

    # Total kWh
    total_kwh = None
    for l in lines:
        if TOTAL_KWH_HINT_RE.search(l):
            for m in KWH_RE.finditer(l):
                total_kwh = _to_float(m.group(1))
                if total_kwh is not None:
                    break
        if total_kwh is not None:
            break
    if total_kwh is None:
        cands: List[float] = []
        for l in lines:
            for m in KWH_RE.finditer(l):
                val = _to_float(m.group(1))
                if val is not None and val < 100000:
                    cands.append(val)
        if cands:
            total_kwh = max(cands)

    # TOU
    peak_kwh = offpeak_kwh = midpeak_kwh = None
    for l in lines:
        if PEAK_RE.search(l) and not OFFPEAK_RE.search(l) and not MIDPEAK_RE.search(l):
            m = KWH_RE.search(l);  peak_kwh    = _to_float(m.group(1)) if m and peak_kwh is None else peak_kwh
        if OFFPEAK_RE.search(l):
            m = KWH_RE.search(l);  offpeak_kwh = _to_float(m.group(1)) if m and offpeak_kwh is None else offpeak_kwh
        if MIDPEAK_RE.search(l):
            m = KWH_RE.search(l);  midpeak_kwh = _to_float(m.group(1)) if m and midpeak_kwh is None else midpeak_kwh
    tou = None
    if any(v is not None for v in (peak_kwh, offpeak_kwh, midpeak_kwh)):
        tou = {"peak_kwh": peak_kwh, "offpeak_kwh": offpeak_kwh, "midpeak_kwh": midpeak_kwh}

    # Supplier / plan / green
    supplier_name = plan = green_attrs = None
    for l in lines:
        m = SUPPLIER_LINE_RE.search(l)
        if m:
            val = m.group(2).strip()
            if len(val) > 120:
                val = val[:120]
            if supplier_name is None:
                supplier_name = val
            elif plan is None:
                plan = val
        if green_attrs is None and GREEN_HINT_RE.search(l):
            green_attrs = l if len(l) < 160 else l[:160]

    # Onsite gen
    import_kwh = export_kwh = None
    net_meter = bool(NET_METER_HINT_RE.search(" ".join(lower)))
    for l in lines:
        mexp = EXPORT_RE.search(l)
        if mexp and export_kwh is None:
            export_kwh = _to_float(mexp.group(3))
        mimp = IMPORT_RE.search(l)
        if mimp and import_kwh is None:
            import_kwh = _to_float(mimp.group(3))
    onsite = None
    if any(v is not None for v in (import_kwh, export_kwh)) or net_meter:
        onsite = {"import_kwh": import_kwh, "export_kwh": export_kwh, "net_metering": net_meter}

    # Home share & T&D losses
    home_share_percent = None
    for l in lines:
        m = HOME_SHARE_RE.search(l)
        if m:
            pct = m.group(3)
            try:
                home_share_percent = float(pct.replace("%", "").strip())
            except Exception:
                pass
            break

    td_loss_percent = None
    for l in lines:
        m = TD_LOSS_RE.search(l)
        if m:
            pct = m.group(2)
            try:
                td_loss_percent = float(pct.replace("%", "").strip())
            except Exception:
                pass
            break

    # Accounting method heuristic
    accounting_method = "market-based" if (green_attrs or (supplier_name and ("green" in supplier_name.lower() or "renewable" in supplier_name.lower()))) else "location-based"

    return {
        "utility_name": utility_name,
        "zip_code": zip_code,
        "service_address": service_address,
        "billing_period_start": start_iso,
        "billing_period_end": end_iso,
        "days": days,
        "total_kwh": total_kwh,
        "tou": tou,
        "supplier": {"name": supplier_name, "plan": plan, "green_attributes": green_attrs} if any([supplier_name, plan, green_attrs]) else None,
        "onsite": onsite,
        "home_share_percent": home_share_percent,
        "td_loss_percent": td_loss_percent,
        "accounting_method": accounting_method,
    }

# ----------------------------
# Vision client (reused)
# ----------------------------

vision_client = vision.ImageAnnotatorClient()

# ----------------------------
# OCR runners used by main.py
# ----------------------------

def ocr_from_bytes(img_bytes: bytes, return_cleaned: bool = False) -> dict:
    """Receipt OCR → items + parsed lines (legacy)."""
    if not img_bytes:
        raise ValueError("empty image")
    if len(img_bytes) > MAX_IMAGE_BYTES:
        raise ValueError(f"image too large (>{MAX_IMAGE_BYTES // (1024*1024)}MB)")

    image = vision.Image(content=img_bytes)
    response = vision_client.document_text_detection(
        image=image, image_context={"language_hints": ["en"]}
    )
    if response.error.message:
        raise RuntimeError(response.error.message)

    full = response.full_text_annotation.text if response.full_text_annotation else ""
    cleaned = basic_clean(full)
    items_lines  = extract_likely_items(cleaned)
    items_parsed = extract_items_structured(cleaned)

    result = {
        "ok": True,
        "method": "vision+bytes",
        "bytes": len(img_bytes),
        "items": items_lines,
        "items_parsed": items_parsed,
        "charCount": len(cleaned),
    }
    if return_cleaned:
        result["cleaned_text"] = cleaned
    return result

def energy_from_image_bytes(img_bytes: bytes, return_cleaned: bool = False) -> dict:
    """Energy bill OCR from image bytes → full structured energy JSON."""
    if not img_bytes:
        raise ValueError("empty image")
    if len(img_bytes) > MAX_IMAGE_BYTES:
        raise ValueError(f"image too large (>{MAX_IMAGE_BYTES // (1024*1024)}MB)")

    image = vision.Image(content=img_bytes)
    response = vision_client.document_text_detection(
        image=image, image_context={"language_hints": ["en"]}
    )
    if response.error.message:
        raise RuntimeError(response.error.message)

    full = response.full_text_annotation.text if response.full_text_annotation else ""
    cleaned = basic_clean(full)
    energy = extract_energy_structured(cleaned)

    out = {
        "ok": True,
        "method": "vision+bytes:energy",
        "bytes": len(img_bytes),
        "energy": energy,
        "charCount": len(cleaned),
    }
    if return_cleaned:
        out["cleaned_text"] = cleaned
    return out

def energy_from_pdf_bytes(pdf_bytes: bytes, return_cleaned: bool = False) -> dict:
    """
    Text-based PDF support (non-scanned):
      - Uses pdfminer.six to extract text from a file-like object.
      - If your PDF is scanned (image-only), you must:
            (a) convert pages to images and call energy_from_image_bytes(), or
            (b) use Vision's async batch PDF OCR via GCS.
    """
    if not pdf_bytes:
        raise ValueError("empty pdf")
    if len(pdf_bytes) > MAX_PDF_BYTES:
        raise ValueError(f"pdf too large (>{MAX_PDF_BYTES // (1024*1024)}MB)")

    try:
        from pdfminer.high_level import extract_text as pdf_extract_text
    except Exception:
        raise RuntimeError("pdfminer.six not installed. Install with: pip install pdfminer.six")

    try:
        # IMPORTANT: pdfminer expects a file path or a file-like object.
        text = pdf_extract_text(BytesIO(pdf_bytes))
    except Exception as e:
        raise RuntimeError(f"pdf text extraction failed: {e}")

    cleaned = basic_clean(text or "")
    if not cleaned:
        raise RuntimeError("empty PDF text; scanned PDFs need image conversion or Vision async with GCS")

    energy = extract_energy_structured(cleaned)
    out = {
        "ok": True,
        "method": "pdf:text:energy",
        "bytes": len(pdf_bytes),
        "energy": energy,
        "charCount": len(cleaned),
    }
    if return_cleaned:
        out["cleaned_text"] = cleaned
    return out

def transport_from_image_bytes(img_bytes: bytes) -> dict:
    """Transport OCR from image bytes → structured transport JSON."""
    if not img_bytes:
        raise ValueError("empty image")
    if len(img_bytes) > MAX_IMAGE_BYTES:
        raise ValueError(f"image too large (>{MAX_IMAGE_BYTES // (1024*1024)}MB)")

    image = vision.Image(content=img_bytes)
    response = vision_client.document_text_detection(
        image=image, image_context={"language_hints": ["en"]}
    )
    if response.error.message:
        raise RuntimeError(response.error.message)

    full = response.full_text_annotation.text if response.full_text_annotation else ""
    parsed = parse_transport_text(full)

    return {
        "ok": True,
        "method": "vision+bytes:transport",
        "bytes": len(img_bytes),
        "transport": parsed,
    }

def transport_from_pdf_bytes(pdf_bytes: bytes) -> dict:
    """Transport OCR from text-based PDF bytes → structured transport JSON."""
    if not pdf_bytes:
        raise ValueError("empty pdf")
    if len(pdf_bytes) > MAX_PDF_BYTES:
        raise ValueError(f"pdf too large (>{MAX_PDF_BYTES // (1024*1024)}MB)")

    try:
        from pdfminer.high_level import extract_text as pdf_extract_text
    except Exception:
        raise RuntimeError("pdfminer.six not installed. Install with: pip install pdfminer.six")

    try:
        text = pdf_extract_text(BytesIO(pdf_bytes))
    except Exception as e:
        raise RuntimeError(f"pdf text extraction failed: {e}")

    cleaned = basic_clean(text or "")
    if not cleaned:
        raise RuntimeError("empty PDF text; scanned PDFs need image conversion or Vision async with GCS")

    parsed = parse_transport_text(cleaned)
    return {
        "ok": True,
        "method": "pdf:text:transport",
        "bytes": len(pdf_bytes),
        "transport": parsed,
    }

# ----------------------------
# Optional base64 FastAPI app (handy for quick CLI tests)
# ----------------------------

app = FastAPI(title="EcoScore OCR", version="4.1.0")

class OCRRequest(BaseModel):
    image_b64: str
    return_cleaned: bool = False

@app.get("/healthz")
def healthz():
    return {"ok": True}

@app.post("/ocr/b64")
def ocr_b64(req: OCRRequest):
    raw = (req.image_b64 or "").strip()
    if not raw:
        raise HTTPException(status_code=400, detail="empty image_b64")

    b64 = extract_base64_payload(raw)
    try:
        img_bytes = base64.b64decode(b64, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid base64 payload")
    if len(img_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail=f"image too large (>{MAX_IMAGE_BYTES // (1024*1024)}MB)")

    try:
        result = ocr_from_bytes(img_bytes, return_cleaned=req.return_cleaned)
        return result
    except ValueError as e:
        raise HTTPException(status_code=413, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=f"Vision/PDF: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"unexpected: {e}")

@app.post("/ocr/energy/b64")
def ocr_energy_b64(req: OCRRequest):
    raw = (req.image_b64 or "").strip()
    if not raw:
        raise HTTPException(status_code=400, detail="empty image_b64")

    b64 = extract_base64_payload(raw)
    try:
        img_bytes = base64.b64decode(b64, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid base64 payload")
    if len(img_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail=f"image too large (>{MAX_IMAGE_BYTES // (1024*1024)}MB)")

    try:
        result = energy_from_image_bytes(img_bytes, return_cleaned=req.return_cleaned)
        return result
    except ValueError as e:
        raise HTTPException(status_code=413, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=f"Vision/PDF: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"unexpected: {e}")
