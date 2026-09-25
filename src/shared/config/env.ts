// Nyilvános környezeti változók. A Next.js a NEXT_PUBLIC_ változókat build időben
// beégeti, ezért szó szerint kell hivatkozni rájuk (nem lehet process.env[name]).

export function hasSupabaseEnv(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function supabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("Hiányzó Supabase környezeti változók (lásd .env.example).");
  }
  return { url, publishableKey };
}
