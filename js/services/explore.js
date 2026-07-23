import { supabase } from '../supabase.js';

export async function getTrendingHashtags({ limit = 10 } = {}) {
  // Fetch recent posts with content (last 500 posts)
  const { data: posts, error } = await supabase
    .from('posts')
    .select('content')
    .eq('post_type', 'original')
    .not('content', 'eq', '')
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) throw error;

  // Extract hashtags and count
  const counts = {};
  for (const post of posts || []) {
    const matches = post.content.match(/#[\w\u0400-\u04FF]+/gi) || [];
    for (const tag of matches) {
      const lower = tag.toLowerCase();
      counts[lower] = (counts[lower] || 0) + 1;
    }
  }

  // Sort by count and return top N
  const sorted = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag, count]) => ({ tag, count }));

  return sorted;
}

export async function getTrendingPosts({ limit = 20 } = {}) {
  // Posts with most likes + comments + reposts
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles:user_id(*)')
    .eq('post_type', 'original')
    .order('like_count', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
