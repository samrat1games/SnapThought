import { supabase } from '../supabase.js';

export async function setReminder(userId, postId, remindAt) {
  const { data, error } = await supabase
    .from('reminders')
    .insert({
      user_id: userId,
      post_id: postId,
      remind_at: remindAt,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getReminders(userId) {
  const { data, error } = await supabase
    .from('reminders')
    .select('*, posts(*)')
    .eq('user_id', userId)
    .order('remind_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function deleteReminder(reminderId) {
  const { error } = await supabase
    .from('reminders')
    .delete()
    .eq('id', reminderId);
  if (error) throw error;
}

export async function getPendingReminders() {
  const { data, error } = await supabase
    .from('reminders')
    .select('*')
    .eq('is_sent', false)
    .lte('remind_at', new Date().toISOString());
  if (error) throw error;
  return data || [];
}

export async function markReminderSent(reminderId) {
  const { error } = await supabase
    .from('reminders')
    .update({ is_sent: true })
    .eq('id', reminderId);
  if (error) throw error;
}
