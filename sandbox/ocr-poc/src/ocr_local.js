import { ImageAnnotatorClient } from "@google-cloud/vision";

const filePath = process.argv[2];
if (!filePath) {
  console.error("usage: node src/ocr_local.js <path-to-image>");
  process.exit(1);
}

const client = new ImageAnnotatorClient();

try {
  // DOCUMENT_TEXT_DETECTION is best for receipts/multi-line docs
  const [result] = await client.documentTextDetection(filePath);
  const text = result.fullTextAnnotation?.text || "";
  if (!text) {
    console.log("no text found (try a sharper/brighter image)");
  } else {
    console.log(text);
  }
} catch (err) {
  console.error("OCR error:", err.message);
  // Helpful hints for common issues:
  //  - UNAUTHENTICATED: env var not set or key path wrong
  //  - PERMISSION_DENIED / BILLING_NOT_ENABLED: enable billing for the project
  //  - API not enabled: enable Cloud Vision API in this project
  process.exit(1);
}
