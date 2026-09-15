import { Response } from 'express';

export function sendSuccess<T>(res: Response, data: T, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    data,
    message,
  });
}

export function sendError(res: Response, message: string, code: string, statusCode = 400) {
  return res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
}
