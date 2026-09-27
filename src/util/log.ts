export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

const PREFIX = "[agate]";

/*
 * The one place Agate touches the console. `debug` is silent unless the user turns on
 * Debug logging in settings; `warn`/`error` report render failures that also show in the
 * chart's error box; `info` is a single line at load. eslint.config.mjs exempts this file
 * from the no-console guideline rule for that reason.
 */
export function createLogger(isDebug: () => boolean): Logger {
  return {
    // console.log, not console.debug: DevTools hides "Verbose" by default and the dump would go unseen.
    debug: (...args) => {
      if (isDebug()) console.log(PREFIX, ...args);
    },
    info: (...args) => console.info(PREFIX, ...args),
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
