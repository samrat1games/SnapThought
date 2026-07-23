import { supabase } from '../supabase.js';

export function extractHashtags(content) {
  if (!content) return [];
  const matches = content.match(/#[\w\u0400-\u04FF]+/gi) || [];
  return [...new Set(matches.map(t => t.toLowerCase()))];
}

export async function savePostHashtags(postId, content) {
  const tags = extractHashtags(content);
  if (tags.length === 0) return;

  try {
    const rows = tags.map(hashtag => ({ post_id: postId, hashtag }));
    const { error } = await supabase.from('post_hashtags').insert(rows);
    if (error) console.warn('Failed to save hashtags (table may not exist yet):', error.message);
  } catch (e) {
    console.warn('Hashtag save skipped:', e.message);
  }
}

export async function searchByHashtag(hashtag, { limit = 20 } = {}) {
  try {
    const { data, error } = await supabase
      .from('post_hashtags')
      .select('post_id, posts!inner(*, profiles:user_id(*))')
      .eq('hashtag', hashtag.toLowerCase())
      .eq('posts.post_type', 'original')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(r => r.posts).filter(Boolean);
  } catch (e) {
    console.warn('Hashtag search failed (table may not exist):', e.message);
    // Fallback: search posts by content containing the hashtag
    const { data } = await supabase
      .from('posts')
      .select('*, profiles:user_id(*)')
      .ilike('content', `%${hashtag}%`)
      .eq('post_type', 'original')
      .order('created_at', { ascending: false })
      .limit(limit);
    return data || [];
  }
}

export async function getTrendingHashtags({ limit = 10 } = {}) {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('post_hashtags')
      .select('hashtag')
      .gte('created_at', sevenDaysAgo);

    if (error) throw error;

    const counts = {};
    for (const row of data || []) {
      counts[row.hashtag] = (counts[row.hashtag] || 0) + 1;
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));
  } catch (e) {
    console.warn('Hashtag trending failed (table may not exist), falling back to post scan');
    // Fallback: scan recent posts for hashtags
    const { data: posts } = await supabase
      .from('posts')
      .select('content')
      .eq('post_type', 'original')
      .not('content', 'eq', '')
      .order('created_at', { ascending: false })
      .limit(500);

    const counts = {};
    for (const post of posts || []) {
      const matches = post.content.match(/#[\w\u0400-\u04FF]+/gi) || [];
      for (const tag of matches) {
        counts[tag.toLowerCase()] = (counts[tag.toLowerCase()] || 0) + 1;
      }
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([tag, count]) => ({ tag, count }));
  }
}
