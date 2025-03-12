#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import axios from "axios";
import * as dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

// Use environment variables with fallback values
const ONYX_API_BASE = process.env.ONYX_API_BASE || "http://172.30.22.52:3000";
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

async function makeOnyxRequest<T>(
  url: string,
  body?: CreateChatSessionRequest,
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

async function makeOnyxRequestStream<T>(
  url: string,
  body?: any,
): Promise<T | null> {
  const headers = {
    "Content-Type": "application/json",
  };
  try {
    const response = await axios.post(url, body, { headers });
    if (!response.data) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const res = magicConvert(response.data);
    return res as T;
  } catch (error) {
    logger.error("Error making Onyx request:", error);
    return null;
  }
}

const magicConvert = (data: any) => {
  try {
    return JSON.parse(data);
  } catch (error) {
    return JSON.parse(data.split(`{"agentic_message_ids": []}`)?.[1]);
  }
};

// Format send message response data
function formatSendMessageResponse(response: SendMessageResponse): string {
  const messageContent = response.message || "No message content";
  const queryInfo = response.rephrased_query
    ? `Query: ${response.rephrased_query}`
    : "";
  const messageInfo = `Message ID: ${response.message_id}`;

  let docsInfo = "";
  if (response.context_docs && response.context_docs.top_documents.length > 0) {
    const topDoc = response.context_docs.top_documents[0];
    docsInfo = [
      `Top source: ${topDoc.semantic_identifier || "Unknown"}`,
      `Relevance: ${topDoc.score.toFixed(2) || "Unknown"}`,
      `Link: ${topDoc.link || "No link available"}`,
    ].join("\n");
  }

  return [
    messageInfo,
    queryInfo,
    "---",
    messageContent,
    "---",
    docsInfo ? `Sources:\n${docsInfo}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

interface CreateChatSessionRequest {
  persona_id?: number;
  description?: string;
}

interface CreateChatSessionResponse {
  chat_session_id: string;
}

interface SendMessageRequest {
  alternate_assistant_id?: number;
  chat_session_id: string;
  message: string;
  parent_message_id?: number | null;
  prompt_id?: number;
  search_doc_ids?: string[] | null;
  file_descriptors?: any[];
  regenerate?: boolean;
  retrieval_options?: {
    run_search: string;
    real_time: boolean;
    filters?: {
      source_type: string | null;
      document_set: string | null;
      time_cutoff: string | null;
      tags: string[];
    };
  };
  prompt_override?: string | null;
  llm_override?: {
    model_provider: string;
    model_version: string;
  };
  use_agentic_search?: boolean;
}

interface SendMessageResponse {
  message_id: number;
  parent_message: number;
  latest_child_message: number | null;
  message: string;
  rephrased_query: string | null;
  context_docs?: {
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
      primary_owners: string[] | null;
      secondary_owners: string[] | null;
      is_internet: boolean;
      db_doc_id: number;
    }>;
  };
}

// Initialize MCP server
const server = new McpServer({
  name: "context-bank",
  version: "1.0.0",
});

server.tool(
  "create-chat-session",
  "Create a chat session for querying the AtherOS's knowledge base",
  {
    persona_id: z.number().optional().describe("user id, default is 0"),
    description: z
      .string()
      .optional()
      .describe("description of the chat session, default is empty string"),
  },
  async ({
    persona_id,
    description,
  }: {
    persona_id?: number;
    description?: string;
  }) => {
    const createChatSessionUrl = `${ONYX_API_BASE}/api/chat/create-chat-session`;
    const body: CreateChatSessionRequest = {
      persona_id: persona_id ?? 0,
      description: description ?? "",
    };
    const createChatSessionData =
      await makeOnyxRequest<CreateChatSessionResponse>(
        createChatSessionUrl,
        body,
      );

    if (!createChatSessionData) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to create chat session for querying the AtherOS's knowledge base`,
          },
        ],
      };
    }

    const chat_session_id = createChatSessionData.chat_session_id;
    if (!chat_session_id) {
      return {
        content: [
          {
            type: "text",
            text: "Failed to get chat session id",
          },
        ],
      };
    }

    const chatSessionText = `Chat session created for querying the AtherOS's knowledge base. Chat session id: ${chat_session_id}`;

    return {
      content: [
        {
          type: "text",
          text: chatSessionText,
        },
      ],
    };
  },
);

server.tool(
  "query-atheros",
  "Send a message to the chat session for querying the AtherOS's knowledge base",
  {
    chat_session_id: z.string().describe("chat session id"),
    message: z
      .string()
      .describe("message to send for querying the knowledge base"),
    parent_message_id: z
      .number()
      .optional()
      .describe(
        "parent message id, if the message is a reply to a previous message, if not provided, use undefined",
      ),
  },
  async ({
    chat_session_id,
    message,
    parent_message_id,
  }: {
    chat_session_id: string;
    message: string;
    parent_message_id?: number;
  }) => {
    const sendMessageUrl = `${ONYX_API_BASE}/api/chat/send-message`;
    const body: SendMessageRequest = {
      alternate_assistant_id: 0,
      chat_session_id: chat_session_id,
      message: message,
      prompt_id: 0,
      search_doc_ids: null,
      file_descriptors: [],
      regenerate: false,
      retrieval_options: {
        run_search: "auto",
        real_time: true,
        filters: {
          source_type: null,
          document_set: null,
          time_cutoff: null,
          tags: [],
        },
      },
      prompt_override: null,
      llm_override: {
        model_provider: "Default",
        model_version: "gpt-4o",
      },
      use_agentic_search: false,
      parent_message_id: parent_message_id ?? null,
    };

    const sendMessageResponse = await makeOnyxRequestStream<any>(
      sendMessageUrl,
      body,
    );

    if (!sendMessageResponse) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to send message ${message} to chat session ${chat_session_id}`,
          },
        ],
      };
    }

    const messageResponse = sendMessageResponse.message;
    if (!messageResponse) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to get message response from chat session ${chat_session_id}`,
          },
        ],
      };
    }

    const messageResponseText = formatSendMessageResponse(sendMessageResponse);

    return {
      content: [
        {
          type: "text",
          text: messageResponseText,
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
