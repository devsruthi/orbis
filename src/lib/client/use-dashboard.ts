"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError, orbisApi } from "./api";
import { getOrCreateLearnerId } from "./storage";
import type { DashboardResponse } from "@/lib/shared/models";
import { NetworkError, userFacingRequestError } from "./network";
import { onAppResume } from "./platform";

type DashboardState = {
  data: DashboardResponse | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
};

const DashboardContext = createContext<DashboardState | null>(null);

function useDashboardState(): DashboardState {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
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
    void (async () => {
      try {
        const dashboard = await orbisApi.getDashboard(getOrCreateLearnerId());
        if (!cancelled) {
          setData(dashboard);
          setError(null);
        }
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof ApiError || caught instanceof NetworkError
              ? caught.message
              : userFacingRequestError(caught),
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    const stopResume = onAppResume(() => {
      if (!cancelled) {
        void load(true);
      }
    });
    const onAuthSynced = () => {
      if (!cancelled) {
        void load(true);
      }
    };
    window.addEventListener("orbis:auth-synced", onAuthSynced);
    return () => {
      cancelled = true;
      stopResume();
      window.removeEventListener("orbis:auth-synced", onAuthSynced);
    };
  }, [load]);

  return useMemo(
    () => ({
      data,
      loading,
      error,
      reload: () => load(false),
    }),
    [data, loading, error, load],
  );
}

export function DashboardProvider({ children }: { children: ReactNode }) {
  const value = useDashboardState();
  return createElement(DashboardContext.Provider, { value }, children);
}

export function useLearnerDashboard(): DashboardState {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error("useLearnerDashboard must be used within DashboardProvider");
  }
  return context;
}
