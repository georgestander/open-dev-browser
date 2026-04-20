#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { execSync } from "child_process";
import { existsSync, readdirSync, readFileSync } from "fs";
import { join } from "path";
import { serve, type DevBrowserServer } from "./server.js";
import { connect, type DevBrowserClient } from "./client.js";
import { toolDefinitions, handleToolCall } from "./tools.js";

const SERVER_PORT = parseInt(process.env.DEV_BROWSER_PORT || "9222");
const HEADLESS = process.env.DEV_BROWSER_HEADLESS === "true";

let browserServer: DevBrowserServer | null = null;
let client: DevBrowserClient | null = null;
let playwrightChecked = false;

function getPackageMetadata(): { name: string; version: string } {
  try {
    const packageJson = readFileSync(new URL("../package.json", import.meta.url), "utf8");
    const pkg = JSON.parse(packageJson) as { name?: string; version?: string };
    return {
      name: pkg.name || "open-dev-browser",
      version: pkg.version || "0.0.0",
    };
  } catch {
    return { name: "open-dev-browser", version: "0.0.0" };
  }
}

const packageMetadata = getPackageMetadata();

function isChromiumInstalled(): boolean {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const playwrightCacheDir = join(homeDir, ".cache", "ms-playwright");

  if (!existsSync(playwrightCacheDir)) {
    return false;
  }

  try {
    const entries = readdirSync(playwrightCacheDir);
    return entries.some((entry) => entry.startsWith("chromium"));
  } catch {
    return false;
  }
}

function ensurePlaywrightInstalled(): void {
  if (playwrightChecked) return;
  playwrightChecked = true;

  if (isChromiumInstalled()) {
    console.error("Playwright Chromium already installed.");
    return;
  }

  console.error("Playwright Chromium not found. Installing (this may take a minute)...");
  try {
    execSync("npx playwright install chromium", { stdio: "inherit" });
    console.error("Chromium installed successfully.");
  } catch (error) {
    console.error("Failed to install Playwright browsers:", error);
    console.error("You may need to run manually: npx playwright install chromium");
  }
}

async function ensureServerAndClient(): Promise<DevBrowserClient> {
  if (!browserServer) {
    ensurePlaywrightInstalled();
    console.error(`Starting ${packageMetadata.name} server...`);
    browserServer = await serve({
      port: SERVER_PORT,
      headless: HEADLESS,
      profileDir: process.env.DEV_BROWSER_PROFILE_DIR,
    });
    console.error(`${packageMetadata.name} server started on port ${SERVER_PORT}`);
  }

  if (!client) {
    client = await connect(`http://127.0.0.1:${SERVER_PORT}`);
  }

  return client;
}

// Create MCP server
const server = new Server(
  {
    name: packageMetadata.name,
    version: packageMetadata.version,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: toolDefinitions,
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const browserClient = await ensureServerAndClient();
  return handleToolCall(name, args, browserClient, browserServer!);
});

// Cleanup on exit
async function cleanup() {
  if (client) {
    await client.disconnect();
  }
  if (browserServer) {
    await browserServer.stop();
  }
}

process.on("SIGINT", async () => {
  await cleanup();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await cleanup();
  process.exit(0);
});

// Start the MCP server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${packageMetadata.name} MCP server running on stdio`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
