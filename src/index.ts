// src/server.ts
import express from "express";
import documentsRouter from "./routes/documents";
import chunksRouter from "./routes/chunks";
import searchRouter from "./routes/search";

const app = express();
app.use(express.json()); // for parsing JSON bodies

// Mount routes
app.use("/documents", documentsRouter);
app.use("/chunks", chunksRouter);
app.use("/search", searchRouter);

// Example: Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
