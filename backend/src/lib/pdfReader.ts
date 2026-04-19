import pdf from "pdf-parse";

export async function readPdfText(buffer: Buffer): Promise<string> {
  const parsed = await pdf(buffer);
  return parsed.text.trim();
}
