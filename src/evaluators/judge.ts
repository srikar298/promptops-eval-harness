export interface JudgeComparison {
  preferred: "A" | "B" | "TIE";
  confidence: number;
  rationale: string;
}

export class CalibratedJudge {
  /**
   * Evaluates pairwise outputs with Position Inversion.
   * Compares (Candidate vs Baseline) and (Baseline vs Candidate) to eliminate positional bias.
   */
  public static async evaluatePairwise(
    query: string,
    candidateOutput: string,
    baselineOutput: string,
    judgeFunction: (prompt: string) => Promise<string>
  ): Promise<{ candidateWon: boolean; consistentAgreement: boolean; rationale: string }> {
    // Round 1: Candidate is Position A, Baseline is Position B
    const promptRound1 = `
You are an impartial judge evaluating two AI assistant responses.
Query: "${query}"

[Response A]:
${candidateOutput}

[Response B]:
${baselineOutput}

Select the superior response. Output JSON: {"preferred": "A" | "B" | "TIE", "rationale": "..."}
`;
    const resp1 = await judgeFunction(promptRound1);
    const parsed1 = this.parseJudgeOutput(resp1);

    // Round 2: Position Swap (Baseline is A, Candidate is B)
    const promptRound2 = `
You are an impartial judge evaluating two AI assistant responses.
Query: "${query}"

[Response A]:
${baselineOutput}

[Response B]:
${candidateOutput}

Select the superior response. Output JSON: {"preferred": "A" | "B" | "TIE", "rationale": "..."}
`;
    const resp2 = await judgeFunction(promptRound2);
    const parsed2 = this.parseJudgeOutput(resp2);

    // Consistency check: Round 1 preferred A (Candidate) AND Round 2 preferred B (Candidate)
    const round1FavorsCandidate = parsed1.preferred === "A";
    const round2FavorsCandidate = parsed2.preferred === "B";

    const consistentAgreement = round1FavorsCandidate === round2FavorsCandidate;
    const candidateWon = round1FavorsCandidate && round2FavorsCandidate;

    return {
      candidateWon,
      consistentAgreement,
      rationale: `Round 1: ${parsed1.rationale} | Round 2: ${parsed2.rationale}`,
    };
  }

  private static parseJudgeOutput(raw: string): JudgeComparison {
    try {
      const cleaned = raw.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleaned);
    } catch {
      return { preferred: "TIE", confidence: 0.5, rationale: "Failed to parse judge output JSON" };
    }
  }
}
