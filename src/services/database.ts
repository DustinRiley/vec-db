import { Client } from "pg";

export const pgClient = new Client({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

pgClient
  .connect()
  .then(async () => {
    console.log("Connected to Postgres!");
  })
  .catch((err) => {
    console.error("Failed to connect to Postgres:", err);
  });

const searchByVector = async (
  vector: number[],
  threshold: number = 0.8
): Promise<Array<{ id: string; file_id: string; content: string; vector: number[] }>> => {
  const formattedVector = `[${vector.join(",")}]`;

  const { rows } = await pgClient.query(
    `SELECT file_id, content FROM embeddings WHERE vector <-> $1 < $2;`, 
    [formattedVector, threshold]
  );
  return rows;
};

const deleteAllFileEmbeddings = async (fileId: string): Promise<void> => {
  try {
    await pgClient.query(`DELETE FROM embeddings WHERE file_id = $1;`, [fileId]);
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
}: {
  fileId: string;
  content: string;
  vector: number[];
}): Promise<void> => {
  const formattedVector = `[${vector.join(",")}]`;

  await pgClient.query(`INSERT INTO embeddings (file_id, content, vector) VALUES ($1, $2, $3);`, [
    fileId,
    content,
    formattedVector,
  ]);
};

const searchByFileId = async (fileId: string): Promise<any[]> => {
  const { rows } = await pgClient.query(`SELECT * FROM embeddings WHERE file_id = $1;`, [fileId]);
  return rows;
};

export { searchByVector, deleteAllFileEmbeddings, storeFileEmbedding, searchByFileId };
