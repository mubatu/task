import { useEffect, useState, type FormEvent } from "react";
import type { CreateItemRequest, Item, ItemType } from "../../../shared/contracts";
import { BellIcon, CloseIcon, TaskIcon } from "../../components/Icons";
import { addRelativeDays, parseIstanbulDateTime, todayKey, toIstanbulDateTimeInput } from "../../lib/dateTime";
import "../../styles/items.css";

interface ItemFormDialogProps {
  onClose: () => void;
  item?: Item;
  onSave: (input: Omit<CreateItemRequest, "userId">) => Promise<unknown>;
}

export function ItemFormDialog({ onClose, onSave, item }: ItemFormDialogProps) {
  const [type, setType] = useState<ItemType>(item?.type ?? "task");
  const [title, setTitle] = useState(item?.title ?? "");
  const [details, setDetails] = useState(item?.details ?? "");
  const [taskDate, setTaskDate] = useState(item?.taskDate ?? "");
  const originalDateTime = item?.remindAt != null ? toIstanbulDateTimeInput(item.remindAt) : "";
  const [reminderMode, setReminderMode] = useState<"exact" | "relative">("exact");
  const [dateTime, setDateTime] = useState(originalDateTime);
  const [relativeDays, setRelativeDays] = useState("1");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, pending]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    let remindAt: number | null = null;
    if (type === "reminder") {
      if (reminderMode === "exact") {
        const unchangedTime = item?.remindAt != null && dateTime === originalDateTime;
        remindAt = unchangedTime ? item.remindAt : parseIstanbulDateTime(dateTime);
        if (remindAt === null || (!unchangedTime && remindAt <= Date.now())) {
          setError("Gelecekte bir tarih ve saat seçin.");
          return;
        }
      } else {
        const days = Number(relativeDays);
        if (!Number.isInteger(days) || days < 1 || days > 3650) {
          setError("1 ile 3650 arasında tam gün sayısı girin.");
          return;
        }
        remindAt = addRelativeDays(days);
      }
    }

    setPending(true);
    try {
      await onSave({
        type,
        title,
        details,
        taskDate: type === "task" && taskDate ? taskDate : null,
        remindAt,
      });
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Öğe kaydedilemedi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.currentTarget === event.target && !pending) onClose();
    }}>
      <section className="item-dialog" role="dialog" aria-modal="true" aria-labelledby="item-form-title">
        <header className="dialog-header">
          <div>
            <p className="eyebrow">{item ? "KAYDI DÜZENLE" : "YENİ KAYIT"}</p>
            <h2 id="item-form-title">{item ? "Kaydını düzenle" : "Aklındakini ekle"}</h2>
          </div>
          <button className="icon-button" type="button" disabled={pending} onClick={onClose} aria-label="Kapat"><CloseIcon /></button>
        </header>

        <form onSubmit={handleSubmit}>
          <fieldset className="item-form-fields" disabled={pending}>
            <div className="type-switch" role="group" aria-label="Kayıt türü">
              <button
                className={type === "task" ? "type-option type-option--active" : "type-option"}
                type="button"
                disabled={!!item}
                onClick={() => setType("task")}
              ><TaskIcon /> Task</button>
              <button
                className={type === "reminder" ? "type-option type-option--active" : "type-option"}
                type="button"
                disabled={!!item}
                onClick={() => setType("reminder")}
              ><BellIcon /> Reminder</button>
            </div>

            <label className="field">
              <span>Başlık</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
                required
                autoFocus
                placeholder={type === "task" ? "Ne yapılacak?" : "Neyi hatırlayalım?"}
              />
            </label>

            <label className="field">
              <span>Detay <small>Opsiyonel</small></span>
              <textarea
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                maxLength={1000}
                rows={3}
                placeholder="Kısa bir not ekleyin"
              />
            </label>

            {type === "task" ? (
              <label className="field">
                <span>Tarih <small>Opsiyonel</small></span>
                <input type="date" value={taskDate} onChange={(event) => setTaskDate(event.target.value)} />
              </label>
            ) : (
              <div className="reminder-fields">
                <div className="mode-switch" role="group" aria-label="Reminder zamanı türü">
                  <button type="button" className={reminderMode === "exact" ? "active" : ""} onClick={() => setReminderMode("exact")}>Tarih ve saat</button>
                  <button type="button" className={reminderMode === "relative" ? "active" : ""} onClick={() => setReminderMode("relative")}>X gün sonra</button>
                </div>
                {reminderMode === "exact" ? (
                  <label className="field">
                    <span>Hatırlatma zamanı</span>
                    <input
                      type="datetime-local"
                      min={item ? undefined : `${todayKey()}T00:00`}
                      value={dateTime}
                      onChange={(event) => setDateTime(event.target.value)}
                      required
                    />
                  </label>
                ) : (
                  <label className="field">
                    <span>Kaç gün sonra?</span>
                    <div className="days-field">
                      <input
                        type="number"
                        min="1"
                        max="3650"
                        step="1"
                        value={relativeDays}
                        onChange={(event) => setRelativeDays(event.target.value)}
                        required
                      />
                      <span>gün sonra</span>
                    </div>
                  </label>
                )}
              </div>
            )}

            {error && <p className="form-error" role="alert">{error}</p>}
            <footer className="dialog-actions">
              <button className="button button--ghost" type="button" onClick={onClose}>Vazgeç</button>
              <button className="button button--primary" type="submit" disabled={pending || !title.trim()}>
                {pending ? "Kaydediliyor…" : item ? "Kaydet" : "Ekle"}
              </button>
            </footer>
          </fieldset>
        </form>
      </section>
    </div>
  );
}
