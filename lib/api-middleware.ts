import { NextResponse, type NextRequest } from "next/server";
import type { Session } from "next-auth";
import type { z } from "zod";
import { ERROR_MESSAGES } from "@/lib/constants";
import type { RateLimitType } from "@/lib/ratelimit";

type MaybePromise<T> = T | Promise<T>;

export type ApiRole = "public" | "user" | "editor" | "admin";

type ZodSchema = z.ZodTypeAny;

type InferSchema<TSchema> = TSchema extends ZodSchema
  ? z.infer<TSchema>
  : undefined;

export interface RouteHandlerContext<
  TBody = undefined,
  TQuery = undefined,
  TParams = Record<string, string>,
  TSession extends Session | null = Session | null,
> {
  request: NextRequest;
  session: TSession;
  body: TBody;
  query: TQuery;
  params: TParams;
  requestId: string;
}

export interface RouteContextInput {
  params?: unknown;
}

export class ApiRouteError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = "ApiRouteError";
    this.status = status;
    this.details = details;
  }
}

interface CreateRouteOptions<
  TBodySchema extends ZodSchema | undefined = undefined,
  TQuerySchema extends ZodSchema | undefined = undefined,
  TParamsSchema extends ZodSchema | undefined = undefined,
> {
  role?: ApiRole;
  includeSession?: boolean;
  requireEmail?: boolean;
  rateLimit?: RateLimitType | false;
  bodySchema?: TBodySchema;
  querySchema?: TQuerySchema;
  paramsSchema?: TParamsSchema;
  internalErrorMessage?: string;
}

type SessionForRole<TRole extends ApiRole> = TRole extends "public"
  ? Session | null
  : Session;

async function loadAuth() {
  const authModule = await import("@/auth");
  return authModule.auth;
}

async function loadLogger() {
  const loggerModule = await import("@/lib/logger");
  return loggerModule.logger;
}

async function loadRateLimitHelpers() {
  const ratelimitModule = await import("@/lib/ratelimit");
  return {
    checkRateLimit: ratelimitModule.checkRateLimit,
    createRateLimitResponse: ratelimitModule.createRateLimitResponse,
  };
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return !!value && typeof value === "object" && "then" in value;
}

async function resolveParams<TParams>(params: unknown): Promise<TParams> {
  if (isPromiseLike(params)) {
    return (await params) as TParams;
  }

  return (params ?? {}) as TParams;
}

function isAuthorized(role: ApiRole, session: Session | null): boolean {
  if (role === "public") return true;
  if (!session?.user) return false;

  const userRole = session.user.role;
  if (role === "user") return true;
  if (role === "editor") {
    return userRole === "ADMIN" || userRole === "EDITOR";
  }

  return userRole === "ADMIN";
}

function parseWithSchema<TSchema extends ZodSchema | undefined>(
  schema: TSchema,
  value: unknown,
  defaultMessage: string,
): InferSchema<TSchema> {
  if (!schema) {
    return undefined as InferSchema<TSchema>;
  }

  const validation = schema.safeParse(value);
  if (!validation.success) {
    throw new ApiRouteError(400, defaultMessage, validation.error.issues);
  }

  return validation.data as InferSchema<TSchema>;
}

async function parseJsonBody(request: NextRequest): Promise<unknown> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return undefined;
  }

  return await request.json();
}

function withRequestId(response: Response, requestId: string): Response {
  response.headers.set("X-Request-Id", requestId);
  return response;
}

async function handleRouteError(
  request: NextRequest,
  requestId: string,
  error: unknown,
  internalErrorMessage?: string,
) {
  if (error instanceof ApiRouteError) {
    return withRequestId(
      NextResponse.json(
        {
          error: error.message,
          details: error.details,
        },
        { status: error.status },
      ),
      requestId,
    );
  }

  const logger = await loadLogger();
  logger.error(
    {
      err: error,
      requestId,
      url: request.url,
      method: request.method,
    },
    "[API] Route handler failed",
  );

  return withRequestId(
    NextResponse.json(
      {
        error: internalErrorMessage || "Terjadi kesalahan server internal.",
      },
      { status: 500 },
    ),
    requestId,
  );
}

export function createRouteHandler<
  const TRole extends ApiRole = "public",
  TBodySchema extends ZodSchema | undefined = undefined,
  TQuerySchema extends ZodSchema | undefined = undefined,
  TParamsSchema extends ZodSchema | undefined = undefined,
>(
  options: CreateRouteOptions<TBodySchema, TQuerySchema, TParamsSchema>,
  handler: (
    context: RouteHandlerContext<
      InferSchema<TBodySchema>,
      InferSchema<TQuerySchema>,
      InferSchema<TParamsSchema> extends undefined
        ? Record<string, string>
        : InferSchema<TParamsSchema>,
      SessionForRole<TRole>
    >,
  ) => MaybePromise<Response>,
) {
  const role = (options.role ?? "public") as TRole;

  return async (request: NextRequest, context: RouteContextInput = {}) => {
    const requestId = crypto.randomUUID();

    try {
      const session =
        role !== "public" || options.includeSession
          ? await (
              await loadAuth()
            )()
          : null;

      if (role !== "public" && !session?.user) {
        return withRequestId(
          NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
          requestId,
        );
      }

      if (!isAuthorized(role, session)) {
        return withRequestId(
          NextResponse.json({ error: "Access denied." }, { status: 403 }),
          requestId,
        );
      }

      if (options.requireEmail && !session?.user?.email) {
        return withRequestId(
          NextResponse.json(
            { error: "User email is required." },
            { status: 400 },
          ),
          requestId,
        );
      }

      const rateLimitType = options.rateLimit ?? false;

      if (rateLimitType) {
        const { checkRateLimit, createRateLimitResponse } =
          await loadRateLimitHelpers();
        const ratelimitResult = await checkRateLimit(request, rateLimitType);
        if (!ratelimitResult.success) {
          return withRequestId(
            NextResponse.json(
              { error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED },
              {
                status: 429,
                headers: createRateLimitResponse(ratelimitResult).headers,
              },
            ),
            requestId,
          );
        }
      }

      const [params, rawBody] = await Promise.all([
        resolveParams<Record<string, string>>(context.params),
        options.bodySchema
          ? parseJsonBody(request)
          : Promise.resolve(undefined),
      ]);

      const parsedContext = {
        request,
        session: session as SessionForRole<TRole>,
        body: parseWithSchema(
          options.bodySchema,
          rawBody,
          "Input tidak valid.",
        ),
        query: parseWithSchema(
          options.querySchema,
          Object.fromEntries(request.nextUrl.searchParams),
          "Parameter query tidak valid.",
        ),
        params:
          parseWithSchema(
            options.paramsSchema,
            params,
            "Parameter route tidak valid.",
          ) ?? params,
        requestId,
      } as RouteHandlerContext<
        InferSchema<TBodySchema>,
        InferSchema<TQuerySchema>,
        InferSchema<TParamsSchema> extends undefined
          ? Record<string, string>
          : InferSchema<TParamsSchema>,
        SessionForRole<TRole>
      >;

      const response = await handler(parsedContext);
      return withRequestId(response, requestId);
    } catch (error) {
      return await handleRouteError(
        request,
        requestId,
        error,
        options.internalErrorMessage,
      );
    }
  };
}

export function createPublicRoute<
  TBodySchema extends ZodSchema | undefined = undefined,
  TQuerySchema extends ZodSchema | undefined = undefined,
  TParamsSchema extends ZodSchema | undefined = undefined,
>(
  handler: Parameters<
    typeof createRouteHandler<
      "public",
      TBodySchema,
      TQuerySchema,
      TParamsSchema
    >
  >[1],
  options: Omit<
    CreateRouteOptions<TBodySchema, TQuerySchema, TParamsSchema>,
    "role"
  > = {},
) {
  return createRouteHandler<"public", TBodySchema, TQuerySchema, TParamsSchema>(
    {
      ...options,
      role: "public",
    },
    handler,
  );
}

export function createUserRoute<
  TBodySchema extends ZodSchema | undefined = undefined,
  TQuerySchema extends ZodSchema | undefined = undefined,
  TParamsSchema extends ZodSchema | undefined = undefined,
>(
  handler: Parameters<
    typeof createRouteHandler<"user", TBodySchema, TQuerySchema, TParamsSchema>
  >[1],
  options: Omit<
    CreateRouteOptions<TBodySchema, TQuerySchema, TParamsSchema>,
    "role"
  > = {},
) {
  return createRouteHandler<"user", TBodySchema, TQuerySchema, TParamsSchema>(
    {
      ...options,
      role: "user",
    },
    handler,
  );
}

export function createEditorRoute<
  TBodySchema extends ZodSchema | undefined = undefined,
  TQuerySchema extends ZodSchema | undefined = undefined,
  TParamsSchema extends ZodSchema | undefined = undefined,
>(
  handler: Parameters<
    typeof createRouteHandler<
      "editor",
      TBodySchema,
      TQuerySchema,
      TParamsSchema
    >
  >[1],
  options: Omit<
    CreateRouteOptions<TBodySchema, TQuerySchema, TParamsSchema>,
    "role"
  > = {},
) {
  return createRouteHandler<"editor", TBodySchema, TQuerySchema, TParamsSchema>(
    {
      ...options,
      role: "editor",
    },
    handler,
  );
}

export function createAdminRoute<
  TBodySchema extends ZodSchema | undefined = undefined,
  TQuerySchema extends ZodSchema | undefined = undefined,
  TParamsSchema extends ZodSchema | undefined = undefined,
>(
  handler: Parameters<
    typeof createRouteHandler<"admin", TBodySchema, TQuerySchema, TParamsSchema>
  >[1],
  options: Omit<
    CreateRouteOptions<TBodySchema, TQuerySchema, TParamsSchema>,
    "role"
  > = {},
) {
  return createRouteHandler<"admin", TBodySchema, TQuerySchema, TParamsSchema>(
    {
      ...options,
      role: "admin",
    },
    handler,
  );
}

export function createCronRoute<
  TQuerySchema extends ZodSchema | undefined = undefined,
>(
  handler: (
    context: RouteHandlerContext<
      undefined,
      InferSchema<TQuerySchema>,
      Record<string, string>,
      null
    >,
  ) => MaybePromise<Response>,
  options: Omit<
    CreateRouteOptions<undefined, TQuerySchema, undefined>,
    "role" | "includeSession" | "rateLimit"
  > = {},
) {
  return createPublicRoute<undefined, TQuerySchema>(
    async (context) => {
      const authHeader = context.request.headers.get("authorization");
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        throw new ApiRouteError(401, "Unauthorized");
      }

      return await handler({
        ...context,
        session: null,
      });
    },
    {
      ...options,
      includeSession: false,
      rateLimit: false,
    },
  );
}

type LegacyAdminHandler = (
  req: NextRequest,
  context: { params?: unknown },
  session: Session,
) => Promise<Response>;

export function withAdminSession(handler: LegacyAdminHandler) {
  return createAdminRoute(async ({ request, params, session }) => {
    return await handler(request, { params }, session);
  });
}

export function withEditorSession(handler: LegacyAdminHandler) {
  return createEditorRoute(async ({ request, params, session }) => {
    return await handler(request, { params }, session);
  });
}
