import { afterEach, describe, expect, it } from "vitest";
import { allowsLocalForceRun } from "@/core/cron";

const originalVercelEnv = process.env.VERCEL;

afterEach(() => {
  if (originalVercelEnv === undefined) {
    delete process.env.VERCEL;

    return;
  }

  process.env.VERCEL = originalVercelEnv;
});

describe("allowsLocalForceRun", () => {
  it("allows force runs on localhost outside Vercel", () => {
    delete process.env.VERCEL;

    const request = new Request("http://localhost:3000/api/cron/weekly?force=1");

    expect(allowsLocalForceRun(request)).toBe(true);
  });

  it("does not allow force runs on Vercel", () => {
    process.env.VERCEL = "1";

    const request = new Request("https://example.vercel.app/api/cron/weekly?force=1");

    expect(allowsLocalForceRun(request)).toBe(false);
  });

  it("does not allow non-local force runs outside Vercel", () => {
    delete process.env.VERCEL;

    const request = new Request("https://example.com/api/cron/weekly?force=1");

    expect(allowsLocalForceRun(request)).toBe(false);
  });
});
