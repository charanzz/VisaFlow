import { z } from "zod";

export const errorSchemas = {
  validation: z.object({ message: z.string(), field: z.string().optional() }),
  notFound: z.object({ message: z.string() }),
  unauthorized: z.object({ message: z.string() }),
  internal: z.object({ message: z.string() }),
};

export const api = {
  // AUTH
  auth: {
    login: { method: "POST" as const, path: "/api/auth/login" as const },
    register: { method: "POST" as const, path: "/api/auth/register" as const },
    logout: { method: "POST" as const, path: "/api/auth/logout" as const },
    me: { method: "GET" as const, path: "/api/auth/me" as const },
  },
  // APPLICATIONS
  applications: {
    list: { method: "GET" as const, path: "/api/applications" as const },
    get: { method: "GET" as const, path: "/api/applications/:id" as const },
    create: { method: "POST" as const, path: "/api/applications" as const },
    update: { method: "PUT" as const, path: "/api/applications/:id" as const },
    all: { method: "GET" as const, path: "/api/applications/all" as const }, // officer
  },
  // DOCUMENTS
  documents: {
    list: { method: "GET" as const, path: "/api/applications/:id/documents" as const },
    upload: { method: "POST" as const, path: "/api/applications/:id/documents" as const },
    verify: { method: "POST" as const, path: "/api/documents/:docId/verify" as const },
  },
  // RISK & AI
  risk: {
    score: { method: "POST" as const, path: "/api/applications/:id/risk-score" as const },
    analyze: { method: "POST" as const, path: "/api/applications/:id/analyze" as const },
  },
  // BLOCKCHAIN
  blockchain: {
    issue: { method: "POST" as const, path: "/api/applications/:id/blockchain/issue" as const },
    verify: { method: "GET" as const, path: "/api/blockchain/verify/:hash" as const },
    ledger: { method: "GET" as const, path: "/api/blockchain/ledger" as const },
  },
  // TIMELINE
  timeline: {
    get: { method: "GET" as const, path: "/api/applications/:id/timeline" as const },
    advance: { method: "POST" as const, path: "/api/applications/:id/advance" as const },
  },
  // CHAT
  chat: {
    history: { method: "GET" as const, path: "/api/chat/history" as const },
    send: { method: "POST" as const, path: "/api/chat/send" as const },
  },
  // OFFICER ACTIONS
  officer: {
    grant: { method: "POST" as const, path: "/api/officer/applications/:id/grant" as const },
    deny: { method: "POST" as const, path: "/api/officer/applications/:id/deny" as const },
    updateStage: { method: "POST" as const, path: "/api/officer/applications/:id/stage" as const },
  },
  // STATS
  stats: {
    overview: { method: "GET" as const, path: "/api/stats/overview" as const },
  },
};

export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
