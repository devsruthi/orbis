"use client";

import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef } from "react";
import { getOrCreateLearnerId, setLearnerId } from "./storage";

type AuthSyncState = {
  syncing: boolean;
  synced: boolean;
};

export function useAuthSync(): AuthSyncState {
  const { data: session, status } = useSession();
  const syncingRef = useRef(false);
  const syncedRef = useRef(false);

  const sync = useCallback(async () => {
    if (!session?.user || syncingRef.current) {
      return;
    }
    syncingRef.current = true;
    try {
      const response = await fetch("/api/auth/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          localLearnerId: getOrCreateLearnerId(),
        }),
      });
      if (!response.ok) {
        return;
      }
      const body = (await response.json()) as { learnerId?: string };
      if (body.learnerId) {
        setLearnerId(body.learnerId);
      }
      syncedRef.current = true;
      window.dispatchEvent(new Event("orbis:auth-synced"));
    } finally {
      syncingRef.current = false;
    }
  }, [session?.user]);

  useEffect(() => {
    if (status !== "authenticated") {
      syncedRef.current = false;
      return;
    }
    void sync();
  }, [status, sync]);

  return {
    syncing: status === "loading" || (status === "authenticated" && !syncedRef.current),
    synced: syncedRef.current,
  };
}
