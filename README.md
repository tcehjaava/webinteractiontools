# 🦉 WebInteractionTools

WebInteractionTools is a Model Context Protocol (MCP) server that provides web browsing capabilities to AI agents. Built on Playwright, it enables automated web interactions including navigation, clicking, scrolling, taking screenshots, and extracting content.

## Available Tools

- **Navigation**: Navigate to URLs and go back in browser history
- **Screenshots**: Capture screenshots of the current viewport
- **Scrolling**: Scroll to specific positions, directions, or text content
- **Clicking**: Click on elements by text, position, or CSS selector
- **Hovering**: Hover over elements by text, position, or CSS selector
- **Fill**: Fill form inputs with text values
- **Element Discovery**: Get clickable elements in the viewport
- **Content Extraction**: Extract cleaned HTML content from specific elements

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