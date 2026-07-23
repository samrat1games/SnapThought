/**
 * Groups Service - Facebook-like groups
 */

import { supabase, getCurrentUserId } from '../supabase.js';

export const GroupsService = {
  
  // ===== CREATE GROUP =====
  async createGroup(name, description, isPrivate = false) {
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('groups')
        .insert({
          name,
          description,
          is_private: isPrivate,
          creator_id: userId,
          members_count: 1
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as member
      await this.joinGroup(data.id, userId, 'admin');
      return data;
    } catch (error) {
      console.error('Error creating group:', error.message);
      throw error;
    }
  },

  // ===== JOIN GROUP =====
  async joinGroup(groupId, userId = null, role = 'member') {
    try {
      if (!userId) userId = await getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: userId,
          role
        })
        .select()
        .single();

      if (error) throw error;

      // Update members count
      await supabase
        .from('groups')
        .update({ members_count: this.incrementCount('groups', groupId, 'members_count') })
        .eq('id', groupId);

      return data;
    } catch (error) {
      console.error('Error joining group:', error.message);
      throw error;
    }
  },

  // ===== LEAVE GROUP =====
  async leaveGroup(groupId, userId = null) {
    try {
      if (!userId) userId = await getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      const { error } = await supabase
        .from('group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', userId);

      if (error) throw error;

      // Update members count
      const { data: group } = await supabase
        .from('groups')
        .select('members_count')
        .eq('id', groupId)
        .single();

      if (group) {
        await supabase
          .from('groups')
          .update({ members_count: Math.max(0, group.members_count - 1) })
          .eq('id', groupId);
      }

      return true;
    } catch (error) {
      console.error('Error leaving group:', error.message);
      throw error;
    }
  },

  // ===== GET GROUP =====
  async getGroup(groupId) {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          creator:creator_id(id, username, display_name, avatar_url, is_verified)
        `)
        .eq('id', groupId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching group:', error.message);
      throw error;
    }
  },

  // ===== GET GROUPS LIST =====
  async getGroups(limit = 20, offset = 0, searchQuery = '') {
    try {
      let query = supabase
        .from('groups')
        .select(`
          *,
          creator:creator_id(id, username, display_name, avatar_url)
        `)
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error, count } = await query
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { data, count };
    } catch (error) {
      console.error('Error fetching groups:', error.message);
      throw error;
    }
  },

  // ===== GET USER GROUPS =====
  async getUserGroups(userId = null, limit = 20) {
    try {
      if (!userId) userId = await getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('group_members')
        .select(`
          group:group_id(
            *,
            creator:creator_id(id, username, display_name, avatar_url)
          )
        `)
        .eq('user_id', userId)
        .limit(limit);

      if (error) throw error;
      return data?.map(m => m.group) || [];
    } catch (error) {
      console.error('Error fetching user groups:', error.message);
      throw error;
    }
  },

  // ===== GET GROUP MEMBERS =====
  async getGroupMembers(groupId, limit = 20, offset = 0) {
    try {
      const { data, error, count } = await supabase
        .from('group_members')
        .select('user:user_id(*)', { count: 'exact' })
        .eq('group_id', groupId)
        .order('joined_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { data: data?.map(m => m.user) || [], count };
    } catch (error) {
      console.error('Error fetching group members:', error.message);
      throw error;
    }
  },

  // ===== POST TO GROUP =====
  async postToGroup(groupId, postId) {
    try {
      const { data, error } = await supabase
        .from('group_posts')
        .insert({
          group_id: groupId,
          post_id: postId
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error posting to group:', error.message);
      throw error;
    }
  },

  // ===== GET GROUP POSTS =====
  async getGroupPosts(groupId, limit = 20, offset = 0) {
    try {
      const { data, error } = await supabase
        .from('group_posts')
        .select(`
          post:post_id(*)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data?.map(gp => gp.post) || [];
    } catch (error) {
      console.error('Error fetching group posts:', error.message);
      throw error;
    }
  },

  // ===== UPDATE GROUP =====
  async updateGroup(groupId, updates) {
    try {
      const { data, error } = await supabase
        .from('groups')
        .update(updates)
        .eq('id', groupId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating group:', error.message);
      throw error;
    }
  },

  // ===== DELETE GROUP =====
  async deleteGroup(groupId) {
    try {
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting group:', error.message);
      throw error;
    }
  },

  // ===== CHECK MEMBERSHIP =====
  async isMemberOfGroup(groupId, userId = null) {
    try {
      if (!userId) userId = await getCurrentUserId();
      if (!userId) return false;

      const { data, error } = await supabase
        .from('group_members')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', userId)
        .single();

      return !error && !!data;
    } catch (error) {
      return false;
    }
  },

  incrementCount(table, id, field) {
    // Helper function - returns incremented value
    return 0; // Implementation in trigger
  }
};
