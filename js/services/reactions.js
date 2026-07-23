import { supabase } from '../supabase.js';

const REACTION_EMOJIS = ['<3', ':D', ':O', ';(', '>:(', '(fire)', '(clap)', '100'];

export { REACTION_EMOJIS };

export async function toggleReaction(postId, userId, emoji) {
  try {
    const { data: existing } = await supabase
      .from('post_reactions')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .eq('emoji', emoji)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('post_reactions')
        .delete()
        .eq('id', existing.id);
      if (error) throw error;
      return { reacted: false, emoji };
    } else {
      const { error } = await supabase
        .from('post_reactions')
        .insert({ post_id: postId, user_id: userId, emoji });
      if (error) throw error;
      return { reacted: true, emoji };
    }
  } catch (err) {
    if (err.code === 'PGRST205' || String(err.message || '').includes('Could not find the table')) {
      return { reacted: false, emoji };
    }
    throw err;
  }
}

export async function getReactions(postId) {
  try {
    const { data, error } = await supabase
      .from('post_reactions')
      .select('emoji, user_id')
      .eq('post_id', postId);
    if (error) throw error;
    return data || [];
  } catch (err) {
    if (err.code === 'PGRST205' || String(err.message || '').includes('Could not find the table')) {
      return [];
    }
    throw err;
  }
}

export async function getUserReaction(postId, userId) {
  try {
    const { data } = await supabase
      .from('post_reactions')
      .select('emoji')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .maybeSingle();
    return data?.emoji || null;
  } catch (err) {
    if (err.code === 'PGRST205' || String(err.message || '').includes('Could not find the table')) {
      return null;
    }
    throw err;
  }
}
