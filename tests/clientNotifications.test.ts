import { describe, expect, it } from "vitest";
import {
  readClientNotifications,
  replaceClientNotificationsByPrefix,
  sanitizeClientNotifications,
  writeClientNotifications,
} from "../lib/notifications/clientNotifications";

function withMockWindow(run: () => void) {
  const store = new Map<string, string>();
  const previousWindow = (globalThis as any).window;
  const previousCustomEvent = (globalThis as any).CustomEvent;

  (globalThis as any).CustomEvent = class MockCustomEvent {
    type: string;

    constructor(type: string) {
      this.type = type;
    }
  };
  (globalThis as any).window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
      removeItem: (key: string) => store.delete(key),
    },
    dispatchEvent: () => true,
  };

  try {
    run();
  } finally {
    if (previousWindow === undefined) {
      delete (globalThis as any).window;
    } else {
      (globalThis as any).window = previousWindow;
    }
    if (previousCustomEvent === undefined) {
      delete (globalThis as any).CustomEvent;
    } else {
      (globalThis as any).CustomEvent = previousCustomEvent;
    }
  }
}

describe("client notification sanitation", () => {
  it("keeps verified score and unlock notifications", () => {
    const notifications = sanitizeClientNotifications([
      {
        id: "score:user-1:101:2-0:15",
        kind: "score",
        title: "+15 pts from Group A",
        body: "Mexico 2-0 South Africa. Your pick 2-0.",
        createdAt: "2026-06-11T21:05:00.000Z",
        href: "/dashboard",
        accent: "gold",
      },
      {
        id: "unlock:user-1:skin:maple-ice-guard",
        kind: "unlock",
        title: "New skin available",
        body: "Ice Guard unlocked. Open Profile, select it, then press Save to make it public.",
        createdAt: "2026-06-11T21:05:00.000Z",
        imageUrl: "/assets/profile/maple/skins/ice-guard.png",
        href: "/profile/setup",
        accent: "gold",
      },
    ]);

    expect(notifications).toHaveLength(2);
  });

  it("drops demo unlocks and placeholder pick score notifications", () => {
    const notifications = sanitizeClientNotifications([
      {
        id: "unlock:demo:demo:emote:starter-roar",
        kind: "unlock",
        title: "New emote available",
        body: "Starter Roar unlocked. Open Profile, select it, then press Save to make it public.",
        createdAt: "2026-06-11T21:05:00.000Z",
      },
      {
        id: "score:user-1:102:1-0:0",
        kind: "score",
        title: "+0 pts from Group B",
        body: "Germany 1-0 Japan. Your pick --.",
        createdAt: "2026-06-11T21:05:00.000Z",
      },
    ]);

    expect(notifications).toEqual([]);
  });

  it("drops malformed legacy notifications instead of defaulting them to profile alerts", () => {
    const notifications = sanitizeClientNotifications([
      {
        id: "old-local-toast",
        title: "New rewards available",
        body: "Open profile now.",
        createdAt: "2026-06-11T21:05:00.000Z",
      },
    ]);

    expect(notifications).toEqual([]);
  });

  it("drops zero-point score notifications even when the pick labels are complete", () => {
    const notifications = sanitizeClientNotifications([
      {
        id: "score:user-1:102:1-0:0",
        kind: "score",
        title: "+0 pts from Group B",
        body: "Germany 1-0 Japan. Your pick 0-2.",
        createdAt: "2026-06-11T21:05:00.000Z",
      },
    ]);

    expect(notifications).toEqual([]);
  });

  it("keeps the verified points repair notification", () => {
    const notifications = sanitizeClientNotifications([
      {
        id: "profile:user-1:points-repair-2026-06-20",
        kind: "profile",
        title: "Points fixed",
        body: "Sorry about the points bug. Totals are fixed now.",
        createdAt: "2026-06-20T18:40:00.000Z",
        href: "/leaderboard",
        accent: "green",
      },
    ]);

    expect(notifications).toHaveLength(1);
    expect(notifications[0]?.title).toBe("Points fixed");
  });

  it("orders notification batches by newest time, then score events, then latest match id", () => {
    const notifications = sanitizeClientNotifications([
      {
        id: "unlock:user-1:skin:maple-ice-guard",
        kind: "unlock",
        title: "New skin available",
        body: "Ice Guard unlocked. Open Profile, select it, then press Save to make it public.",
        createdAt: "2026-06-11T21:05:00.000Z",
      },
      {
        id: "score:user-1:101:2-0:15",
        kind: "score",
        title: "+15 pts from Group A",
        body: "Mexico 2-0 South Africa. Your pick 2-0.",
        createdAt: "2026-06-11T21:05:00.000Z",
      },
      {
        id: "score:user-1:104:1-0:5",
        kind: "score",
        title: "+5 pts from Group D",
        body: "USA 1-0 Paraguay. Your pick 2-0.",
        createdAt: "2026-06-11T21:05:00.000Z",
      },
      {
        id: "score:user-1:99:1-1:4",
        kind: "score",
        title: "+4 pts from Group C",
        body: "Brazil 1-1 Morocco. Your pick 1-1.",
        createdAt: "2026-06-10T21:05:00.000Z",
      },
    ]);

    expect(notifications.map((notification) => notification.id)).toEqual([
      "score:user-1:104:1-0:5",
      "score:user-1:101:2-0:15",
      "unlock:user-1:skin:maple-ice-guard",
      "score:user-1:99:1-1:4",
    ]);
  });

  it("uses score sort time so newest fixtures appear above older outcomes from the same scoring run", () => {
    const notifications = sanitizeClientNotifications([
      {
        id: "score:user-1:201:1-0:5",
        kind: "score",
        title: "+5 pts from Group E",
        body: "Germany 1-0 Japan. Your pick 1-0.",
        createdAt: "2026-06-12T22:00:00.000Z",
        sortAt: "2026-06-12T15:00:00.000Z",
      },
      {
        id: "score:user-1:202:2-1:9",
        kind: "score",
        title: "+9 pts from Group F",
        body: "Canada 2-1 Qatar. Your pick 2-1.",
        createdAt: "2026-06-12T22:00:00.000Z",
        sortAt: "2026-06-12T18:00:00.000Z",
      },
    ]);

    expect(notifications.map((notification) => notification.id)).toEqual([
      "score:user-1:202:2-1:9",
      "score:user-1:201:1-0:5",
    ]);
  });

  it("replaces stale cosmetic unlocks for one user with only server-verified unlocks", () => {
    withMockWindow(() => {
      writeClientNotifications([
        {
          id: "score:user-1:201:1-0:5",
          kind: "score",
          title: "+5 pts from Group E",
          body: "Germany 1-0 Japan. Your pick 1-0.",
          createdAt: "2026-06-12T22:00:00.000Z",
        },
        {
          id: "unlock:user-1:emote:maple-starter-roar",
          kind: "unlock",
          title: "New emote available",
          body: "Starter Roar unlocked. Open Profile, select it, then press Save to make it public.",
          createdAt: "2026-06-12T22:00:00.000Z",
        },
        {
          id: "unlock:user-2:skin:zayu-black-gold",
          kind: "unlock",
          title: "New skin available",
          body: "Black Gold unlocked. Open Profile, select it, then press Save to make it public.",
          createdAt: "2026-06-12T22:00:00.000Z",
        },
      ]);

      replaceClientNotificationsByPrefix("unlock:user-1:", [
        {
          id: "unlock:user-1:skin:maple-ice-guard",
          kind: "unlock",
          title: "New skin available",
          body: "Ice Guard unlocked. Open Profile, select it, then press Save to make it public.",
          createdAt: "2026-06-13T22:00:00.000Z",
        },
      ]);

      const ids = readClientNotifications().map((notification) => notification.id);
      expect(ids).toContain("score:user-1:201:1-0:5");
      expect(ids).toContain("unlock:user-1:skin:maple-ice-guard");
      expect(ids).toContain("unlock:user-2:skin:zayu-black-gold");
      expect(ids).not.toContain("unlock:user-1:emote:maple-starter-roar");
    });
  });
});
