// Common Utility Functions

import { ApiResponse, PaginatedResponse, PaginationQuery } from '../interfaces';

/**
 * Create a standardized API response
 */
export function createApiResponse<T>(
  success: boolean,
  message: string,
  data?: T,
  error?: string,
): ApiResponse<T> {
  return {
    success,
    message,
    data,
    error,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a success response
 */
export function createSuccessResponse<T>(message: string, data?: T): ApiResponse<T> {
  return createApiResponse(true, message, data);
}

/**
 * Create an error response
 */
export function createErrorResponse(message: string, error?: string): ApiResponse {
  return createApiResponse(false, message, undefined, error);
}

/**
 * Create pagination metadata
 */
export function createPagination(
  page: number,
  limit: number,
  total: number,
): PaginatedResponse<any>['pagination'] {
  const totalPages = Math.ceil(total / limit);
  
  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrevious: page > 1,
  };
}

/**
 * Validate and normalize pagination query
 */
export function normalizePaginationQuery(query: PaginationQuery): Required<PaginationQuery> {
  return {
    page: Math.max(1, query.page || 1),
    limit: Math.min(100, Math.max(1, query.limit || 10)),
    sortBy: query.sortBy || 'createdAt',
    sortOrder: query.sortOrder === 'asc' ? 'asc' : 'desc',
  };
}

/**
 * Generate a random string
 */
export function generateRandomString(length: number = 32): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Format date to ISO string
 */
export function formatDate(date: Date): string {
  return date.toISOString();
}

/**
 * Check if a string is a valid email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}