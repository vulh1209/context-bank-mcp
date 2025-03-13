#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Use environment variables with fallback values
const ONYX_API_BASE = process.env.ONYX_API_BASE || "";
const LOG_LEVEL = process.env.LOG_LEVEL || "info";

// Configure logging based on LOG_LEVEL
const logger = {
  info: (...args: any[]) => {
    if (["info", "debug"].includes(LOG_LEVEL)) {
      console.error("[INFO]", ...args);
    }
  },
  debug: (...args: any[]) => {
    if (LOG_LEVEL === "debug") {
      console.error("[DEBUG]", ...args);
    }
  },
  error: (...args: any[]) => {
    console.error("[ERROR]", ...args);
  },
  warn: (...args: any[]) => {
    if (["info", "debug", "warn"].includes(LOG_LEVEL)) {
      console.error("[WARN]", ...args);
    }
  },
};

interface DocumentSearchRequest {
  message: string;
  search_type: string;
  retrieval_options: {
    enable_auto_detect_filters: boolean;
    offset: number;
    limit: number;
    dedupe_docs: boolean;
  };
  evaluation_type: string;
  chunks_above: number;
  chunks_below: number;
  full_doc: boolean;
}

interface DocumentSearchResponse {
  top_documents: Array<{
    document_id: string;
    chunk_ind: number;
    semantic_identifier: string;
    link: string;
    blurb: string;
    source_type: string;
    boost: number;
    hidden: boolean;
    metadata: Record<string, any>;
    score: number;
    is_relevant: boolean | null;
    relevance_explanation: string | null;
    match_highlights: string[];
    updated_at: string | null;
    primary_owners: any | null;
    secondary_owners: any | null;
    is_internet: boolean;
    db_doc_id: number;
    content: string;
  }>;
  llm_indices: any[];
}

async function makeOnyxRequest<T>(
  url: string,
  body?: DocumentSearchRequest,
): Promise<T | null> {
  const headers = {
    "Content-Type": "application/json",
  };
  try {
    const response = await axios.post(url, body, { headers });
    if (!response.data) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data as T;
  } catch (error) {
    logger.error("Error making Onyx request:", error);
    return null;
  }
}

// Initialize MCP server
const server = new McpServer({
  name: "context-bank",
  version: "1.0.0",
});

server.tool(
  "document-search",
  "Search for documents in the AtherOS's knowledge base",
  {
    message: z.string().describe("message to search for"),
  },
  async ({ message }) => {
    const searchUrl = `${ONYX_API_BASE}/api/chat/document-search`;
    const body = {
      message: message,
      search_type: "semantic",
      retrieval_options: {
        enable_auto_detect_filters: false,
        offset: 0,
        limit: 3,
        dedupe_docs: true,
      },
      evaluation_type: "skip",
      chunks_above: 1,
      chunks_below: 1,
      full_doc: false,
    };
    const documentSearchResponse =
      await makeOnyxRequest<DocumentSearchResponse>(searchUrl, body);
    if (!documentSearchResponse) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to search for documents in the AtherOS's knowledge base`,
          },
        ],
      };
    }
    return {
      content: documentSearchResponse?.top_documents?.map((doc) => ({
        type: "text",
        text: doc.content + "\n" + doc.link,
      })) ?? [
        {
          type: "text",
          text: `No documents found in the AtherOS's knowledge base`,
        },
      ],
    };
  },
);

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info("Context Bank MCP Server running on stdio");
}

main().catch((error) => {
  logger.error("Fatal error in main():", error);
  process.exit(1);
});
