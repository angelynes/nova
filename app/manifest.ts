import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NOVA Planner",
    short_name: "NOVA",
    description: "A calm personal planner for tasks, projects, habits and time.",
    start_url: "/today",
    display: "standalone",
    background_color: "#FAF9FC",
    theme_color: "#42326E",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
