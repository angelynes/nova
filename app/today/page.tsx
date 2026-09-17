import type { Metadata } from "next";
import { Suspense } from "react";
import { NovaShell } from "@/components/nova-shell";
import { TodayPlanner } from "@/components/today-planner";

export const metadata: Metadata = { title: "Today" };

export default function TodayPage() {
  return <NovaShell active="today"><Suspense fallback={<div className="loading-screen"><span className="brand-mark">NOVA</span><p>Opening your day…</p></div>}><TodayPlanner /></Suspense></NovaShell>;
}
