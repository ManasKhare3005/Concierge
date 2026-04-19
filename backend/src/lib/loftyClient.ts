import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import type { ServiceStatus } from "@shared";

import "../bootstrap/loadEnv";

const loftyApiKey = process.env.LOFTY_API_KEY;

const loftyClient: AxiosInstance | null = loftyApiKey
  ? axios.create({
      baseURL: process.env.LOFTY_API_BASE_URL ?? "https://api.lofty.com",
      timeout: Number(process.env.LOFTY_TIMEOUT_MS ?? 8000),
      headers: {
        Authorization: `Bearer ${loftyApiKey}`
      }
    })
  : null;

export function getLoftyStatus(): ServiceStatus {
  if (!loftyApiKey) {
    return {
      name: "lofty",
      state: "demo",
      detail: "LOFTY_API_KEY is not set. Demo transaction data will be used."
    };
  }

  return {
    name: "lofty",
    state: "configured",
    detail: `Configured for ${process.env.LOFTY_API_BASE_URL ?? "https://api.lofty.com"}.`
  };
}

export async function loftyRequest<TResponse>(config: AxiosRequestConfig): Promise<TResponse | null> {
  if (!loftyClient) {
    return null;
  }

  const response = await loftyClient.request<TResponse>(config);
  return response.data;
}
