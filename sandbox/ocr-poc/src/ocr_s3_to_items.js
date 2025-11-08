// Usage:
//   node src/ocr_s3_to_items.js "<S3 URL>" | tee out/items.json
// Works with public or pre-signed S3 URLs. Requires GOOGLE_APPLICATION_CREDENTIALS set.

import axios from "axios";
import { ImageAnnotatorClient } from "@google-cloud/vision";

const imageUrl = process.argv[2];
if (!imageUrl) {
  console.error('usage: node src/ocr_s3_to_items.js "<s3-url>"');
  process.exit(1);
}

const client = new ImageAnnotatorClient();

function normalizeWhitespace(s) {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function basicClean(s) {
  // very light cleanup for receipts; keep it short
  let t = normalizeWhitespace(s);
  // join hyphenated line breaks
  t = t.replace(/-\n/g, "");
  return t;
}

function extractLikelyItems(text) {
  // Heuristic: item lines often contain a trailing price like 12.99
  // Exclude common summary lines.
  const BAD = /(subtotal|total|tax|gst|pst|hst|change|cash|visa|mastercard|debit|tender|balance|rounding)/i;
  const PRICE = /(^|[^0-9])\d+\.\d{2}(\b|[^0-9])/;

  return text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean)
    .filter(l => PRICE.test(l))
    .filter(l => !BAD.test(l))
    .slice(0, 60); // keep it reasonable
}

try {
  // 1) Download bytes from S3 (public or pre-signed)
  const res = await axios.get(imageUrl, { responseType: "arraybuffer" });
  const bytes = Buffer.from(res.data);

  // Optional size sanity check (10 MB)
  if (bytes.length > 10 * 1024 * 1024) {
    console.error("image too large (>10MB); consider resizing");
    process.exit(1);
  }

  // 2) OCR with Vision (send bytes, not a URL)
  const [result] = await client.documentTextDetection({
    image: { content: bytes.toString("base64") },
    imageContext: { languageHints: ["en"] },
  });

  const full = result.fullTextAnnotation?.text || "";
  if (!full) {
    console.log(JSON.stringify({ ok: true, items: [], note: "no text found" }, null, 2));
    process.exit(0);
  }

  // 3) Clean + extract likely items
  const cleaned = basicClean(full);
  const items = extractLikelyItems(cleaned);

  // 4) Output JSON
  console.log(JSON.stringify({
    ok: true,
    source: "vision+bytes",
    url: imageUrl,
    charCount: cleaned.length,
    items
  }, null, 2));
} catch (err) {
  console.error("OCR error:", err?.response?.data || err?.message || err);
  process.exit(1);
}
