export interface Logger {
  debug: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

const PREFIX = "[agate]";

/*
 * The one place Agate touches the console. `debug` is silent unless the user turns on
 * Debug logging in settings; `warn`/`error` report render failures that also show in the
 * chart's error box. eslint.config.mjs exempts this file
 * from the no-console guideline rule for that reason.
 */
export function createLogger(isDebug: () => boolean): Logger {
  return {
    // console.debug: DevTools shows it only with the Verbose level on, so even Debug logging
    // keeps the default console quiet (plugin guidelines).
    debug: (...args) => {
      if (isDebug()) console.debug(PREFIX, ...args);
    },
    warn: (...args) => console.warn(PREFIX, ...args),
    error: (...args) => console.error(PREFIX, ...args),
  };
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
