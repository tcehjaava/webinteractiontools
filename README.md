[![MSeeP.ai Security Assessment Badge](https://mseep.net/pr/tcehjaava-webinteractiontools-badge.png)](https://mseep.ai/app/tcehjaava-webinteractiontools)

# 🦉 WebInteractionTools

MCP server that gives AI agents web browsing capabilities via Playwright.

## Features

- **Navigate** - Browse URLs, go back in history
- **Screenshot** - Capture viewport images  
- **Scroll** - Scroll to position, direction, or text
- **Execute JS** - Run JavaScript on pages

## Quick Start

```bash
# Install
npm install -g @tcehjaava/webinteractiontools

# Add to Claude
claude mcp add webinteractiontools "webinteractiontools"
```

## Tools

| Tool | Description |
|------|-------------|
| `navigate` | Go to URL with custom timeout/wait conditions |
| `goBack` | Navigate to previous page |
| `screenshot` | Capture current viewport |
| `scrollToPosition` | Scroll to Y coordinate |
| `scrollDirection` | Scroll up/down/top/bottom |
| `scrollToText` | Find and scroll to text |
| `executeJavaScript` | Run JS code on page |

## Development

```bash
# Setup
npm install
npm run build

# Dev mode
npm run dev

# Add local build to Claude
claude mcp remove webinteractiontools
claude mcp add webinteractiontools node dist/index.js
```

## Troubleshooting

Server not connecting? Start manually:
```bash
webinteractiontools
```
