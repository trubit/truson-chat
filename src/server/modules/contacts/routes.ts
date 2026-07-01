import { Router } from 'express';

const router = Router();

router.use((_req, res) => {
  res.status(200).json({ status: 'coming_soon', module: 'contacts' });
});

export default router;
