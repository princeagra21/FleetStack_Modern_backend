import { applyDecorators, Type } from '@nestjs/common';
import { ApiResponse, getSchemaPath } from '@nestjs/swagger';

export const ApiSuccessResponse = <TModel extends Type<any>>(
  model: TModel,
  description?: string,
) => {
  return applyDecorators(
    ApiResponse({
      status: 200,
      description: description || 'Operation successful',
      schema: {
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'Operation completed successfully' },
          data: { $ref: getSchemaPath(model) },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
    }),
  );
};

export const ApiErrorResponse = (description?: string) => {
  return applyDecorators(
    ApiResponse({
      status: 400,
      description: description || 'Bad Request',
      schema: {
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string', example: 'Bad Request' },
          error: { type: 'string', example: 'Validation failed' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
    }),
  );
};