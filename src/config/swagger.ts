import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { Express } from 'express';
import { env } from './env.js';

const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mini Reading Tracker API',
      version: '1.0.0',
      description: 'RESTful API trung gian kết nối Open Library và quản lý Tủ sách cá nhân (MySQL).',
      contact: {
        name: 'Backend Engineering Team'
      }
    },
    servers: [
      ...(env.NODE_ENV === 'production'
        ? [
            {
              url: 'https://reading-tracker-be.onrender.com/api/v1',
              description: 'Production Server (Render)'
            }
          ]
        : [
            {
              url: `http://localhost:${env.PORT}/api/v1`,
              description: 'Local Development Server'
            },
            {
              url: 'https://reading-tracker-be.onrender.com/api/v1',
              description: 'Production Server (Render)'
            }
          ])
    ],
    components: {
      schemas: {
        ApiResponse: {
          type: 'object',
          properties: {
            data: { type: 'object' },
            meta: {
              type: 'object',
              properties: {
                page: { type: 'integer', example: 1 },
                limit: { type: 'integer', example: 20 },
                total: { type: 'integer', example: 100 },
                totalPages: { type: 'integer', example: 5 }
              }
            }
          }
        },
        ApiError: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'VALIDATION_ERROR' },
                message: { type: 'string', example: 'Dữ liệu không hợp lệ' },
                details: { type: 'object', nullable: true }
              }
            }
          }
        },
        BookSearchResult: {
          type: 'object',
          properties: {
            id: { type: 'integer', nullable: true, example: 1 },
            workId: { type: 'string', example: 'OL82563W' },
            title: { type: 'string', example: "Harry Potter and the Philosopher's Stone" },
            author: { type: 'string', nullable: true, example: 'J. K. Rowling' },
            description: { type: 'string', nullable: true, example: 'Harry Potter has never even heard of Hogwarts...' },
            publishYear: { type: 'integer', nullable: true, example: 1997 },
            totalPages: { type: 'integer', nullable: true, example: 223 },
            subjects: {
              type: 'array',
              items: { type: 'string' },
              example: ['Fantasy', 'Magic']
            },
            coverUrl: { type: 'string', nullable: true, example: 'https://covers.openlibrary.org/b/id/10521270-M.jpg' }
          }
        },
        LibraryBook: {
          type: 'object',
          properties: {
            id: { type: 'integer', example: 1 },
            workId: { type: 'string', example: 'OL82563W' },
            title: { type: 'string', example: "Harry Potter and the Philosopher's Stone" },
            author: { type: 'string', nullable: true, example: 'J. K. Rowling' },
            coverUrl: { type: 'string', nullable: true, example: 'https://covers.openlibrary.org/b/id/10521270-M.jpg' },
            status: { type: 'integer', enum: [0, 1, 2], example: 1, description: '0: Muốn đọc, 1: Đang đọc, 2: Đã đọc' },
            currentPage: { type: 'integer', example: 100 },
            totalPages: { type: 'integer', nullable: true, example: 223 },
            rating: { type: 'integer', minimum: 0, maximum: 5, example: 4 },
            note: { type: 'string', example: 'Sách rất lôi cuốn' },
            startedAt: { type: 'string', format: 'date-time', nullable: true },
            finishedAt: { type: 'string', format: 'date-time', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        AddBookInput: {
          type: 'object',
          required: ['workId'],
          properties: {
            workId: { type: 'string', example: 'OL82563W' },
            status: { type: 'integer', enum: [0, 1, 2], default: 0 }
          }
        },
        UpdateProgressInput: {
          type: 'object',
          properties: {
            status: { type: 'integer', enum: [0, 1, 2] },
            currentPage: { type: 'integer', minimum: 0 },
            rating: { type: 'integer', minimum: 0, maximum: 5 },
            note: { type: 'string', maxLength: 2000 }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts', './dist/routes/*.js']
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions);

export function setupSwagger(app: Express): void {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'Reading Tracker API Docs'
  }));

  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}
