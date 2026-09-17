import type { Metadata, Viewport } from "next";
import "./globals.css";
import { NovaProvider } from "@/components/nova-provider";
import { ReminderWatcher } from "@/components/reminder-watcher";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: { default: "NOVA Planner", template: "%s · NOVA" },
  description: "A calm personal planner for your day, projects, habits and calendar.",
  applicationName: "NOVA",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "NOVA" },
};

export const viewport: Viewport = {
  themeColor: "#FAF9FC",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <NovaProvider>
          <PwaRegister />
          <ReminderWatcher />
          {children}
        </NovaProvider>
      </body>
    </html>
  );
}
