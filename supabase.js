// POSTKU Supabase configuration.
// The publishable/anon key is intended for browser clients.
// NEVER put a service-role/secret key in this file.
window.POSTKU_SUPABASE_URL = "https://zuujewnzhwctbcyywihb.supabase.co";
window.POSTKU_SUPABASE_KEY = "sb_publishable_Cgxv-pJRNkeDvlQntWP4WQ_Qjsder1p";
window.postkuSupabase = window.supabase.createClient(
  window.POSTKU_SUPABASE_URL,
  window.POSTKU_SUPABASE_KEY,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);
