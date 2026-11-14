import { describe, expect, it } from "vitest";
import { z } from "zod";

describe("schema validation tooling", () => {
  it("accepts valid data and rejects invalid data", () => {
    const schema = z.object({ message: z.string().min(1) });
    expect(schema.safeParse({ message: "hello" }).success).toBe(true);
    expect(schema.safeParse({ message: "" }).success).toBe(false);
  });
});
