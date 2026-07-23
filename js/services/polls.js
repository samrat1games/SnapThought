import { supabase } from '../supabase.js';

export async function createPoll(postId, { question = '', options = [], endsIn = 1440 } = {}) {
  if (options.length < 2) throw new Error('Poll needs at least 2 options');

  const endsAt = new Date(Date.now() + endsIn * 60 * 1000).toISOString();

  const { data: poll, error } = await supabase
    .from('polls')
    .insert({ post_id: postId, question, ends_at: endsAt })
    .select()
    .single();

  if (error) throw error;

  const optionRows = options.map((text, i) => ({
    poll_id: poll.id,
    text,
    position: i,
  }));

  const { data: pollOptions, error: optErr } = await supabase
    .from('poll_options')
    .insert(optionRows)
    .select();

  if (optErr) throw optErr;

  return { ...poll, options: pollOptions };
}

export async function getPoll(postId) {
  const { data: poll, error } = await supabase
    .from('polls')
    .select('*')
    .eq('post_id', postId)
    .maybeSingle();

  if (error) throw error;
  if (!poll) return null;

  const { data: options } = await supabase
    .from('poll_options')
    .select('*')
    .eq('poll_id', poll.id)
    .order('position');

  return { ...poll, options: options || [] };
}

export async function votePoll(pollId, optionId, userId) {
  const { error } = await supabase
    .from('poll_votes')
    .insert({ poll_id: pollId, option_id: optionId, user_id: userId });

  if (error) throw error;

  await supabase.rpc('increment_poll_vote_count', { pid: pollId });
  await supabase.rpc('increment_poll_option_votes', { oid: optionId });
}

export async function hasVoted(pollId, userId) {
  const { data } = await supabase
    .from('poll_votes')
    .select('id')
    .eq('poll_id', pollId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!data;
}

export async function getPollResults(pollId) {
  const { data: poll } = await supabase
    .from('polls')
    .select('*')
    .eq('id', pollId)
    .single();

  if (!poll) return null;

  const { data: options } = await supabase
    .from('poll_options')
    .select('*')
    .eq('poll_id', pollId)
    .order('position');

  return { ...poll, options: options || [] };
}
