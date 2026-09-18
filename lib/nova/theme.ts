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
    categoryColors: ["#EEE8F7", "#E5DCF5", "#F5E5F1", "#E6EEF9", "#F7EEDC", "#E2F0E9", "#ECE5F8", "#F8E8EF"],
    habitColor: "#C9B7F1",
  },
  neutral: {
    name: "Minimal",
    description: "Clean, calm and gender neutral",
    preview: ["#2F3437", "#8C9497", "#E3E5E6", "#FAFAF9"],
    categoryColors: ["#ECEEEF", "#E5E9EA", "#EFECE7", "#E4ECE7", "#ECE9F0", "#F1E9E5", "#E4EBF0", "#F0EFE5"],
    habitColor: "#B8C2C4",
  },
  blush: {
    name: "Blush",
    description: "Baby pink pastel",
    preview: ["#704A5B", "#E8B8CC", "#FAE8F0", "#FFF9FB"],
    categoryColors: ["#F9E4EC", "#F6DCE7", "#FCEBF2", "#F4E3EA", "#F8E5DD", "#EDE5F1", "#FAE8E4", "#F5DFE8"],
    habitColor: "#F0BDD2",
  },
  aqua: {
    name: "Aqua",
    description: "Pastel turquoise blue",
    preview: ["#235E63", "#8ED6D2", "#D3EFED", "#F8FCFB"],
    categoryColors: ["#DDF3F1", "#D2EEEB", "#E1EFF7", "#DCEEEA", "#E8F3DD", "#E3EAF6", "#D5F2EF", "#E8F5F3"],
    habitColor: "#9EDDD8",
  },
};

export const THEME_IDS = Object.keys(THEME_META) as ThemeId[];
