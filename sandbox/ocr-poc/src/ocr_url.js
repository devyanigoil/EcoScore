import { ImageAnnotatorClient } from "@google-cloud/vision";

const imageUrl = process.argv[2];
if (!imageUrl) {
  console.error("usage: node src/ocr_url.js <image-url>");
  process.exit(1);
}

const client = new ImageAnnotatorClient();

try {
  const [result] = await client.documentTextDetection({
    image: { source: { imageUri: imageUrl } },
    imageContext: { languageHints: ["en"] },
  });
  const text = result.fullTextAnnotation?.text || "";
  console.log(text || "no text found");
} catch (err) {
  console.error("OCR error:", err.message);
  process.exit(1);
}
