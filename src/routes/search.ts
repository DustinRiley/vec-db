import { Router } from 'express';
import { generateEmbedding } from '../services/embeddings';
import { searchByVector } from '../services/database';

export const searchRouter = Router();

searchRouter.post('/', async (req, res) => {
  try {
    const { text } = req.body;
    console.log('Searching for:', text);

    const embedding = await generateEmbedding(text);

    const results = await searchByVector(embedding);


    return res.json({
      message: 'Search successful',
      results: results.map((result) => ({
        id: result.id,
        file_id: result.file_id,
        content: result.content,
      })).slice(0, 5),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

