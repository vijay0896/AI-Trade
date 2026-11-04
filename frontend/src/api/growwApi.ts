import { baseApi } from "./baseApi";
import { API_TAGS } from "./apiTags";
import type {
  ApiResponse,
  GrowwSession,
  GrowwProfile,
  GrowwFunds,
  GrowwHoldings,
  GrowwPositions,
} from "../types/groww.types";

export const growwApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGrowwStatus: builder.query<ApiResponse<GrowwSession>, void>({
      query: () => "/groww/status",
      providesTags: [API_TAGS.GROWW_STATUS],
    }),

    connectGroww: builder.mutation<ApiResponse<GrowwSession>, void>({
      query: () => ({
        url: "/groww/connect",
        method: "POST",
      }),
      invalidatesTags: [
        API_TAGS.GROWW_STATUS,
        API_TAGS.GROWW_PROFILE,
        API_TAGS.GROWW_FUNDS,
        API_TAGS.GROWW_HOLDINGS,
        API_TAGS.GROWW_POSITIONS,
      ],
    }),

    getGrowwProfile: builder.query<ApiResponse<GrowwProfile>, void>({
      query: () => "/groww/profile",
      providesTags: [API_TAGS.GROWW_PROFILE],
    }),

    getGrowwFunds: builder.query<ApiResponse<GrowwFunds>, void>({
      query: () => "/groww/funds",
      providesTags: [API_TAGS.GROWW_FUNDS],
    }),

    getGrowwHoldings: builder.query<ApiResponse<GrowwHoldings>, void>({
      query: () => "/groww/holdings",
      providesTags: [API_TAGS.GROWW_HOLDINGS],
    }),

    getGrowwPositions: builder.query<ApiResponse<GrowwPositions>, void>({
      query: () => "/groww/positions",
      providesTags: [API_TAGS.GROWW_POSITIONS],
    }),
  }),
});

export const {
  useGetGrowwStatusQuery,
  useConnectGrowwMutation,
  useGetGrowwProfileQuery,
  useGetGrowwFundsQuery,
  useGetGrowwHoldingsQuery,
  useGetGrowwPositionsQuery,
} = growwApi;

