export type ErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "INVALID_INPUT"
  | "COPY_NOT_FOUND"
  | "SHELF_NOT_FOUND"
  | "SHELF_FULL"
  | "ACCOUNT_NOT_FOUND"
  | "COPY_ON_LOAN"
  | "COPY_ON_HOLD"
  | "NOT_ON_LOAN";

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  INVALID_INPUT: 400,
  COPY_NOT_FOUND: 404,
  SHELF_NOT_FOUND: 404,
  SHELF_FULL: 409,
  ACCOUNT_NOT_FOUND: 404,
  COPY_ON_LOAN: 409,
  COPY_ON_HOLD: 409,
  NOT_ON_LOAN: 409,
};

export class ServiceError extends Error {
  readonly code: ErrorCode;
  readonly status: number;

  constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.status = STATUS_BY_CODE[code];
  }
}

export function errorResponse(err: unknown): Response {
  if (err instanceof ServiceError) {
    return Response.json(
      { ok: false, code: err.code, error: err.message },
      { status: err.status },
    );
  }
  console.error(err);
  return Response.json(
    { ok: false, code: "INTERNAL_ERROR", error: "Something went wrong." },
    { status: 500 },
  );
}
