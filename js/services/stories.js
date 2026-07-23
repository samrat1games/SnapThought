import { supabase } from '../supabase.js';

export async function createStory({ userId, imageUrl, videoUrl, caption }) {
  const { data, error } = await supabase
    .from('stories')
    .insert({
      user_id: userId,
      image_url: imageUrl || '',
      video_url: videoUrl || '',
      caption: caption || '',
    })
    .select('*, profiles:user_id(*)')
    .single();

  if (error) throw error;
  return data;
}

export async function getActiveStories({ limit = 50 } = {}) {
  const { data, error } = await supabase
    .from('stories')
    .select('*, profiles:user_id(*)')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

export async function getStoriesByUser(userId) {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function viewStory(storyId, userId) {
  // Check if already viewed
  const { data: existing } = await supabase
    .from('story_views')
    .select('id')
    .eq('story_id', storyId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) return;

  // Insert view
  await supabase.from('story_views').insert({
    story_id: storyId,
    user_id: userId,
  });

  // Increment view count
  await supabase.rpc('increment_story_views', { sid: storyId });
}

export async function hasViewedStory(storyId, userId) {
  const { data } = await supabase
    .from('story_views')
    .select('id')
    .eq('story_id', storyId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

export async function deleteStory(storyId) {
  const { error } = await supabase
    .from('stories')
    .delete()
    .eq('id', storyId);
  if (error) throw error;
}
