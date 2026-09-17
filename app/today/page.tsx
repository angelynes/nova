import type { Metadata } from "next";
import { NovaShell } from "@/components/nova-shell";
import { TodayPlanner } from "@/components/today-planner";

export const metadata: Metadata = { title: "Today" };

export default function TodayPage() {
  return <NovaShell active="today"><TodayPlanner /></NovaShell>;
}
