const DEFAULT_ORIGINS = [
  "tauri://localhost",
  "https://tauri.localhost",
  "http://tauri.localhost",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://10.0.2.2:3000",
];

export function allowedCorsOrigins(
  extra: string = process.env.ORBIS_CORS_ORIGINS ?? "",
): string[] {
  const fromEnv = extra
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  return [...DEFAULT_ORIGINS, ...fromEnv];
}

export function isAllowedCorsOrigin(
  origin: string | null,
  extra?: string,
): origin is string {
  if (!origin) {
    return false;
  }
  return allowedCorsOrigins(extra).includes(origin);
}

export function corsHeaders(
  origin: string | null,
  extra?: string,
): Record<string, string> {
  if (!isAllowedCorsOrigin(origin, extra)) {
    return {};
  }
  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "600",
  };
}

export function corsPreflightResponse(origin: string | null): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}
