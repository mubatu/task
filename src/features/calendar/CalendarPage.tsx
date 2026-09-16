import { useMemo, useState } from "react";
import type { Item } from "../../../shared/contracts";
import { ChevronLeftIcon, ChevronRightIcon, PlusIcon } from "../../components/Icons";
import {
  buildCalendarDays,
  currentMonthKey,
  formatTime,
  monthTitle,
  shiftMonth,
  todayKey,
} from "../../lib/dateTime";
import { isItemOverdue, itemDateKey } from "../items/itemGroups";
import { ItemCard } from "../items/ItemCard";
import "../../styles/calendar.css";

interface CalendarPageProps {
  items: Item[];
  nowMs: number;
  pendingItemId: string | null;
  onAdd: () => void;
  onComplete: (item: Item) => void;
}

const weekDays = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export function CalendarPage({ items, nowMs, pendingItemId, onAdd, onComplete }: CalendarPageProps) {
  const currentDateKey = todayKey(nowMs);
  const [month, setMonth] = useState(() => currentMonthKey(nowMs));
  const [selectedDate, setSelectedDate] = useState(currentDateKey);
  const days = useMemo(() => buildCalendarDays(month), [month]);
  const itemsByDate = useMemo(() => {
    const groups = new Map<string, Item[]>();
    for (const item of items) {
      const dateKey = itemDateKey(item);
      if (!dateKey) continue;
      groups.set(dateKey, [...(groups.get(dateKey) ?? []), item]);
    }
    return groups;
  }, [items]);
  const selectedItems = itemsByDate.get(selectedDate) ?? [];

  function moveMonth(amount: number) {
    const nextMonth = shiftMonth(month, amount);
    setMonth(nextMonth);
    setSelectedDate(`${nextMonth}-01`);
  }

  function returnToToday() {
    setMonth(currentDateKey.slice(0, 7));
    setSelectedDate(currentDateKey);
  }

  return (
    <div className="page-content calendar-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">AYLIK GÖRÜNÜM</p>
          <h1>Takvim</h1>
          <p>Task ve reminder'larınızı gün gün görün.</p>
        </div>
        <button className="button button--primary desktop-add" type="button" onClick={onAdd}><PlusIcon /> Yeni ekle</button>
      </header>

      <section className="calendar-panel">
        <header className="calendar-toolbar">
          <button className="icon-button" type="button" onClick={() => moveMonth(-1)} aria-label="Önceki ay"><ChevronLeftIcon /></button>
          <h2>{monthTitle(month)}</h2>
          <button className="icon-button" type="button" onClick={() => moveMonth(1)} aria-label="Sonraki ay"><ChevronRightIcon /></button>
          <button className="today-button" type="button" onClick={returnToToday}>Bugün</button>
        </header>

        <div className="calendar-grid calendar-weekdays" aria-hidden="true">
          {weekDays.map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="calendar-grid calendar-days">
          {days.map((day) => {
            const dayItems = itemsByDate.get(day.dateKey) ?? [];
            const hasOverdue = dayItems.some((item) => isItemOverdue(item, nowMs, currentDateKey));
            const classNames = [
              "calendar-day",
              !day.isCurrentMonth && "calendar-day--muted",
              day.dateKey === currentDateKey && "calendar-day--today",
              day.dateKey === selectedDate && "calendar-day--selected",
            ].filter(Boolean).join(" ");
            return (
              <button
                key={day.dateKey}
                className={classNames}
                type="button"
                onClick={() => setSelectedDate(day.dateKey)}
                aria-label={`${day.dateKey}, ${dayItems.length} kayıt`}
              >
                <span className="day-number">{day.dayNumber}</span>
                <div className="day-items">
                  {dayItems.slice(0, 3).map((item) => (
                    <span key={item.id} className={`${item.type === "reminder" ? "day-item day-item--reminder" : "day-item"}${isItemOverdue(item, nowMs, currentDateKey) ? " day-item--overdue" : ""}`}>
                      {item.type === "reminder" && item.remindAt !== null ? `${formatTime(item.remindAt)} ` : ""}{item.title}
                    </span>
                  ))}
                  {dayItems.length > 3 && <span className="more-items">+{dayItems.length - 3} daha</span>}
                </div>
                {dayItems.length > 0 && (
                  <span className={hasOverdue ? "mobile-day-dot mobile-day-dot--overdue" : "mobile-day-dot"}>{dayItems.length}</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="selected-day-section">
        <header><h2>{selectedDate === currentDateKey ? "Bugün" : selectedDate}</h2><span>{selectedItems.length}</span></header>
        {selectedItems.length === 0 ? (
          <p className="selected-day-empty">Bu gün için kayıt yok.</p>
        ) : (
          <div className="item-list">
            {selectedItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                overdue={isItemOverdue(item, nowMs, currentDateKey)}
                pending={pendingItemId === item.id}
                onAction={onComplete}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
