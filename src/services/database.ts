import { Pinecone, RecordMetadata, ScoredPineconeRecord } from "@pinecone-database/pinecone";

/**
 * Embedding interface describing the expected structure
 * of objects stored and retrieved from Pinecone.
 */
export interface Embedding {
  id: string;
  file_id: string;
  content: string;
  vector: number[];
  metadata: Record<string, any>;
}

// ===== Pinecone Initialization =====
const PINECONE_API_KEY = process.env.PINECONE_API_KEY || "your-api-key";
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || "your-index-name";

const pinecone = new Pinecone({
  apiKey: PINECONE_API_KEY,
});


const index = pinecone.index(PINECONE_INDEX_NAME);

// ===== Query by Vector =====

/**
 * Queries Pinecone for the closest matching vectors.
 *
 * @param vector - The numeric embedding to query against.
 * @param topK - Maximum number of results to return.
 * @param namespace - (Optional) Pinecone namespace to query within.
 * @returns An array of matching embeddings.
 */
export const searchByVector = async (
  vector: number[],
  topK = 10,
  namespace: string
): Promise<ScoredPineconeRecord<RecordMetadata>[]> => {
  try {
    const response = await index.namespace(namespace).query({
      topK,
      vector,
      includeMetadata: true,
    });

    const { matches = [] } = response;
    return matches.map((match) => ({
      ...match,
      id: match.id,
      file_id: match.metadata?.file_id,
      content: match.metadata?.content,
      vector: match.values,
      metadata: match.metadata,
    }));
  } catch (error) {
    console.error("Error querying by vector:", error);
    throw error;
  }
};

// ===== Create Embeddings =====
export const createEmbeddings = async (
  {
    model = "multilingual-e5-large",
    texts = [],
  }: {
    model?: string;
    texts: string[];
  }
): Promise<any> => {
  try {
    const embeddings = await pinecone.inference.embed(
      model,
      texts,
      { inputType: "text", truncate: "END" }
    );
    return embeddings;
  } catch (error) {
    console.error("Error creating embeddings:", error);
    throw error;
  }
};

// ===== Delete Embeddings by File ID =====

/**
 * Deletes all embeddings associated with a specific file_id.
 *
 * @param fileId - The file ID whose embeddings should be deleted.
 * @param namespace - (Optional) Pinecone namespace to delete from.
 */
export const deleteAllFileEmbeddings = async (
  fileId: string,
  namespace: string
): Promise<void> => {
  try {
    await index.namespace(namespace).deleteMany({
      filter: { file_id: fileId },
    });
    console.log(`Deleted all embeddings for file_id: ${fileId}`);
  } catch (error) {
    console.error(`Error deleting embeddings for file_id ${fileId}:`, error);
    throw error;
  }
};

/**
 * Deletes an embedding by its unique ID.
 *
 * @param id - The ID of the embedding to delete.
 * @param namespace - (Optional) Pinecone namespace to delete from.
 */
export const deleteIdEmbedding = async (
  id: string,
  namespace: string
): Promise<void> => {
  try {
    await index.namespace(namespace).deleteOne(id);
    console.log(`Deleted embedding with id: ${id}`);
  } catch (error) {
    console.error(`Error deleting embedding with id ${id}:`, error);
    throw error;
  }
};

// ===== Upsert Embeddings =====

/**
 * Stores (upserts) a single embedding associated with a particular file_id.
 *
 * @param params - Object containing embedding parameters.
 */
export const storeFileEmbedding = async ({
  id,
  fileId,
  content,
  vector,
  metadata = {},
  namespace,
}: {
  id: string;
  fileId: string;
  content: string;
  vector: number[];
  metadata?: Record<string, any>;
  namespace: string;
}): Promise<void> => {
  try {
    await index.namespace(namespace).upsert([
      {
        id,
        values: vector,
        metadata: {
          file_id: fileId,
          content,
          ...metadata,
        },
      },
    ]);
    console.log(`Stored embedding for file_id: ${fileId}`);
  } catch (error) {
    console.error(`Error storing embedding for file_id ${fileId}:`, error);
    throw error;
  }
};

// ===== Query by File ID =====

/**
 * Retrieves all embeddings that match a given file_id.
 *
 * @param fileId - The file ID to filter by.
 * @param namespace - (Optional) Pinecone namespace to query within.
 * @returns An array of matching embeddings.
 */
export const searchByFileId = async (
  fileId: string,
  namespace: string
): Promise<ScoredPineconeRecord<RecordMetadata>[]> => {
  try {
    // Define a default query vector; ensure it matches the dimensionality of your index
    const defaultQueryVector = new Array(1024).fill(0); // Replace 1024 with your index's dimension

    const response = await index.namespace(namespace).query({
      vector: defaultQueryVector,
      filter: { file_id: fileId },
      topK: 10,
      includeMetadata: true,
    });

    const { matches = [] } = response;
    return matches.map((match) => ({
      ...match,
      id: match.id,
      file_id: match.metadata?.file_id,
      content: match.metadata?.content,
      vector: match.values, // Adjusted to match the correct property
      metadata: match.metadata,
    }));
  } catch (error) {
    console.error(`Error searching for file_id ${fileId}:`, error);
    throw error;
  }
};

