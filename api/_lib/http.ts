import type { VercelRequest, VercelResponse } from "@vercel/node";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
type Handler = (req: VercelRequest, res: VercelResponse) => Promise<void> | void;

/** Wraps per-method handlers with error handling and 405s. */
export function route(handlers: Partial<Record<Method, Handler>>) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const fn = handlers[(req.method || "GET") as Method];
    if (!fn) {
      res.setHeader("Allow", Object.keys(handlers).join(", "));
      res.status(405).json({ error: "Method not allowed" });
      return;
    }
    try {
      await fn(req, res);
    } catch (err: any) {
      if (err instanceof ApiError) {
        res.status(err.status).json({ error: err.message });
      } else {
        console.error("Unhandled API error:", err);
        const msg =
          typeof err?.message === "string" && /POSTGRES_URL|connection/i.test(err.message)
            ? "Database not configured. Create a Postgres store in the Vercel dashboard and redeploy."
            : "Internal server error";
        res.status(500).json({ error: msg });
      }
    }
  };
}

export function body<T = any>(req: VercelRequest): T {
  if (!req.body || typeof req.body !== "object") {
    throw new ApiError(400, "Expected a JSON body");
  }
  return req.body as T;
}
