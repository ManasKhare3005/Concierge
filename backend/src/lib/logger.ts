export interface LogContext {
  [key: string]: unknown;
}

function formatContext(context?: LogContext): string {
  if (!context || Object.keys(context).length === 0) {
    return "";
  }

  try {
    return ` ${JSON.stringify(context)}`;
  } catch {
    return " [unserializable-context]";
  }
}

function write(level: "INFO" | "WARN" | "ERROR", message: string, context?: LogContext): void {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] [${level}] ${message}${formatContext(context)}`;
  if (level === "ERROR") {
    console.error(line);
    return;
  }

  if (level === "WARN") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export const logger = {
  info: (message: string, context?: LogContext) => write("INFO", message, context),
  warn: (message: string, context?: LogContext) => write("WARN", message, context),
  error: (message: string, context?: LogContext) => write("ERROR", message, context)
};
