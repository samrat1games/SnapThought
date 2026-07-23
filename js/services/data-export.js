import { supabase } from '../supabase.js';
import { getCurrentUser } from '../state.js';

export async function exportUserData(userId) {
  const [profileRes, postsRes, likesRes, followsRes, bookmarksRes, commentsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('posts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
    supabase.from('likes').select('*').eq('user_id', userId),
    supabase.from('follows').select('*').eq('follower_id', userId),
    supabase.from('bookmarks').select('*, posts(*)').eq('user_id', userId),
    supabase.from('posts').select('*').eq('user_id', userId).eq('post_type', 'reply'),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    profile: profileRes.data,
    posts: postsRes.data || [],
    likes: likesRes.data || [],
    following: followsRes.data || [],
    bookmarks: bookmarksRes.data || [],
    replies: commentsRes.data || [],
  };

  return exportData;
}

export function downloadExport(data, filename = 'snapthought-export.json') {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportAsCSV(data, filename = 'snapthought-posts.csv') {
  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const val = String(row[h] ?? '');
      return val.includes(',') || val.includes('"') || val.includes('\n')
        ? '"' + val.replace(/"/g, '""') + '"'
        : val;
    }).join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
