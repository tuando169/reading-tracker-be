import { app } from './app.js';
import { env } from './config/env.js';
import { pool, testDatabaseConnection } from './config/database.js';
import { logger } from './utils/logger.js';

const PORT = env.PORT || 8000;

async function bootstrap() {
  const dbConnected = await testDatabaseConnection();
  if (dbConnected) {
    logger.info('MySQL Database connected successfully.');
  } else {
    logger.warn('Could not establish initial MySQL connection. Will retry on demand.');
  }

  const server = app.listen(PORT, () => {
    logger.info(`Server is running at http://localhost:${PORT}`);
    logger.info(`API Base Path: http://localhost:${PORT}/api/v1`);
    logger.info(`Swagger UI Docs: http://localhost:${PORT}/api-docs`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      logger.info('HTTP server closed.');
      await pool.end();
      logger.info('Database pool closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  logger.error('Failed to start application:', error);
  process.exit(1);
});
