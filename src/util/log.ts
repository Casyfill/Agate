export interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

const PREFIX = "[agate]";

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
