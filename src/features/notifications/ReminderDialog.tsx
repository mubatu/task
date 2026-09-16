import type { Item } from "../../../shared/contracts";
import { BellIcon, CheckIcon, CloseIcon } from "../../components/Icons";
import { formatDateTime } from "../../lib/dateTime";

interface ReminderDialogProps {
  item: Item;
  remainingCount: number;
  pending: boolean;
  onComplete: (item: Item) => void;
  onDismiss: () => void;
}

export function ReminderDialog({ item, remainingCount, pending, onComplete, onDismiss }: ReminderDialogProps) {
  return (
    <div className="reminder-backdrop">
      <section className="reminder-dialog" role="alertdialog" aria-modal="true" aria-labelledby="reminder-title">
        <button className="icon-button reminder-close" type="button" onClick={onDismiss} aria-label="Kapat"><CloseIcon /></button>
        <span className="reminder-bell"><BellIcon /></span>
        <p className="eyebrow">VAKTİ GELDİ</p>
        <h2 id="reminder-title">{item.title}</h2>
        {item.details && <p className="reminder-details">{item.details}</p>}
        {item.remindAt !== null && <time>{formatDateTime(item.remindAt)}</time>}
        {remainingCount > 1 && <span className="remaining-alerts">Ardından {remainingCount - 1} reminder daha var</span>}
        <div className="reminder-actions">
          <button className="button button--ghost" type="button" onClick={onDismiss}>Kapat</button>
          <button className="button button--danger" type="button" disabled={pending} onClick={() => onComplete(item)}>
            <CheckIcon /> {pending ? "Kaydediliyor…" : "Tamamlandı"}
          </button>
        </div>
      </section>
    </div>
  );
}
