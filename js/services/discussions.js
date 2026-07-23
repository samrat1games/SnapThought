import { supabase } from '../supabase.js';

export async function createDiscussion({ name, title, description, creatorId }) {
  const { data, error } = await supabase
    .from('discussions')
    .insert({
      name: name.toLowerCase().replace(/[^a-z0-9_]/g, ''),
      title,
      description: description || '',
      creator_id: creatorId,
    })
    .select('*, profiles:creator_id(*)')
    .single();

  if (error) throw error;

  // Auto-join creator
  await supabase.from('discussion_members').insert({
    discussion_id: data.id,
    user_id: creatorId,
    role: 'admin',
  });

  return data;
}

export async function getDiscussion(name) {
  const { data, error } = await supabase
    .from('discussions')
    .select('*, profiles:creator_id(*)')
    .eq('name', name)
    .single();
  if (error) throw error;
  return data;
}

export async function getDiscussions({ limit = 20, cursor = null } = {}) {
  let query = supabase
    .from('discussions')
    .select('*, profiles:creator_id(*)')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function searchDiscussions(query, { limit = 20 } = {}) {
  const { data, error } = await supabase
    .from('discussions')
    .select('*, profiles:creator_id(*)')
    .or(`name.ilike.%${query}%,title.ilike.%${query}%`)
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function joinDiscussion(discussionId, userId) {
  const { error } = await supabase
    .from('discussion_members')
    .insert({ discussion_id: discussionId, user_id: userId });
  if (error && error.code !== '23505') throw error; // ignore duplicate

  // Update member count
  await supabase.rpc('increment_member_count', { did: discussionId }).catch(() => {});
  return true;
}

export async function leaveDiscussion(discussionId, userId) {
  const { error } = await supabase
    .from('discussion_members')
    .delete()
    .eq('discussion_id', discussionId)
    .eq('user_id', userId);
  if (error) throw error;
  return true;
}

export async function isMember(discussionId, userId) {
  const { data } = await supabase
    .from('discussion_members')
    .select('id')
    .eq('discussion_id', discussionId)
    .eq('user_id', userId)
    .limit(1);
  return data && data.length > 0;
}

export async function getDiscussionPosts(discussionId, { limit = 20, cursor = null } = {}) {
  let query = supabase
    .from('discussion_posts')
    .select('*, post:post_id(*, profiles:user_id(*)), profiles:user_id(*)')
    .eq('discussion_id', discussionId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) query = query.lt('created_at', cursor);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(d => ({ ...d.post, discussion_post_id: d.id }));
}

export async function addPostToDiscussion(discussionId, postId, userId) {
  const { error } = await supabase
    .from('discussion_posts')
    .insert({ discussion_id: discussionId, post_id: postId, user_id: userId });
  if (error) throw error;
  return true;
}
