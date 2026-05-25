import type {
  BehaviorNodeConfig,
  DurationValue,
  NextConfig,
  TextConfig,
  WeightedNextNodeConfig
} from "./behaviorTypes";

export function parseDurationMs(value: DurationValue | undefined): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "forever") return null;

  const match = normalized.match(/^(\d+(?:\.\d+)?)(ms|s|m)$/);
  if (!match) return null;

  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount < 0) return null;

  const unit = match[2];
  if (unit === "ms") return Math.round(amount);
  if (unit === "s") return Math.round(amount * 1000);
  return Math.round(amount * 60_000);
}

export function chooseText(text: TextConfig | undefined, random = Math.random): string | undefined {
  if (!text) return undefined;
  if (typeof text === "string") return text;
  if (!Array.isArray(text.random) || text.random.length === 0) return undefined;

  const index = Math.min(text.random.length - 1, Math.floor(random() * text.random.length));
  return text.random[index];
}

export function chooseNextNode(
  next: NextConfig | undefined,
  random = Math.random
): BehaviorNodeConfig | undefined {
  if (!next) return undefined;
  if (!Array.isArray(next)) return next.node;
  if (next.length === 0) return undefined;
  if (next.length === 1) return next[0].node;

  const total = next.reduce((sum, child) => sum + normalizedProbability(child), 0);
  if (total <= 0) return next[0].node;

  let cursor = random() * total;
  for (const child of next) {
    cursor -= normalizedProbability(child);
    if (cursor <= 0) return child.node;
  }

  return next[next.length - 1].node;
}

function normalizedProbability(child: WeightedNextNodeConfig): number {
  const probability = Number(child.probability ?? 1);
  return Number.isFinite(probability) && probability > 0 ? probability : 0;
}
