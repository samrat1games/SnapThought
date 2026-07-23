import { supabase } from '../supabase.js';

// Messages table schema (needs to be created in Supabase):
// CREATE TABLE IF NOT EXISTS messages (
//   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
//   receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
//   content TEXT NOT NULL,
//   is_read BOOLEAN NOT NULL DEFAULT false,
//   created_at TIMESTAMPTZ NOT NULL DEFAULT now()
// );
// CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender_id);
// CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages (receiver_id);
// CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id));

export async function sendMessage(senderId, receiverId, content) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      content: content,
    })
    .select('*, profiles:sender_id(*)')
    .single();

  if (error) throw error;
  return data;
}

export async function getConversations(userId) {
  // Get latest message for each conversation
  const { data, error } = await supabase
    .from('messages')
    .select('*, profiles:sender_id(*)')
    .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Group by conversation partner
  const conversations = new Map();
  for (const msg of (data || [])) {
    const partnerId = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
    if (!conversations.has(partnerId)) {
      conversations.set(partnerId, {
        partnerId,
        lastMessage: msg,
        unread: msg.receiver_id === userId && !msg.is_read ? 1 : 0,
      });
    } else {
      const conv = conversations.get(partnerId);
      if (msg.receiver_id === userId && !msg.is_read) {
        conv.unread++;
      }
    }
  }

  // Get partner profiles
  const partnerIds = [...conversations.keys()];
  if (partnerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', partnerIds);

    for (const [partnerId, conv] of conversations) {
      conv.partner = profiles?.find(p => p.id === partnerId);
    }
  }

  return [...conversations.values()].sort((a, b) =>
    new Date(b.lastMessage.created_at) - new Date(a.lastMessage.created_at)
  );
}

export async function getMessages(userId, partnerId, { limit = 50, before = null } = {}) {
  let query = supabase
    .from('messages')
    .select('*, profiles:sender_id(*)')
    .or(
      `and(sender_id.eq.${userId},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${userId})`
    )
    .order('created_at', { ascending: true })
    .limit(limit);

  if (before) {
    query = query.lt('created_at', before);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function markAsRead(userId, senderId) {
  const { error } = await supabase
    .from('messages')
    .update({ is_read: true })
    .eq('sender_id', senderId)
    .eq('receiver_id', userId)
    .eq('is_read', false);

  if (error) throw error;
}

export async function getUnreadCount(userId) {
  const { count, error } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .eq('receiver_id', userId)
    .eq('is_read', false);

  if (error) throw error;
  return count || 0;
}
