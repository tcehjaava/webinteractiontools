# 🦉 WebInteractionTools

WebInteractionTools is a Model Context Protocol (MCP) server that provides web browsing capabilities to AI agents. Built on Playwright, it enables automated web interactions including navigation, scrolling, taking screenshots, and executing JavaScript code.

## Available Tools

- **Navigation**: Navigate to URLs and go back in browser history
  - `navigate`: Navigate to a URL with customizable timeout, wait conditions, and headless mode
  - `goBack`: Navigate back to the previous page in browser history
- **Screenshots**: Capture screenshots of the current viewport
  - `screenshot`: Take a screenshot of the visible viewport with metadata about scroll position
- **Scrolling**: Advanced scrolling capabilities
  - `scrollToPosition`: Scroll to a specific Y coordinate on the page
  - `scrollDirection`: Scroll the page up, down, to top, or to bottom
  - `scrollToText`: Find and scroll to an element containing specific text
- **JavaScript Execution**: Execute custom JavaScript code on the page
  - `executeJavaScript`: Run JavaScript code and get the result back

## Installation

### Global Installation

```bash
npm install -g @tcehjaava/webinteractiontools
```

### Add to Claude Code

After installing globally, add it to Claude Code as an MCP server:

```bash
claude mcp add webinteractiontools "webinteractiontools"
```

## Troubleshooting

If you have trouble connecting to the MCP server, you can start it manually by running:

```bash
webinteractiontools
```

This will start the server automatically, which can help if Claude Code can't manage the server on its own.

## Local Development

### Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

### Development Scripts

```bash
# Development mode with hot reload
npm run dev

# Build the project
npm run build

# Run linting
npm run lint

# Format code
npm run format

# Run all checks (lint, format, build)
npm run check
```

### Add to Claude Code (Development)

```bash
# Remove if already exists
claude mcp remove webinteractiontools

# Add the server
claude mcp add webinteractiontools node dist/index.js
```

### Remove from Claude Code

```bash
claude mcp remove webinteractiontools
```