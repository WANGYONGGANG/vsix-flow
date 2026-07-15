import { Router } from 'express';
import { mockStore } from '../lib/mockGenerator.js';

const router = Router();

router.get('/', (_req, res) => {
  res.json(mockStore.sectors);
});

router.post('/', (req, res) => {
  const { name } = req.body || {};
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'name required' });
    return;
  }
  const s = mockStore.addSector(name.trim());
  res.json(s);
});

router.delete('/:id', (req, res) => {
  mockStore.removeSector(req.params.id);
  res.status(204).send();
});

export default router;