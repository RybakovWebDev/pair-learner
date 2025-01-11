"use server";

import { createClient } from "@/utils/supabase/server";
import { User } from "@supabase/supabase-js";

function validateInput(email: string, password?: string): string | null {
  if (email.length < 5 || email.length > 35) {
    return "Email must be between 5 and 35 characters long.";
  }
  if (password && (password.length < 6 || password.length > 65)) {
    return "Password must be between 6 and 65 characters long.";
  }
  return null;
}

export async function login(email: string, password: string) {
  const validationError = validateInput(email, password);
  if (validationError) {
    return { error: validationError };
  }

  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  return { user: data.user };
}

export async function signInWithGoogle(credential: string): Promise<{ error?: string; user: User | null }> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: credential,
  });

  if (error) {
    return { error: error.message, user: null };
  }

  return { user: data.user };
}

export async function register(email: string, password: string) {
  const validationError = validateInput(email, password);
  if (validationError) {
    return { error: validationError };
  }

  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { user: data.user };
}

export async function sendMagicLink(email: string) {
  const validationError = validateInput(email);
  if (validationError) {
    return { error: validationError };
  }

  const supabase = createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function resetPassword(email: string) {
  const validationError = validateInput(email);
  if (validationError) {
    return { error: validationError };
  }

  const supabase = createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}
