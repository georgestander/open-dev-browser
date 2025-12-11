import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import type { DevBrowserClient } from "./client.js";
import type { DevBrowserServer } from "./server.js";
import { waitForPageLoad } from "./client.js";

export const toolDefinitions: Tool[] = [
  {
    name: "browser_snapshot",
    description:
      "Get an AI-friendly snapshot of the current page. Returns YAML with element refs like [ref=e1]. Use these refs with other tools to interact with elements.",
    inputSchema: {
      type: "object",
      properties: {
        page: {
          type: "string",
          description: "Page name (creates new page if doesn't exist)",
          default: "default",
        },
      },
    },
  },
  {
    name: "browser_navigate",
    description: "Navigate to a URL",
    inputSchema: {
      type: "object",
      properties: {
        page: {
          type: "string",
          description: "Page name",
          default: "default",
        },
        url: {
          type: "string",
          description: "URL to navigate to",
        },
      },
      required: ["url"],
    },
  },
  {
    name: "browser_click",
    description: "Click an element by its ref from the last snapshot",
    inputSchema: {
      type: "object",
      properties: {
        page: {
          type: "string",
          description: "Page name",
          default: "default",
        },
        ref: {
          type: "string",
          description: "Element ref from snapshot (e.g. 'e1', 'e2')",
        },
      },
      required: ["ref"],
    },
  },
  {
    name: "browser_type",
    description: "Type text into an element",
    inputSchema: {
      type: "object",
      properties: {
        page: {
          type: "string",
          description: "Page name",
          default: "default",
        },
        ref: {
          type: "string",
          description: "Element ref from snapshot",
        },
        text: {
          type: "string",
          description: "Text to type",
        },
        clear: {
          type: "boolean",
          description: "Clear existing text first",
          default: false,
        },
      },
      required: ["ref", "text"],
    },
  },
  {
    name: "browser_screenshot",
    description: "Take a screenshot of the page",
    inputSchema: {
      type: "object",
      properties: {
        page: {
          type: "string",
          description: "Page name",
          default: "default",
        },
        fullPage: {
          type: "boolean",
          description: "Capture full scrollable page",
          default: false,
        },
      },
    },
  },
  {
    name: "browser_scroll",
    description: "Scroll the page or an element",
    inputSchema: {
      type: "object",
      properties: {
        page: {
          type: "string",
          description: "Page name",
          default: "default",
        },
        direction: {
          type: "string",
          enum: ["up", "down"],
          description: "Scroll direction",
        },
        amount: {
          type: "number",
          description: "Pixels to scroll (default 500)",
          default: 500,
        },
      },
      required: ["direction"],
    },
  },
  {
    name: "browser_run_script",
    description:
      "Run a Playwright script on the page. The script receives `page` (Playwright Page) and `refs` (element refs from last snapshot). Return a value to send back.",
    inputSchema: {
      type: "object",
      properties: {
        page: {
          type: "string",
          description: "Page name",
          default: "default",
        },
        script: {
          type: "string",
          description:
            "JavaScript/TypeScript code. Has access to `page` (Playwright Page) and `refs` object.",
        },
      },
      required: ["script"],
    },
  },
  {
    name: "browser_list_pages",
    description: "List all open browser pages",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
  {
    name: "browser_close_page",
    description: "Close a browser page",
    inputSchema: {
      type: "object",
      properties: {
        page: {
          type: "string",
          description: "Page name to close",
        },
      },
      required: ["page"],
    },
  },
];

export async function handleToolCall(
  name: string,
  args: Record<string, unknown> | undefined,
  client: DevBrowserClient,
  _server: DevBrowserServer
): Promise<{ content: Array<{ type: string; text?: string; data?: string; mimeType?: string }> }> {
  const pageName = (args?.page as string) || "default";

  try {
    switch (name) {
      case "browser_snapshot": {
        const snapshot = await client.getAISnapshot(pageName);
        return {
          content: [{ type: "text", text: snapshot }],
        };
      }

      case "browser_navigate": {
        const url = args?.url as string;
        if (!url) throw new Error("url is required");

        const page = await client.page(pageName);
        await page.goto(url);
        await waitForPageLoad(page);

        const snapshot = await client.getAISnapshot(pageName);
        return {
          content: [
            { type: "text", text: `Navigated to ${url}\n\n${snapshot}` },
          ],
        };
      }

      case "browser_click": {
        const ref = args?.ref as string;
        if (!ref) throw new Error("ref is required");

        const element = await client.selectSnapshotRef(pageName, ref);
        if (!element) throw new Error(`Element with ref "${ref}" not found`);

        await element.click();
        const page = await client.page(pageName);
        await waitForPageLoad(page);

        const snapshot = await client.getAISnapshot(pageName);
        return {
          content: [
            { type: "text", text: `Clicked element [ref=${ref}]\n\n${snapshot}` },
          ],
        };
      }

      case "browser_type": {
        const ref = args?.ref as string;
        const text = args?.text as string;
        const clear = args?.clear as boolean;

        if (!ref) throw new Error("ref is required");
        if (!text) throw new Error("text is required");

        const element = await client.selectSnapshotRef(pageName, ref);
        if (!element) throw new Error(`Element with ref "${ref}" not found`);

        if (clear) {
          await element.fill(text);
        } else {
          await element.type(text);
        }

        const snapshot = await client.getAISnapshot(pageName);
        return {
          content: [
            { type: "text", text: `Typed "${text}" into [ref=${ref}]\n\n${snapshot}` },
          ],
        };
      }

      case "browser_screenshot": {
        const fullPage = args?.fullPage as boolean;
        const page = await client.page(pageName);
        const buffer = await page.screenshot({ fullPage });
        const base64 = buffer.toString("base64");

        return {
          content: [
            {
              type: "image",
              data: base64,
              mimeType: "image/png",
            },
          ],
        };
      }

      case "browser_scroll": {
        const direction = args?.direction as string;
        const amount = (args?.amount as number) || 500;

        if (!direction) throw new Error("direction is required");

        const page = await client.page(pageName);
        const delta = direction === "down" ? amount : -amount;
        await page.mouse.wheel(0, delta);
        await waitForPageLoad(page, { timeout: 2000 });

        const snapshot = await client.getAISnapshot(pageName);
        return {
          content: [
            { type: "text", text: `Scrolled ${direction} ${amount}px\n\n${snapshot}` },
          ],
        };
      }

      case "browser_run_script": {
        const script = args?.script as string;
        if (!script) throw new Error("script is required");

        const page = await client.page(pageName);

        // Create a function from the script that has access to page
        const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
        const fn = new AsyncFunction("page", script);
        const result = await fn(page);

        return {
          content: [
            {
              type: "text",
              text: result !== undefined ? JSON.stringify(result, null, 2) : "Script executed successfully",
            },
          ],
        };
      }

      case "browser_list_pages": {
        const pages = await client.list();
        return {
          content: [
            {
              type: "text",
              text: pages.length > 0 ? `Open pages:\n${pages.map((p) => `- ${p}`).join("\n")}` : "No pages open",
            },
          ],
        };
      }

      case "browser_close_page": {
        const pageToClose = args?.page as string;
        if (!pageToClose) throw new Error("page is required");

        await client.close(pageToClose);
        return {
          content: [{ type: "text", text: `Closed page "${pageToClose}"` }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${message}` }],
    };
  }
}
