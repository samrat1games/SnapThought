import { supabase } from '../supabase.js';

export async function saveDraft(userId, { content = '', imageUrl = '', videoUrl = '', mediaType = 'none', draftId = null }) {
  if (draftId) {
    const { data, error } = await supabase
      .from('post_drafts')
      .update({ content, image_url: imageUrl, video_url: videoUrl, media_type: mediaType })
      .eq('id', draftId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await supabase
    .from('post_drafts')
    .insert({ user_id: userId, content, image_url: imageUrl, video_url: videoUrl, media_type: mediaType })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getDrafts(userId) {
  const { data, error } = await supabase
    .from('post_drafts')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function deleteDraft(draftId) {
  const { error } = await supabase
    .from('post_drafts')
    .delete()
    .eq('id', draftId);
  if (error) throw error;
}

export async function getDraft(draftId) {
  const { data, error } = await supabase
    .from('post_drafts')
    .select('*')
    .eq('id', draftId)
    .single();
  if (error) throw error;
  return data;
}
