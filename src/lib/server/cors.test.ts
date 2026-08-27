import { describe, expect, it } from "vitest";
import { allowedCorsOrigins, corsHeaders, isAllowedCorsOrigin } from "./cors";

describe("CORS origins", () => {
  it("allows Tauri and local development origins, not a wildcard", () => {
    expect(isAllowedCorsOrigin("https://tauri.localhost")).toBe(true);
    expect(isAllowedCorsOrigin("http://10.0.2.2:3000")).toBe(true);
    expect(isAllowedCorsOrigin("https://evil.example")).toBe(false);
    expect(JSON.stringify(allowedCorsOrigins())).not.toContain("*");
  });

  it("adds extra origins from configuration", () => {
    expect(
      isAllowedCorsOrigin("https://orbis.example", "https://orbis.example"),
    ).toBe(true);
    expect(corsHeaders("https://orbis.example", "https://orbis.example")["Access-Control-Allow-Origin"]).toBe(
      "https://orbis.example",
    );
    expect(corsHeaders("https://evil.example")).toEqual({});
  });
});
