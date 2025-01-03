import { EMBEDDING_CHUNK_CHAR_SIZE } from '../../constants';

const chuckText = (text: string, chunkSize=EMBEDDING_CHUNK_CHAR_SIZE): string[] => {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

export { chuckText };