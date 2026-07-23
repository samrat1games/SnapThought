import { supabase } from '../supabase.js';

export async function createList(userId, { name, description = '', isPrivate = false }) {
  const { data, error } = await supabase
    .from('lists')
    .insert({ user_id: userId, name, description, is_private: isPrivate })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserLists(userId) {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getList(listId) {
  const { data: list, error } = await supabase
    .from('lists')
    .select('*')
    .eq('id', listId)
    .single();

  if (error) throw error;

  const { data: members } = await supabase
    .from('list_members')
    .select('*, profiles:user_id(*)')
    .eq('list_id', listId);

  return { ...list, members: members || [] };
}

export async function addToList(listId, userId) {
  const { error } = await supabase
    .from('list_members')
    .insert({ list_id: listId, user_id: userId });

  if (error) throw error;
}

export async function removeFromList(listId, userId) {
  const { error } = await supabase
    .from('list_members')
    .delete()
    .eq('list_id', listId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function isUserInList(listId, userId) {
  const { data } = await supabase
    .from('list_members')
    .select('id')
    .eq('list_id', listId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!data;
}

export async function getListFeed(listId, { limit = 20, cursor = null } = {}) {
  const { data: members } = await supabase
    .from('list_members')
    .select('user_id')
    .eq('list_id', listId);

  if (!members || members.length === 0) return [];

  const userIds = members.map(m => m.user_id);

  let query = supabase
    .from('posts')
    .select('*, profiles:user_id(*)')
    .in('user_id', userIds)
    .eq('post_type', 'original')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
