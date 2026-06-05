import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { traceStorage } from '../utils/trace-context';

// Extend Express Request type to include traceId
declare global {
  namespace Express {
    interface Request {
      traceId: string;
      user?: {
        id: string;
        email: string;
        name: string;
      };
    }
  }
}

export function traceMiddleware(req: Request, res: Response, next: NextFunction) {
  const traceId = (req.headers['x-trace-id'] as string) || 
                  (req.headers['x-request-id'] as string) || 
                  randomUUID();
  
  req.traceId = traceId;
  res.setHeader('x-trace-id', traceId);

  traceStorage.run({ traceId }, () => {
    next();
  });
}
