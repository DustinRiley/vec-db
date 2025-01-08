import { Router, Request, Response } from "express";
import multer from "multer";
import { checkAuth } from "../services/checkAuth";
import { extractTextFromPDF } from "../services/document_parsing/pdf";
import { createEmbeddings, batchStoreFileEmbeddings, PineconeRecord } from "../services/database";
import { deleteIdEmbedding } from "../services/database";
import { MAX_CHUNKS } from "../constants";
import { EmbeddingsList } from "@pinecone-database/pinecone";
import { Embedding } from "@pinecone-database/pinecone/dist/pinecone-generated-ts-fetch/inference";

const router = Router();
router.use(checkAuth);

const storage = multer.memoryStorage();
const upload = multer({ storage });

// ===============  PUT /chunks/:id (Partial Update by Chunk ID) ===============
router.put("/:id", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { content, fileId } = req.body;

    /**
     * We have two possible update methods:
     *   If `file` is present, we re-extract text from the PDF (likely just one chunk).
     *   If `content` is provided, we use that text directly.
     */
    let newTextChunks: string[] = [];

    if (req.file) {
      // PDF-based chunk update
      newTextChunks = await extractTextFromPDF(req.file.buffer);
      if (newTextChunks.length > MAX_CHUNKS) {
        return res.status(400).json({ error: "Too many chunks for a single chunk update." });
      }
    } else if (content) {
      // Direct text content
      newTextChunks = [content];
    } else {
      return res.status(400).json({ error: "No content or file provided." });
    }

    //    Delete the old chunk
    //    If you want to confirm that the chunk actually belongs to the specified fileId,
    //    you could do so before deleting, to avoid accidental cross-file updates.
    await deleteIdEmbedding(id);

    //  Create embeddings for the new text
    const embeddings = await createEmbeddings({ texts: newTextChunks });

    //    Upsert the new chunk(s)
    //    We'll store them under the same ID or a brand new ID. If chunk boundaries changed,
    //    we might want to generate a new ID to avoid confusion. For simplicity, we'll re-use `id`.
    //    Also note, we need a `fileId` to store in metadata if not provided, or else fallback logic.
    if (!fileId) {
      console.warn("Warning: No explicit fileId provided for chunk update.");
    }

    const embeddingRecords: PineconeRecord[] = embeddings.map((emb: Embedding, idx: number) => {
      const chunkId = idx === 0 ? id : `${id}-split-${idx}`;
      return {
        ...emb,
        id: chunkId,
        file_id: fileId || "unknown-file-id",
        content: newTextChunks[idx],
        metadata: {
          file_id: fileId || "unknown-file-id",
          // Additional metadata as needed
          updatedFromChunkId: id, // track that this was an update
        },
      };
    });

    await batchStoreFileEmbeddings(embeddingRecords);

    return res.status(200).json({
      message: "Chunk updated successfully",
      newIds: embeddingRecords.map((r) => r.id),
    });
  } catch (error: any) {
    console.error("Error in PUT /chunks/:id:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

// =============== DELETE /chunks/:id (Remove Single Chunk) ===============
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: "Missing chunk ID in route params" });
    }

    await deleteIdEmbedding(id);

    return res.status(200).json({
      message: `Chunk with ID ${id} has been deleted`,
    });
  } catch (error: any) {
    console.error("Error in DELETE /chunks/:id:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

export default router;
