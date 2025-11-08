# main.py
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from ocr import ocr_from_bytes  # import the helper from ocr.py

app = FastAPI(title="EcoScore Upload OCR", version="1.0.0")

# CORS (helpful when calling from your RN dev app)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/healthz")
def healthz():
    return {"ok": True}

@app.post("/ocr/upload")
async def ocr_upload(
    image: UploadFile = File(..., description="Receipt image"),
    return_cleaned: bool = Form(False)
):
    # Basic content-type check
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="file must be an image/*")

    data = await image.read()
    try:
        result = ocr_from_bytes(data, return_cleaned=bool(return_cleaned))
    except ValueError as e:
        # size/empty, etc.
        raise HTTPException(status_code=413, detail=str(e))
    except RuntimeError as e:
        # Vision API errors
        raise HTTPException(status_code=502, detail=f"Vision API: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"unexpected: {e}")

    return JSONResponse(result)
