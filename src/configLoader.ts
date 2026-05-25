import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import type { BehaviorConfig } from "./behaviorTypes";
import { cloneDefaultBehaviorConfig } from "./defaultBehaviorConfig";

export interface LoadedBehaviorConfig {
  config: BehaviorConfig;
  source: "user" | "bundled" | "default";
  path?: string;
}

export function loadBehaviorConfig(appRoot: string, userDataRoot?: string): LoadedBehaviorConfig {
  const bundledConfigPath = path.join(appRoot, "config", "behaviors.yaml");

  if (userDataRoot) {
    const userConfigPath = path.join(userDataRoot, "behaviors.yaml");
    ensureUserConfig(userConfigPath, bundledConfigPath);

    const userLoaded = tryLoadConfig(userConfigPath, "user");
    if (userLoaded) return userLoaded;

    console.warn(`Unable to load user behavior config from ${userConfigPath}. Falling back to bundled config.`);
  }

  const bundledLoaded = tryLoadConfig(bundledConfigPath, "bundled");
  if (bundledLoaded) return bundledLoaded;

  console.warn(`Unable to load bundled behavior config from ${bundledConfigPath}. Falling back to defaults.`);

  return {
    config: cloneDefaultBehaviorConfig(),
    source: "default"
  };
}

function ensureUserConfig(userConfigPath: string, bundledConfigPath: string): void {
  try {
    if (fs.existsSync(userConfigPath)) return;

    fs.mkdirSync(path.dirname(userConfigPath), { recursive: true });
    fs.copyFileSync(bundledConfigPath, userConfigPath);
  } catch (error) {
    console.warn(`Unable to create user behavior config at ${userConfigPath}.`, error);
  }
}

function tryLoadConfig(configPath: string, source: "user" | "bundled"): LoadedBehaviorConfig | undefined {
  try {
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed = yaml.load(raw);
    assertBehaviorConfig(parsed);

    return {
      config: parsed,
      source,
      path: configPath
    };
  } catch (error) {
    console.warn(`Unable to load behavior config from ${configPath}.`, error);
    return undefined;
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
