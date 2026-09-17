import type { Metadata } from "next";
import { NovaShell } from "@/components/nova-shell";
import { CalendarPlanner } from "@/components/calendar-planner";

export const metadata: Metadata = { title: "Calendar" };

export default function CalendarPage() {
  return <NovaShell active="calendar"><CalendarPlanner /></NovaShell>;
}
