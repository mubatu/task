import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LoginPage } from "../src/features/auth/LoginPage";

const profile = {
  id: "123e4567-e89b-42d3-a456-426614174000",
  displayName: "Batu",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stubGoogleIdentity() {
  let callback: ((response: { credential?: string }) => void) | null = null;
  const renderButton = vi.fn();
  vi.stubGlobal("google", {
    accounts: {
      id: {
        initialize: vi.fn((config: { callback: typeof callback }) => {
          callback = config.callback;
        }),
        renderButton,
        disableAutoSelect: vi.fn(),
      },
    },
  });
  return {
    renderButton,
    signIn: (credential: string) => callback?.({ credential }),
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("LoginPage", () => {
  it("signs in directly when the Google account is already linked", async () => {
    const google = stubGoogleIdentity();
    const onLogin = vi.fn();
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ status: "signed_in", user: profile })));

    render(<LoginPage googleClientId="client-id" onLogin={onLogin} />);
    await waitFor(() => expect(google.renderButton).toHaveBeenCalled());
    act(() => google.signIn("google-token"));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(profile));
  });

  it("links an existing name profile on first Google sign-in", async () => {
    const user = userEvent.setup();
    const google = stubGoogleIdentity();
    const onLogin = vi.fn();
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      return jsonResponse(body.profile
        ? { status: "signed_in", user: profile }
        : { status: "needs_profile", suggestedName: "Batu Han" });
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<LoginPage googleClientId="client-id" onLogin={onLogin} />);
    await waitFor(() => expect(google.renderButton).toHaveBeenCalled());
    act(() => google.signIn("google-token"));

    await user.click(await screen.findByRole("button", { name: "Evet, eski profilimi bağla" }));
    await user.type(screen.getByLabelText("Daha önce kullandığın ad"), "Batu");
    await user.click(screen.getByRole("button", { name: "Devam et" }));

    await waitFor(() => expect(onLogin).toHaveBeenCalledWith(profile));
    expect(fetchMock).toHaveBeenLastCalledWith("/api/auth/google", expect.objectContaining({
      body: JSON.stringify({ credential: "google-token", profile: { mode: "claim", name: "Batu" } }),
    }));
  });

  it("prefills the Google name for a new profile", async () => {
    const user = userEvent.setup();
    const google = stubGoogleIdentity();
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ status: "needs_profile", suggestedName: "Batu Han" })));

    render(<LoginPage googleClientId="client-id" onLogin={vi.fn()} />);
    await waitFor(() => expect(google.renderButton).toHaveBeenCalled());
    act(() => google.signIn("google-token"));
    await user.click(await screen.findByRole("button", { name: "Hayır, yeni başlıyorum" }));

    expect(screen.getByLabelText("Adın")).toHaveValue("Batu Han");
  });

  it("explains when Google sign-in is not configured", () => {
    render(<LoginPage googleClientId={null} onLogin={vi.fn()} />);
    expect(screen.getByText("Google girişi henüz yapılandırılmadı.")).toBeInTheDocument();
  });
});
