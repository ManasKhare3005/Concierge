export function bucketReadinessScore(score: number): "clear" | "needs_light_touch" | "needs_full_attention" {
  if (score >= 8) {
    return "needs_full_attention";
  }

  if (score >= 4) {
    return "needs_light_touch";
  }

  return "clear";
}
