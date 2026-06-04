"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const placeholderAvatarDefaults = {
  avatar_base: "placeholder",
  skin_tone: "#273353",
  hair_style: "placeholder",
  hair_color: "#111a33",
  kit_primary_color: "#5b6cff",
  kit_secondary_color: "#d8ad4c",
  kit_pattern: "solid",
  badge_shape: "shield",
  celebration_style: "clean",
};

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function saveProfile(formData: FormData) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) redirect("/login?message=Please%20sign%20in%20first");

  const displayName = text(formData, "display_name") || data.user.email?.split("@")[0] || "Player";
  const department = text(formData, "department");
  const favoriteCountry = text(formData, "favorite_country");
  const favoriteTeamRaw = text(formData, "favorite_team_id");
  const favoriteTeamId = favoriteTeamRaw ? Number(favoriteTeamRaw) : null;

  await supabase.from("profiles").upsert({
    id: data.user.id,
    email: data.user.email ?? "",
    display_name: displayName,
    department,
    favorite_country: favoriteCountry,
    favorite_team_id: Number.isFinite(favoriteTeamId) ? favoriteTeamId : null,
  });

  await supabase.from("user_avatars").upsert(
    {
      user_id: data.user.id,
      avatar_base: text(formData, "avatar_base") || placeholderAvatarDefaults.avatar_base,
      skin_tone: text(formData, "skin_tone") || placeholderAvatarDefaults.skin_tone,
      hair_style: text(formData, "hair_style") || placeholderAvatarDefaults.hair_style,
      hair_color: text(formData, "hair_color") || placeholderAvatarDefaults.hair_color,
      kit_primary_color: text(formData, "kit_primary_color") || placeholderAvatarDefaults.kit_primary_color,
      kit_secondary_color: text(formData, "kit_secondary_color") || placeholderAvatarDefaults.kit_secondary_color,
      kit_pattern: text(formData, "kit_pattern") || placeholderAvatarDefaults.kit_pattern,
      badge_shape: text(formData, "badge_shape") || placeholderAvatarDefaults.badge_shape,
      celebration_style: text(formData, "celebration_style") || placeholderAvatarDefaults.celebration_style,
      kit_number: text(formData, "kit_number") || "26",
    },
    { onConflict: "user_id" },
  );

  revalidatePath("/");
  revalidatePath("/profile/setup");
  redirect("/");
}
