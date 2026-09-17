import type { ExternalCalendarEvent } from "./types";

function unfold(input: string) {
  return input.replace(/\r?\n[ \t]/g, "");
}

function parseDate(value: string) {
  const raw = value.trim();
  if (/^\d{8}$/.test(raw)) {
    const y = raw.slice(0, 4);
    const m = raw.slice(4, 6);
    const d = raw.slice(6, 8);
    return `${y}-${m}-${d}T00:00:00`;
  }
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!match) return "";
  const [, y, m, d, hh, mm, ss, z] = match;
  return `${y}-${m}-${d}T${hh}:${mm}:${ss}${z ? "Z" : ""}`;
}

function field(lines: string[], key: string) {
  const line = lines.find((item) => item.startsWith(`${key}:`) || item.startsWith(`${key};`));
  if (!line) return "";
  const idx = line.indexOf(":");
  return idx >= 0 ? line.slice(idx + 1).replace(/\\n/g, "\n").replace(/\\,/g, ",") : "";
}

export function parseIcs(input: string): ExternalCalendarEvent[] {
  const text = unfold(input);
  const blocks = text.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) ?? [];
  return blocks.flatMap((block, index) => {
    const lines = block.split(/\r?\n/);
    const title = field(lines, "SUMMARY") || "Untitled event";
    const startRaw = field(lines, "DTSTART");
    const endRaw = field(lines, "DTEND") || startRaw;
    const start = parseDate(startRaw);
    const end = parseDate(endRaw);
    if (!start || !end) return [];
    const uid = field(lines, "UID") || `ics-${Date.now()}-${index}`;
    return [{
      id: `ics-${uid}`,
      title,
      start,
      end,
      isAllDay: /^\d{8}$/.test(startRaw),
      calendarName: "Imported calendar",
      location: field(lines, "LOCATION") || undefined,
      notes: field(lines, "DESCRIPTION") || undefined,
      source: "ics" as const,
    }];
  });
}
