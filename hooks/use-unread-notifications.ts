"use client";

import { useEffect, useState } from "react";

type NotificationsStatsResponse = {
  stats?: {
    unread?: number;
  };
};

export function useUnreadNotificationsCount(refreshMs = 60000) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await fetch("/api/notifications?page=1&pageSize=1&status=all", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as NotificationsStatsResponse;
        if (!active) return;
        setCount(json.stats?.unread ?? 0);
      } catch {
        // no-op: keep current count
      }
    };

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, refreshMs);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [refreshMs]);

  return count;
}

export function useUnreadNotificationsCountEnabled(
  enabled: boolean,
  refreshMs = 60000,
  endpoint = "/api/notifications"
) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }

    let active = true;

    const load = async () => {
      try {
        const res = await fetch(`${endpoint}?page=1&pageSize=1&status=all`, {
          cache: "no-store",
        });
        if (!res.ok) return;
        const json = (await res.json()) as NotificationsStatsResponse;
        if (!active) return;
        setCount(json.stats?.unread ?? 0);
      } catch {
        // no-op
      }
    };

    void load();
    const timer = window.setInterval(() => {
      void load();
    }, refreshMs);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [enabled, refreshMs, endpoint]);

  return count;
}
