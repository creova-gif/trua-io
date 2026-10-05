import type { Request, Response, NextFunction } from "express";

type Bucket = { count: number; resetAt: number };

export type OrgRateLimitOptions = {
  /** Distinguishes buckets if more than one limiter is created. */
  name: string;
  windowMs: number;
  max: number;
};

export type OrgRateLimiter = ((
  req: Request,
  res: Response,
  next: NextFunction,
) => void) & {
  reset: () => void;
};

/**
 * Fixed-window limiter keyed by the org already resolved on the request.
 * In-process only: each server keeps its own counters.
 */
export function createOrgRateLimit(
  options: OrgRateLimitOptions,
): OrgRateLimiter {
  const buckets = new Map<string, Bucket>();

  const middleware = (
    req: Request,
    res: Response,
    next: NextFunction,
  ): void => {
    const orgId = (req as any).orgId as unknown;
    if (typeof orgId !== "number" || !Number.isInteger(orgId)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const now = Date.now();
    if (buckets.size > 1000) {
      for (const [key, existing] of buckets) {
        if (now >= existing.resetAt) buckets.delete(key);
      }
    }

    const key = `${options.name}:${orgId}`;
    let bucket = buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + options.windowMs };
      buckets.set(key, bucket);
    }

    if (bucket.count >= options.max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({ error: "Too many requests" });
      return;
    }

    bucket.count += 1;
    next();
  };

  return Object.assign(middleware, {
    reset() {
      buckets.clear();
    },
  });
}

/** Shared budget for routes that call the model. */
export const AI_ORG_RATE_LIMIT = {
  name: "ai",
  windowMs: 60_000,
  max: 30,
} as const;

export const aiOrgRateLimit = createOrgRateLimit(AI_ORG_RATE_LIMIT);
