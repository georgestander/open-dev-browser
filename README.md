# dev-browser-mcp

An MCP server for browser automation with persistent Playwright sessions. Originally based on [SawyerHood/dev-browser](https://github.com/SawyerHood/dev-browser).

## Why?

Unlike standard Playwright MCP servers that create fresh browser instances, dev-browser maintains **persistent browser state** across tool calls. Pages stay alive, sessions persist, and you can iteratively explore and interact without starting over.

## Installation

### For OpenCode

Add to your `opencode.json` or `~/.config/opencode/config.json`:
```json
{
  "mcp": {
    "dev-browser": {
      "type": "local",
      "command": ["npx", "-y", "open-dev-browser"],
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
      "command": "npx",
      "args": ["-y", "open-dev-browser"]
    }
  }
}
```

### Environment Variables

- `DEV_BROWSER_PORT` - HTTP API port (default: 9222)
- `DEV_BROWSER_HEADLESS` - Run headless (default: false)
- `DEV_BROWSER_PROFILE_DIR` - Directory for persistent browser profile

## Tools

| Tool | Description |
|------|-------------|
| `browser_navigate` | Navigate to a URL |
| `browser_snapshot` | Get AI-friendly DOM snapshot with element refs |
| `browser_click` | Click element by ref |
| `browser_type` | Type text into element |
| `browser_screenshot` | Take screenshot |
| `browser_scroll` | Scroll page |
| `browser_run_script` | Run arbitrary Playwright script |
| `browser_list_pages` | List open pages |
| `browser_close_page` | Close a page |

## Usage

Ask your AI to interact with your browser:

- "Navigate to localhost:3000 and test the login flow"
- "Take a snapshot of the page and click the submit button"
- "Fill out the contact form and submit it"

## Credits

Based on [dev-browser](https://github.com/SawyerHood/dev-browser) by Sawyer Hood.

## License

MIT
