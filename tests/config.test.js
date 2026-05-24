const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { loadBehaviorConfig } = require("../dist/configLoader");
const { chooseNextNode, parseDurationMs } = require("../dist/behaviorRuntime");

assert.strictEqual(parseDurationMs("60s"), 60000);
assert.strictEqual(parseDurationMs("10m"), 600000);
assert.strictEqual(parseDurationMs("4.2s"), 4200);
assert.strictEqual(parseDurationMs("forever"), null);

const workspaceRoot = path.join(__dirname, "..");
const loaded = loadBehaviorConfig(workspaceRoot);
assert.strictEqual(loaded.source, "yaml");
assert.strictEqual(loaded.config.root.id, "idle");
assert.strictEqual(loaded.config.events.pointerClick.node.action, "HappyAction");
assert.ok(!("when" in loaded.config.events.pointerClick));

const next = loaded.config.root.next;
assert.ok(Array.isArray(next));
assert.strictEqual(chooseNextNode(next, () => 0).id, next[0].node.id);
assert.strictEqual(chooseNextNode(next, () => 0.99).id, next[next.length - 1].node.id);
assert.strictEqual(chooseNextNode({ node: loaded.config.root }).id, "idle");

const sleep = next.find((child) => child.node.id === "sleep").node;
assert.strictEqual(sleep.fixedFrame.children[0].node.return, "fixedFrame");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "hamster-config-"));
fs.mkdirSync(path.join(tempRoot, "config"));
fs.writeFileSync(path.join(tempRoot, "config", "behaviors.yaml"), "version: [broken");
const originalWarn = console.warn;
console.warn = () => {};
const fallback = loadBehaviorConfig(tempRoot);
console.warn = originalWarn;
assert.strictEqual(fallback.source, "default");
assert.strictEqual(fallback.config.root.id, "idle");

console.log("Config behavior tests passed.");
