import { Pool } from "pg";

export const pgPool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5435"),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

pgPool.connect()
  .then(client => {
    console.log("Connected to Postgres!");
    client.release();
  })
  .catch(err => {
    console.error("Failed to connect to Postgres:", err);
    throw err;
  });

export interface Embedding {
  id: number;
  file_id: string;
  content: string;
  vector: number[];
  metadata: Record<string, any>;
}

const searchByVector = async (
  vector: number[],
  threshold: number = 0.8
): Promise<Embedding[]> => {
  const { rows } = await pgPool.query<Embedding>(
    `SELECT * FROM embeddings WHERE vector <-> $1 < $2;`,
    [JSON.stringify(vector), threshold]
  );
  return rows;
};

const deleteAllFileEmbeddings = async (fileId: string): Promise<void> => {
  try {
    await pgPool.query(`DELETE FROM embeddings WHERE file_id = $1;`, [fileId]);
    console.log(`Deleted all embeddings for file_id: ${fileId}`);
  } catch (error) {
    console.error(`Error deleting embeddings for file_id ${fileId}:`, error);
    throw error;
  }
};

const storeFileEmbedding = async ({
  fileId,
  content,
  vector,
  metadata={},
}: {
  fileId: string;
  content: string;
  vector: number[];
  metadata?: Record<string, any>;
}): Promise<void> => {
  await pgPool.query(
    `INSERT INTO embeddings (file_id, content, vector, metadata) VALUES ($1, $2, $3, $4);`,
    [fileId, content, JSON.stringify(vector), JSON.stringify(metadata)]
  );
};

const searchByFileId = async (fileId: string): Promise<Embedding[]> => {
  const { rows } = await pgPool.query<Embedding>(
    `SELECT * FROM embeddings WHERE file_id = $1;`,
    [fileId]
  );
  return rows;
};

export { searchByVector, deleteAllFileEmbeddings, storeFileEmbedding, searchByFileId };
