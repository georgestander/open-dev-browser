# open-dev-browser

An MCP server for browser automation with persistent Playwright sessions. Originally based on [SawyerHood/dev-browser](https://github.com/SawyerHood/dev-browser).

## Why?

Unlike standard Playwright MCP servers that create fresh browser instances, open-dev-browser maintains **persistent browser state** across tool calls. Pages stay alive, sessions persist, and you can iteratively explore and interact without starting over.

## Installation

The package metadata is aligned to `open-dev-browser`, but until it is published on npm the safest setup is to run it from a local checkout.

1. Clone the repository somewhere on your machine.
2. Run `npm install && npm run build` in the repo root.
3. Point your MCP client at the built `dist/index.js` entrypoint.

### For OpenCode

Add to your `opencode.json` or `~/.config/opencode/config.json`:
```json
{
  "mcp": {
    "dev-browser": {
      "type": "local",
      "command": ["node", "/absolute/path/to/open-dev-browser/dist/index.js"],
      "enabled": true
    }
  }
}
```

### For Claude Desktop

Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "dev-browser": {
      "command": "node",
      "args": ["/absolute/path/to/open-dev-browser/dist/index.js"]
    }
  }
}
```

### Environment Variables

- `DEV_BROWSER_PORT` - HTTP API port (default: 9222)
- `DEV_BROWSER_HEADLESS` - Run headless (default: false)
- `DEV_BROWSER_PROFILE_DIR` - Base directory for the persistent browser profile; the server stores browser data in a `browser-data/` subdirectory there (defaults to `.browser-data` in the current working directory)

## Tools

| Tool | Description |
|------|-------------|
| `browser_navigate` | Navigate to a URL |
| `browser_snapshot` | Get AI-friendly DOM snapshot with element refs |
| `browser_click` | Click element by ref |
| `browser_type` | Type text into element |
| `browser_screenshot` | Take screenshot |
| `browser_scroll` | Scroll page |
| `browser_run_script` | Run arbitrary JavaScript against the current Playwright page |
| `browser_list_pages` | List open pages |
| `browser_close_page` | Close a page |

## Development

```bash
npm install
npm run verify
npm run audit
```

## Usage

Ask your AI to interact with your browser:

- "Navigate to localhost:3000 and test the login flow"
- "Take a snapshot of the page and click the submit button"
- "Fill out the contact form and submit it"

For lower-level automation, `browser_run_script` executes JavaScript with the current Playwright `page` object as its only argument.

## Credits

Based on [dev-browser](https://github.com/SawyerHood/dev-browser) by Sawyer Hood.

## License

MIT
