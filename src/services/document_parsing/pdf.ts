import { PDFNet } from "@pdftron/pdfnet-node";
import { chuckText } from "./utils";

// Extract text from the PDF using PDFTron
async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string[]> {
  return await PDFNet.runWithCleanup(async () => {
    const doc = await PDFNet.PDFDoc.createFromBuffer(pdfBuffer);
    doc.initSecurityHandler();

    const txt = await PDFNet.TextExtractor.create();
    const pageCount = await doc.getPageCount();
    let extractedText = "";

    for (let i = 1; i <= pageCount; i++) {
      const page = await doc.getPage(i);
      txt.begin(page);
      extractedText += await txt.getAsText();
    }
    const chunks = chuckText(extractedText);
    return chunks
    
  }, process.env.PDFTRON_LICENSE_KEY);

}

export { extractTextFromPDF };