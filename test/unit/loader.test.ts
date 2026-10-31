import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeApp, requestUrlCalls, requestUrlFailures } from "obsidian";
import { createVaultLoader, fetchRemote, fillSecrets, parseSecretHosts } from "../../src/core/loader";
import type { DataSchemeProvider } from "../../src/core/types";

const app = new FakeApp({
  "data/sales.csv": "a,b\n1,2\n",
  "Notes/local.json": "[1]",
});

const secrets: Record<string, string> = { maptiler: "s3cr/t" };
const getSecret = (id: string): string | null => secrets[id] ?? null;

function make(allowRemote = false, schemes = new Map<string, DataSchemeProvider>(), secretHosts = new Map<string, string>()) {
  return createVaultLoader({ app, sourcePath: "Notes/x.md", allowRemote, secretHosts, getSecret, schemes });
}

describe("vault loader (D5)", () => {
  beforeEach(() => {
    requestUrlCalls.length = 0;
    requestUrlFailures.length = 0;
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

  it("retries network errors and 5xx, not 4xx, and names the URL when it gives up", async () => {
    // The loader uses window.setTimeout (popout-safe in Obsidian); Node has no window.
    vi.stubGlobal("window", globalThis);
    vi.useFakeTimers();
    try {
      requestUrlFailures.push(new Error("net::ERR_HTTP2_PROTOCOL_ERROR"), 503);
      const ok = fetchRemote("https://a.test/x.csv");
      await vi.runAllTimersAsync();
      await expect(ok).resolves.toBe("remote:https://a.test/x.csv");
      expect(requestUrlCalls).toHaveLength(3);

      requestUrlCalls.length = 0;
      requestUrlFailures.push(404);
      await expect(fetchRemote("https://a.test/missing.csv")).rejects.toThrow("HTTP 404 (https://a.test/missing.csv)");
      expect(requestUrlCalls).toHaveLength(1);

      requestUrlFailures.push(new Error("reset"), new Error("reset"), new Error("reset"));
      const bad = fetchRemote("https://a.test/y.csv");
      const settled = expect(bad).rejects.toThrow("reset (https://a.test/y.csv)");
      await vi.runAllTimersAsync();
      await settled;
    } finally {
      vi.useRealTimers();
      vi.unstubAllGlobals();
    }
  });

  it("keeps at most two requests in flight per host", async () => {
    const urls = Array.from({ length: 6 }, (_, i) => `https://b.test/${i}.csv`);
    const results = await Promise.all(urls.map((u) => fetchRemote(u)));
    expect(results).toHaveLength(6);
    expect(requestUrlCalls).toEqual(urls);
  });

  it("holds image URLs (map tiles) to the remote setting too", async () => {
    await expect(make(false).sanitize("https://tiles.test/1/2/3.png", { context: "image" } as never)).rejects.toThrow(/Remote URL blocked/);
    await expect(make(true).sanitize("https://tiles.test/1/2/3.png", { context: "image" } as never)).resolves.toMatchObject({ href: "https://tiles.test/1/2/3.png" });
  });

  it("fills {secret:name} only for the host it is allowed for, and keeps the key out of errors", async () => {
    const hosts = parseSecretHosts("maptiler api.maptiler.com  # basemap\n\n# comment only\n");
    expect([...hosts]).toEqual([["maptiler", "api.maptiler.com"]]);
    expect(fillSecrets("https://api.maptiler.com/t/1/2/3.png?key={secret:maptiler}", hosts, getSecret)).toBe(
      "https://api.maptiler.com/t/1/2/3.png?key=s3cr%2Ft",
    );
    expect(fillSecrets("https://plain.test/x.csv", hosts, getSecret)).toBe("https://plain.test/x.csv");
    expect(() => fillSecrets("https://evil.test/?k={secret:maptiler}", hosts, getSecret)).toThrow(/allowed for api.maptiler.com only/);
    expect(() => fillSecrets("https://api.maptiler.com@evil.test/?k={secret:maptiler}", hosts, getSecret)).toThrow(/not evil.test/);
    expect(() => fillSecrets("https://api.maptiler.com/?k={secret:openai}", hosts, getSecret)).toThrow(/not allowed/);
    expect(() => fillSecrets("https://api.maptiler.com/?k={secret:maptiler}", hosts, () => null)).toThrow(/No secret named "maptiler"/);
    // The old {env:…} syntax is left alone (and so never filled).
    expect(fillSecrets("https://api.maptiler.com/?k={env:MAPTILER_KEY}", hosts, getSecret)).toBe("https://api.maptiler.com/?k={env:MAPTILER_KEY}");

    requestUrlFailures.push(401);
    const loader = make(true, undefined, hosts);
    const err = await loader.load("https://api.maptiler.com/d.json?key={secret:maptiler}").catch((e: Error) => e.message);
    expect(err).toContain("{secret:maptiler}");
    expect(err).not.toContain("s3cr");
    expect(requestUrlCalls.at(-1)).toBe("https://api.maptiler.com/d.json?key=s3cr%2Ft");

    // Image marks get a blob: URL, so the key never reaches the DOM.
    const out = await loader.sanitize("https://api.maptiler.com/t.png?key={secret:maptiler}", { context: "href" });
    expect(out.href).toMatch(/^blob:/);
    await expect(make(false, undefined, hosts).sanitize("https://api.maptiler.com/t.png?key={secret:maptiler}", { context: "href" })).rejects.toThrow(
      /Remote URL blocked/,
    );
  });
});
