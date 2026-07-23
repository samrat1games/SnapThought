import { supabase } from '../supabase.js';

export async function isSpamContent(userId, content) {
  if (!content || content.trim().length === 0) return false;

  const normalized = content.trim().toLowerCase();

  // Check last 5 posts by this user for identical content
  const { data: recentPosts } = await supabase
    .from('posts')
    .select('content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentPosts) {
    for (const post of recentPosts) {
      if (post.content && post.content.trim().toLowerCase() === normalized) {
        return true;
      }
    }
  }

  // Check last 5 comments by this user
  const { data: recentComments } = await supabase
    .from('posts')
    .select('content')
    .eq('user_id', userId)
    .eq('post_type', 'reply')
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentComments) {
    for (const comment of recentComments) {
      if (comment.content && comment.content.trim().toLowerCase() === normalized) {
        return true;
      }
    }
  }

  return false;
}
