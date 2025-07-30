# WebSight

MCP server for web browsing with Playwright, featuring provider-aware image sizing for different AI APIs.

## Install

```bash
npm install
```

## Build

```bash
npm run build
```

## Add to Claude Code

```bash
claude mcp add websight node dist/index.js
```

## Features

- **Navigate**: Load web pages with customizable wait conditions
- **Screenshot**: Capture viewport or full page screenshots
- **Page Overview**: Get comprehensive page analysis including:
  - Full page screenshot with automatic resizing
  - Page metadata (title, URL, dimensions)
  - Extracted text content
  - Provider-aware image sizing

## Provider Configuration

WebSight supports provider-specific image sizing to optimize screenshots for different AI APIs. Pass the `provider` parameter to the screenshot and page_overview tools:

### Supported Providers

- **claude** / **anthropic**: 8000x8000px maximum dimension
- **gemini** / **google**: 3072x3072px maximum dimension  
- **openai** / **gpt4**: 2048x2048px maximum dimension
- **default**: 2000x2000px maximum dimension (when no provider specified)

### Usage Example

```javascript
// Taking a screenshot optimized for Claude
await screenshot({ fullPage: true, provider: 'claude' })

// Getting page overview optimized for Gemini
await page_overview({ provider: 'gemini' })
```

## Tools

### navigate
Navigate to a URL with options for waiting conditions.

### screenshot
Take a screenshot of the current page (viewport or full page).

Parameters:
- `fullPage` (boolean): Capture full page (true) or viewport only (false)
- `provider` (string): AI provider to optimize for (claude, gemini, openai, etc.)

### page_overview
Get a comprehensive overview of the current page including screenshot, metadata, and text content.

Parameters:
- `includeText` (boolean): Include extracted text content
- `includeMetadata` (boolean): Include page metadata
- `maxTextLength` (number): Maximum length of extracted text
- `provider` (string): AI provider to optimize for (claude, gemini, openai, etc.)