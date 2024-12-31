import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateEmbedding(text: string): Promise<number[]> {
  
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  });

  if (response.data && response.data.length > 0) {
    return response.data[0].embedding;
  }

  throw new Error("Failed to generate embedding.");
}

export { generateEmbedding };
