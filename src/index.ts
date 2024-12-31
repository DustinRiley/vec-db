import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { authRouter } from './routes/auth';
import { uploadRouter } from './routes/upload';
import { webhookRouter } from './routes/webhook';
import { searchRouter } from './routes/search';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use('/auth', authRouter);
app.use('/upload', uploadRouter);
app.use('/webhook', webhookRouter);
app.use('/search', searchRouter);
app.get('/', (req, res) => {
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
