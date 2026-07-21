import { qdrantClient } from "../../tb/src/infra.js";

export async function upsertPoint(id: string, vector: number[], payload: any): Promise<any> {
  return qdrantClient.request("PUT", "/collections/pi_identity/points", {
    points: [{ id, vector, payload }],
  });
}

export async function queryPoints(vector: number[], options: { limit?: number; filter?: any }): Promise<any> {
  return qdrantClient.request("POST", "/collections/pi_identity/points/query", {
    vector,
    ...options,
  });
}

export async function scrollPoints(options: { filter?: any }): Promise<any> {
  return qdrantClient.request("POST", "/collections/pi_identity/points/scroll", options);
}

export async function deletePoints(ids: string[]): Promise<any> {
  return qdrantClient.request("POST", "/collections/pi_identity/points/delete", { points: ids });
}

export async function getPointById(id: string): Promise<any> {
  return qdrantClient.request("GET", `/collections/pi_identity/points/${id}`, undefined);
}
