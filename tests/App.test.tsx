import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Item } from "../shared/contracts";
import { App } from "../src/App";

const profile = { id: "123e4567-e89b-42d3-a456-426614174000", displayName: "Batu" };
const item: Item = {
  id: "123e4567-e89b-42d3-a456-426614174001",
  userId: profile.id,
  type: "task",
  title: "Planı hazırla",
  details: "",
  taskDate: null,
  remindAt: null,
  status: "active",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  completedAt: null,
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function stubGoogleIdentity() {
  let callback: ((response: { credential?: string }) => void) | null = null;
  const accountsId = {
    initialize: vi.fn((config: { callback: typeof callback }) => {
      callback = config.callback;
    }),
    renderButton: vi.fn(),
    disableAutoSelect: vi.fn(),
  };
  vi.stubGlobal("google", { accounts: { id: accountsId } });
  return { accountsId, signIn: (credential: string) => callback?.({ credential }) };
}

const loginCopy = /Başlamak için Google hesabınla giriş yap/;

afterEach(() => {
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});

describe("App session handling", () => {
  it("shows a retry button when the session check fails", async () => {
    const user = userEvent.setup();
    stubGoogleIdentity();
    let attempts = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      attempts += 1;
      if (attempts === 1) throw new TypeError("Failed to fetch");
      return jsonResponse({ user: null, googleClientId: "client-id" });
    }));

    render(<App />);
    expect(screen.getByText("Yükleniyor…")).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Tekrar dene" }));

    expect(await screen.findByText(loginCopy)).toBeInTheDocument();
  });

  it("signs out through the API and disables Google auto-select", async () => {
    const user = userEvent.setup();
    const google = stubGoogleIdentity();
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/auth/session") return jsonResponse({ user: profile, googleClientId: "client-id" });
      if (url === "/api/auth/logout") return jsonResponse({ ok: true });
      return jsonResponse({ serverTime: new Date().toISOString(), items: [item] });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);
    expect(await screen.findByText(item.title)).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Çıkış yap" })[0]);

    expect(await screen.findByText(loginCopy)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", expect.objectContaining({ method: "POST" }));
    expect(google.accountsId.disableAutoSelect).toHaveBeenCalled();
  });

  it("returns to sign-in when a data request reports an expired session", async () => {
    stubGoogleIdentity();
    const fetchMock = vi.fn(async (url: string) => {
      if (url === "/api/auth/session") return jsonResponse({ user: profile, googleClientId: "client-id" });
      return jsonResponse({ error: "Sign in to continue." }, 401);
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<App />);

    expect(await screen.findByText(loginCopy)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/items?status=active", expect.anything());
    expect(fetchMock.mock.calls.filter(([url]) => String(url).startsWith("/api/items"))).toHaveLength(2);
  });

  it("returns to sign-in when saving a change reports an expired session", async () => {
    const user = userEvent.setup();
    stubGoogleIdentity();
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/auth/session") return jsonResponse({ user: profile, googleClientId: "client-id" });
      if (init?.method === "PATCH") return jsonResponse({ error: "Sign in to continue." }, 401);
      return jsonResponse({ serverTime: new Date().toISOString(), items: [item] });
    }));

    render(<App />);
    expect(await screen.findByText(item.title)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Tamamla" }));

    expect(await screen.findByText(loginCopy)).toBeInTheDocument();
    expect(screen.queryByText("Sign in to continue.")).not.toBeInTheDocument();
  });

  it("starts over when the Google credential expires during profile setup", async () => {
    const user = userEvent.setup();
    const google = stubGoogleIdentity();
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "/api/auth/session") return jsonResponse({ user: null, googleClientId: "client-id" });
      const body = JSON.parse(String(init?.body));
      return body.profile
        ? jsonResponse({ error: "Google sign-in could not be verified. Try again." }, 401)
        : jsonResponse({ status: "needs_profile", suggestedName: "Batu" });
    }));

    render(<App />);
    await waitFor(() => expect(google.accountsId.renderButton).toHaveBeenCalled());
    act(() => google.signIn("google-token"));
    await user.click(await screen.findByRole("button", { name: "Hayır, yeni başlıyorum" }));
    await user.click(screen.getByRole("button", { name: "Devam et" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Google sign-in could not be verified. Try again.");
    expect(screen.queryByLabelText("Adın")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Gizlilik politikası" })).toHaveAttribute("href", "/privacy");
  });
});
