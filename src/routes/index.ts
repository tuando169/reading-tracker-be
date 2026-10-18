import { Router } from 'express';
import { bookRouter } from './bookRoutes.js';
import { libraryRouter } from './libraryRoutes.js';

export const apiRouter = Router();

apiRouter.use('/books', bookRouter);
apiRouter.use('/library', libraryRouter);

apiRouter.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
