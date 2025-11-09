// Usage examples:
//   # from a local image -> base64 -> Vision -> items
//   base64 sandbox/ocr-poc/images/receipt1.jpg | node src/ocr_b64_stdin_to_items.js | tee out/items_from_b64.json
//
//   # from a data URI string saved in a file
//   cat out/datauri.txt | node src/ocr_b64_stdin_to_items.js
//
// Requires GOOGLE_APPLICATION_CREDENTIALS pointing to your Vision key JSON.

import { ImageAnnotatorClient } from "@google-cloud/vision";

function normalizeWhitespace(s) {
  return s.replace(/\r\n?/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
function basicClean(s) {
  let t = normalizeWhitespace(s);
  t = t.replace(/-\n/g, ""); // join hyphen line breaks
  return t;
}
function extractLikelyItems(text) {
  const BAD = /(subtotal|total|tax|gst|pst|hst|change|cash|visa|mastercard|debit|tender|balance|rounding)/i;
  const PRICE = /(^|[^0-9])\d+\.\d{2}(\b|[^0-9])/;
  return text
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean)
    .filter(l => PRICE.test(l))
    .filter(l => !BAD.test(l))
    .slice(0, 60);
}
function extractBase64Payload(s) {
  // Accept raw base64 or data URI like "data:image/jpeg;base64,...."
  const m = s.match(/^data:[^;]+;base64,(.*)$/s);
  const payload = m ? m[1] : s;
  return payload.replace(/\s+/g, "");
}

const client = new ImageAnnotatorClient();

let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", chunk => (raw += chunk));
process.stdin.on("end", async () => {
  try {
    if (!raw || !raw.trim()) {
      console.error("no base64 input on stdin");
      process.exit(1);
    }
    const b64 = extractBase64Payload(raw.trim());
    // quick sanity check
    const bytes = Buffer.from(b64, "base64");
    if (!bytes.length) {
      console.error("invalid base64 input");
      process.exit(1);
    }
    if (bytes.length > 10 * 1024 * 1024) {
      console.error("image too large (>10MB); compress before sending");
      process.exit(1);
    }

    const [result] = await client.documentTextDetection({
      image: { content: b64 },
      imageContext: { languageHints: ["en"] },
    });

    const full = result.fullTextAnnotation?.text || "";
    const cleaned = basicClean(full);
    const items = extractLikelyItems(cleaned);

    console.log(JSON.stringify({
      ok: true,
      method: "vision+base64",
      bytes: bytes.length,
      items,
      charCount: cleaned.length
    }, null, 2));
  } catch (err) {
    console.error("OCR error:", err?.message || err);
    process.exit(1);
  }
});
process.stdin.resume();
