import dotenv from "dotenv";
import fs from "fs";
import path from "path";
dotenv.config({
  path: path.resolve(__dirname, "../.env"),
});

import { createEmbeddings, batchStoreFileEmbeddings } from "../src/services/database";
import { EmbeddingsList } from "@pinecone-database/pinecone";

const DATA_DIRECTORY = "./import-data/algolia";

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunked: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunked.push(array.slice(i, i + size));
  }
  return chunked;
}

async function loadAllJsonFiles(directory: string): Promise<any[]> {
  const files = fs
    .readdirSync(directory)
    .filter((file) => file.endsWith(".json"));
  const allRecords: any[] = [];

  for (const file of files) {
    const filePath = path.join(directory, file);
    console.log(`Loading records from: ${filePath}`);
    const fileContent = fs.readFileSync(filePath, "utf-8");
    const records = JSON.parse(fileContent);
    allRecords.push(...records);
  }

  console.log(`Loaded ${allRecords.length} total records from ${files.length} files.`);
  return allRecords;
}

async function migrateJsonToPinecone() {
  try {
    // Load all records
    const records = await loadAllJsonFiles(DATA_DIRECTORY);

    // We’ll use this chunk size both for embedding and for upserting
    const EMBEDDING_BATCH_SIZE = 96;
    const UPSERT_BATCH_SIZE = 100;

    // Split the full records array into chunks
    const recordChunks = chunkArray(records, EMBEDDING_BATCH_SIZE);

    let chunkIndex = 0;
    for (const chunk of recordChunks) {
      chunkIndex++;
      console.log(`\nProcessing chunk ${chunkIndex} of ${recordChunks.length}...`);

      // Prepare texts for embedding
      const textsToEmbed = chunk.map(
        (record) => `${record.title ?? ""}\n${record.content ?? ""}`
      );

      // Generate embeddings
      console.log("Generating embeddings...");
      const embeddings: EmbeddingsList = await createEmbeddings({
        model: "multilingual-e5-large",
        texts: textsToEmbed,
      });

      // Build objects for Pinecone
      const pineconeVectors = chunk.map((record, idx) => {
        return {
          id: record.objectID,
          file_id: "algolia",
          content: record.content ?? "",
          values: embeddings[idx].values ?? Array(96).fill(0),
          metadata: {
            objectID: record.objectID,
            title: record.title,
            content: record.content,
            product: record.product,
            type: record.type,
            pageId: record.pageId,
            path: record.path,
            breadcrumbs: record.breadcrumbs,
            header: record.header,
          },
        };
      });

      // Upsert in smaller batches (if desired)
      const upsertChunks = chunkArray(pineconeVectors, UPSERT_BATCH_SIZE);
      for (const upsertChunk of upsertChunks) {
        await batchStoreFileEmbeddings(upsertChunk);
      }

      console.log(`Finished pushing chunk ${chunkIndex} to Pinecone.`);
    }

    console.log("\nSuccessfully imported all records into Pinecone!");
  } catch (error) {
    console.error("Error during migration:", error);
  }
}

if (require.main === module) {
  migrateJsonToPinecone().then(() => {
    console.log("Migration script completed.");
  });
}
