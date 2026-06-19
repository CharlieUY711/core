// packages/core-mlmp/src/MLModuleError.ts

export type MLModuleErrorCode =
  | "NO_CREDENTIAL"
  | "REFRESH_FAILED"
  | "MISSING_CLIENT_SECRET"
  | "VAULT_ERROR"
  | "INVALID_CONFIG";

export class MLModuleError extends Error {
  readonly code: MLModuleErrorCode;

  constructor(code: MLModuleErrorCode, message: string) {
    super(message);
    this.name = "MLModuleError";
    this.code = code;
  }
}
