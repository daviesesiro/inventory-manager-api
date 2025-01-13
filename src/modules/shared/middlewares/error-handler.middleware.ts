import { ValidationError } from "class-validator";
import { NextFunction, Request, Response } from "express";
import {
  ExpressErrorMiddlewareInterface,
  HttpError,
  Middleware,
} from "routing-controllers";
import { Service } from "typedi";

@Service()
@Middleware({ type: "after" })
export default class AppErrorHandler
  implements ExpressErrorMiddlewareInterface
{
  error(
    error: unknown,
    request: Request,
    response: Response,
    _: NextFunction
  ): Response<unknown, Record<string, unknown>> {
    if (error instanceof HttpError) {
      return handleHttpError(request, response, error);
    }

    request.logger?.error("Unexpected error occurred", error);
    return response.status(500).json({
      status: "failed",
      message: "Something went wrong, please try again",
      data: null,
    });
  }
}

function handleHttpError(
  request: Request,
  response: Response,
  error: HttpError
) {
  request.logger?.error("HTTP Error occurred", error);
  if (hasValidationErrors(error)) {
    return response.status(error.httpCode).json(handleValidationErrors(error));
  }

  return response.status(error.httpCode).json({
    status: "failed",
    message: error.message,
    data: null,
  });
}

function handleValidationErrors(error: HasValidationErrors) {
  const errors = formatValidationErrors(error.errors);
  const [message] = Object.values(errors);

  return {
    status: "failed",
    message: `Invalid request body sent. ${
      message ?? "please check and try again"
    }`,
    errors,
    data: null,
  };
}

function formatValidationErrors(
  errors: ValidationError[],
  parentKey = ""
): Record<string, string> {
  const formattedErrors: Record<string, string> = {};

  errors.forEach((error) => {
    const currentKey = parentKey
      ? `${parentKey}.${error.property}`
      : error.property;

    if (error.constraints) {
      // Join all validation messages for this property
      formattedErrors[currentKey] = Object.values(error.constraints).join(", ");
    }

    // Recursively process nested errors
    if (error.children && error.children.length > 0) {
      Object.assign(
        formattedErrors,
        formatValidationErrors(error.children, currentKey)
      );
    }
  });

  return formattedErrors;
}

type HasValidationErrors = { errors: ValidationError[] };
function hasValidationErrors(error: object): error is HasValidationErrors {
  return (
    "errors" in error &&
    Array.isArray(error.errors) &&
    error.errors[0] instanceof ValidationError
  );
}
