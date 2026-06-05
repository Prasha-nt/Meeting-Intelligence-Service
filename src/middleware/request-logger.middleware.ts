import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request completed', {
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs: duration
    });
  });

  next();
}
