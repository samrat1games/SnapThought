import { supabase } from '../supabase.js';

export async function logAuditAction(adminId, action, targetUserId = null, details = '') {
  const { error } = await supabase
    .from('audit_logs')
    .insert({
      admin_id: adminId,
      action,
      target_user_id: targetUserId,
      details,
    });
  if (error) throw error;
}

export async function getAuditLogs({ limit = 50, offset = 0 } = {}) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*, profiles:admin_id(username, display_name), target_profiles:target_user_id(username, display_name)')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data || [];
}
