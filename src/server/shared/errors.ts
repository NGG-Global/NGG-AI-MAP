export class AppError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = new.target.name;
    this.status = status;
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "forbidden") {
    super(message, 403);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "unauthorized") {
    super(message, 401);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "not_found") {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  readonly issues: string[];
  constructor(message = "invalid", issues: string[] = []) {
    super(message, 422);
    this.issues = issues;
  }
}

export class ConflictError extends AppError {
  constructor(message = "conflict") {
    super(message, 409);
  }
}
