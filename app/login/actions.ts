"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

async function ensureProfile(email: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;

  await supabase.from("profiles").upsert(
    {
      id: data.user.id,
      email: data.user.email ?? email,
      display_name: (data.user.email ?? email).split("@")[0],
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
}

export async function signIn(formData: FormData) {
  const email = clean(formData.get("email")).toLowerCase();
  const password = clean(formData.get("password"));

  if (!email || !password) redirect("/login?message=Email%20and%20password%20are%20required");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?message=${encodeURIComponent(error.message)}`);

  await ensureProfile(email);
  redirect("/profile/setup");
}

export async function signUp(formData: FormData) {
  const email = clean(formData.get("email")).toLowerCase();
  const password = clean(formData.get("password"));

  if (!email || !password) redirect("/login?message=Email%20and%20password%20are%20required");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) redirect(`/login?message=${encodeURIComponent(error.message)}`);

  if (data.user) {
    await supabase.from("profiles").upsert({
      id: data.user.id,
      email: data.user.email ?? email,
      display_name: email.split("@")[0],
    });
  }

  await ensureProfile(email);
  redirect("/profile/setup");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?message=Signed%20out");
}
