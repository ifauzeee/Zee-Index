import { logger } from "./logger";


export async function measure<T>(
    name: string,
    fn: () => Promise<T>,
    metadata: Record<string, unknown> = {}
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
                    perfName: name
                },
                `[Performance] ${name} took ${duration.toFixed(2)}ms`
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
                err: error
            },
            `[Performance] ${name} failed after ${duration.toFixed(2)}ms`
        );
        throw error;
    }
}


export function withPerformance<T extends (...args: any[]) => Promise<any>>(
    name: string,
    fn: T
): T {
    return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
        return measure(name, () => fn(...args), { argsCount: args.length });
    }) as T;
}
