import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { toolDefinitions } from "../src/tools.js";

function readJson<T>(url: URL): T {
  return JSON.parse(readFileSync(url, "utf8")) as T;
}

test("package metadata and README stay aligned", () => {
  const packageJson = readJson<{
    name: string;
    bin: Record<string, string>;
  }>(new URL("../package.json", import.meta.url));
  const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");

  assert.equal(packageJson.name, "open-dev-browser");
  assert.equal(Object.keys(packageJson.bin)[0], packageJson.name);
  assert.match(readme, /^# open-dev-browser$/m);
  assert.doesNotMatch(readme, /Unlike standard Playwright MCP servers that create fresh browser instances, dev-browser maintains/i);
  assert.match(readme, /\/absolute\/path\/to\/open-dev-browser\/dist\/index\.js/);
  assert.match(readme, /browser-data\/`\s+subdirectory/i);
});

test("browser_run_script documents the actual execution contract", () => {
  const browserRunScriptTool = toolDefinitions.find((tool) => tool.name === "browser_run_script");

  assert.ok(browserRunScriptTool, "browser_run_script should exist");
  assert.match(browserRunScriptTool.description ?? "", /current Playwright page/i);
  assert.doesNotMatch(browserRunScriptTool.description ?? "", /refs/i);

  const scriptDescription =
    browserRunScriptTool.inputSchema.properties?.script &&
    "description" in browserRunScriptTool.inputSchema.properties.script
      ? String(browserRunScriptTool.inputSchema.properties.script.description)
      : "";

  assert.match(scriptDescription, /JavaScript source code/i);
  assert.doesNotMatch(scriptDescription, /TypeScript/i);
  assert.doesNotMatch(scriptDescription, /refs/i);
});
