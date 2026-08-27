"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError, orbisApi } from "./api";
import { getOrCreateLearnerId } from "./storage";
import type { DashboardResponse } from "@/lib/shared/models";
import { NetworkError, userFacingRequestError } from "./network";
import { onAppResume } from "./platform";

export function useLearnerDashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const dashboard = await orbisApi.getDashboard(getOrCreateLearnerId());
      setData(dashboard);
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof ApiError || caught instanceof NetworkError
          ? caught.message
          : userFacingRequestError(caught),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const dashboard = await orbisApi.getDashboard(getOrCreateLearnerId());
        if (cancelled) {
          return;
        }
        setData(dashboard);
        setError(null);
      } catch (caught) {
        if (cancelled) {
          return;
        }
        setError(
          caught instanceof ApiError || caught instanceof NetworkError
            ? caught.message
            : userFacingRequestError(caught),
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    const stopResume = onAppResume(() => {
      if (!cancelled) {
        void load();
      }
    });
    return () => {
      cancelled = true;
      stopResume();
    };
  }, []);

  return {
    data,
    loading,
    error,
    reload: async () => {
      setLoading(true);
      await reload();
    },
  };
}
