import Fastify from "fastify";
import { EvaluationCache } from "../cache/redis.js";

const fastify = Fastify({ logger: true });
const cache = new EvaluationCache();

fastify.get("/health", async () => {
  return { status: "UP", service: "promptops-eval-harness", timestamp: new Date().toISOString() };
});

fastify.post("/api/v1/eval/stream", async (request, reply) => {
  reply.raw.setHeader("Content-Type", "text/event-stream");
  reply.raw.setHeader("Cache-Control", "no-cache");
  reply.raw.setHeader("Connection", "keep-alive");

  const sendEvent = (event: string, data: any) => {
    reply.raw.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent("start", { message: "Starting evaluation suite run..." });

  // Stream simulated evaluation steps
  for (let i = 1; i <= 5; i++) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    sendEvent("progress", {
      testId: `test_case_${i}`,
      score: 1.0,
      status: "PASSED",
      latencyMs: 180 + i * 15,
    });
  }

  sendEvent("complete", { status: "SUCCESS", accuracy: "100.0%" });
  reply.raw.end();
});

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3000;
    await fastify.listen({ port, host: "0.0.0.0" });
    console.log(`🚀 PromptOps SSE Eval Server listening on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
