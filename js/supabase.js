import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { loadConfig, getSupabaseUrlSync, getSupabaseAnonKeySync } from './config.js';
import { getCurrentUser } from './state.js';

let supabaseClient = null;
let configLoaded = false;

export async function initSupabase() {
  if (configLoaded) return supabaseClient;

  const config = await loadConfig();
  supabaseClient = createClient(config.SUPABASE_URL, config.SUPABASE_ANON_KEY);
  configLoaded = true;
  return supabaseClient;
}

export function getSupabase() {
  if (!configLoaded) {
    throw new Error('Supabase not initialized. Call initSupabase() first.');
  }
  return supabaseClient;
}

// For backward compatibility - will work after initSupabase() is called
export const supabase = new Proxy({}, {
  get(target, prop) {
    if (!configLoaded) {
      throw new Error('Supabase not initialized. Call initSupabase() first.');
    }
    return supabaseClient[prop];
  },
});

export async function getCurrentUserId() {
  const currentUser = getCurrentUser();
  if (currentUser?.id) {
    return currentUser.id;
  }
  
  // Fallback to Supabase auth
  const client = getSupabase();
  const { data: { user } } = await client.auth.getUser();
  return user?.id || null;
}

export async function getUser() {
  const client = getSupabase();
  const { data: { user } } = await client.auth.getUser();
  return user;
}