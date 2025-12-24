# Browser-Use Microservice

A standalone FastAPI microservice that wraps browser-use for agentic browser automation.
Runs as a separate process to avoid async compatibility issues with LangGraph.

## Why a Microservice?

The `browser-use` library has async compatibility issues with LangGraph's event loop
(specifically `Blocking call to os.getcwd`). Running it as a separate service solves this
by isolating the browser automation in its own process.

## Features

- **Agentic browsing**: Natural language commands to control the browser
- **Vision support**: Screenshot analysis with vision models
- **Profile persistence**: Save and reuse browser profiles for authenticated sessions
- **Headless/Headful modes**: Run invisibly or watch the automation

## API Endpoints

### `POST /browse`
Execute a browsing task with natural language instructions.

```json
{
  "task": "Search for AI news and summarize the first 3 results",
  "url": "https://google.com",  // optional starting URL
  "max_steps": 10,
  "use_vision": false,
  "profile_id": null  // optional profile for persistent sessions
}
```

### `POST /extract`
Extract content from a URL using browser rendering.

```json
{
  "url": "https://example.com",
  "extract_type": "text",  // or "html", "screenshot"
  "wait_for": "body"  // CSS selector to wait for
}
```

### `GET /profiles`
List available browser profiles.

### `POST /profiles`
Create a new browser profile for persistent sessions.

## Running

```bash
cd browser_service
pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8001
```
