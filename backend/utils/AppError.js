export class AppError extends Error {
  constructor(status = 500, code = "ERROR", message = "Unexpected error", details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function toErrorPayload(error, fallbackMessage = "Unexpected error") {
  if (error instanceof AppError) {
    return {
      statusCode: error.status,
      payload: {
        status: error.code,
        message: error.message,
        ...(error.details ? { errors: error.details } : {})
      }
    };
  }

  console.error(error);
  return {
    statusCode: 500,
    payload: {
      status: "ERROR",
      message: fallbackMessage
    }
  };
}
