"use server";

import { signIn, signOut } from "@/auth";
import { safeReturnTo } from "@/lib/domain/links";

export async function previewAsAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const returnTo = safeReturnTo(formData.get("returnTo"), "/");
  await signIn("preview", { email, redirectTo: returnTo });
}

export async function googleSignInAction() {
  await signIn("google", { redirectTo: "/" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/sign-in" });
}
