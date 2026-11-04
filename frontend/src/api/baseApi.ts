import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { ENV } from "../config/env.config";
import { API_TAGS } from "./apiTags";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: ENV.BACKEND_URL ? `${ENV.BACKEND_URL}/api/v1` : "/api/v1",
  prepareHeaders: (headers) => {
    headers.set("Accept", "application/json");
    return headers;
  },
});

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: rawBaseQuery,
  tagTypes: Object.values(API_TAGS),
  keepUnusedDataFor: 60,
  endpoints: () => ({}),
});

