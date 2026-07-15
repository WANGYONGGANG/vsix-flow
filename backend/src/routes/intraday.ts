import { Router } from 'express';
import { mockStore } from '../lib/mockGenerator.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(mockStore.getIntraday());
});

export default router;