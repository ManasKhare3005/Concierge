import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:4000",
  withCredentials: false
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      return Promise.reject(error);
    }

    const responseData = error.response?.data;
    if (typeof responseData === "string" && responseData.trim()) {
      return Promise.reject(new Error(responseData));
    }

    if (responseData && typeof responseData === "object") {
      if ("message" in responseData && typeof responseData.message === "string") {
        return Promise.reject(new Error(responseData.message));
      }

      if (
        "detail" in responseData &&
        responseData.detail &&
        typeof responseData.detail === "object" &&
        "message" in responseData.detail &&
        typeof responseData.detail.message === "string"
      ) {
        return Promise.reject(new Error(responseData.detail.message));
      }
    }

    return Promise.reject(new Error(error.message));
  }
);
