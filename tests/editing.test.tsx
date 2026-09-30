import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Item } from "../shared/contracts";
import { App } from "../src/App";
import { saveProfile } from "../src/features/auth/profileStorage";
import { ItemFormDialog } from "../src/features/items/ItemFormDialog";
import { useReminderAlerts } from "../src/features/notifications/useReminderAlerts";
import { todayKey, toIstanbulDateTimeInput } from "../src/lib/dateTime";

const item: Item = {
  id: "123e4567-e89b-42d3-a456-426614174001",
  userId: "123e4567-e89b-42d3-a456-426614174000",
  type: "reminder",
  title: "Miniş ile buluşma",
  details: "Kahve içelim",
  taskDate: null,
  remindAt: Date.now() + 86_400_000,
  status: "active",
  createdAt: Date.now(),
  updatedAt: Date.now(),
  completedAt: null,
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});

describe("editing items", () => {
  it.each(["/", "/calendar", "/completed"])("saves edits from %s and keeps them after reload", async (route) => {
    const user = userEvent.setup();
    let stored = route === "/completed"
      ? { ...item, status: "completed" as const, completedAt: item.createdAt }
      : { ...item };
    if (route === "/calendar") stored.remindAt = Date.now() + 60_000;
    saveProfile({ id: item.userId, displayName: "Miniş" });
    window.history.replaceState({}, "", route);
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        stored = { ...stored, ...JSON.parse(init.body as string), updatedAt: Date.now() };
        return { ok: true, json: async () => stored };
      }
      const status = new URL(url, "http://localhost").searchParams.get("status");
      return { ok: true, json: async () => ({ serverTime: new Date().toISOString(), items: status === stored.status ? [stored] : [] }) };
    });
    vi.stubGlobal("fetch", fetchMock);

    const view = render(<App />);
    await user.click(await screen.findByRole("button", { name: `${item.title} kaydını düzenle` }));
    expect(screen.getByLabelText("Başlık")).toHaveValue(item.title);
    expect(screen.getByLabelText(/Detay/)).toHaveValue(item.details);
    expect(screen.getByLabelText("Hatırlatma zamanı")).toHaveValue(toIstanbulDateTimeInput(stored.remindAt!));
    const newTime = "2099-10-01T18:45";
    fireEvent.change(screen.getByLabelText("Hatırlatma zamanı"), { target: { value: newTime } });
    await user.clear(screen.getByLabelText("Başlık"));
    await user.type(screen.getByLabelText("Başlık"), "Akşam buluşması");
    await user.click(screen.getByRole("button", { name: "Kaydet" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    expect(fetchMock).toHaveBeenCalledWith(`/api/items/${item.id}`, expect.objectContaining({ method: "PATCH" }));
    expect(stored).toMatchObject({ id: item.id, title: "Akşam buluşması", remindAt: Date.parse("2099-10-01T15:45:00Z") });
    expect(stored.status).toBe(route === "/completed" ? "completed" : "active");
    view.unmount();
    render(<App />);
    // The calendar remains on the original day after moving the item to another date.
    if (route === "/calendar") {
      await waitFor(() => expect(screen.getByLabelText(`${todayKey()}, 0 kayıt`)).toBeInTheDocument());
    } else {
      expect(await screen.findByRole("heading", { name: "Akşam buluşması" })).toBeInTheDocument();
    }
  });

  it("allows changing or clearing a task date", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ItemFormDialog item={{ ...item, type: "task", taskDate: "2026-10-01", remindAt: null }} onSave={onSave} onClose={vi.fn()} />);
    expect(screen.getByLabelText(/Tarih/)).toHaveValue("2026-10-01");
    fireEvent.change(screen.getByLabelText(/Tarih/), { target: { value: "2026-10-03" } });
    await user.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ taskDate: "2026-10-03", remindAt: null }));
    fireEvent.change(screen.getByLabelText(/Tarih/), { target: { value: "" } });
    await user.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(onSave).toHaveBeenLastCalledWith(expect.objectContaining({ taskDate: null }));
  });

  it("preserves the exact overdue timestamp when only the title changes", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const pastTime = Date.now() - 86_400_123;
    render(<ItemFormDialog item={{ ...item, remindAt: pastTime }} onSave={onSave} onClose={vi.fn()} />);
    await user.type(screen.getByLabelText("Başlık"), " güncellendi");
    await user.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ remindAt: pastTime }));
  });

  it("rejects a newly chosen past reminder time", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ItemFormDialog item={item} onSave={onSave} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Hatırlatma zamanı"), { target: { value: "2020-01-01T12:00" } });
    await user.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Gelecekte bir tarih ve saat seçin.");
    expect(onSave).not.toHaveBeenCalled();
  });

  it("retains edits after a save failure and allows retrying", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSave = vi.fn().mockRejectedValueOnce(new Error("Bağlantı yok")).mockResolvedValueOnce(undefined);
    render(<ItemFormDialog item={item} onSave={onSave} onClose={onClose} />);
    await user.type(screen.getByLabelText("Başlık"), " güncellendi");
    await user.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Bağlantı yok");
    expect(screen.getByLabelText("Başlık")).toHaveValue(`${item.title} güncellendi`);
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Kaydet" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("cancels without saving", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const onClose = vi.fn();
    render(<ItemFormDialog item={item} onSave={onSave} onClose={onClose} />);
    await user.type(screen.getByLabelText("Başlık"), " güncellendi");
    await user.click(screen.getByRole("button", { name: "Vazgeç" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("still creates new tasks", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ItemFormDialog onSave={onSave} onClose={vi.fn()} />);
    await user.type(screen.getByLabelText("Başlık"), "Yeni task");
    await user.click(screen.getByRole("button", { name: "Ekle" }));
    expect(onSave).toHaveBeenCalledWith({ type: "task", title: "Yeni task", details: "", taskDate: null, remindAt: null });
  });
});

describe("edited reminder alerts", () => {
  it("removes a rescheduled alert and alerts again at the new time", () => {
    const nowMs = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(nowMs);
    const due = { ...item, remindAt: nowMs - 1000 };
    const { result, rerender } = renderHook(({ items }) => useReminderAlerts(items, 0), { initialProps: { items: [due] } });
    expect(result.current.currentAlert?.id).toBe(item.id);
    const moved = { ...due, remindAt: Date.now() + 60_000, updatedAt: due.updatedAt + 1 };
    rerender({ items: [moved] });
    expect(result.current.currentAlert).toBeNull();
    clock.mockReturnValue(nowMs + 60_001);
    rerender({ items: [{ ...moved }] });
    expect(result.current.currentAlert?.id).toBe(item.id);
  });

  it("refreshes queued details without alerting again after a title-only edit", () => {
    const due = { ...item, remindAt: Date.now() - 1000 };
    const { result, rerender } = renderHook(({ items }) => useReminderAlerts(items, 0), { initialProps: { items: [due] } });
    const edited = { ...due, title: "Yeni başlık", updatedAt: due.updatedAt + 1 };
    rerender({ items: [edited] });
    expect(result.current.currentAlert?.title).toBe("Yeni başlık");
    act(() => result.current.dismissCurrent());
    rerender({ items: [{ ...edited, updatedAt: edited.updatedAt + 1 }] });
    expect(result.current.currentAlert).toBeNull();
  });
});
