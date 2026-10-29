import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  startSession,
  getSessionStatus,
  recordSessionEvent,
  stopSession,
  cancelSession,
  cleanSession,
  invalidateSession,
  isSessionExpired,
} from "../session";
import type { CaptureSession } from "../../types/session";

function buildMockChrome() {
  const store: Record<string, unknown> = {};
  return {
    tabs: {
      query: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockImplementation((id: number) =>
        Promise.resolve({ id, url: `https://example.com/tab-${id}`, title: `Tab ${id}` })
      ),
      onRemoved: { addListener: vi.fn() },
      onUpdated: { addListener: vi.fn() },
    },
    scripting: {
      executeScript: vi.fn().mockResolvedValue([{ result: undefined }]),
    },
    runtime: {
      sendMessage: vi.fn(),
      onMessage: { addListener: vi.fn() },
    },
    storage: {
      session: {
        get: vi.fn().mockImplementation((key?: string) => {
          if (key) return Promise.resolve({ [key]: store[key] });
          return Promise.resolve({ ...store });
        }),
        set: vi.fn().mockImplementation((items: Record<string, unknown>) => {
          Object.assign(store, items);
          return Promise.resolve();
        }),
        remove: vi.fn().mockImplementation((key: string) => {
          delete store[key];
          return Promise.resolve();
        }),
      },
    },
  };
}

describe("Session Management", () => {
  let chromeMock: ReturnType<typeof buildMockChrome>;

  beforeEach(async () => {
    chromeMock = buildMockChrome();
    // @ts-expect-error Mocking global chrome
    global.chrome = chromeMock;
    await cleanSession();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts a session on a valid HTTPS tab", async () => {
    const tab = { id: 101, url: "https://example.com/test", title: "Test Page" } as chrome.tabs.Tab;
    const info = await startSession(tab);

    expect(info.tabId).toBe(101);
    expect(info.tabUrl).toBe("https://example.com/test");
    expect(typeof info.startedAt).toBe("number");
    expect(chromeMock.scripting.executeScript).toHaveBeenCalledTimes(2);
  });

  it("throws when attempting to start on a restricted page", async () => {
    const tab = { id: 102, url: "chrome://extensions", title: "Extensions" } as chrome.tabs.Tab;
    await expect(startSession(tab)).rejects.toThrow("Cannot start session on restricted page");
  });

  it("is idempotent when starting on the same active tab", async () => {
    const tab = { id: 103, url: "https://example.com", title: "Page" } as chrome.tabs.Tab;
    const first = await startSession(tab);
    const second = await startSession(tab);

    expect(second.tabId).toBe(first.tabId);
    expect(second.startedAt).toBe(first.startedAt);
  });

  it("returns session status accurately", async () => {
    const tab = { id: 104, url: "https://example.com/app", title: "App" } as chrome.tabs.Tab;
    await startSession(tab);

    const status = await getSessionStatus(104);
    expect(status.active).toBe(true);
    expect(status.tabId).toBe(104);
    expect(status.eventCount).toBe(0);
  });

  it("records valid events and enforces the 20-event limit", async () => {
    const tab = { id: 105, url: "https://example.com", title: "Page" } as chrome.tabs.Tab;
    const sessionInfo = await startSession(tab);

    const wrongTokenRes = await recordSessionEvent("wrong_token", {
      type: "error",
      message: "Test error",
    });
    expect(wrongTokenRes.ok).toBe(false);
    expect(wrongTokenRes.error).toBe("Invalid session token");

    // Record 25 events using the valid sessionToken
    for (let i = 1; i <= 25; i++) {
      const res = await recordSessionEvent(sessionInfo.sessionToken, {
        type: "error",
        message: `Error number ${i}`,
        lineno: i,
      });
      expect(res.ok).toBe(true);
    }

    const status = await getSessionStatus(105);
    // Verified: capped strictly at 20 events
    expect(status.eventCount).toBe(20);
  });

  it("correctly identifies expired sessions (> 10 minutes)", () => {
    const now = Date.now();
    const freshSession: CaptureSession = {
      tabId: 1,
      tabUrl: "https://example.com",
      tabTitle: "Example",
      startedAt: now - 5 * 60 * 1000, // 5 min ago
      sessionToken: "token1",
      events: [],
    };
    expect(isSessionExpired(freshSession)).toBe(false);

    const expiredSession: CaptureSession = {
      tabId: 1,
      tabUrl: "https://example.com",
      tabTitle: "Example",
      startedAt: now - 11 * 60 * 1000, // 11 min ago
      sessionToken: "token2",
      events: [],
    };
    expect(isSessionExpired(expiredSession)).toBe(true);
  });

  it("stops session, cleans up, and returns context with events", async () => {
    const tab = { id: 106, url: "https://example.com/checkout", title: "Checkout" } as chrome.tabs.Tab;
    await startSession(tab);

    chromeMock.tabs.get.mockImplementation((id: number) => {
      if (id === 106) return Promise.resolve(tab);
      return Promise.reject(new Error("Tab not found"));
    });

    const result = await stopSession();
    expect(result.context.url).toBe("https://example.com/checkout");
    expect(Array.isArray(result.events)).toBe(true);

    const afterStatus = await getSessionStatus();
    expect(afterStatus.active).toBe(false);
  });

  it("cancels session cleanly", async () => {
    const tab = { id: 107, url: "https://example.com", title: "Page" } as chrome.tabs.Tab;
    await startSession(tab);

    await cancelSession();
    const status = await getSessionStatus();
    expect(status.active).toBe(false);
  });

  it("does not wipe an active session when cleanSession is called for an unrelated tab", async () => {
    const tab = { id: 108, url: "https://example.com", title: "Page" } as chrome.tabs.Tab;
    await startSession(tab);

    // Unrelated tab closure or navigation
    await cleanSession(999);

    const status = await getSessionStatus(108);
    expect(status.active).toBe(true);
    expect(status.tabId).toBe(108);

    // Matching tab closure or navigation cleans it
    await cleanSession(108);
    const afterStatus = await getSessionStatus(108);
    expect(afterStatus.active).toBe(false);
  });

  it("invalidates active session and records reason when target tab reloads", async () => {
    const tab = { id: 109, url: "https://example.com/form", title: "Form" } as chrome.tabs.Tab;
    await startSession(tab);

    // Unrelated tab reload does not invalidate
    await invalidateSession(999, "Page reloaded");
    const statusBefore = await getSessionStatus(109);
    expect(statusBefore.active).toBe(true);

    // Target tab reload invalidates session
    await invalidateSession(109, "Capture stopped because the page was reloaded or navigated.");
    const statusAfter = await getSessionStatus(109);
    expect(statusAfter.active).toBe(false);
    expect(statusAfter.invalidatedReason).toBe(
      "Capture stopped because the page was reloaded or navigated."
    );
  });

  it("cleans up expired session when starting a new session on the same tab", async () => {
    const tab = { id: 110, url: "https://example.com/page", title: "Page" } as chrome.tabs.Tab;
    const firstSession = await startSession(tab);

    // Artificially expire the session in storage
    const stored = await chromeMock.storage.session.get("buglens_active_session");
    const active = stored["buglens_active_session"] as CaptureSession;
    active.startedAt = Date.now() - 11 * 60 * 1000;
    await chromeMock.storage.session.set({ ["buglens_active_session"]: active });

    // Starting new session on same tab should clean up and produce new sessionToken
    const secondSession = await startSession(tab);
    expect(secondSession.tabId).toBe(110);
    expect(secondSession.sessionToken).not.toBe(firstSession.sessionToken);
  });

  it("rejects recorded events if sender tab ID does not match active session tab", async () => {
    const tab = { id: 111, url: "https://example.com", title: "Target" } as chrome.tabs.Tab;
    const sessionInfo = await startSession(tab);

    // Event sent from a different tab (e.g. tab 999)
    const result = await recordSessionEvent(
      sessionInfo.sessionToken,
      { type: "error", message: "Attack error" },
      999 // wrong sender tab
    );

    expect(result.ok).toBe(false);
    expect(result.error).toContain("sender tab does not match");

    // Event sent from the expected session tab (111)
    const validResult = await recordSessionEvent(
      sessionInfo.sessionToken,
      { type: "error", message: "Genuine error" },
      111
    );
    expect(validResult.ok).toBe(true);
  });

  it("captures context from session.tabId upon stop even if another tab is focused", async () => {
    const tab = { id: 112, url: "https://example.com/target", title: "Target App" } as chrome.tabs.Tab;
    await startSession(tab);

    // Mock chrome.tabs.query returning a DIFFERENT focused tab (e.g. user switched to tab 999)
    chromeMock.tabs.query.mockResolvedValue([
      { id: 999, url: "https://google.com", title: "Google" },
    ]);

    // Mock chrome.tabs.get returning target tab 112
    chromeMock.tabs.get.mockImplementation((id: number) => {
      if (id === 112) {
        return Promise.resolve({
          id: 112,
          url: "https://example.com/target",
          title: "Target App",
        });
      }
      return Promise.reject(new Error("Tab not found"));
    });

    const stopResult = await stopSession();
    expect(stopResult.context.url).toBe("https://example.com/target");
    expect(stopResult.context.title).toBe("Target App");
  });

  it("handles 10 concurrent event recordings without dropping or duplicating events", async () => {
    const tab = { id: 201, url: "https://example.com/concurrent", title: "Concurrent Test" } as chrome.tabs.Tab;
    const sessionInfo = await startSession(tab);

    // Fire 10 distinct events simultaneously using Promise.all
    const promises = Array.from({ length: 10 }).map((_, i) =>
      recordSessionEvent(
        sessionInfo.sessionToken,
        {
          type: "error",
          message: `Concurrent error ${i + 1}`,
          lineno: 100 + i,
        },
        201
      )
    );

    const results = await Promise.all(promises);
    for (const res of results) {
      expect(res.ok).toBe(true);
    }

    const status = await getSessionStatus(201);
    expect(status.eventCount).toBe(10);

    const stopResult = await stopSession();
    expect(stopResult.events.length).toBe(10);

    // Verify all 10 distinct messages are present without omissions
    const messages = stopResult.events.map((e) => e.message);
    for (let i = 1; i <= 10; i++) {
      expect(messages).toContain(`Concurrent error ${i}`);
    }

    // Verify all IDs are unique without duplicates
    const idSet = new Set(stopResult.events.map((e) => e.id));
    expect(idSet.size).toBe(10);
  });

  it("enforces the 20-event maximum under a concurrent burst exceeding the cap", async () => {
    const tab = { id: 202, url: "https://example.com/burst", title: "Burst Test" } as chrome.tabs.Tab;
    const sessionInfo = await startSession(tab);

    // Fire 25 events concurrently
    const promises = Array.from({ length: 25 }).map((_, i) =>
      recordSessionEvent(
        sessionInfo.sessionToken,
        {
          type: "error",
          message: `Burst error ${i + 1}`,
          lineno: 200 + i,
        },
        202
      )
    );

    const results = await Promise.all(promises);
    for (const res of results) {
      expect(res.ok).toBe(true);
    }

    const status = await getSessionStatus(202);
    expect(status.eventCount).toBe(20);

    const stopResult = await stopSession();
    expect(stopResult.events.length).toBe(20);
  });
});
