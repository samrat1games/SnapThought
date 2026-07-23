import { supabase } from '../supabase.js';

export async function recordPostView(postId, userId = null) {
  const viewData = { post_id: postId };
  if (userId) viewData.user_id = userId;

  await supabase.from('post_views').insert(viewData);
  await supabase.rpc('increment_post_views', { pid: postId });
}

export async function getPostViewCount(postId) {
  const { data } = await supabase
    .from('posts')
    .select('view_count')
    .eq('id', postId)
    .single();
  return data?.view_count || 0;
}

export async function hasUserViewed(postId, userId) {
  if (!userId) return false;
  const { data } = await supabase
    .from('post_views')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}
