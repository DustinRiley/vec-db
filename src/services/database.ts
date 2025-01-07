import { Pinecone, RecordMetadata, ScoredPineconeRecord } from "@pinecone-database/pinecone";
const namespace = "default";
/**
 * Embedding interface describing the expected structure
 * of objects stored and retrieved from Pinecone.
 */
export interface Embedding {
  id: string;
  file_id: string;
  content: string;
  values: number[];
  metadata: Record<string, any>;
}

const getRandomString = (length = 7): string => {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from({ length }, () =>
    characters.charAt(Math.floor(Math.random() * characters.length))
  ).join("");
};

// ===== Pinecone Initialization =====
const PINECONE_API_KEY = process.env.PINECONE_API_KEY || "your-api-key";
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || "your-index-name";

const pinecone = new Pinecone({
  apiKey: PINECONE_API_KEY,
});

const index = pinecone.index(PINECONE_INDEX_NAME);

// ===== Query by values =====

/**
 * Queries Pinecone for the closest matching valuess.
 *
 * @param values - The numeric embedding to query against.
 * @param topK - Maximum number of results to return.
 * @param namespace - (Optional) Pinecone namespace to query within.
 * @returns An array of matching embeddings.
 */
export const searchByvalues = async (
  values: number[],
  topK = 10
): Promise<ScoredPineconeRecord<RecordMetadata>[]> => {
  try {
    const response = await index.namespace(namespace).query({
      topK,
      vector: values,
      includeMetadata: true,
    });

    const { matches = [] } = response;
    return matches.map((match) => ({
      ...match,
      id: match.id,
      file_id: match.metadata?.file_id,
      content: match.metadata?.content,
      values: match.values,
      metadata: match.metadata,
    }));
  } catch (error) {
    console.error("Error querying by values:", error);
    throw error;
  }
};

// ===== Create Embeddings =====
export const createEmbeddings = async ({
  model = "multilingual-e5-large",
  texts = [],
}: {
  model?: string;
  texts: string[];
}): Promise<any> => {
  try {
    const embeddings = await pinecone.inference.embed(model, texts, {
      inputType: "text",
      truncate: "NONE",
    });
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
export const deleteAllFileEmbeddings = async (fileId: string): Promise<void> => {
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
export const deleteIdEmbedding = async (id: string): Promise<void> => {
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
export const storeSingleFileEmbedding = async ({
  filename,
  content,
  values,
  metadata = {},
}: {
  filename: string;
  content: string;
  values: number[];
  metadata?: Record<string, any>;
}): Promise<void> => {
  try {
    const fileId = `${filename}-${getRandomString()}`;
    await index.namespace(namespace).upsert([
      {
        id: fileId,
        values: values,
        metadata: {
          file_id: fileId,
          content,
          ...metadata,
        },
      },
    ]);
    console.log(`Stored embedding for file_id: ${fileId}`);
  } catch (error) {
    console.error(`Error storing embedding for file_id ${filename}:`, error);
    throw error;
  }
};

// ===== Batch Upsert Embeddings =====

/**
 * Stores (upserts) multiple embeddings associated with particular file_ids.
 *
 * @param embeddings - An array of embeddings to store.
 */
export const batchStoreFileEmbeddings = async (embeddings: Embedding[]): Promise<void> => {
  try {
    // Delete all embeddings associated with the first file_id in the batch
    await deleteAllFileEmbeddings(embeddings[0].file_id);
    const records = embeddings.map(({ id, file_id, content, values, metadata }) => ({
      id,
      values: values,
      metadata: {
        file_id,
        content,
        ...metadata,
      },
    }));
    await index.namespace(namespace).upsert(records);
    console.log(`Stored ${embeddings.length} embeddings`);
  } catch (error) {
    console.error("Error storing embeddings:", error);
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
  fileId: string
): Promise<ScoredPineconeRecord<RecordMetadata>[]> => {
  try {
    const defaultQueryvalues = new Array(1024).fill(0); // todo: Replace 1024 with our index's dimension

    const response = await index.namespace(namespace).query({
      vector: defaultQueryvalues,
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
      values: match.values, // Adjusted to match the correct property
      metadata: match.metadata,
    }));
  } catch (error) {
    console.error(`Error searching for file_id ${fileId}:`, error);
    throw error;
  }
};
