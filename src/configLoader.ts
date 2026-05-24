import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import type { BehaviorConfig } from "./behaviorTypes";
import { cloneDefaultBehaviorConfig } from "./defaultBehaviorConfig";

export interface LoadedBehaviorConfig {
  config: BehaviorConfig;
  source: "yaml" | "default";
  error?: string;
}

export function loadBehaviorConfig(appRoot: string): LoadedBehaviorConfig {
  const configPath = path.join(appRoot, "config", "behaviors.yaml");

  try {
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed = yaml.load(raw);
    assertBehaviorConfig(parsed);

    return {
      config: parsed,
      source: "yaml"
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Unable to load behavior config from ${configPath}. Falling back to defaults.`, error);

    return {
      config: cloneDefaultBehaviorConfig(),
      source: "default",
      error: message
    };
  }
}

function assertBehaviorConfig(value: unknown): asserts value is BehaviorConfig {
  if (!isRecord(value)) {
    throw new Error("Behavior config must be an object.");
  }

  if (value.version !== 1) {
    throw new Error("Behavior config version must be 1.");
  }

  if (!isRecord(value.root) || typeof value.root.action !== "string") {
    throw new Error("Behavior config root node is missing an action.");
  }

  if (!isRecord(value.animations) || Object.keys(value.animations).length === 0) {
    throw new Error("Behavior config must declare animations.");
  }

  if (!isRecord(value.events)) {
    throw new Error("Behavior config must declare events.");
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
