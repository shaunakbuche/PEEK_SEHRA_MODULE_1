export class ApiClientError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(init.headers || {}) },
    credentials: "same-origin",
    ...init,
  });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response */
  }
  if (!res.ok) {
    throw new ApiClientError(res.status, data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/* ---------- shared shapes ---------- */

export interface User {
  id: string;
  email: string;
  role: "school" | "admin";
  fullName: string;
  org: { id: string; name: string; country: string; region: string } | null;
}

export type AssessmentStatus = "draft" | "submitted" | "in_review" | "approved" | "returned";

export interface AssessmentPayload {
  assessment: {
    id: string;
    orgId: string;
    status: AssessmentStatus;
    answers: Record<string, string>;
    returnNote: string;
    submittedAt: string | null;
    updatedAt: string;
  };
  report: {
    id: string;
    status: "generated" | "edited" | "approved";
    content: import("./reportTypes").ReportContent;
    pdfUrl: string | null;
    docxUrl: string | null;
    approvedAt: string | null;
  } | null;
}

export interface OrgRow {
  id: string;
  name: string;
  country: string;
  region: string;
  archived: boolean;
  schoolEmail: string | null;
  assessmentId: string | null;
  assessmentStatus: AssessmentStatus;
  submittedAt: string | null;
  updatedAt: string | null;
  reportId: string | null;
  reportStatus: "generated" | "edited" | "approved" | null;
  messageCount: number;
}

export interface Message {
  id: string;
  senderRole: "school" | "admin";
  body: string;
  createdAt: string;
}

/** A single answer the document scanner proposes filling in. */
export interface ExtractSuggestion {
  key: string;
  value: string;
  label: string;
  section: string;
}

export interface ExtractResponse {
  suggestions: ExtractSuggestion[];
  model: string;
}
