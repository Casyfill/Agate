/**
 * Runtime stand-in for the `obsidian` package, which ships type declarations only.
 * Implements just enough of the surface that `src/core` touches, plus the Bases `Value`
 * classes with the public API (toString, isTruthy, ListValue.get/length, ObjectValue.get).
 *
 * The real runtime keeps raw values on private fields with minified names; the mock keeps
 * them on `value` so tests can also exercise Agate's "peek" path. Tests that want the
 * toString-only path construct a value and delete `value` (see helpers in test/helpers.ts).
 */
import YAML from "yaml";

// --- YAML / paths ------------------------------------------------------------

export function parseYaml(text: string): unknown {
  return YAML.parse(text);
}

export function stringifyYaml(obj: unknown): string {
  return YAML.stringify(obj, { lineWidth: 0 });
}

export function normalizePath(path: string): string {
  return path
    .replace(/\\/g, "/")
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "");
}

// --- files -------------------------------------------------------------------

export class TAbstractFile {
  path = "";
  name = "";
  parent: TFolder | null = null;
}

export class TFolder extends TAbstractFile {
  children: TAbstractFile[] = [];
}

export class TFile extends TAbstractFile {
  basename = "";
  extension = "";
  stat = { ctime: 0, mtime: 0, size: 0 };
  constructor(path: string, content = "") {
    super();
    this.path = path;
    this.name = path.split("/").pop() ?? path;
    const dot = this.name.lastIndexOf(".");
    this.basename = dot > 0 ? this.name.slice(0, dot) : this.name;
    this.extension = dot > 0 ? this.name.slice(dot + 1) : "";
    const folder = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
    this.parent = Object.assign(new TFolder(), { path: folder, name: folder.split("/").pop() ?? "" });
    this.stat = { ctime: 1_700_000_000_000, mtime: 1_700_000_100_000, size: content.length };
  }
}

/** Minimal in-memory vault: `new FakeApp({ "a/b.md": "content" })`. */
export class FakeApp {
  files = new Map<string, TFile>();
  contents = new Map<string, string>();
  vault = {
    getFileByPath: (p: string): TFile | null => this.files.get(normalizePath(p)) ?? null,
    read: async (f: TFile): Promise<string> => this.contents.get(f.path) ?? "",
    cachedRead: async (f: TFile): Promise<string> => this.contents.get(f.path) ?? "",
  };
  metadataCache = {
    // Link resolution: exact path, then path without extension, then basename match.
    getFirstLinkpathDest: (linkpath: string, _sourcePath: string): TFile | null => {
      const clean = normalizePath(linkpath);
      const exact = this.files.get(clean);
      if (exact) return exact;
      for (const [p, f] of this.files) {
        if (p.replace(/\.[^.]+$/, "") === clean) return f;
      }
      for (const [, f] of this.files) {
        if (f.basename === clean || f.name === clean) return f;
      }
      return null;
    },
  };
  constructor(files: Record<string, string> = {}) {
    for (const [p, c] of Object.entries(files)) {
      const path = normalizePath(p);
      this.files.set(path, new TFile(path, c));
      this.contents.set(path, c);
    }
  }
}

export type App = FakeApp;

// --- network -----------------------------------------------------------------

export const requestUrlCalls: string[] = [];
/** Queue of failures for the next calls: an Error (network) or a number (HTTP status). */
export const requestUrlFailures: Array<Error | number> = [];
export async function requestUrl(req: { url: string; headers?: Record<string, string> }): Promise<{ text: string; json: unknown }> {
  requestUrlCalls.push(req.url);
  const fail = requestUrlFailures.shift();
  if (typeof fail === "number") throw Object.assign(new Error(`Request failed, status ${fail}`), { status: fail });
  if (fail) throw fail;
  return { text: `remote:${req.url}`, json: null };
}

// --- components --------------------------------------------------------------

export class Component {
  private unloaders: Array<() => void> = [];
  load(): void {
    this.onload();
  }
  unload(): void {
    this.onunload();
    for (const cb of this.unloaders.splice(0)) cb();
  }
  onload(): void {}
  onunload(): void {}
  register(cb: () => void): void {
    this.unloaders.push(cb);
  }
  registerEvent(_ref: unknown): void {}
  registerDomEvent(): void {}
  addChild<T>(c: T): T {
    return c;
  }
}

export class MarkdownRenderChild extends Component {
  constructor(public containerEl: HTMLElement) {
    super();
  }
}

export class Notice {
  static messages: string[] = [];
  constructor(message: string) {
    Notice.messages.push(message);
  }
}

export class Plugin extends Component {}
export class PluginSettingTab {}
export class Setting {}
export const MarkdownRenderer = { render: async (): Promise<void> => {} };

// --- Bases -------------------------------------------------------------------

export type BasesPropertyType = "note" | "formula" | "file";
export type BasesPropertyId = `${BasesPropertyType}.${string}`;

export function parsePropertyId(id: BasesPropertyId): { type: BasesPropertyType; name: string } {
  const i = id.indexOf(".");
  if (i <= 0) throw new Error(`Invalid property id: ${id}`);
  return { type: id.slice(0, i) as BasesPropertyType, name: id.slice(i + 1) };
}

export abstract class Value {
  static type = "value";
  abstract toString(): string;
  abstract isTruthy(): boolean;
}

export abstract class NotNullValue extends Value {}

export class NullValue extends Value {
  static value = new NullValue();
  toString(): string {
    return "";
  }
  isTruthy(): boolean {
    return false;
  }
}

export abstract class PrimitiveValue<T> extends NotNullValue {
  constructor(public value: T) {
    super();
  }
  toString(): string {
    return String(this.value);
  }
  isTruthy(): boolean {
    return Boolean(this.value);
  }
}

export class StringValue extends PrimitiveValue<string> {
  static type = "string";
}
export class NumberValue extends PrimitiveValue<number> {
  static type = "number";
}
export class BooleanValue extends PrimitiveValue<boolean> {
  static type = "boolean";
}

export class DateValue extends NotNullValue {
  constructor(
    public date: Date,
    public hasTime = false,
  ) {
    super();
  }
  /** Mirrors Bases: "YYYY-MM-DD" or "YYYY-MM-DD HH:mm:ss". */
  toString(): string {
    const iso = this.date.toISOString();
    return this.hasTime ? iso.slice(0, 19).replace("T", " ") : iso.slice(0, 10);
  }
  isTruthy(): boolean {
    return true;
  }
  dateOnly(): DateValue {
    return new DateValue(this.date, false);
  }
  relative(): string {
    return "some time ago";
  }
  static parseFromString(input: string): DateValue | null {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : new DateValue(d, input.includes("T") || input.includes(" "));
  }
}

export class DurationValue extends NotNullValue {
  constructor(private ms: number) {
    super();
  }
  toString(): string {
    return `${this.ms} ms`;
  }
  isTruthy(): boolean {
    return this.ms !== 0;
  }
  getMilliseconds(): number {
    return this.ms;
  }
}

export class ListValue extends NotNullValue {
  static type = "list";
  constructor(private items: Value[]) {
    super();
  }
  toString(): string {
    return this.items.map((v) => v.toString()).join(", ");
  }
  isTruthy(): boolean {
    return this.items.length > 0;
  }
  length(): number {
    return this.items.length;
  }
  get(i: number): Value {
    return this.items[i];
  }
  includes(v: Value): boolean {
    const needle = String(v.toString());
    return this.items.some((x) => String(x.toString()) === needle);
  }
}

export class LinkValue extends StringValue {
  constructor(
    public path: string,
    public display?: string,
  ) {
    super(display ? `[[${path}|${display}]]` : `[[${path}]]`);
  }
}

export class FileValue extends NotNullValue {
  constructor(public path: string) {
    super();
  }
  toString(): string {
    return this.path;
  }
  isTruthy(): boolean {
    return true;
  }
}

export class ObjectValue extends NotNullValue {
  static type = "object";
  constructor(public value: Record<string, unknown>) {
    super();
  }
  toString(): string {
    return JSON.stringify(this.value);
  }
  isTruthy(): boolean {
    return Object.keys(this.value).length > 0;
  }
  isEmpty(): boolean {
    return Object.keys(this.value).length === 0;
  }
  get(key: string): Value | null {
    const v = this.value[key];
    return v === undefined ? null : new StringValue(String(v));
  }
}

/** A Value class outside Agate's known set, standing in for ErrorValue and future additions. */
export class UnknownValue extends NotNullValue {
  constructor(private text: string) {
    super();
  }
  toString(): string {
    return this.text;
  }
  isTruthy(): boolean {
    return true;
  }
}

export class BasesEntryGroup {
  constructor(
    public entries: BasesEntry[],
    public key?: Value,
  ) {}
  hasKey(): boolean {
    return this.key !== undefined && !(this.key instanceof NullValue);
  }
}

export class BasesEntry {
  constructor(
    public file: TFile,
    private values: Partial<Record<BasesPropertyId, Value | null>>,
  ) {}
  getValue(id: BasesPropertyId): Value | null {
    if (id in this.values) return this.values[id] ?? null;
    return null;
  }
}

export abstract class BasesView extends Component {}
export class QueryController extends Component {}
