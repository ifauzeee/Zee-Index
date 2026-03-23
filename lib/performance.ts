import { logger } from "./logger";

type AsyncFunction<TArgs extends unknown[] = unknown[], TResult = unknown> = (
  ...args: TArgs
) => Promise<TResult>;

export async function measure<T>(
  name: string,
  fn: () => Promise<T>,
  metadata: Record<string, unknown> = {},
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;

    if (duration > 100 || process.env.NODE_ENV === "development") {
      logger.info(
        {
          ...metadata,
          durationMs: parseFloat(duration.toFixed(2)),
          perfName: name,
        },
        `[Performance] ${name} took ${duration.toFixed(2)}ms`,
      );
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    logger.error(
      {
        ...metadata,
        durationMs: parseFloat(duration.toFixed(2)),
        perfName: name,
        err: error,
      },
      `[Performance] ${name} failed after ${duration.toFixed(2)}ms`,
    );
    throw error;
  }
}

export function withPerformance<TArgs extends unknown[], TResult>(
  name: string,
  fn: AsyncFunction<TArgs, TResult>,
): AsyncFunction<TArgs, TResult> {
  return async (...args: TArgs): Promise<TResult> => {
    return measure(name, () => fn(...args), { argsCount: args.length });
  };
}
