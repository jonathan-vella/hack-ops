import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { z } from "zod";

type RouteContext = { params: Promise<Record<string, string>> };

type ValidatedHandler<T> = (
  request: NextRequest,
  context: RouteContext,
  body: T,
) => Promise<NextResponse>;

/**
 * Wraps a route handler with automatic Zod request body validation.
 * Returns 400 with structured errors on validation failure.
 *
 * Usage: `export const POST = withValidation(MySchema)(handler);`
 */
export function withValidation<T>(schema: z.ZodType<T>) {
  return (handler: ValidatedHandler<T>) =>
    async (
      request: NextRequest,
      context: RouteContext,
    ): Promise<NextResponse> => {
      let raw: unknown;
      try {
        raw = await request.json();
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON body", ok: false },
          { status: 400 },
        );
      }

      const result = schema.safeParse(raw);
      if (!result.success) {
        return NextResponse.json(
          {
            error: "Validation failed",
            issues: result.error.issues.map((i) => ({
              path: i.path,
              message: i.message,
            })),
            ok: false,
          },
          { status: 400 },
        );
      }

      return handler(request, context, result.data);
    };
}
