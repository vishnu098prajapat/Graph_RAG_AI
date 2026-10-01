export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export type SearchMode = "hybrid" | "dense" | "sparse";

// ── Core document types ───────────────────────────────────────────────────────

export interface DocInfo {
  id: string;
  filename: string;
  n_pages: number;
  n_chunks: number;
  warnings: string[];
  timings_ms: Record<string, number>;
}

/** Page-local citation. `rects` are PDF points, origin top-left: [x0, y0, x1, y1]. */
export interface Citation {
  page: number;
  start: number;
  end: number;
  page_width: number | null;
  page_height: number | null;
  rects: number[][];
}

export interface Signals {
  rrf: number;
  dense_rank: number | null;
  sparse_rank: number | null;
  dense_score: number | null;
  sparse_score: number | null;
  rerank: number | null;
}

export interface SearchResult {
  chunk_id: string;
  doc_id: string;
  text: string;
  score: number;
  signals: Signals;
  citations: Citation[];
}

export interface QueryResponse {
  query: string;
  results: SearchResult[];
  timings_ms: Record<string, number>;
}

// ── Batch ingestion types ─────────────────────────────────────────────────────

export type IngestionStage =
  | "queued"
  | "parsing"
  | "chunking"
  | "embedding"
  | "graphing"
  | "done"
  | "error";

export interface DocProgress {
  doc_id: string;
  filename: string;
  stage: IngestionStage;
  processed: number;   // e.g. chunks embedded so far
  total: number;       // e.g. total chunks to embed
  pct: number;         // 0-100
  error: string | null;
  result: DocInfo | null;
}

export interface BatchProgress {
  batch_id: string;
  done: boolean;
  pct: number;         // overall 0-100
  docs: DocProgress[];
}

// ── Knowledge graph types ─────────────────────────────────────────────────────

export type EntityType = "TECH" | "CONCEPT" | "TERM" | "ORG" | "PERSON";

export interface GraphNode {
  id: string;
  text: string;
  type: EntityType;
  freq: number;
  pages: number[];
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
}

export interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch {
    throw new Error(`Cannot reach the API at ${API_URL}. Is the backend running?`);
  }
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const body = (await res.json()) as { detail?: unknown };
      if (typeof body.detail === "string") detail = body.detail;
    } catch {
      /* non-JSON error body */
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

// ── Single-file upload (backward-compat) ─────────────────────────────────────

export function uploadDocument(file: File): Promise<DocInfo> {
  const form = new FormData();
  form.append("file", file);
  return request<DocInfo>("/api/documents", { method: "POST", body: form });
}

// ── Multi-file batch upload with SSE progress ─────────────────────────────────

export function uploadDocumentsBatch(
  files: File[],
  onProgress: (batch: BatchProgress) => void,
  onInstantStart?: (initialDocs: DocInfo[]) => void,
): { abort: () => void; promise: Promise<DocInfo[]> } {
  let aborted = false;
  let es: EventSource | null = null;
  const controller = new AbortController();

  const promise: Promise<DocInfo[]> = (async () => {
    // 1. POST all files to batch endpoint
    const form = new FormData();
    for (const f of files) form.append("files", f);

    const res = await request<{ batch_id: string; doc_count: number; docs?: DocInfo[] }>(
      "/api/documents/batch",
      { method: "POST", body: form, signal: controller.signal },
    );
    const { batch_id } = res;

    if (res.docs && res.docs.length > 0 && onInstantStart) {
      onInstantStart(res.docs);
    }

    if (aborted) throw new Error("Upload aborted");

    // 2. Open SSE stream for progress
    return new Promise<DocInfo[]>((resolve, reject) => {
      if (aborted) {
        reject(new Error("Upload aborted"));
        return;
      }

      const source = new EventSource(`${API_URL}/api/documents/batch/${batch_id}/stream`);
      es = source;

      source.onmessage = (event: MessageEvent) => {
        if (aborted) {
          source.close();
          reject(new Error("Upload aborted"));
          return;
        }

        let batch: BatchProgress;
        try {
          batch = JSON.parse(event.data as string) as BatchProgress;
        } catch {
          return;  // ignore malformed frames (e.g. keep-alive comments)
        }

        onProgress(batch);

        if (batch.done) {
          source.close();
          const docs = batch.docs
            .filter((d) => d.stage === "done" && d.result != null)
            .map((d) => d.result as DocInfo);

          if (docs.length === 0) {
            // d.error may be an empty string when Python's str(exc) yields "",
            // so check stage=="error" first and fall back to a human message.
            const errDoc = batch.docs.find((d) => d.stage === "error");
            const firstError =
              (errDoc?.error && errDoc.error.trim())
                ? errDoc.error.trim()
                : errDoc
                  ? `${errDoc.filename} could not be processed. Check the backend logs for details.`
                  : "All documents failed to process. Check the backend logs for details.";
            reject(new Error(firstError));
          } else {
            resolve(docs);
          }
        }
      };

      source.onerror = () => {
        source.close();
        if (!aborted) reject(new Error("Lost connection to progress stream"));
      };
    });
  })();

  return {
    abort() {
      aborted = true;
      es?.close();
      controller.abort();
    },
    promise,
  };
}

// ── List all documents ────────────────────────────────────────────────────────

export function listDocuments(): Promise<{ documents: DocInfo[] }> {
  return request<{ documents: DocInfo[] }>("/api/documents");
}

// ── Knowledge graph ───────────────────────────────────────────────────────────

export const pdfUrl = (docId: string) => `${API_URL}/api/documents/${docId}/pdf`;

export function fetchGraph(docId: string): Promise<KnowledgeGraphData> {
  return request<KnowledgeGraphData>(`/api/documents/${docId}/graph`);
}

// ── Query — single-doc or cross-doc ──────────────────────────────────────────

/** Query against one specific doc (original API). */
export function queryDocument(
  docId: string,
  query: string,
  mode: SearchMode,
  topK = 5,
  signal?: AbortSignal,
): Promise<QueryResponse> {
  return request<QueryResponse>("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, doc_id: docId, top_k: topK, mode }),
    signal,
  });
}

/** Query across all uploaded docs (doc_id = null → search everything). */
export function queryAllDocuments(
  query: string,
  mode: SearchMode,
  topK = 5,
  signal?: AbortSignal,
): Promise<QueryResponse> {
  return request<QueryResponse>("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, doc_id: null, top_k: topK, mode }),
    signal,
  });
}

/** Query across a specific subset of docs. */
export function queryDocuments(
  docIds: string[],
  query: string,
  mode: SearchMode,
  topK = 5,
  signal?: AbortSignal,
): Promise<QueryResponse> {
  return request<QueryResponse>("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, doc_ids: docIds, top_k: topK, mode }),
    signal,
  });
}
