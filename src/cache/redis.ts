import crypto from "crypto";
import Redis from "ioredis";
import { EvaluationResult } from "../types/index.js";

export class EvaluationCache {
  private redis: Redis | null = null;
  private memoryFallback: Map<string, EvaluationResult> = new Map();

  constructor(redisUrl: string = "redis://localhost:6379") {
    try {
      this.redis = new Redis(redisUrl, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // Do not hang if Redis is offline
      });

      this.redis.on("error", () => {
        // Fall back to memory quietly without crashing
        this.redis = null;
      });
    } catch {
      this.redis = null;
    }
  }

  public computeKey(promptId: string, version: string, testId: string, inputPayload: Record<string, any>): string {
    const raw = JSON.stringify({ promptId, version, testId, inputPayload });
    const hash = crypto.createHash("sha256").update(raw).digest("hex");
    return `eval_cache:${promptId}:${version}:${hash}`;
  }

  public async get(key: string): Promise<EvaluationResult | null> {
    if (this.redis) {
      try {
        const data = await this.redis.get(key);
        if (data) {
          const parsed = JSON.parse(data) as EvaluationResult;
          parsed.cached = true;
          return parsed;
        }
      } catch {
        // Redis connection error, fallback to memory
      }
    }
    const memHit = this.memoryFallback.get(key);
    if (memHit) {
      return { ...memHit, cached: true };
    }
    return null;
  }

  public async set(key: string, result: EvaluationResult, ttlSeconds: number = 86400): Promise<void> {
    this.memoryFallback.set(key, result);
    if (this.redis) {
      try {
        await this.redis.set(key, JSON.stringify(result), "EX", ttlSeconds);
      } catch {
        // Redis connection error, ignore
      }
    }
  }
}
