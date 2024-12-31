import { Router } from 'express';

export const webhookRouter = Router();

webhookRouter.post('/', async (req, res) => {
  try {
    const payload = req.body;
    console.log('Webhook payload:', payload);
    return res.json({ message: 'Webhook received and processed' });
  } catch (err) {
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});
