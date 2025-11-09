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
