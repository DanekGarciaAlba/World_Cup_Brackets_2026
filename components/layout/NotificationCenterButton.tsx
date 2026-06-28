"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, Gift, Trophy, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CLIENT_NOTIFICATIONS_EVENT,
  markClientNotificationsRead,
  readClientNotifications,
  type ClientNotification,
} from "@/lib/notifications/clientNotifications";
import { cn } from "@/lib/utils";

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Just now";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function iconFor(notification: ClientNotification) {
  if (notification.kind === "score") return Trophy;
  if (notification.kind === "unlock") return Gift;
  return CheckCircle2;
}

export function NotificationCenterButton() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<ClientNotification[]>([]);

  useEffect(() => {
    const refresh = () => setNotifications(readClientNotifications());
    refresh();
    window.addEventListener(CLIENT_NOTIFICATIONS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(CLIENT_NOTIFICATIONS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const pointNotifications = useMemo(() => notifications.filter((item) => item.kind === "score"), [notifications]);
  const unreadCount = useMemo(() => pointNotifications.filter((item) => !item.read).length, [pointNotifications]);

  function toggleOpen() {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (nextOpen) {
      markClientNotificationsRead("score");
      setNotifications(readClientNotifications());
    }
  }

  return (
    <div className="relative">
      <Button
        size="icon"
        variant="secondary"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={toggleOpen}
        className={cn("relative", unreadCount > 0 && "notification-bell-alert border-red-400/45 bg-red-500/12 text-white")}
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
            {Math.min(9, unreadCount)}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="notification-center-panel fixed left-3 right-3 top-20 z-[60] w-auto overflow-hidden rounded-2xl border border-white/12 bg-[#071126]/98 text-left shadow-[0_28px_90px_rgba(0,0,0,.5),inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-xl md:absolute md:left-auto md:right-0 md:top-[calc(100%+0.6rem)] md:w-[min(92vw,24rem)]">
          <div className="flex items-start justify-between gap-3 border-b border-white/10 p-3">
            <span className="min-w-0">
              <p className="text-[0.68rem] font-black uppercase tracking-[0.14em] text-electric">Notifications</p>
              <h2 className="mt-1 text-lg font-black text-white">Point updates</h2>
            </span>
            <button
              type="button"
              aria-label="Close notifications"
              onClick={() => setOpen(false)}
              className="grid size-9 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.055] text-white/70 transition hover:border-white/18 hover:bg-white/[0.09] hover:text-white"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="notification-center-list max-h-[24rem] space-y-2 overflow-y-auto p-2">
            {pointNotifications.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/[0.045] p-4">
                <p className="text-sm font-black text-white">No point notifications yet</p>
                <p className="mt-1 text-xs font-semibold leading-5 text-muted-foreground">Match points, group releases, and Top 8 releases will collect here.</p>
              </div>
            ) : (
              pointNotifications.map((notification) => {
                const Icon = iconFor(notification);
                const content = (
                  <article className="grid grid-cols-[2.4rem_minmax(0,1fr)] gap-2 rounded-xl border border-white/10 bg-white/[0.045] p-2.5 transition hover:border-white/18 hover:bg-white/[0.07]">
                    <span
                      className={cn(
                        "grid size-9 place-items-center overflow-hidden rounded-lg border bg-white/[0.055]",
                        notification.accent === "gold" && "border-trophy-gold/28 text-trophy-gold",
                        notification.accent === "green" && "border-pitch-green/28 text-pitch-green",
                        notification.accent === "red" && "border-red-400/28 text-red-200",
                        notification.accent === "blue" && "border-electric/28 text-electric",
                      )}
                    >
                      {notification.imageUrl ? <img src={notification.imageUrl} alt="" className="h-full w-full object-contain p-0.5" /> : <Icon className="size-4" />}
                    </span>
                    <span className="min-w-0">
                      <span className="flex min-w-0 items-center justify-between gap-2">
                        <strong className="truncate text-sm font-black text-white">{notification.title}</strong>
                        {!notification.read ? <span className="size-2 rounded-full bg-red-400" /> : null}
                      </span>
                      <small className="mt-0.5 block text-xs font-semibold leading-5 text-muted-foreground">{notification.body}</small>
                      <em className="mt-1 block text-[0.62rem] font-black uppercase tracking-[0.1em] text-white/38 not-italic">
                        {formatNotificationTime(notification.createdAt)}
                      </em>
                    </span>
                  </article>
                );
                return notification.href ? (
                  <Link key={notification.id} href={notification.href} onClick={() => setOpen(false)}>
                    {content}
                  </Link>
                ) : (
                  <div key={notification.id}>{content}</div>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
