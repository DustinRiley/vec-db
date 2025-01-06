import { Router } from "express";
import multer from "multer";
import { storeFileEmbedding, updateFileEmbedding } from "../services/database";
import { checkAuth } from "../services/checkAuth";
import { generateEmbedding } from "../services/embeddings";
import { extractTextFromPDF } from "../services/document_parsing/pdf";
import { MAX_CHUNKS } from "../constants";

export const updateRouter = Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });
const singleFileUpload = upload.single("file");

updateRouter.use(checkAuth);

updateRouter.post("/", singleFileUpload, async (req, res) => {
  
  try {
    const {file, body} = req;
    const { fileId, content, metadata, id} = body;

    const hasFileIdentifier = !!fileId || !!id;
    const hasContent = !!content || !!file;
    if(!hasFileIdentifier || !hasContent) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No file provided." });
    }

    if(fileId && !file) {
      return res.status(400).json({ error: "No file provided." });
    }

    if(id && !content) {
      return res.status(400).json({ error: "No content provided." });
    }
    if(id && fileId) {
      return res.status(400).json({ error: "Cannot provide both id and fileId" });
    } 
    
    let chunks = [];
    if(file){
      chunks = await extractTextFromPDF(req.file.buffer);
    } else {
      chunks = [content];
    }


    if (chunks.length === 0 || chunks.length > MAX_CHUNKS) {
      return res.status(400).json({ error: "Could not extract text from file!!" });
    }


    for (const text of chunks) {
      console.log("Chunk:", text);
      if (!text) {
        return res.status(400).json({ error: "Could not extract text from file!!" });
      }

      const embedding = await generateEmbedding(text);

      await updateFileEmbedding({ fileId, content: text, vector: embedding, id });
    }
    return res.status(200).json({ message: "File uploaded successfully" });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: "Processing failed", details: err.message });
  }
});

