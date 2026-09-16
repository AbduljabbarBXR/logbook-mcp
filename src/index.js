#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const server = new McpServer({ name: "logbook-mcp", version: "0.1.0" });

function storePath(root) {
  const dir = join(resolve(root || "."), ".logbook");
  mkdirSync(dir, { recursive: true });
  return join(dir, "logbook.json");
}

function readEntries(path) {
  if (!existsSync(path)) return [];
  try {
    const data = JSON.parse(readFileSync(path, "utf8"));
    return Array.isArray(data) ? data : data.entries || [];
  } catch {
    return [];
  }
}

function writeEntries(path, entries) {
  writeFileSync(path, JSON.stringify({ entries }, null, 2));
}

function id() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

server.registerTool(
  "logbook.record",
  {
    description: "Record a decision, finding, or gotcha into the project memory. The entry is persisted in the repository so future sessions can recall it.",
    inputSchema: {
      path: z.string().optional().describe("Repository root where the logbook lives. Defaults to the current directory."),
      title: z.string().describe("Short title for the entry"),
      body: z.string().describe("The decision, finding, or gotcha to remember"),
      scope: z.string().optional().describe("Optional scope such as deploy, build, auth"),
      tags: z.array(z.string()).optional().describe("Tags for later search"),
      type: z.enum(["decision", "finding", "gotcha", "note"]).default("note"),
    },
  },
  async ({ path, title, body, scope, tags, type }) => {
    const file = storePath(path);
    const entries = readEntries(file);
    const entry = {
      id: id(),
      ts: new Date().toISOString(),
      type,
      title,
      body,
      scope: scope || "",
      tags: tags || [],
    };
    entries.push(entry);
    writeEntries(file, entries);
    return { content: [{ type: "text", text: JSON.stringify({ recorded: entry.id, count: entries.length, file }, null, 2) }] };
  }
);

server.registerTool(
  "logbook.search",
  {
    description: "Search the project memory by text, scope, tags, or type. Returns matching entries with their timestamps.",
    inputSchema: {
      path: z.string().optional().describe("Repository root. Defaults to the current directory."),
      query: z.string().optional().describe("Text to match against titles and bodies"),
      scope: z.string().optional().describe("Filter by scope"),
      tags: z.array(z.string()).optional().describe("Filter by tags, entries matching any tag are returned"),
      type: z.enum(["decision", "finding", "gotcha", "note"]).optional().describe("Filter by type"),
      limit: z.number().int().min(1).max(100).default(20).describe("Maximum entries to return"),
    },
  },
  async ({ path, query, scope, tags, type, limit }) => {
    const file = storePath(path);
    const entries = readEntries(file);
    const q = (query || "").toLowerCase();
    const filtered = entries
      .filter((e) => {
        if (scope && e.scope !== scope) return false;
        if (type && e.type !== type) return false;
        if (tags && tags.length && !tags.some((t) => (e.tags || []).includes(t))) return false;
        if (q && !((e.title + " " + e.body).toLowerCase().includes(q))) return false;
        return true;
      })
      .sort((a, b) => (a.ts < b.ts ? 1 : -1))
      .slice(0, limit);
    return { content: [{ type: "text", text: JSON.stringify({ count: filtered.length, entries: filtered }, null, 2) }] };
  }
);

server.registerTool(
  "logbook.recent",
  {
    description: "Return the most recent entries from the project memory.",
    inputSchema: {
      path: z.string().optional().describe("Repository root. Defaults to the current directory."),
      limit: z.number().int().min(1).max(100).default(10),
    },
  },
  async ({ path, limit }) => {
    const entries = readEntries(storePath(path)).sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, limit);
    return { content: [{ type: "text", text: JSON.stringify({ count: entries.length, entries }, null, 2) }] };
  }
);

server.registerTool(
  "logbook.stats",
  {
    description: "Summarize the project memory: total entries, counts by type and scope, and the logbook location.",
    inputSchema: {
      path: z.string().optional().describe("Repository root. Defaults to the current directory."),
    },
  },
  async ({ path }) => {
    const file = storePath(path);
    const entries = readEntries(file);
    const byType = {};
    const byScope = {};
    for (const e of entries) {
      byType[e.type] = (byType[e.type] || 0) + 1;
      if (e.scope) byScope[e.scope] = (byScope[e.scope] || 0) + 1;
    }
    return { content: [{ type: "text", text: JSON.stringify({ count: entries.length, byType, byScope, file }, null, 2) }] };
  }
);

server.registerTool(
  "logbook.forget",
  {
    description: "Remove an entry from the project memory by id.",
    inputSchema: {
      path: z.string().optional().describe("Repository root. Defaults to the current directory."),
      id: z.string().describe("The entry id to remove"),
    },
  },
  async ({ path, id }) => {
    const file = storePath(path);
    const entries = readEntries(file);
    const before = entries.length;
    const after = entries.filter((e) => e.id !== id);
    writeEntries(file, after);
    return { content: [{ type: "text", text: JSON.stringify({ removed: before - after.length, count: after.length }) }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);