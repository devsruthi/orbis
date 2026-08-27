import { z } from "zod";

export function jsonOk<T>(data: T, status = 200): Response {
  return Response.json(data, { status });
}

export function jsonError(
  status: number,
  error: string,
  details?: unknown,
): Response {
  return Response.json(
    details === undefined ? { error } : { error, details },
    { status },
  );
}

export function parseParam<T>(
  value: string,
  schema: z.ZodType<T>,
  error = "Invalid request",
): { ok: true; data: T } | { ok: false; response: Response } {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      response: jsonError(400, error, z.flattenError(parsed.error)),
    };
  }
  return { ok: true, data: parsed.data };
}

export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: jsonError(400, "Invalid JSON body") };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      response: jsonError(400, "Invalid request", z.flattenError(parsed.error)),
    };
  }

  return { ok: true, data: parsed.data };
}
