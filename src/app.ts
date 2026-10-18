import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { apiRouter } from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFoundHandler } from './middlewares/notFoundHandler.js';
import { setupSwagger } from './config/swagger.js';

export const app = express();

// Security HTTP Headers (cấu hình CSP để Swagger UI load stylesheet & script an toàn)
app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

// CORS cho phép Frontend tương tác
app.use(
  cors({
    origin: env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
  })
);

// Request Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup Swagger Docs UI tại /api-docs và /api-docs.json
setupSwagger(app);

// Mount API V1 routes
app.use('/api/v1', apiRouter);

// Root redirect hoặc welcome
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// 404 Not Found
app.use(notFoundHandler);

// Global Error Handler
app.use(errorHandler);
