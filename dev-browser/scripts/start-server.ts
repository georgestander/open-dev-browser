import { serve } from "dev-browser";
import { execSync } from "child_process";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const tmpDir = join(__dirname, "..", "tmp");
const profileDir = join(__dirname, "..", "profiles");

// Create tmp and profile directories if they don't exist
console.log("Creating tmp directory...");
mkdirSync(tmpDir, { recursive: true });
console.log("Creating profiles directory...");
mkdirSync(profileDir, { recursive: true });

// Kill any existing process on port 9222 (HTTP API) and 9223 (CDP)
console.log("Checking for existing servers...");
try {
  // Find and kill processes on our ports
  const ports = [9222, 9223];
  for (const port of ports) {
    try {
      const pid = execSync(`lsof -ti:${port}`, { encoding: "utf-8" }).trim();
      if (pid) {
        console.log(`Killing existing process on port ${port} (PID: ${pid})`);
        execSync(`kill -9 ${pid}`);
      }
    } catch {
      // No process on this port, which is fine
    }
  }
} catch {
  // lsof not available or no processes found
}

console.log("Starting dev browser server...");
const server = await serve({
  port: 9222,
  headless: false,
  profileDir,
});

console.log(`Dev browser server started`);
console.log(`  WebSocket: ${server.wsEndpoint}`);
console.log(`  Tmp directory: ${tmpDir}`);
console.log(`  Profile directory: ${profileDir}`);
console.log(`\nPress Ctrl+C to stop`);

// Keep the process running
await new Promise(() => {});
