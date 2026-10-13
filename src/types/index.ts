import { z } from "zod";

export const PromptSpecSchema = z.object({
  prompt_id: z.string(),
  version: z.string(),
  model: z.string(),
  temperature: z.number().default(0.0),
  system_prompt: z.string(),
  user_template: z.string(),
  output_schema: z.record(z.any()).optional(),
  budget: z.object({
    max_tokens_per_call: z.number().default(1000),
    max_p95_latency_ms: z.number().default(3000),
    max_cost_per_1k_usd: z.number().default(0.05),
  }).default({
    max_tokens_per_call: 1000,
    max_p95_latency_ms: 3000,
    max_cost_per_1k_usd: 0.05,
  }),
});

export type PromptSpec = z.infer<typeof PromptSpecSchema>;

export const EvaluationTestCaseSchema = z.object({
  id: z.string(),
  input: z.record(z.any()),
  expected_output: z.record(z.any()).optional(),
  rubric: z.string().optional(),
  is_adversarial: z.boolean().default(false),
});

export type EvaluationTestCase = z.infer<typeof EvaluationTestCaseSchema>;

export interface EvaluationResult {
  test_id: string;
  is_adversarial: boolean;
  score: number; // 0.0 to 1.0
  passed: boolean;
  cached: boolean;
  latency_ms: number;
  tokens_used: number;
  failure_reason?: string;
  candidate_output: string;
}

export interface AggregatedReport {
  prompt_id: string;
  version: string;
  total_tests: number;
  passed_tests: number;
  accuracy_rate: number;
  adversarial_pass_rate: number;
  cache_hit_rate: number;
  avg_latency_ms: number;
  p95_latency_ms: number;
  estimated_cost_usd: number;
  regression_detected: boolean;
  details: EvaluationResult[];
}
