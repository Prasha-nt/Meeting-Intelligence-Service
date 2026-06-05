import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

export function validateRequest(schema: {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
}) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        const validated = await schema.query.parseAsync(req.query);
        for (const key of Object.keys(req.query)) {
          delete (req.query as any)[key];
        }
        Object.assign(req.query, validated);
      }
      if (schema.params) {
        const validated = await schema.params.parseAsync(req.params);
        for (const key of Object.keys(req.params)) {
          delete (req.params as any)[key];
        }
        Object.assign(req.params, validated);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message
        }));
        next(new ValidationError('Validation failed', details));
      } else {
        next(error);
      }
    }
  };
}
