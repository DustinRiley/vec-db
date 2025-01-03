import { Router, Request, Response } from "express";
import { generateEmbedding } from "../services/embeddings";
import { Embedding, searchByVector } from "../services/database";
import { checkAuth } from "../services/checkAuth";

interface SearchRequestBody {
  text: string;
  threshold?: number;
  limit?: number;
}

interface SearchResult {
  id: number;
  file_id: string;
  content: string;
  vector: number[];
  metadata: Record<string, any>;  
}

export const searchRouter = Router();
searchRouter.use(checkAuth);

searchRouter.post("/", async (req: Request<{}, {}, SearchRequestBody>, res: Response) => {
  try {
    const { text, threshold = 0.8, limit = 5 } = req.body;

    const embedding = await generateEmbedding(text);

    const results = await searchByVector(embedding, threshold);

    const responseResults: Partial<Embedding>[] = results
      .map((result) => ({
        id: result.id,
        file_id: result.file_id,
        content: result.content,
        metadata: result.metadata,
      }))
      .slice(0, limit);

    return res.json({
      message: "Search successful",
      results: responseResults,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
});
