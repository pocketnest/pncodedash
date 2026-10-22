import { ClickUpTicket } from "@/lib/features";

const API_ROOT = "https://api.clickup.com/api/v2";

type ClickUpTask = {
  id?: unknown;
  name?: unknown;
  url?: unknown;
  status?: { status?: unknown };
  assignees?: { username?: unknown }[];
};

export class ClickUpReadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClickUpReadError";
  }
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function ticketFromClickUpTask(task: ClickUpTask): ClickUpTicket | null {
  const id = text(task.id);
  const name = text(task.name);
  if (!id || !name) return null;

  const assignees = (task.assignees ?? [])
    .map((person) => text(person.username))
    .filter(Boolean);

  return {
    id,
    name,
    status: text(task.status?.status) || "Unknown",
    url: text(task.url) || `https://app.clickup.com/t/${id}`,
    assignees: assignees.join(", ") || "Unassigned",
  };
}

async function tasksForTag(token: string, teamId: string, tag: string) {
  const tickets: ClickUpTicket[] = [];
  const seen = new Set<string>();

  for (let page = 0; page < 5; page += 1) {
    const params = new URLSearchParams();
    params.append("tags[]", tag);
    params.append("tags[]", `feature:${tag}`);
    params.set("page", String(page));
    params.set("subtasks", "true");

    const response = await fetch(
      `${API_ROOT}/team/${encodeURIComponent(teamId)}/task?${params}`,
      {
        headers: {
          Authorization: token,
          "User-Agent": "pncodedash",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      throw new ClickUpReadError(
        response.status === 401
          ? "ClickUp rejected the API token."
          : `ClickUp returned ${response.status} while reading tasks tagged ${tag}.`,
      );
    }

    const body = (await response.json()) as { tasks?: ClickUpTask[] };
    const tasks = body.tasks ?? [];
    for (const task of tasks) {
      const ticket = ticketFromClickUpTask(task);
      if (!ticket || seen.has(ticket.id)) continue;
      seen.add(ticket.id);
      tickets.push(ticket);
    }
    if (tasks.length < 100) break;
  }

  return tickets;
}

export async function loadTicketsForFeatures(
  token: string,
  teamId: string,
  featureIds: string[],
) {
  const ids = [...new Set(featureIds.filter(Boolean))];
  const entries = await Promise.all(
    ids.map(async (id) => [id, await tasksForTag(token, teamId, id)] as const),
  );
  return Object.fromEntries(entries) as Record<string, ClickUpTicket[]>;
}
