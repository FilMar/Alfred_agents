import { assert } from "./contract.js";

export type HttpClientConfig = Readonly<{
  baseUrl: string | (() => string);
  timeout?: number;
}>;

export const HTTP_METHODS: readonly string[] = ["GET", "POST", "PUT", "PATCH", "DELETE"];
export const DEFAULT_TIMEOUT_MS = 10_000;
export const ERROR_TEXT_MAX_LEN = 200;

export class HttpError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export class HttpClient {
  readonly #config: HttpClientConfig;

  constructor(config: HttpClientConfig) {
    this.#config = config;
  }

  async fetch(method: string, path: string, body?: unknown): Promise<Response> {
    assert(HTTP_METHODS.includes(method), "HttpClient.fetch: method is GET, POST, PUT, PATCH or DELETE");
    assert(path.startsWith("/"), "HttpClient.fetch: path starts with /");
    const base = typeof this.#config.baseUrl === "string" ? this.#config.baseUrl : this.#config.baseUrl();
    return globalThis.fetch(`${base}${path}`, {
      method,
      signal: AbortSignal.timeout(this.#config.timeout ?? DEFAULT_TIMEOUT_MS),
      headers: body ? { "Content-Type": "application/json" } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await this.fetch(method, path, body);
    if (!res.ok) {
      const text = await res.text();
      throw new HttpError(`${res.status} ${text.slice(0, ERROR_TEXT_MAX_LEN)}`, res.status);
    }
    return res.json() as Promise<T>;
  }
}
