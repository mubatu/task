import { useEffect, useRef } from "react";
import type { CreateItemRequest, Item } from "../../shared/contracts";

type CreateItemAction = (input: Omit<CreateItemRequest, "userId">) => Promise<Item>;

export function useWebMcp(items: Item[], createItem: CreateItemAction): void {
  const itemsRef = useRef(items);
  const createItemRef = useRef(createItem);
  itemsRef.current = items;
  createItemRef.current = createItem;

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    const register = async () => {
      await context.registerTool({
        name: "list_active_items",
        title: "List active tasks and reminders",
        description: "Return the current profile's active tasks and reminders.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: () => ({ items: itemsRef.current }),
      }, { signal: lifecycle.signal });

      await context.registerTool({
        name: "create_item",
        title: "Create a task or reminder",
        description: "Create a task with an optional YYYY-MM-DD date or a reminder with a future UTC timestamp in milliseconds.",
        inputSchema: {
          type: "object",
          properties: {
            type: { type: "string", enum: ["task", "reminder"] },
            title: { type: "string", minLength: 1, maxLength: 120 },
            details: { type: "string", maxLength: 1000 },
            taskDate: { type: ["string", "null"] },
            remindAt: { type: ["number", "null"] },
          },
          required: ["type", "title"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        async execute(rawInput) {
          if (typeof rawInput !== "object" || rawInput === null) throw new Error("Input must be an object.");
          const input = rawInput as Record<string, unknown>;
          if (input.type !== "task" && input.type !== "reminder") throw new Error("Type must be task or reminder.");
          if (typeof input.title !== "string" || !input.title.trim()) throw new Error("Title is required.");
          const created = await createItemRef.current({
            type: input.type,
            title: input.title,
            details: typeof input.details === "string" ? input.details : "",
            taskDate: input.type === "task" && typeof input.taskDate === "string" ? input.taskDate : null,
            remindAt: input.type === "reminder" && typeof input.remindAt === "number" ? input.remindAt : null,
          });
          return { id: created.id, status: created.status, type: created.type };
        },
      }, { signal: lifecycle.signal });
    };

    void register().catch((error) => console.error("WebMCP tool registration failed.", error));
    return () => lifecycle.abort();
  }, []);
}
