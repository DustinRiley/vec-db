import { Router } from "express";
import multer from "multer";
import { batchStoreFileEmbeddings, createEmbeddings, PineconeRecord } from "../services/database";
import { checkAuth } from "../services/checkAuth";
import { extractTextFromPDF } from "../services/document_parsing/pdf";
import { MAX_CHUNKS } from "../constants";

export const uploadRouter = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });
const singleFileUpload = upload.single("file");

uploadRouter.use(checkAuth);



uploadRouter.post("/", singleFileUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided." });
    }

    const chunks = await extractTextFromPDF(req.file.buffer);
    if (chunks.length === 0 || chunks.length > MAX_CHUNKS) {
      return res.status(400).json({ error: "Could not extract text from file!!" });
    }

    // todo do better file id generation
    const fileId = req.file.originalname + "-" + Math.random().toString(36).substring(7);
    const embeddings = await createEmbeddings({texts: chunks});

    const embeddingsWithMetadata: PineconeRecord[] = embeddings.map((embedding, index) => ({
      ...embedding,
        file_id: fileId,
        chunk_index: index,
      id: `${fileId}-${index}`,
      content: chunks[index],
      metadata: {
        file_id: fileId,
        chunk_index: index,
    }}));
    
    await batchStoreFileEmbeddings(embeddingsWithMetadata);

    return res.status(200).json({ message: "File uploaded successfully" });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Processing failed", details: err.message });
  }
});

// TODO: store in an S3 bucket?
// idk if we wanna do that for security reasons though
