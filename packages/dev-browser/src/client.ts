import { chromium, type Browser, type Page } from "playwright";
import type {
  GetPageRequest,
  GetPageResponse,
  ListPagesResponse,
  ServerInfoResponse,
} from "./types";

export interface DevBrowserClient {
  page: (name: string) => Promise<Page>;
  list: () => Promise<string[]>;
  close: (name: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

export async function connect(serverUrl: string): Promise<DevBrowserClient> {
  let browser: Browser | null = null;
  let wsEndpoint: string | null = null;

  async function ensureConnected(): Promise<Browser> {
    if (browser && browser.isConnected()) {
      return browser;
    }

    // Fetch wsEndpoint from server
    const res = await fetch(serverUrl);
    const info = (await res.json()) as ServerInfoResponse;
    wsEndpoint = info.wsEndpoint;

    // Connect to the browser via CDP
    browser = await chromium.connectOverCDP(wsEndpoint);
    return browser;
  }

  // Find page by CDP targetId - more reliable than JS globals
  async function findPageByTargetId(b: Browser, targetId: string): Promise<Page | null> {
    for (const context of b.contexts()) {
      for (const page of context.pages()) {
        try {
          const cdpSession = await context.newCDPSession(page);
          const { targetInfo } = await cdpSession.send("Target.getTargetInfo");
          await cdpSession.detach();
          if (targetInfo.targetId === targetId) {
            return page;
          }
        } catch {
          // Page might be closed
        }
      }
    }
    return null;
  }

  return {
    async page(name: string): Promise<Page> {
      // Request the page from server (creates if doesn't exist)
      const res = await fetch(`${serverUrl}/pages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name } satisfies GetPageRequest),
      });

      if (!res.ok) {
        throw new Error(`Failed to get page: ${await res.text()}`);
      }

      const { targetId } = (await res.json()) as GetPageResponse;

      // Connect to browser
      const b = await ensureConnected();

      // Find the page by targetId
      const page = await findPageByTargetId(b, targetId);
      if (!page) {
        throw new Error(`Page "${name}" not found in browser contexts`);
      }

      return page;
    },

    async list(): Promise<string[]> {
      const res = await fetch(`${serverUrl}/pages`);
      const data = (await res.json()) as ListPagesResponse;
      return data.pages;
    },

    async close(name: string): Promise<void> {
      const res = await fetch(`${serverUrl}/pages/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(`Failed to close page: ${await res.text()}`);
      }
    },

    async disconnect(): Promise<void> {
      // Just disconnect the CDP connection - pages persist on server
      if (browser) {
        await browser.close();
        browser = null;
      }
    },
  };
}
