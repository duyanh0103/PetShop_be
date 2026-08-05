/**
 * Centralized custom error classes. Services throw these instead of plain
 * Error/string-matched messages; the global error middleware (see
 * middlewares/error.middleware.js) maps them to the right HTTP status.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errors = undefined) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true;
    if (errors) this.errors = errors;
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  constructor(message = "Bad request", errors) {
    super(message, 400, errors);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message, 404);
  }
}

class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, 409);
  }
}

module.exports = {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
};
