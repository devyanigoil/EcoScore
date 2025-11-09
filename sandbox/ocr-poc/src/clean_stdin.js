// Reads raw OCR text from STDIN, cleans it, prints to STDOUT.
// Usage:
//   node src/ocr_url.js "<URL>" | node src/clean_stdin.js
//   node src/ocr_local.js images/receipt1.jpg | node src/clean_stdin.js

import fs from "fs";

function normalizeWhitespace(s) {
  // normalize newlines, collapse multiple spaces
  return s
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripDecorations(s) {
  const lines = s.split("\n");
  const out = [];
  for (let line of lines) {
    const l = line.trim();

    // skip long runs of symbols or blank lines
    if (!l) continue;
    if (/^[\-=*_#~]{3,}$/.test(l)) continue;

    // drop common footer noise
    if (/^thank(s| you)/i.test(l)) continue;
    if (/^(visit|survey|feedback|call|tel|phone|www\.|http)/i.test(l)) continue;
    if (/^(customer|order|ref|approval|auth)/i.test(l) && l.length < 40) continue;

    out.push(l);
  }
  return out.join("\n");
}

function fixCommonOCR(s) {
  // Fix O/0 mixups only inside price-like tokens
  // e.g., "1O.99" -> "10.99"
  return s
    .replace(/(\d)O(\d)/g, "$10$2")
    .replace(/(\$?\s*)O(\.\d{2}\b)/g, "$10$2")
    .replace(/(\d)[oO](\d{2}\b)/g, "$10$2")
    // unify comma decimal to dot (e.g., 12,99 -> 12.99)
    .replace(/(\d),(\d{2}\b)/g, "$1.$2");
}

function joinHyphenBreaks(s) {
  // Join words broken across lines with a trailing hyphen
  return s.replace(/-\n/g, "");
}

function cleanReceiptText(raw) {
  let t = raw;
  t = normalizeWhitespace(t);
  t = joinHyphenBreaks(t);
  t = stripDecorations(t);
  t = fixCommonOCR(t);
  // collapse extra spaces again
  t = normalizeWhitespace(t);
  return t;
}

// Read all stdin then clean
let raw = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => (raw += chunk));
process.stdin.on("end", () => {
  const cleaned = cleanReceiptText(raw || "");
  process.stdout.write(cleaned + "\n");
});
process.stdin.resume();
