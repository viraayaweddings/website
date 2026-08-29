/**
 * Structured production logging for errors and operational events.
 *
 * Vercel log drains can parse the JSON lines. No secrets, tokens, or PII are
 * included — only safe diagnostic metadata.
 */
type LogLevel = "error" | "warn" | "info";

type LogPayload = {
  level: LogLevel;
  at: string;
  area: string;
  message: string;
  digest?: string;
  status?: number;
};

function write(payload: LogPayload): void {
  const line = JSON.stringify(payload);
  if (payload.level === "error") console.error(line);
  else if (payload.level === "warn") console.warn(line);
  else console.log(line);
}

export function logProductionError(
  area: string,
  error: unknown,
  extra: { digest?: string; status?: number } = {},
): void {
  const message =
    error instanceof Error
      ? error.name
      : typeof error === "string"
        ? error.slice(0, 200)
        : "unknown";

  write({
    level: "error",
    at: new Date().toISOString(),
    area,
    message,
    ...extra,
  });
}

export function logProductionWarn(area: string, message: string): void {
  write({ level: "warn", at: new Date().toISOString(), area, message });
}

export function logProductionInfo(area: string, message: string): void {
  write({ level: "info", at: new Date().toISOString(), area, message });
}
