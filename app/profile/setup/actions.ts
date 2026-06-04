"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { defaultAvatarConfig } from "@/components/avatar/avatar-options";

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

  await supabase.from("profiles").upsert({
    id: data.user.id,
    email: data.user.email ?? "",
    display_name: displayName,
    department,
    favorite_country: favoriteCountry,
  });

  await supabase.from("user_avatars").upsert(
    {
      user_id: data.user.id,
      avatar_base: text(formData, "avatar_base") || defaultAvatarConfig.avatar_base,
      skin_tone: text(formData, "skin_tone") || defaultAvatarConfig.skin_tone,
      hair_style: text(formData, "hair_style") || defaultAvatarConfig.hair_style,
      hair_color: text(formData, "hair_color") || defaultAvatarConfig.hair_color,
      kit_primary_color: text(formData, "kit_primary_color") || defaultAvatarConfig.kit_primary_color,
      kit_secondary_color: text(formData, "kit_secondary_color") || defaultAvatarConfig.kit_secondary_color,
      kit_pattern: text(formData, "kit_pattern") || defaultAvatarConfig.kit_pattern,
      badge_shape: text(formData, "badge_shape") || defaultAvatarConfig.badge_shape,
      celebration_style: text(formData, "celebration_style") || defaultAvatarConfig.celebration_style,
    },
    { onConflict: "user_id" },
  );

  revalidatePath("/");
  revalidatePath("/profile/setup");
  redirect("/");
}
