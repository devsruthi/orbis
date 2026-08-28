import { describe, expect, it } from "vitest";
import { handleRouteError } from "./handleRouteError";

describe("handleRouteError", () => {
  it("maps read-only filesystem errors to a production database hint", async () => {
    const error = Object.assign(new Error("read-only file system"), {
      code: "EROFS",
    });
    const response = handleRouteError(error);
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringMatching(/DATABASE_URL/),
    });
  });
});
