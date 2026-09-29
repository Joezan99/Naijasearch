/* =========================================================
   NaijaReach — Supabase connection config
   These two values are SAFE to expose publicly: the anon/publishable
   key only grants what the Row Level Security policies in your
   Supabase project allow — it is not a secret.

   NEVER put your service_role/secret key here or anywhere else in
   the frontend. That key bypasses Row Level Security entirely and
   must only ever live server-side (e.g. in a Supabase Edge Function
   secret), never in a file that ships to the browser or to GitHub.
   ========================================================= */

const NR_SUPABASE_URL = "https://fjxrantbwlxypsyeaomi.supabase.co";
const NR_SUPABASE_ANON_KEY = "sb_publishable_TMI7OchcG003ECClbiqwJQ_0OqyyFGc";

const nrSupabase = window.supabase.createClient(NR_SUPABASE_URL, NR_SUPABASE_ANON_KEY);
