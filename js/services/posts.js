import { supabase } from '../supabase.js';
import { getCurrentUser } from '../state.js';

export async function createPost({ content, imageUrl, videoUrl, mediaType, replyTo, postType = 'original', images = [] }) {
  const user = getCurrentUser();
  if (!user) throw new Error('Not logged in');

  const insertData = {
    user_id: user.id,
    content: content || '',
    image_url: imageUrl || '',
    video_url: videoUrl || '',
    media_type: mediaType || 'none',
    post_type: postType,
    reply_to: replyTo || null,
  };

  // Include images array only if there are images
  if (images.length > 0) {
    insertData.images = images;
  }

  let { data, error } = await supabase
    .from('posts')
    .insert(insertData)
    .select('*, profiles:user_id(*)')
    .single();

  // If images column doesn't exist, retry without it
  if (error && error.message && error.message.includes('images')) {
    delete insertData.images;
    ({ data, error } = await supabase
      .from('posts')
      .insert(insertData)
      .select('*, profiles:user_id(*)')
      .single());
  }

  if (error) throw error;
  return data;
}

export async function deletePost(postId) {
  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId);
  if (error) throw error;
}

export async function editPost(postId, updates) {
  const { data, error } = await supabase
    .from('posts')
    .update({
      content: updates.content,
      edited_at: new Date().toISOString(),
      edit_count: (updates.edit_count || 0) + 1,
    })
    .eq('id', postId)
    .select('*, profiles:user_id(*)')
    .single();
  if (error) throw error;
  return data;
}

export function canEditPost(post) {
  if (!post) return false;
  const created = new Date(post.created_at);
  const now = new Date();
  const diffMinutes = (now - created) / (1000 * 60);
  return diffMinutes <= 15;
}

export async function getPost(postId) {
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles:user_id(*)')
    .eq('id', postId)
    .single();
  if (error) throw error;
  return data;
}

export async function getUserPosts(userId, { limit = 20, cursor = null } = {}) {
  let query = supabase
    .from('posts')
    .select('*, profiles:user_id(*)')
    .eq('user_id', userId)
    .eq('post_type', 'original')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function toggleLike(postId, userId) {
  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('id', existing.id);
    if (error) throw error;
    return false;
  } else {
    const { error } = await supabase
      .from('likes')
      .insert({ user_id: userId, post_id: postId });
    if (error) throw error;

    const { data: post } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (post && post.user_id !== userId) {
      await supabase.from('notifications').insert({
        user_id: post.user_id,
        actor_id: userId,
        post_id: postId,
        type: 'like',
      });
    }

    return true;
  }
}

export async function isLiked(postId, userId) {
  const { data } = await supabase
    .from('likes')
    .select('id')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .maybeSingle();
  return !!data;
}

export async function toggleRepost(postId, userId) {
  const { data: existing } = await supabase
    .from('reposts')
    .select('id')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('reposts')
      .delete()
      .eq('id', existing.id);
    if (error) throw error;
    return false;
  } else {
    const { error } = await supabase
      .from('reposts')
      .insert({ user_id: userId, post_id: postId });
    if (error) throw error;

    const { data: post } = await supabase
      .from('posts')
      .select('user_id')
      .eq('id', postId)
      .single();

    if (post && post.user_id !== userId) {
      await supabase.from('notifications').insert({
        user_id: post.user_id,
        actor_id: userId,
        post_id: postId,
        type: 'repost',
      });
    }

    return true;
  }
}

export async function isReposted(postId, userId) {
  const { data } = await supabase
    .from('reposts')
    .select('id')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .maybeSingle();
  return !!data;
}

export async function toggleBookmark(postId, userId) {
  const { data: existing } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('id', existing.id);
    if (error) throw error;
    return false;
  } else {
    const { error } = await supabase
      .from('bookmarks')
      .insert({ user_id: userId, post_id: postId });
    if (error) throw error;
    return true;
  }
}

export async function isBookmarked(postId, userId) {
  const { data } = await supabase
    .from('bookmarks')
    .select('id')
    .eq('user_id', userId)
    .eq('post_id', postId)
    .maybeSingle();
  return !!data;
}

export async function getComments(postId, { limit = 50, cursor = null } = {}) {
  let query = supabase
    .from('posts')
    .select('*, profiles:user_id(*)')
    .eq('reply_to', postId)
    .eq('post_type', 'reply')
    .order('created_at', { ascending: true })
    .limit(limit);

  if (cursor) {
    query = query.gt('created_at', cursor);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function addComment(postId, userId, content, replyToComment = null) {
  const insertData = {
    content,
    post_type: 'reply',
    reply_to: replyToComment || postId,
    user_id: userId,
  };

  const { data, error } = await supabase
    .from('posts')
    .insert(insertData)
    .select('*, profiles:user_id(*)')
    .single();

  if (error) throw error;

  const { data: post } = await supabase
    .from('posts')
    .select('user_id')
    .eq('id', postId)
    .single();

  if (post && post.user_id !== userId) {
    await supabase.from('notifications').insert({
      user_id: post.user_id,
      actor_id: userId,
      post_id: postId,
      type: 'comment',
    });
  }

  return data;
}

export async function searchPosts(query, { limit = 20 } = {}) {
  const { data, error } = await supabase
    .from('posts')
    .select('*, profiles:user_id(*)')
    .ilike('content', `%${query}%`)
    .eq('post_type', 'original')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function togglePinPost(postId, userId) {
  // First check if already pinned
  const { data: current } = await supabase
    .from('posts')
    .select('is_pinned')
    .eq('id', postId)
    .single();

  const newPinned = !current?.is_pinned;

  // Unpin any existing pinned post by this user
  if (newPinned) {
    await supabase
      .from('posts')
      .update({ is_pinned: false })
      .eq('user_id', userId)
      .eq('is_pinned', true);
  }

  const { error } = await supabase
    .from('posts')
    .update({ is_pinned: newPinned })
    .eq('id', postId);
  if (error) throw error;
  return newPinned;
}

export async function getPinnedPost(userId) {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*, profiles:user_id(*)')
      .eq('user_id', userId)
      .eq('is_pinned', true)
      .eq('post_type', 'original')
      .maybeSingle();
    if (error) throw error;
    return data;
  } catch (err) {
    // is_pinned column may not exist yet
    return null;
  }
}
