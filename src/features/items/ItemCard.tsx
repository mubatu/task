import type { Item } from "../../../shared/contracts";
import { CalendarIcon, CheckIcon, ClockIcon, TaskIcon } from "../../components/Icons";
import { formatDate, formatDateTime } from "../../lib/dateTime";

interface ItemCardProps {
  item: Item;
  overdue?: boolean;
  actionLabel?: string;
  pending?: boolean;
  onAction: (item: Item) => void;
}

export function ItemCard({ item, overdue = false, actionLabel = "Tamamla", pending, onAction }: ItemCardProps) {
  return (
    <article className={overdue ? "item-card item-card--overdue" : "item-card"}>
      <div className={item.type === "reminder" ? "item-icon item-icon--reminder" : "item-icon"}>
        {item.type === "reminder" ? <ClockIcon /> : <TaskIcon />}
      </div>
      <div className="item-body">
        <div className="item-heading">
          <span className="item-kind">{item.type === "reminder" ? "Reminder" : "Task"}</span>
          {overdue && <span className="overdue-label">Vakti geldi</span>}
        </div>
        <h3>{item.title}</h3>
        {item.details && <p>{item.details}</p>}
        <div className="item-meta">
          {item.type === "reminder" && item.remindAt !== null && (
            <span><ClockIcon /> {formatDateTime(item.remindAt)}</span>
          )}
          {item.type === "task" && item.taskDate && (
            <span><CalendarIcon /> {formatDate(item.taskDate, { year: undefined })}</span>
          )}
          {item.type === "task" && !item.taskDate && <span>Tarih yok</span>}
        </div>
      </div>
      <button
        className="item-action"
        type="button"
        disabled={pending}
        onClick={() => onAction(item)}
      >
        <CheckIcon />
        <span>{pending ? "Kaydediliyor…" : actionLabel}</span>
      </button>
    </article>
  );
}
