import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';

export function errorMiddleware(err: Error, req: Request, res: Response, next: NextFunction) {
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details: any = null;

  if (err instanceof AppError) {
    status = err.status;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err.name === 'SyntaxError' && 'status' in err && (err as any).status === 400) {
    status = 400;
    code = 'MALFORMED_REQUEST';
    message = 'Malformed JSON body';
  } else {
    // Check for Prisma errors (e.g. Unique constraint)
    const errAny = err as any;
    if (errAny.code === 'P2002') {
      status = 409;
      code = 'CONFLICT';
      message = `Unique constraint failed on field(s): ${errAny.meta?.target || 'unknown'}`;
    } else if (errAny.code === 'P2025') {
      status = 404;
      code = 'NOT_FOUND';
      message = errAny.meta?.cause || 'Record not found';
    }
  }

  // Log the error
  logger.error(err.message || message, err);

  res.status(status).json({
    traceId: req.traceId || 'N/A',
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {})
    }
  });
}
export default errorMiddleware;
