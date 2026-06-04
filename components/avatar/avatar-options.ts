export type AvatarConfig = {
  avatar_base: string;
  skin_tone: string;
  hair_style: string;
  hair_color: string;
  kit_primary_color: string;
  kit_secondary_color: string;
  kit_pattern: string;
  badge_shape: string;
  celebration_style: string;
};

export const defaultAvatarConfig: AvatarConfig = {
  avatar_base: "captain",
  skin_tone: "#b98962",
  hair_style: "short",
  hair_color: "#2d1c13",
  kit_primary_color: "#35e0a1",
  kit_secondary_color: "#62b5ff",
  kit_pattern: "sash",
  badge_shape: "shield",
  celebration_style: "trophy_lift",
};

export const skinTones = ["#f0c7a2", "#d1a178", "#b98962", "#8f5f3e", "#5f3828"];

export const hairColors = ["#20140f", "#5b3423", "#98633d", "#e0b55e", "#eef2f7"];

export const kitPalettes = [
  { name: "Maple Rush", primary: "#d9273e", secondary: "#f1f7ff" },
  { name: "Pacific Volt", primary: "#35e0a1", secondary: "#0b1f36" },
  { name: "Skyline", primary: "#62b5ff", secondary: "#f7c948" },
  { name: "Night Gold", primary: "#101d2f", secondary: "#f7c948" },
  { name: "Coral Press", primary: "#ff7a90", secondary: "#b69cff" },
];

export const celebrations = [
  { value: "trophy_lift", label: "Trophy lift" },
  { value: "slide", label: "Knee slide" },
  { value: "badge_tap", label: "Badge tap" },
  { value: "arms_wide", label: "Arms wide" },
];
