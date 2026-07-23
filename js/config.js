export const SUPABASE_URL = 'https://ttglprrkuwsnfinodzfh.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0Z2xwcnJrdXdzbmZpbm9kemZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMjQ2OTYsImV4cCI6MjA5OTcwMDY5Nn0.c665QX1r0_3XpOUWlG7m3ytGJLUZ6h1LXSx3pcmcc48';

// News API key (obfuscated - not for public repos)
const _k = [53,48,55,97,50,102,50,56,56,53,97,57,50,49,57,98,54,97,102,52,56,101,50,49,57,98,52,102,52,49,55,102];
export const GNEWS_API_KEY = _k.map(c => String.fromCharCode(c)).join('');

// GIPHY API key (obfuscated)
const _g = [106,76,121,75,108,57,87,118,107,114,75,51,82,57,51,122,85,88,116,109,75,88,90,84,79,66,78,80,111,56,115,53];
export const GIPHY_API_KEY = _g.map(c => String.fromCharCode(c)).join('');

export async function loadConfig() {
  return { SUPABASE_URL, SUPABASE_ANON_KEY };
}

export async function getSupabaseUrl() { return SUPABASE_URL; }
export async function getSupabaseAnonKey() { return SUPABASE_ANON_KEY; }
export function getSupabaseUrlSync() { return SUPABASE_URL; }
export function getSupabaseAnonKeySync() { return SUPABASE_ANON_KEY; }
