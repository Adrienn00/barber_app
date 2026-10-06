"use client";

import { useEffect } from "react";
import { markAllReadAction } from "@/backend/notifications/notifications.actions";

/** Láthatatlan: az oldal megnyitásakor minden értesítést olvasottnak jelöl (a lista kiemelése megmarad). */
export function MarkAllRead({ hasUnread }: { hasUnread: boolean }) {
  useEffect(() => {
    if (hasUnread) void markAllReadAction();
  }, [hasUnread]);
  return null;
}
