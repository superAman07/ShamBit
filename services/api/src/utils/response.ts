import { Response } from 'express';
import { ErrorCode } from '../constants/seller';

export interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    timestamp: string;
    details?: any;
  };
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  meta: {
    timestamp: string;
  };
}

export const errorResponse = (
  res: Response, 
  statusCode: number, 
  code: ErrorCode, 
  message: string,
  details?: any
): Response<ErrorResponse> => {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
      ...(details && { details })
    }
  });
};

export const successResponse = <T>(
  res: Response, 
  data: T, 
  statusCode: number = 200
): Response<SuccessResponse<T>> => {
  return res.status(statusCode).json({
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString()
    }
  });
};