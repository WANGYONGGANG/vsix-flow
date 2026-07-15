import { Router } from 'express';

const router = Router();

router.get('/', async (req, res) => {
  const provider = (req.app.locals.getProvider as () => any)();
  const data = await provider.getIntraday();
  res.json(data);
});

export default router;
