import { Router, Request, Response } from "express";
import { checkAuth } from "../services/checkAuth";
import { createEmbeddings, searchByvalues } from "../services/database";

const router = Router();
router.use(checkAuth);

// =============== POST /search (Query the Vector DB) ===============
// Could also use GET /search with query params, but a POST is often more convenient for passing JSON text.
router.post("/", async (req: Request, res: Response) => {
  try {
    const { queryText, topK = 10 } = req.body;
    if (!queryText) {
      return res.status(400).json({ error: "Missing queryText in body" });
    }

    //  Embed the user query text
    const [queryEmbedding] = await createEmbeddings({ texts: [queryText] });

    if (!queryEmbedding?.values) {
      return res.status(500).json({
        error: "Failed to generate query embedding",
      });
    }

    //  Search the vector DB
    const results = await searchByvalues(queryEmbedding.values, topK);

    //  Return the matches
    return res.status(200).json({
      query: queryText,
      results: results.map((match) => ({
        id: match.id,
        score: match.score,
        file_id: match.metadata?.file_id,
        content: match.metadata?.content,
        metadata: match.metadata,
      })),
    });
  } catch (error: any) {
    console.error("Error in POST /search:", error);
    return res.status(500).json({ error: error.message || "Server error" });
  }
});

export default router;
