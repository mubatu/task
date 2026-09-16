PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name_key TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL
);

CREATE TABLE items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('task', 'reminder')),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
  details TEXT NOT NULL DEFAULT '' CHECK (length(details) <= 1000),
  task_date TEXT,
  remind_at_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL,
  completed_at_ms INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CHECK (
    (type = 'task' AND remind_at_ms IS NULL) OR
    (type = 'reminder' AND task_date IS NULL AND remind_at_ms IS NOT NULL)
  ),
  CHECK (
    (status = 'active' AND completed_at_ms IS NULL) OR
    (status = 'completed' AND completed_at_ms IS NOT NULL)
  )
);

CREATE INDEX items_user_status_created
  ON items(user_id, status, created_at_ms);

CREATE INDEX items_active_reminder_time
  ON items(user_id, remind_at_ms)
  WHERE status = 'active' AND type = 'reminder';

CREATE INDEX items_active_task_date
  ON items(user_id, task_date)
  WHERE status = 'active' AND type = 'task' AND task_date IS NOT NULL;

CREATE INDEX items_completed_time
  ON items(user_id, completed_at_ms)
  WHERE status = 'completed';
