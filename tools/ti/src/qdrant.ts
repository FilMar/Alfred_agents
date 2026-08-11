import { qdrantClient, getCollectionInfo, createCollection, VECTOR_SIZE } from "../../tb/src/infra.js";

const COLLECTION = "pi_identity";

// Idempotent: creates `pi_identity` if missing, no-op otherwise. No schema
// evolution to handle here (unlike tb) — a single unnamed dense vector, ever.
export async function ensureCollection(): Promise<void> {
  const check = await getCollectionInfo(COLLECTION);
  if (check.exists) return;
  await createCollection(COLLECTION, {
    vectors: { size: VECTOR_SIZE, distance: "Cosine" },
  });
}

export async function upsertPoint(id: string, vector: number[], payload: any): Promise<any> {
  return qdrantClient.request("PUT", "/collections/pi_identity/points", {
    points: [{ id, vector, payload }],
  });
}

export async function queryPoints(
  vector: number[],
  options: { limit?: number; filter?: any; score_threshold?: number },
): Promise<any> {
  return qdrantClient.request("POST", "/collections/pi_identity/points/query", {
    query: vector,
    with_payload: true,
    ...options,
  });
}

export async function scrollPoints(options: { filter?: any }): Promise<any> {
  return qdrantClient.request("POST", "/collections/pi_identity/points/scroll", { with_payload: true, ...options });
}

export async function deletePoints(ids: string[]): Promise<any> {
  return qdrantClient.request("POST", "/collections/pi_identity/points/delete", { points: ids });
}

export async function getPointById(id: string): Promise<any> {
  return qdrantClient.request("GET", `/collections/pi_identity/points/${id}`, undefined);
}
