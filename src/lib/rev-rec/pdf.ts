import { extractText, getDocumentProxy } from "unpdf";

export interface ExtractedPdf {
  text: string;       // full text with "--- Page N ---" markers between pages
  pageCount: number;
  language: string;   // best-effort: "en" | "fr"
}

export class PdfExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfExtractionError";
  }
}

// Extracts plain text per page and joins with page markers so downstream
// agents can emit `p.<page>` citations.
export async function extractPdf(buffer: ArrayBuffer): Promise<ExtractedPdf> {
  let pages: string[];
  let totalPages: number;
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const result = await extractText(pdf, { mergePages: false });
    totalPages = result.totalPages;
    pages = Array.isArray(result.text) ? result.text : [result.text];
  } catch (e) {
    throw new PdfExtractionError(
      `Could not read PDF (encrypted, image-only, or corrupted): ${(e as Error).message}`
    );
  }

  const joined = pages
    .map((p, i) => `\n\n--- Page ${i + 1} ---\n\n${(p ?? "").trim()}`)
    .join("");

  const text = joined.trim();

  if (!text || text.replace(/--- Page \d+ ---/g, "").trim().length < 20) {
    throw new PdfExtractionError(
      "Extracted text is empty — the PDF may be image-only and require OCR."
    );
  }

  return { text, pageCount: totalPages, language: detectLanguage(text) };
}

// Lightweight EN/FR detector. The agent re-verifies language; this just
// gives downstream a hint per the Implementation Guide.
function detectLanguage(text: string): string {
  const sample = text.slice(0, 4000).toLowerCase();
  const frenchTokens = [
    " le ", " la ", " les ", " des ", " une ", " du ", " et ", " est ",
    "contrat", "bon de commande", "société", "abonnement", "présent",
    "conditions", "facturation", "résiliation",
  ];
  let frHits = 0;
  for (const t of frenchTokens) if (sample.includes(t)) frHits++;
  const accentMatches = (sample.match(/[éèêàçùœ]/g) ?? []).length;
  return frHits >= 3 || accentMatches > 15 ? "fr" : "en";
}
