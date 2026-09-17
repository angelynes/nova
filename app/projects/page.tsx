import type { Metadata } from "next";
import { NovaShell } from "@/components/nova-shell";
import { ProjectsBoard } from "@/components/projects-board";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return <NovaShell active="projects"><ProjectsBoard /></NovaShell>;
}
