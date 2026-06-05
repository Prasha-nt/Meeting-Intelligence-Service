import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import fs from 'fs';
import path from 'path';

const swaggerDocument = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'docs', 'swagger.json'), 'utf8')
);

import { traceMiddleware } from './middleware/trace.middleware';
import { requestLoggerMiddleware } from './middleware/request-logger.middleware';
import { errorMiddleware } from './middleware/error.middleware';

import authRouter from './routes/auth.routes';
import meetingRouter from './routes/meeting.routes';
import actionItemRouter from './routes/action-item.routes';
import { getHealth, getEvaluation } from './controllers/evaluation.controller';

const app = express();

// 1. CORS enabled (*)
app.use(cors({ origin: '*' }));

// 2. Body parsing
app.use(express.json());

// 3. Trace ID propagation
app.use(traceMiddleware);

// 4. Request logging
app.use(requestLoggerMiddleware);

// 5. Public Health and Evaluation endpoints
app.get('/health', getHealth);
app.get('/api/health', getHealth);
app.get('/api/evaluation', getEvaluation);

// 6. Swagger API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// 7. API Routes
app.use('/api/auth', authRouter);
app.use('/api/meetings', meetingRouter);
app.use('/api/action-items', actionItemRouter);

// 8. Global Centralized Error Handler
app.use(errorMiddleware);

export default app;
