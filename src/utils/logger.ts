import { getTraceId } from './trace-context';

export const logger = {
  info(message: string, meta?: any) {
    const logObj = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      traceId: getTraceId() || 'N/A',
      message,
      ...meta,
    };
    console.log(JSON.stringify(logObj));
  },
  
  warn(message: string, meta?: any) {
    const logObj = {
      timestamp: new Date().toISOString(),
      level: 'WARN',
      traceId: getTraceId() || 'N/A',
      message,
      ...meta,
    };
    console.warn(JSON.stringify(logObj));
  },

  error(message: string, error?: any, meta?: any) {
    const logObj = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      traceId: getTraceId() || 'N/A',
      message,
      error: error ? {
        message: error.message,
        stack: error.stack,
        code: error.code,
        ...error
      } : undefined,
      ...meta,
    };
    console.error(JSON.stringify(logObj));
  }
};
export default logger;
