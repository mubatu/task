import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LoginPage } from "../src/features/auth/LoginPage";

describe("LoginPage", () => {
  it("opens a profile with the entered name", async () => {
    const user = userEvent.setup();
    const onLogin = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "123e4567-e89b-42d3-a456-426614174000",
        displayName: "Batu",
      }),
    }));

    render(<LoginPage onLogin={onLogin} />);
    await user.type(screen.getByLabelText("Adın"), "Batu");
    await user.click(screen.getByRole("button", { name: "Devam et" }));

    expect(onLogin).toHaveBeenCalledWith(expect.objectContaining({ displayName: "Batu" }));
    vi.unstubAllGlobals();
  });
});
