export const STATUS_ORDER = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"];

export const STATUS = {
  BACKLOG: { label: "Backlog", dot: "bg-status-backlog" },
  TODO: { label: "To do", dot: "bg-status-todo" },
  IN_PROGRESS: { label: "In progress", dot: "bg-status-progress" },
  IN_REVIEW: { label: "In review", dot: "bg-status-review" },
  DONE: { label: "Done", dot: "bg-status-done" },
};

export const PRIORITY = {
  LOWEST: { label: "Lowest", level: 1, color: "text-priority-low" },
  LOW: { label: "Low", level: 2, color: "text-priority-low" },
  MEDIUM: { label: "Medium", level: 3, color: "text-priority-medium" },
  HIGH: { label: "High", level: 4, color: "text-priority-high" },
  HIGHEST: { label: "Highest", level: 5, color: "text-priority-highest" },
};