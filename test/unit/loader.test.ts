import { beforeEach, describe, expect, it } from "vitest";
import { FakeApp, requestUrlCalls } from "obsidian";
import { createVaultLoader } from "../../src/core/loader";
import type { DataSchemeProvider } from "../../src/core/types";

const app = new FakeApp({
  "data/sales.csv": "a,b\n1,2\n",
  "Notes/local.json": "[1]",
});

function make(allowRemote = false, schemes = new Map<string, DataSchemeProvider>()) {
  return createVaultLoader({ app, sourcePath: "Notes/x.md", allowRemote, schemes });
}

describe("vault loader (D5)", () => {
  beforeEach(() => {
    requestUrlCalls.length = 0;
  });

  it("reads vault files by path and relative to the note", async () => {
    const loader = make();
    await expect(loader.load("data/sales.csv")).resolves.toBe("a,b\n1,2\n");
    await expect(loader.load("local.json")).resolves.toBe("[1]");
    await expect(loader.load("nope.csv")).rejects.toThrow(/not found in vault/);
  });

  it("blocks remote URLs unless allowed, then goes through requestUrl", async () => {
    await expect(make(false).load("https://example.com/x.json")).rejects.toThrow(/Remote URL blocked/);
    expect(requestUrlCalls).toEqual([]);
    await expect(make(true).load("https://example.com/x.json")).resolves.toBe("remote:https://example.com/x.json");
    expect(requestUrlCalls).toEqual(["https://example.com/x.json"]);
  });

  it("dispatches registered schemes and stringifies row results", async () => {
    const schemes = new Map<string, DataSchemeProvider>();
    const seen: string[] = [];
    schemes.set("demo", async (uri, ctx) => {
      seen.push(`${uri}@${ctx.sourcePath}`);
      return [{ a: 1 }];
    });
    schemes.set("txt", async () => "x,y\n");
    const loader = make(false, schemes);
    await expect(loader.load("demo://anything")).resolves.toBe('[{"a":1}]');
    await expect(loader.load("txt://t")).resolves.toBe("x,y\n");
    expect(seen).toEqual(["demo://anything@Notes/x.md"]);
  });

  it("rejects unknown schemes", async () => {
    await expect(make().load("ftp://host/file")).rejects.toThrow(/Unknown URL scheme "ftp:\/\/"/);
  });
});
