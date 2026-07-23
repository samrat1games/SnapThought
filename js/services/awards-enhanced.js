/**
 * Enhanced Awards System Service
 */

import { supabase, getCurrentUserId } from '../supabase.js';

export const AwardsService = {

  // Award templates
  AWARD_TEMPLATES: {
    'first_post': {
      name: 'First Post',
      description: 'Posted your first post',
      category: 'milestone',
      tier: 'bronze',
      icon_url: '<svg viewBox="0 0 24 24" width="24" height="24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      color: '#CD7F32'
    },
    'verified_user': {
      name: 'Verified',
      description: 'Verified account',
      category: 'badge',
      tier: 'gold',
      icon_url: '<svg viewBox="0 0 24 24" width="24" height="24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      color: '#FFD700',
      is_badge: true
    },
    'influencer': {
      name: 'Influencer',
      description: 'Reached 10k followers',
      category: 'milestone',
      tier: 'platinum',
      icon_url: '<svg viewBox="0 0 24 24" width="24" height="24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      color: '#E5E4E2',
      criteria_type: 'followers',
      criteria_value: 10000
    },
    'content_king': {
      name: 'Content King',
      description: 'Created 100 posts',
      category: 'achievement',
      tier: 'gold',
      icon_url: '<svg viewBox="0 0 24 24" width="24" height="24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      color: '#FFD700',
      criteria_type: 'posts',
      criteria_value: 100
    },
    'engagement_master': {
      name: 'Engagement Master',
      description: 'Got 1000 likes',
      category: 'achievement',
      tier: 'silver',
      icon_url: '<svg viewBox="0 0 24 24" width="24" height="24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      color: '#C0C0C0',
      criteria_type: 'likes',
      criteria_value: 1000
    },
    'community_helper': {
      name: 'Community Helper',
      description: 'Helped 50 users',
      category: 'social',
      tier: 'bronze',
      icon_url: '<svg viewBox="0 0 24 24" width="24" height="24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      color: '#CD7F32'
    },
    'speedster': {
      name: 'Speedster',
      description: 'Posted 10 times in one day',
      category: 'challenge',
      tier: 'silver',
      icon_url: '<svg viewBox="0 0 24 24" width="24" height="24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      color: '#C0C0C0'
    },
    'early_adopter': {
      name: 'Early Adopter',
      description: 'Joined in the first month',
      category: 'milestone',
      tier: 'gold',
      icon_url: '<svg viewBox="0 0 24 24" width="24" height="24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      color: '#FFD700'
    },
    'mentor': {
      name: 'Mentor',
      description: 'Helped new users grow',
      category: 'social',
      tier: 'platinum',
      icon_url: '<svg viewBox="0 0 24 24" width="24" height="24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      color: '#E5E4E2'
    },
    'viral_post': {
      name: 'Viral!',
      description: 'Post got 10k+ likes',
      category: 'viral',
      tier: 'platinum',
      icon_url: '<svg viewBox="0 0 24 24" width="24" height="24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
      color: '#E5E4E2',
      criteria_type: 'likes',
      criteria_value: 10000
    }
  },

  // ===== INITIALIZE AWARDS =====
  async initializeAwards() {
    try {
      for (const [key, template] of Object.entries(this.AWARD_TEMPLATES)) {
        const { data: existing } = await supabase
          .from('awards')
          .select('id')
          .eq('name', template.name)
          .single();

        if (!existing) {
          await supabase.from('awards').insert({
            name: template.name,
            description: template.description,
            icon_url: template.icon_url,
            category: template.category,
            tier: template.tier,
            color: template.color,
            is_badge: template.is_badge || false,
            is_public: true
          });
        }
      }
      return true;
    } catch (error) {
      console.error('Error initializing awards:', error.message);
      throw error;
    }
  },

  // ===== AWARD USER =====
  async awardUser(userId, awardName) {
    try {
      // Get award by name
      const { data: award, error: awardError } = await supabase
        .from('awards')
        .select('id')
        .eq('name', awardName)
        .single();

      if (awardError) throw new Error(`Award not found: ${awardName}`);

      // Check if already awarded
      const { data: existing } = await supabase
        .from('user_awards')
        .select('id')
        .eq('user_id', userId)
        .eq('award_id', award.id)
        .single();

      if (existing) return null; // Already awarded

      // Award user
      const { data, error } = await supabase
        .from('user_awards')
        .insert({
          user_id: userId,
          award_id: award.id,
          achieved_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error awarding user:', error.message);
      throw error;
    }
  },

  // ===== GET USER AWARDS =====
  async getUserAwards(userId = null) {
    try {
      if (!userId) userId = await getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('user_awards')
        .select(`
          award:award_id(*)
        `)
        .eq('user_id', userId)
        .order('achieved_at', { ascending: false });

      if (error) throw error;
      return data?.map(ua => ua.award) || [];
    } catch (error) {
      console.error('Error fetching user awards:', error.message);
      throw error;
    }
  },

  // ===== CHECK AWARD ELIGIBILITY =====
  async checkEligibility(userId, criteria) {
    try {
      const profile = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      // Check various criteria
      if (criteria.followers) {
        const { data: followers } = await supabase
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', userId);

        if ((followers?.length || 0) < criteria.followers) {
          return false;
        }
      }

      if (criteria.posts) {
        const { data: posts } = await supabase
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);

        if ((posts?.length || 0) < criteria.posts) {
          return false;
        }
      }

      if (criteria.likes) {
        const { data: likes } = await supabase
          .from('likes')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);

        if ((likes?.length || 0) < criteria.likes) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.error('Error checking eligibility:', error.message);
      return false;
    }
  },

  // ===== GET LEADERBOARD =====
  async getLeaderboard(category = null, limit = 20) {
    try {
      let query = supabase
        .from('user_awards')
        .select(`
          user:user_id(id, username, display_name, avatar_url, is_verified),
          award:award_id(category, tier),
          count:id
        `)
        .order('achieved_at', { ascending: false });

      if (category) {
        query = query.eq('award:award_id.category', category);
      }

      const { data, error } = await query.limit(limit);

      if (error) throw error;

      // Group by user and count awards
      const grouped = {};
      data?.forEach(ua => {
        if (!grouped[ua.user.id]) {
          grouped[ua.user.id] = { user: ua.user, awardCount: 0, awards: [] };
        }
        grouped[ua.user.id].awardCount++;
        grouped[ua.user.id].awards.push(ua.award);
      });

      return Object.values(grouped)
        .sort((a, b) => b.awardCount - a.awardCount)
        .slice(0, limit);
    } catch (error) {
      console.error('Error fetching leaderboard:', error.message);
      throw error;
    }
  },

  // ===== GET ACHIEVEMENT PROGRESS =====
  async getAchievementProgress(userId = null) {
    try {
      if (!userId) userId = await getCurrentUserId();
      if (!userId) throw new Error('User not authenticated');

      const { data: posts } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      const { data: likes } = await supabase
        .from('likes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId);

      const { data: followers } = await supabase
        .from('follows')
        .select('id', { count: 'exact', head: true })
        .eq('following_id', userId);

      return {
        posts: posts?.length || 0,
        likes: likes?.length || 0,
        followers: followers?.length || 0,
        achievements: {
          '100_posts': (posts?.length || 0) >= 100,
          '1000_likes': (likes?.length || 0) >= 1000,
          '10k_followers': (followers?.length || 0) >= 10000
        }
      };
    } catch (error) {
      console.error('Error fetching achievement progress:', error.message);
      throw error;
    }
  },

  // ===== GET ALL AWARDS =====
  async getAllAwards(category = null, tier = null) {
    try {
      let query = supabase.from('awards').select('*');

      if (category) query = query.eq('category', category);
      if (tier) query = query.eq('tier', tier);

      const { data, error } = await query.order('tier', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching all awards:', error.message);
      throw error;
    }
  }
};
