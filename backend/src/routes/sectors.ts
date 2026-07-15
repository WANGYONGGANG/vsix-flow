import { Router } from 'express';

const router = Router();

router.get('/', async (req, res) => {
  const provider = (req.app.locals.getProvider as () => any)();
  const sectors = await provider.getSectors();
  res.json(sectors);
});

export default router;
