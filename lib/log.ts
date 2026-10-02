export const log = {
  error: (scope: string, text: string, cause?: string) =>
    console.error(`[${scope}] ${text}`, cause ?? ""),
  warn: (scope: string, text: string, cause?: string) =>
    console.warn(`[${scope}] ${text}`, cause ?? ""),
};
