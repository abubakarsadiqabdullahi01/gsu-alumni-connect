"use client";

import { useEffect } from "react";

const HEARTBEAT_ENDPOINT = "/api/presence/heartbeat";
const HEARTBEAT_INTERVAL_MS = 60_000;

async function sendHeartbeat() {
  try {
    await fetch(HEARTBEAT_ENDPOINT, {
      method: "POST",
      cache: "no-store",
      keepalive: true,
    });
  } catch {
    // no-op
  }
}

function sendBeaconHeartbeat() {
  if (typeof navigator === "undefined" || !navigator.sendBeacon) return;
  const blob = new Blob(["{}"], { type: "application/json" });
  navigator.sendBeacon(HEARTBEAT_ENDPOINT, blob);
}

export function PresenceHeartbeat() {
  useEffect(() => {
    void sendHeartbeat();

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void sendHeartbeat();
      }
    }, HEARTBEAT_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void sendHeartbeat();
      }
    };

    const onPageHide = () => {
      sendBeaconHeartbeat();
    };

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  return null;
}
