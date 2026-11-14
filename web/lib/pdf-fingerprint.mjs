export const MAX_PDF_SIZE = 20 * 1024 * 1024;

/** @param {File} file */
export async function createPdfFingerprint(file) {
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Please choose a file with a .pdf extension.");
  }
  if (file.size === 0) {
    throw new Error("This file is empty. Please choose a PDF with content.");
  }
  if (file.size > MAX_PDF_SIZE) {
    throw new Error("This PDF is larger than 20 MB. Choose a smaller agreement.");
  }
  if (!globalThis.crypto?.subtle) {
    throw new Error("Fingerprint calculation requires HTTPS or localhost. Please open this site using one of those addresses.");
  }

  const bytes = await file.arrayBuffer();
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
