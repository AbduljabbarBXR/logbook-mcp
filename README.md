# logbook-mcp

[![npm](https://img.shields.io/npm/v/logbook-mcp)](https://www.npmjs.com/package/logbook-mcp) [![license](https://img.shields.io/npm/l/logbook-mcp)](LICENSE) [![MCP](https://img.shields.io/badge/MCP-compatible-blue)](https://modelcontextprotocol.io) [![Tawakkul Labs](https://img.shields.io/badge/by-Tawakkul%20Labs-0f766e)](https://tawakkul-labs.co.ke)

Project memory across sessions for AI agents. A queryable decision log that lives in the repository, so an agent remembers what was decided and why, instead of re-deriving it at full token cost.

Built as an MCP server, so it works in any platform that speaks Model Context Protocol.

## Why

Agents forget everything between sessions. The decision that "the domain is served by Cloudflare Pages, never deploy to Netlify" is paid for once and lost. Logbook persists it in `.logbook/logbook.json`, tagged and searchable, so the next session starts where the last one finished.

## Tools

* `logbook.record` record a decision, finding, gotcha, or note with a scope and tags
* `logbook.search` search by text, scope, tags, or type
* `logbook.recent` the latest entries
* `logbook.stats` counts by type and scope
* `logbook.forget` remove an entry by id

## Usage

```bash
npm install -g logbook-mcp
```

```json
{
  "mcpServers": {
    "logbook": {
      "command": "logbook-mcp",
      "args": []
    }
  }
}
```

## License

MIT. Part of the Tawakkul Labs MCP family.

---

Links: [npm](https://www.npmjs.com/package/logbook-mcp) | [GitHub](https://github.com/AbduljabbarBXR/logbook-mcp) | [Tawakkul Labs](https://tawakkul-labs.co.ke)
