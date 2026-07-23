import { supabase } from '../supabase.js';

export async function saveSearch(userId, query) {
  const { data, error } = await supabase
    .from('saved_searches')
    .upsert({ user_id: userId, query: query.trim() }, { onConflict: 'user_id,query' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removeSearch(userId, query) {
  const { error } = await supabase
    .from('saved_searches')
    .delete()
    .eq('user_id', userId)
    .eq('query', query.trim());
  if (error) throw error;
}

export async function getSavedSearches(userId) {
  const { data, error } = await supabase
    .from('saved_searches')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function isSearchSaved(userId, query) {
  const { data } = await supabase
    .from('saved_searches')
    .select('id')
    .eq('user_id', userId)
    .eq('query', query.trim())
    .maybeSingle();
  return !!data;
}
