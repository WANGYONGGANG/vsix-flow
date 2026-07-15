import { Router } from 'express';
import { mockStore } from '../lib/mockGenerator.js';

const router = Router();

router.get('/', (req, res) => {
  const days = Math.min(90, Math.max(1, parseInt(req.query.days as string) || 45));
  res.json(mockStore.getHistorical(days));
});

export default router;