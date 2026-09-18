import type { ThemeId } from "./types";

export const THEME_META: Record<ThemeId, {
  name: string;
  description: string;
  preview: string[];
  categoryColors: string[];
  habitColor: string;
}> = {
  lavender: {
    name: "Lavender",
    description: "Soft, feminine lavender",
    preview: ["#42326E", "#B29CE4", "#E0D4FC", "#FAF9FC"],
    categoryColors: ["#D7C8ED", "#B29CE4", "#E8CFE5", "#C9D8EE", "#E6D7B8", "#BFD8CE", "#D9C7EF", "#F0D6E4"],
    habitColor: "#C9B7F1",
  },
  neutral: {
    name: "Minimal",
    description: "Clean, calm and gender neutral",
    preview: ["#2F3437", "#8C9497", "#E3E5E6", "#FAFAF9"],
    categoryColors: ["#D8DCDD", "#BFC7C9", "#D9D4CB", "#C8D1CB", "#D4D0DC", "#E2D5CF", "#C7D3DB", "#DFDECE"],
    habitColor: "#B8C2C4",
  },
  blush: {
    name: "Blush",
    description: "Baby pink pastel",
    preview: ["#704A5B", "#E8B8CC", "#FAE8F0", "#FFF9FB"],
    categoryColors: ["#F2C9D9", "#E8B8CC", "#F7D9E5", "#E6CBD6", "#F0CDBF", "#D9CEDF", "#F4D6D0", "#E7BFD0"],
    habitColor: "#F0BDD2",
  },
  aqua: {
    name: "Aqua",
    description: "Pastel turquoise blue",
    preview: ["#235E63", "#8ED6D2", "#D3EFED", "#F8FCFB"],
    categoryColors: ["#BFE6E3", "#8ED6D2", "#C7DFEC", "#BBD8D2", "#D7E8C8", "#C9D4E8", "#A9DDD7", "#D5E9E7"],
    habitColor: "#9EDDD8",
  },
};

export const THEME_IDS = Object.keys(THEME_META) as ThemeId[];
