import pino from "pino";

const isDev = process.env.NODE_ENV === "development";

export const logger = pino({
    level: process.env.LOG_LEVEL || "info",
    transport: isDev
        ? {
            target: "pino-pretty",
            options: {
                colorize: true,
                ignore: "pid,hostname",
                translateTime: "SYS:standard",
            },
        }
        : undefined,
    base: {
        env: process.env.NODE_ENV,
    },
    formatters: {
        level: (label) => {
            return { level: label };
        },
    },
});
