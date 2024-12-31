# Simple PDF vector embeddings with pgvector

This project is a containerized Node.js application that:

- Extracts text from uploaded documents using the PDFTron/Apryse api.
- Generates vector embeddings with OpenAI's API.
- Stores embeddings in a Postgres database with `pgvector`.

## Features

- **File Upload**: Upload and process documents.
- **Text Extraction**: Extract text using PDFTron.
- **Vector Embeddings**: Generate and store embeddings.
- **Postgres Integration**: Search and manage embeddings with `pgvector`.
- **Dockerized**: Easy setup with Docker Compose.

## Setup

### Prerequisites
- Node.js (>= 18.x)
- Docker & Docker Compose
- OpenAI API Key
- PDFTron/Apryse license key

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd vec-db
   ```
2. Create a `.env` file:
   ```env
   PORT=3000
   OPENAI_API_KEY=<your_openai_api_key>
   DB_HOST=db
   DB_PORT=5432
   DB_NAME=mydb
   DB_USER=postgres
   DB_PASSWORD=postgres
   PDFTRON_LICENSE_KEY=<your_pdftron_license_key>
   ```
3. Run with Docker Compose:
   ```bash
   docker-compose up --build
   ```

## API Endpoints

### Upload File
**POST** `/upload`
- Uploads a file, extracts text, generates embeddings, and stores them.
- **Headers**: `Authorization: Bearer <token>`
- **Body**: Form-data with `file`.

### Search by Vector
**POST** `/search`
- Finds similar embeddings.
- **Body**:
  ```json
  {
    "vector": [0.1, 0.2, 0.3],
    "threshold": 0.5
  }
  ```

### Delete Embeddings
**DELETE** `/embeddings/:fileId`
- Deletes all embeddings for a file.


## Database Schema

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS embeddings (
  id SERIAL PRIMARY KEY,
  file_id TEXT NOT NULL,
  content TEXT NOT NULL,
  vector VECTOR(1536) NOT NULL
);
```


MIT License

