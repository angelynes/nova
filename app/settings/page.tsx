import type { Metadata } from "next";
import { NovaShell } from "@/components/nova-shell";
import { SettingsPanel } from "@/components/settings-panel";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return <NovaShell active="settings"><SettingsPanel /></NovaShell>;
}
