import { supabase } from '../supabase.js';

export async function createReport(reporterId, { postId = null, userId = null, reason }) {
  const { error } = await supabase
    .from('reports')
    .insert({
      reporter_id: reporterId,
      post_id: postId,
      user_id: userId,
      reason,
    });
  if (error) throw error;
}

export async function getReports({ status = 'pending', limit = 50 } = {}) {
  const { data, error } = await supabase
    .from('reports')
    .select('*, reporter:reporter_id(username, display_name, avatar_url), post:post_id(content, created_at), reported_user:user_id(username, display_name)')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function updateReportStatus(reportId, status) {
  const { error } = await supabase
    .from('reports')
    .update({ status })
    .eq('id', reportId);
  if (error) throw error;
}
