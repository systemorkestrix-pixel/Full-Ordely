import { createClient } from "@supabase/supabase-js";
import { fail } from "../governor/error-guard.js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);
export const db = hasSupabaseConfig ? createClient(supabaseUrl, supabaseAnonKey) : null;

export function requireClient() {
  if (!db) {
    fail("SUPABASE_NOT_CONFIGURED", "Supabase is not configured");
  }

  return db;
}

export function onAuthStateChange(callback) {
  return requireClient().auth.onAuthStateChange(callback);
}

export function getSession() {
  return requireClient().auth.getSession();
}

export function getCurrentUser() {
  return requireClient().auth.getUser();
}

export function signInWithPassword(credentials) {
  return requireClient().auth.signInWithPassword(credentials);
}

export async function signUpUser(payloadOrEmail, password = "") {
  const payload = typeof payloadOrEmail === "string"
    ? { email: payloadOrEmail, password }
    : payloadOrEmail;
  const { data, error } = await requireClient().auth.signUp(payload);

  return {
    data,
    error,
    user: data?.user || null,
    session: data?.session || null,
  };
}

export function signOutUser() {
  return requireClient().auth.signOut();
}

export function rpc(name, payload) {
  return requireClient().rpc(name, payload);
}

export function storageFrom(bucketName) {
  return requireClient().storage.from(bucketName);
}
