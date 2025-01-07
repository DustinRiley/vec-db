import { Router, Request, Response } from "express";
import multer from "multer";
import { checkAuth } from "../services/checkAuth";
import { extractTextFromPDF } from "../services/document_parsing/pdf";
import { createEmbeddings, batchStoreFileEmbeddings } from "../services/database";
import { deleteAllFileEmbeddings, searchByFileId } from "../services/database";
import { MAX_CHUNKS } from "../constants";

const router = Router();
router.use(checkAuth); // Apply auth middleware to all routes in this router

// Configure file upload (in-memory for PDF buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// =============== POST /documents (Upload & Create) ===============
router.post("/", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file provided." });
    }

    const chunks = await extractTextFromPDF(req.file.buffer);
    if (chunks.length === 0 || chunks.length > MAX_CHUNKS) {
      return res.status(400).json({ error: "Could not extract text or chunk limit exceeded." });
    }

    // Simple fileId generation (you may want something more robust or unique)
    const fileId = `${req.file.originalname}-${Math.random().toString(36).substring(7)}`;

    // Generate embeddings
    const embeddings = await createEmbeddings({ texts: chunks });

    // Convert embeddings to your standard interface, adding metadata
    const embeddingsWithMetadata = embeddings.map((emb: any, idx: number) => ({
      ...emb,
      id: `${fileId}-${idx}`,
      file_id: fileId,
      content: chunks[idx],
      metadata: {
        file_id: fileId,
        chunk_index: idx,
      },
    }));

    // Upsert (batch store) the embeddings
    await batchStoreFileEmbeddings(embeddingsWithMetadata);

    return res.status(200).json({
      message: "Document uploaded and indexed successfully",
      fileId,
    });
  } catch (error: any) {
    console.error("Error in POST /documents:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

// =============== PUT /documents/:fileId (Full Doc Re-Upload) ===============
router.put("/:fileId", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    if (!fileId) {
      return res.status(400).json({ error: "Missing fileId in route params" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file provided for update." });
    }

    // Delete old embeddings for this fileId
    await deleteAllFileEmbeddings(fileId);

    // Extract text from new file
    const chunks = await extractTextFromPDF(req.file.buffer);
    if (chunks.length === 0 || chunks.length > MAX_CHUNKS) {
      return res.status(400).json({ error: "Could not extract text or chunk limit exceeded." });
    }

    // Re-embed
    const embeddings = await createEmbeddings({ texts: chunks });

    const embeddingsWithMetadata = embeddings.map((emb: any, idx: number) => ({
      ...emb,
      id: `${fileId}-${idx}`,
      file_id: fileId,
      content: chunks[idx],
      metadata: {
        file_id: fileId,
        chunk_index: idx,
      },
    }));

    //Store new embeddings
    await batchStoreFileEmbeddings(embeddingsWithMetadata);

    return res.status(200).json({
      message: `Document (${fileId}) re-uploaded successfully`,
    });
  } catch (error: any) {
    console.error("Error in PUT /documents/:fileId:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

// =============== DELETE /documents/:fileId (Remove Entire Doc) ===============
router.delete("/:fileId", async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    if (!fileId) {
      return res.status(400).json({ error: "Missing fileId in route params" });
    }

    // Delete all embeddings for that doc
    await deleteAllFileEmbeddings(fileId);

    return res.status(200).json({
      message: `All embeddings for fileId ${fileId} have been deleted`,
    });
  } catch (error: any) {
    console.error("Error in DELETE /documents/:fileId:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

// ===============  GET /documents/:fileId/chunks (List All Chunks) ===============
router.get("/:fileId/chunks", async (req: Request, res: Response) => {
  try {
    const { fileId } = req.params;
    if (!fileId) {
      return res.status(400).json({ error: "Missing fileId in route params" });
    }

    // Retrieve all embeddings for this fileId
    const results = await searchByFileId(fileId);
    // (Note: searchByFileId uses a "dummy" vector or filter-based approach)

    return res.status(200).json({
      fileId,
      chunks: results.map((r) => ({
        id: r.id,
        content: r.metadata?.content,
        metadata: r.metadata,
      })),
    });
  } catch (error: any) {
    console.error("Error in GET /documents/:fileId/chunks:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

export default router;
