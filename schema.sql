-- SnapThought Database Schema
-- Safe to re-run (all statements are idempotent)

-- ============================================
-- ENUMS
-- ============================================

DO $$ BEGIN
  CREATE TYPE post_type AS ENUM ('original', 'repost', 'reply');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_type AS ENUM ('like', 'follow', 'mention', 'repost', 'comment');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- TABLES
-- ============================================

CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  bio         TEXT NOT NULL DEFAULT '',
  avatar_url  TEXT NOT NULL DEFAULT '',
  cover_url   TEXT NOT NULL DEFAULT '',
  website     TEXT NOT NULL DEFAULT '',
  is_verified  BOOLEAN NOT NULL DEFAULT false,
  is_banned    BOOLEAN NOT NULL DEFAULT false,
  is_admin     BOOLEAN NOT NULL DEFAULT false,
  is_best      BOOLEAN NOT NULL DEFAULT false,
  role         TEXT NOT NULL DEFAULT 'user',
  referral_code TEXT UNIQUE,
  referred_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  username_changed_at TIMESTAMPTZ,
  has_password BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON profiles (username);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles (created_at DESC);

CREATE TABLE IF NOT EXISTS posts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content        TEXT NOT NULL DEFAULT '',
  image_url      TEXT NOT NULL DEFAULT '',
  video_url      TEXT NOT NULL DEFAULT '',
  images         JSONB NOT NULL DEFAULT '[]'::jsonb,
  media_type     TEXT NOT NULL DEFAULT 'none',
  post_type      post_type NOT NULL DEFAULT 'original',
  repost_of      UUID REFERENCES posts(id) ON DELETE SET NULL,
  reply_to       UUID REFERENCES posts(id) ON DELETE CASCADE,
  like_count     INT NOT NULL DEFAULT 0,
  reply_count    INT NOT NULL DEFAULT 0,
  repost_count   INT NOT NULL DEFAULT 0,
  bookmark_count INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  edited_at      TIMESTAMPTZ,
  edit_count     INT NOT NULL DEFAULT 0,
  view_count     INT NOT NULL DEFAULT 0,
  is_pinned      BOOLEAN NOT NULL DEFAULT false,
  location_name  TEXT NOT NULL DEFAULT '',
  location_lat   DOUBLE PRECISION,
  location_lng   DOUBLE PRECISION,
  CONSTRAINT content_or_media CHECK (content != '' OR image_url != '' OR video_url != '')
);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts (user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_reply_to ON posts (reply_to) WHERE reply_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_repost_of ON posts (repost_of) WHERE repost_of IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts (post_type);

CREATE TABLE IF NOT EXISTS likes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes (user_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes (post_id);

CREATE TABLE IF NOT EXISTS reposts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_reposts_user_id ON reposts (user_id);
CREATE INDEX IF NOT EXISTS idx_reposts_post_id ON reposts (post_id);

CREATE TABLE IF NOT EXISTS bookmarks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  folder_id  UUID,
  note       TEXT NOT NULL DEFAULT '',
  UNIQUE (user_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks (user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id ON bookmarks (post_id);

CREATE TABLE IF NOT EXISTS follows (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows (following_id);

CREATE TABLE IF NOT EXISTS comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  content    TEXT NOT NULL CHECK (char_length(content) > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments (post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments (user_id);

CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id    UUID REFERENCES posts(id) ON DELETE CASCADE,
  type       notification_type NOT NULL,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications (user_id) WHERE is_read = false;

-- Questions / Support tickets
CREATE TABLE IF NOT EXISTS questions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject    TEXT NOT NULL DEFAULT '',
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_questions_user_id ON questions (user_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions (status);

-- Question replies
CREATE TABLE IF NOT EXISTS question_replies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_question_replies_question_id ON question_replies (question_id);

-- ============================================
-- DISCUSSIONS (like Reddit communities)
-- ============================================
CREATE TABLE IF NOT EXISTS discussions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon_url    TEXT NOT NULL DEFAULT '',
  creator_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  member_count INT NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discussions_name ON discussions (name);
CREATE INDEX IF NOT EXISTS idx_discussions_creator_id ON discussions (creator_id);

CREATE TABLE IF NOT EXISTS discussion_members (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id  UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role           TEXT NOT NULL DEFAULT 'member',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (discussion_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_discussion_members_discussion ON discussion_members (discussion_id);
CREATE INDEX IF NOT EXISTS idx_discussion_members_user ON discussion_members (user_id);

CREATE TABLE IF NOT EXISTS discussion_posts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id  UUID NOT NULL REFERENCES discussions(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id        UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (discussion_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_discussion_posts_discussion ON discussion_posts (discussion_id);

-- ============================================
-- MESSAGES (Direct messages between users)
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages (receiver_id);

-- ============================================
-- SHORTVS (Reels / short videos)
-- ============================================
CREATE TABLE IF NOT EXISTS shortvs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  video_url   TEXT NOT NULL,
  thumbnail_url TEXT NOT NULL DEFAULT '',
  caption     TEXT NOT NULL DEFAULT '',
  like_count  INT NOT NULL DEFAULT 0,
  view_count  INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shortvs_user_id ON shortvs (user_id);
CREATE INDEX IF NOT EXISTS idx_shortvs_created_at ON shortvs (created_at DESC);

CREATE TABLE IF NOT EXISTS shortv_likes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shortv_id  UUID NOT NULL REFERENCES shortvs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, shortv_id)
);

CREATE INDEX IF NOT EXISTS idx_shortv_likes_shortv ON shortv_likes (shortv_id);

CREATE TABLE IF NOT EXISTS shortv_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shortv_id  UUID NOT NULL REFERENCES shortvs(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shortv_comments_shortv ON shortv_comments (shortv_id);

-- ============================================
-- NEW v1.1 TABLES
-- ============================================

-- Post hashtags
CREATE TABLE IF NOT EXISTS post_hashtags (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  hashtag    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, hashtag)
);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_tag ON post_hashtags (hashtag);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_post ON post_hashtags (post_id);

-- Post views
CREATE TABLE IF NOT EXISTS post_views (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ip_hash    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_post_views_post ON post_views (post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_user ON post_views (user_id) WHERE user_id IS NOT NULL;

-- Bookmark folders
CREATE TABLE IF NOT EXISTS bookmark_folders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name       TEXT NOT NULL DEFAULT 'Default',
  icon       TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);
CREATE INDEX IF NOT EXISTS idx_bookmark_folders_user ON bookmark_folders (user_id);

-- User lists
CREATE TABLE IF NOT EXISTS lists (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_private  BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lists_user ON lists (user_id);

-- List members (references lists, created after lists)
CREATE TABLE IF NOT EXISTS list_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id     UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (list_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_list_members_list ON list_members (list_id);

-- Polls
CREATE TABLE IF NOT EXISTS polls (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  question    TEXT NOT NULL DEFAULT '',
  ends_at     TIMESTAMPTZ,
  total_votes INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_polls_post ON polls (post_id);

-- Poll options (references polls, created after polls)
CREATE TABLE IF NOT EXISTS poll_options (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id    UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  vote_count INT NOT NULL DEFAULT 0,
  position   INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options (poll_id);

-- Poll votes (references polls and poll_options)
CREATE TABLE IF NOT EXISTS poll_votes (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id   UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes (poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user ON poll_votes (user_id);

-- Blocks
CREATE TABLE IF NOT EXISTS blocks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks (blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks (blocked_id);

-- Mutes
CREATE TABLE IF NOT EXISTS mutes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  muted_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, muted_id),
  CHECK (user_id != muted_id)
);
CREATE INDEX IF NOT EXISTS idx_mutes_user ON mutes (user_id);

-- Post drafts
CREATE TABLE IF NOT EXISTS post_drafts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL DEFAULT '',
  image_url  TEXT NOT NULL DEFAULT '',
  video_url  TEXT NOT NULL DEFAULT '',
  media_type TEXT NOT NULL DEFAULT 'none',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_post_drafts_user ON post_drafts (user_id);

-- Reports
CREATE TABLE IF NOT EXISTS reports (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id     UUID REFERENCES posts(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason      TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status);

-- Data exports
CREATE TABLE IF NOT EXISTS data_exports (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status     TEXT NOT NULL DEFAULT 'pending',
  file_url   TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comment likes
CREATE TABLE IF NOT EXISTS comment_likes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  comment_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, comment_id)
);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user ON comment_likes (user_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes (comment_id);

-- Post reactions (emoji reactions on posts)
CREATE TABLE IF NOT EXISTS post_reactions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON post_reactions (post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user ON post_reactions (user_id);

-- Stories
CREATE TABLE IF NOT EXISTS stories (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL DEFAULT '',
  video_url   TEXT NOT NULL DEFAULT '',
  caption     TEXT NOT NULL DEFAULT '',
  view_count  INT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '24 hours')
);
CREATE INDEX IF NOT EXISTS idx_stories_user ON stories (user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires ON stories (expires_at);

-- Story views
CREATE TABLE IF NOT EXISTS story_views (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id   UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (story_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_story_views_story ON story_views (story_id);

-- Saved searches
CREATE TABLE IF NOT EXISTS saved_searches (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  query      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, query)
);
CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches (user_id);

-- Reminders
CREATE TABLE IF NOT EXISTS reminders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  remind_at  TIMESTAMPTZ NOT NULL,
  is_sent    BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders (user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_pending ON reminders (remind_at) WHERE is_sent = false;

-- User achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_type  TEXT NOT NULL,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_type)
);
CREATE INDEX IF NOT EXISTS idx_achievements_user ON user_achievements (user_id);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action        TEXT NOT NULL,
  target_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  details       TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs (admin_id);

-- ============================================
-- GROUPS (Facebook-like groups)
-- ============================================

CREATE TABLE IF NOT EXISTS groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon_url    TEXT NOT NULL DEFAULT '',
  cover_url   TEXT NOT NULL DEFAULT '',
  creator_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  members_count INT NOT NULL DEFAULT 1,
  is_private  BOOLEAN NOT NULL DEFAULT false,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  rules       TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_groups_name ON groups (name);
CREATE INDEX IF NOT EXISTS idx_groups_creator_id ON groups (creator_id);
CREATE INDEX IF NOT EXISTS idx_groups_created_at ON groups (created_at DESC);

CREATE TABLE IF NOT EXISTS group_members (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT NOT NULL DEFAULT 'member',
  is_moderator BOOLEAN NOT NULL DEFAULT false,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members (group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members (user_id);

CREATE TABLE IF NOT EXISTS group_posts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (group_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_group_posts_group ON group_posts (group_id);

-- ============================================
-- LIVE STREAMING
-- ============================================

CREATE TABLE IF NOT EXISTS live_streams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  thumbnail_url TEXT NOT NULL DEFAULT '',
  stream_url  TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'offline',
  viewer_count INT NOT NULL DEFAULT 0,
  like_count  INT NOT NULL DEFAULT 0,
  comment_count INT NOT NULL DEFAULT 0,
  started_at  TIMESTAMPTZ,
  ended_at    TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_streams_user ON live_streams (user_id);
CREATE INDEX IF NOT EXISTS idx_live_streams_status ON live_streams (status);
CREATE INDEX IF NOT EXISTS idx_live_streams_started_at ON live_streams (started_at DESC);

CREATE TABLE IF NOT EXISTS live_stream_viewers (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id  UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  ip_hash    TEXT,
  joined_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  left_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_live_viewers_stream ON live_stream_viewers (stream_id);
CREATE INDEX IF NOT EXISTS idx_live_viewers_user ON live_stream_viewers (user_id);

CREATE TABLE IF NOT EXISTS live_stream_messages (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id  UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  is_pinned  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_messages_stream ON live_stream_messages (stream_id);
CREATE INDEX IF NOT EXISTS idx_live_messages_user ON live_stream_messages (user_id);

CREATE TABLE IF NOT EXISTS live_stream_gifts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stream_id  UUID NOT NULL REFERENCES live_streams(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  gift_type  TEXT NOT NULL,
  quantity   INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_gifts_stream ON live_stream_gifts (stream_id);
CREATE INDEX IF NOT EXISTS idx_live_gifts_from_user ON live_stream_gifts (from_user_id);
CREATE INDEX IF NOT EXISTS idx_live_gifts_to_user ON live_stream_gifts (to_user_id);

-- ============================================
-- ENHANCED AWARDS SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS awards (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  icon_url    TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL DEFAULT 'general',
  tier        TEXT NOT NULL DEFAULT 'bronze',
  color       TEXT NOT NULL DEFAULT '#CD7F32',
  is_badge    BOOLEAN NOT NULL DEFAULT false,
  is_public   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_awards_category ON awards (category);
CREATE INDEX IF NOT EXISTS idx_awards_tier ON awards (tier);

CREATE TABLE IF NOT EXISTS user_awards (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  award_id   UUID NOT NULL REFERENCES awards(id) ON DELETE CASCADE,
  achieved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, award_id)
);

CREATE INDEX IF NOT EXISTS idx_user_awards_user ON user_awards (user_id);
CREATE INDEX IF NOT EXISTS idx_user_awards_award ON user_awards (award_id);

CREATE TABLE IF NOT EXISTS award_criteria (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  award_id        UUID NOT NULL REFERENCES awards(id) ON DELETE CASCADE,
  criteria_type   TEXT NOT NULL,
  criteria_value  INT NOT NULL DEFAULT 0,
  description     TEXT NOT NULL DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_award_criteria_award ON award_criteria (award_id);

-- ============================================
-- TRIGGERS: Counter sync
-- ============================================

CREATE OR REPLACE FUNCTION update_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_like_count ON likes;
CREATE TRIGGER trg_like_count
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION update_post_like_count();

CREATE OR REPLACE FUNCTION update_post_repost_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET repost_count = repost_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET repost_count = GREATEST(repost_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_repost_count ON reposts;
CREATE TRIGGER trg_repost_count
  AFTER INSERT OR DELETE ON reposts
  FOR EACH ROW EXECUTE FUNCTION update_post_repost_count();

CREATE OR REPLACE FUNCTION update_post_bookmark_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET bookmark_count = bookmark_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET bookmark_count = GREATEST(bookmark_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bookmark_count ON bookmarks;
CREATE TRIGGER trg_bookmark_count
  AFTER INSERT OR DELETE ON bookmarks
  FOR EACH ROW EXECUTE FUNCTION update_post_bookmark_count();

CREATE OR REPLACE FUNCTION update_post_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.post_type = 'reply' AND NEW.reply_to IS NOT NULL THEN
    UPDATE posts SET reply_count = reply_count + 1 WHERE id = NEW.reply_to;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.post_type = 'reply' AND OLD.reply_to IS NOT NULL THEN
    UPDATE posts SET reply_count = GREATEST(reply_count - 1, 0) WHERE id = OLD.reply_to;
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_reply_count ON posts;
CREATE TRIGGER trg_reply_count
  AFTER INSERT OR DELETE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_post_reply_count();

-- ============================================
-- TRIGGER: Auto-create profile on signup
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name, avatar_url, bio, cover_url, website, is_verified, is_banned, is_admin, is_best)
  VALUES (
    NEW.id,
    LOWER(COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), 'user')) || SUBSTRING(NEW.id::TEXT, 1, 6),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), 'User'),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    '',
    '',
    '',
    false,
    false,
    false,
    false
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- TRIGGER: Update updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_posts_updated_at ON posts;
CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_lists_updated_at ON lists;
CREATE TRIGGER trg_lists_updated_at
  BEFORE UPDATE ON lists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_post_drafts_updated_at ON post_drafts;
CREATE TRIGGER trg_post_drafts_updated_at
  BEFORE UPDATE ON post_drafts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reposts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE discussion_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortvs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortv_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE shortv_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmark_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE mutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
  DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
  DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
  DROP POLICY IF EXISTS "Admins can update any profile" ON profiles;
  DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;
  DROP POLICY IF EXISTS "Users can create own posts" ON posts;
  DROP POLICY IF EXISTS "Users can update own posts" ON posts;
  DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
  DROP POLICY IF EXISTS "Likes are viewable by everyone" ON likes;
  DROP POLICY IF EXISTS "Users can create own likes" ON likes;
  DROP POLICY IF EXISTS "Users can delete own likes" ON likes;
  DROP POLICY IF EXISTS "Reposts are viewable by everyone" ON reposts;
  DROP POLICY IF EXISTS "Users can create own reposts" ON reposts;
  DROP POLICY IF EXISTS "Users can delete own reposts" ON reposts;
  DROP POLICY IF EXISTS "Bookmarks are viewable by everyone" ON bookmarks;
  DROP POLICY IF EXISTS "Users can create own bookmarks" ON bookmarks;
  DROP POLICY IF EXISTS "Users can delete own bookmarks" ON bookmarks;
  DROP POLICY IF EXISTS "Follows are viewable by everyone" ON follows;
  DROP POLICY IF EXISTS "Users can follow others" ON follows;
  DROP POLICY IF EXISTS "Users can unfollow" ON follows;
  DROP POLICY IF EXISTS "Comments are viewable by everyone" ON comments;
  DROP POLICY IF EXISTS "Users can create comments" ON comments;
  DROP POLICY IF EXISTS "Users can delete own comments" ON comments;
  DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
  DROP POLICY IF EXISTS "System can create notifications" ON notifications;
  DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
  DROP POLICY IF EXISTS "Users can view own questions" ON questions;
  DROP POLICY IF EXISTS "Admins can view all questions" ON questions;
  DROP POLICY IF EXISTS "Users can create questions" ON questions;
  DROP POLICY IF EXISTS "Users can update own questions" ON questions;
  DROP POLICY IF EXISTS "Admins can update all questions" ON questions;
  DROP POLICY IF EXISTS "Users can view replies to own questions" ON question_replies;
  DROP POLICY IF EXISTS "Admins can view all replies" ON question_replies;
  DROP POLICY IF EXISTS "Users can reply to own questions" ON question_replies;
  DROP POLICY IF EXISTS "Admins can reply to any question" ON question_replies;
  DROP POLICY IF EXISTS "Discussions are viewable by everyone" ON discussions;
  DROP POLICY IF EXISTS "Users can create discussions" ON discussions;
  DROP POLICY IF EXISTS "Creators can update own discussions" ON discussions;
  DROP POLICY IF EXISTS "Discussion members are viewable by everyone" ON discussion_members;
  DROP POLICY IF EXISTS "Users can join discussions" ON discussion_members;
  DROP POLICY IF EXISTS "Users can leave discussions" ON discussion_members;
  DROP POLICY IF EXISTS "Discussion posts are viewable by everyone" ON discussion_posts;
  DROP POLICY IF EXISTS "Members can post to discussions" ON discussion_posts;
  DROP POLICY IF EXISTS "Users can view own messages" ON messages;
  DROP POLICY IF EXISTS "Users can send messages" ON messages;
  DROP POLICY IF EXISTS "Users can update own received messages" ON messages;
  DROP POLICY IF EXISTS "ShortVs are viewable by everyone" ON shortvs;
  DROP POLICY IF EXISTS "Users can create shortvs" ON shortvs;
  DROP POLICY IF EXISTS "Users can delete own shortvs" ON shortvs;
  DROP POLICY IF EXISTS "ShortV likes are viewable by everyone" ON shortv_likes;
  DROP POLICY IF EXISTS "Users can like shortvs" ON shortv_likes;
  DROP POLICY IF EXISTS "Users can unlike shortvs" ON shortv_likes;
  DROP POLICY IF EXISTS "ShortV comments are viewable by everyone" ON shortv_comments;
  DROP POLICY IF EXISTS "Users can comment on shortvs" ON shortv_comments;
  DROP POLICY IF EXISTS "Users can delete own shortv comments" ON shortv_comments;
  DROP POLICY IF EXISTS "Post hashtags are viewable by everyone" ON post_hashtags;
  DROP POLICY IF EXISTS "Users can insert post hashtags" ON post_hashtags;
  DROP POLICY IF EXISTS "Users can insert post views" ON post_views;
  DROP POLICY IF EXISTS "Users can view own post views" ON post_views;
  DROP POLICY IF EXISTS "Users can manage own bookmark folders" ON bookmark_folders;
  DROP POLICY IF EXISTS "Lists are viewable by everyone" ON lists;
  DROP POLICY IF EXISTS "Users can manage own lists" ON lists;
  DROP POLICY IF EXISTS "List members are viewable by everyone" ON list_members;
  DROP POLICY IF EXISTS "Users can manage own list members" ON list_members;
  DROP POLICY IF EXISTS "Users can remove own list members" ON list_members;
  DROP POLICY IF EXISTS "Polls are viewable by everyone" ON polls;
  DROP POLICY IF EXISTS "Users can create polls" ON polls;
  DROP POLICY IF EXISTS "Poll options are viewable by everyone" ON poll_options;
  DROP POLICY IF EXISTS "Users can create poll options" ON poll_options;
  DROP POLICY IF EXISTS "Users can view poll votes" ON poll_votes;
  DROP POLICY IF EXISTS "Users can vote on polls" ON poll_votes;
  DROP POLICY IF EXISTS "Users can manage own blocks" ON blocks;
  DROP POLICY IF EXISTS "Users can manage own mutes" ON mutes;
  DROP POLICY IF EXISTS "Users can manage own drafts" ON post_drafts;
  DROP POLICY IF EXISTS "Users can create reports" ON reports;
  DROP POLICY IF EXISTS "Admins can view all reports" ON reports;
  DROP POLICY IF EXISTS "Users can manage own data exports" ON data_exports;
  DROP POLICY IF EXISTS "Reactions are viewable by everyone" ON post_reactions;
  DROP POLICY IF EXISTS "Users can add reactions" ON post_reactions;
  DROP POLICY IF EXISTS "Users can remove their own reactions" ON post_reactions;
  DROP POLICY IF EXISTS "Comment likes are viewable by everyone" ON comment_likes;
  DROP POLICY IF EXISTS "Users can like comments" ON comment_likes;
  DROP POLICY IF EXISTS "Users can unlike comments" ON comment_likes;
  DROP POLICY IF EXISTS "Stories are viewable by everyone" ON stories;
  DROP POLICY IF EXISTS "Users can create stories" ON stories;
  DROP POLICY IF EXISTS "Users can delete own stories" ON stories;
  DROP POLICY IF EXISTS "Users can view story views" ON story_views;
  DROP POLICY IF EXISTS "Users can view stories" ON story_views;
  DROP POLICY IF EXISTS "Users can manage own saved searches" ON saved_searches;
  DROP POLICY IF EXISTS "Users can manage own reminders" ON reminders;
  DROP POLICY IF EXISTS "Achievements are viewable by everyone" ON user_achievements;
  DROP POLICY IF EXISTS "System can create achievements" ON user_achievements;
  DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
  DROP POLICY IF EXISTS "Admins can create audit logs" ON audit_logs;
  DROP POLICY IF EXISTS "Admins can update reports" ON reports;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- Profiles
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR role IN ('mod', 'mod+')))
  );

-- Posts
CREATE POLICY "Posts are viewable by everyone"
  ON posts FOR SELECT USING (true);
CREATE POLICY "Users can create own posts"
  ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE USING (auth.uid() = user_id);

-- Likes
CREATE POLICY "Likes are viewable by everyone"
  ON likes FOR SELECT USING (true);
CREATE POLICY "Users can create own likes"
  ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own likes"
  ON likes FOR DELETE USING (auth.uid() = user_id);

-- Reposts
CREATE POLICY "Reposts are viewable by everyone"
  ON reposts FOR SELECT USING (true);
CREATE POLICY "Users can create own reposts"
  ON reposts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own reposts"
  ON reposts FOR DELETE USING (auth.uid() = user_id);

-- Bookmarks
CREATE POLICY "Bookmarks are viewable by everyone"
  ON bookmarks FOR SELECT USING (true);
CREATE POLICY "Users can create own bookmarks"
  ON bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own bookmarks"
  ON bookmarks FOR DELETE USING (auth.uid() = user_id);

-- Follows
CREATE POLICY "Follows are viewable by everyone"
  ON follows FOR SELECT USING (true);
CREATE POLICY "Users can follow others"
  ON follows FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can unfollow"
  ON follows FOR DELETE USING (auth.uid() = follower_id);

-- Comments
CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments"
  ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE USING (auth.uid() = user_id);

-- Notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create notifications"
  ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Questions
CREATE POLICY "Users can view own questions"
  ON questions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all questions"
  ON questions FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR role IN ('mod', 'mod+')))
  );
CREATE POLICY "Users can create questions"
  ON questions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own questions"
  ON questions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can update all questions"
  ON questions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR role IN ('mod', 'mod+')))
  );

-- Question replies
CREATE POLICY "Users can view replies to own questions"
  ON question_replies FOR SELECT USING (
    EXISTS (SELECT 1 FROM questions WHERE id = question_id AND user_id = auth.uid())
  );
CREATE POLICY "Admins can view all replies"
  ON question_replies FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR role IN ('mod', 'mod+')))
  );
CREATE POLICY "Users can reply to own questions"
  ON question_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can reply to any question"
  ON question_replies FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND (is_admin = true OR role IN ('mod', 'mod+')))
  );

-- Discussions
CREATE POLICY "Discussions are viewable by everyone"
  ON discussions FOR SELECT USING (true);
CREATE POLICY "Users can create discussions"
  ON discussions FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update own discussions"
  ON discussions FOR UPDATE USING (auth.uid() = creator_id);

-- Discussion members
CREATE POLICY "Discussion members are viewable by everyone"
  ON discussion_members FOR SELECT USING (true);
CREATE POLICY "Users can join discussions"
  ON discussion_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave discussions"
  ON discussion_members FOR DELETE USING (auth.uid() = user_id);

-- Discussion posts
CREATE POLICY "Discussion posts are viewable by everyone"
  ON discussion_posts FOR SELECT USING (true);
CREATE POLICY "Members can post to discussions"
  ON discussion_posts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Messages
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages"
  ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update own received messages"
  ON messages FOR UPDATE USING (auth.uid() = receiver_id);

-- ShortVs
CREATE POLICY "ShortVs are viewable by everyone"
  ON shortvs FOR SELECT USING (true);
CREATE POLICY "Users can create shortvs"
  ON shortvs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own shortvs"
  ON shortvs FOR DELETE USING (auth.uid() = user_id);

-- ShortV likes
CREATE POLICY "ShortV likes are viewable by everyone"
  ON shortv_likes FOR SELECT USING (true);
CREATE POLICY "Users can like shortvs"
  ON shortv_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike shortvs"
  ON shortv_likes FOR DELETE USING (auth.uid() = user_id);

-- ShortV comments
CREATE POLICY "ShortV comments are viewable by everyone"
  ON shortv_comments FOR SELECT USING (true);
CREATE POLICY "Users can comment on shortvs"
  ON shortv_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own shortv comments"
  ON shortv_comments FOR DELETE USING (auth.uid() = user_id);

-- Post hashtags
CREATE POLICY "Post hashtags are viewable by everyone"
  ON post_hashtags FOR SELECT USING (true);
CREATE POLICY "Users can insert post hashtags"
  ON post_hashtags FOR INSERT WITH CHECK (true);

-- Post views
CREATE POLICY "Users can insert post views"
  ON post_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own post views"
  ON post_views FOR SELECT USING (auth.uid() = user_id);

-- Bookmark folders
CREATE POLICY "Users can manage own bookmark folders"
  ON bookmark_folders FOR ALL USING (auth.uid() = user_id);

-- Lists
CREATE POLICY "Lists are viewable by everyone"
  ON lists FOR SELECT USING (true);
CREATE POLICY "Users can manage own lists"
  ON lists FOR ALL USING (auth.uid() = user_id);

-- List members
CREATE POLICY "List members are viewable by everyone"
  ON list_members FOR SELECT USING (true);
CREATE POLICY "Users can manage own list members"
  ON list_members FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM lists WHERE id = list_id AND user_id = auth.uid()));
CREATE POLICY "Users can remove own list members"
  ON list_members FOR DELETE USING (EXISTS (SELECT 1 FROM lists WHERE id = list_id AND user_id = auth.uid()));

-- Polls
CREATE POLICY "Polls are viewable by everyone"
  ON polls FOR SELECT USING (true);
CREATE POLICY "Users can create polls"
  ON polls FOR INSERT WITH CHECK (true);

-- Poll options
CREATE POLICY "Poll options are viewable by everyone"
  ON poll_options FOR SELECT USING (true);
CREATE POLICY "Users can create poll options"
  ON poll_options FOR INSERT WITH CHECK (true);

-- Poll votes
CREATE POLICY "Users can view poll votes"
  ON poll_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote on polls"
  ON poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Blocks
CREATE POLICY "Users can manage own blocks"
  ON blocks FOR ALL USING (auth.uid() = blocker_id);

-- Mutes
CREATE POLICY "Users can manage own mutes"
  ON mutes FOR ALL USING (auth.uid() = user_id);

-- Post drafts
CREATE POLICY "Users can manage own drafts"
  ON post_drafts FOR ALL USING (auth.uid() = user_id);

-- Reports
CREATE POLICY "Users can create reports"
  ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins can view all reports"
  ON reports FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- Data exports
CREATE POLICY "Users can manage own data exports"
  ON data_exports FOR ALL USING (auth.uid() = user_id);

-- Comment likes
CREATE POLICY "Comment likes are viewable by everyone"
  ON comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can like comments"
  ON comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike comments"
  ON comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Stories
CREATE POLICY "Stories are viewable by everyone"
  ON stories FOR SELECT USING (true);
CREATE POLICY "Users can create stories"
  ON stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own stories"
  ON stories FOR DELETE USING (auth.uid() = user_id);

-- Story views
CREATE POLICY "Users can view story views"
  ON story_views FOR SELECT USING (true);
CREATE POLICY "Users can view stories"
  ON story_views FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Saved searches
CREATE POLICY "Users can manage own saved searches"
  ON saved_searches FOR ALL USING (auth.uid() = user_id);

-- Reminders
CREATE POLICY "Users can manage own reminders"
  ON reminders FOR ALL USING (auth.uid() = user_id);

-- User achievements
CREATE POLICY "Achievements are viewable by everyone"
  ON user_achievements FOR SELECT USING (true);
CREATE POLICY "System can create achievements"
  ON user_achievements FOR INSERT WITH CHECK (true);

-- Audit logs
CREATE POLICY "Admins can view audit logs"
  ON audit_logs FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
CREATE POLICY "Admins can create audit logs"
  ON audit_logs FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Post reactions
CREATE POLICY "Reactions are viewable by everyone"
  ON post_reactions FOR SELECT USING (true);
CREATE POLICY "Users can add reactions"
  ON post_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their own reactions"
  ON post_reactions FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- RPC FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION increment_member_count(did UUID)
RETURNS void AS $$
BEGIN
  UPDATE discussions SET member_count = member_count + 1 WHERE id = did;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_shortv_views(sid UUID)
RETURNS void AS $$
BEGIN
  UPDATE shortvs SET view_count = view_count + 1 WHERE id = sid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_post_views(pid UUID)
RETURNS void AS $$
BEGIN
  UPDATE posts SET view_count = view_count + 1 WHERE id = pid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_poll_vote_count(pid UUID)
RETURNS void AS $$
BEGIN
  UPDATE polls SET total_votes = total_votes + 1 WHERE id = pid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_poll_option_votes(oid UUID)
RETURNS void AS $$
BEGIN
  UPDATE poll_options SET vote_count = vote_count + 1 WHERE id = oid;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_story_views(sid UUID)
RETURNS void AS $$
BEGIN
  UPDATE stories SET view_count = view_count + 1 WHERE id = sid;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- MONETIZATION SYSTEM
-- ============================================

-- Creator subscription plans (creators set their own prices)
CREATE TABLE IF NOT EXISTS creator_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT 'Premium',
  description   TEXT NOT NULL DEFAULT '',
  price_cents   INT NOT NULL CHECK (price_cents > 0),
  currency      TEXT NOT NULL DEFAULT 'USD',
  interval      TEXT NOT NULL DEFAULT 'month' CHECK (interval IN ('month', 'year')),
  features      JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  subscriber_count INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_creator_plans_creator ON creator_plans (creator_id);

-- Subscriptions (users subscribe to creators)
CREATE TABLE IF NOT EXISTS subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  creator_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan_id       UUID NOT NULL REFERENCES creator_plans(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired')),
  platform_fee_pct INT NOT NULL DEFAULT 20,
  started_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (subscriber_id, creator_id)
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber ON subscriptions (subscriber_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_creator ON subscriptions (creator_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions (status);

-- Tips / donations (users tip creators on posts)
CREATE TABLE IF NOT EXISTS tips (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id       UUID REFERENCES posts(id) ON DELETE SET NULL,
  amount_cents  INT NOT NULL CHECK (amount_cents > 0),
  currency      TEXT NOT NULL DEFAULT 'USD',
  platform_fee_pct INT NOT NULL DEFAULT 20,
  message       TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tips_from ON tips (from_user_id);
CREATE INDEX IF NOT EXISTS idx_tips_to ON tips (to_user_id);
CREATE INDEX IF NOT EXISTS idx_tips_post ON tips (post_id) WHERE post_id IS NOT NULL;

-- Creator wallets (track earnings)
CREATE TABLE IF NOT EXISTS wallets (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance_cents     BIGINT NOT NULL DEFAULT 0,
  total_earned_cents BIGINT NOT NULL DEFAULT 0,
  total_withdrawn_cents BIGINT NOT NULL DEFAULT 0,
  currency          TEXT NOT NULL DEFAULT 'USD',
  is_payout_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Financial transactions log
CREATE TABLE IF NOT EXISTS transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('tip_received', 'tip_sent', 'subscription_received', 'subscription_sent', 'withdrawal', 'deposit')),
  amount_cents  INT NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'USD',
  platform_fee_cents INT NOT NULL DEFAULT 0,
  related_tip_id UUID REFERENCES tips(id) ON DELETE SET NULL,
  related_subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  description   TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions (user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);
CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions (created_at DESC);

-- Platform revenue tracking
CREATE TABLE IF NOT EXISTS platform_revenue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source        TEXT NOT NULL CHECK (source IN ('subscription_fee', 'tip_fee')),
  amount_cents  INT NOT NULL,
  currency      TEXT NOT NULL DEFAULT 'USD',
  from_user_id  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  to_user_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_source ON platform_revenue (source);
CREATE INDEX IF NOT EXISTS idx_platform_revenue_created ON platform_revenue (created_at DESC);

-- Enable RLS
ALTER TABLE creator_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_revenue ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PAYMENT LINKS (creator external donation platforms)
-- ============================================

CREATE TABLE IF NOT EXISTS payment_links (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  platform      TEXT NOT NULL CHECK (platform IN ('stripe', 'paypal', 'ko_fi', 'buy_me_a_coffee', 'boosty', 'donationalerts', 'qiwi', 'yoomoney', 'crypto', 'other')),
  url           TEXT NOT NULL,
  label         TEXT NOT NULL DEFAULT '',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payment_links_user ON payment_links (user_id);

ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_payment_links_updated_at ON payment_links;
CREATE TRIGGER trg_payment_links_updated_at
  BEFORE UPDATE ON payment_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Policies: Creator Plans
DO $$ BEGIN
  DROP POLICY IF EXISTS "Creator plans are viewable by everyone" ON creator_plans;
  DROP POLICY IF EXISTS "Creators can manage own plans" ON creator_plans;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Creator plans are viewable by everyone"
  ON creator_plans FOR SELECT USING (true);
CREATE POLICY "Creators can manage own plans"
  ON creator_plans FOR ALL USING (auth.uid() = creator_id);

-- Policies: Subscriptions
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
  DROP POLICY IF EXISTS "Users can create subscriptions" ON subscriptions;
  DROP POLICY IF EXISTS "Subscribers can cancel own subscriptions" ON subscriptions;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Users can view own subscriptions"
  ON subscriptions FOR SELECT USING (auth.uid() = subscriber_id OR auth.uid() = creator_id);
CREATE POLICY "Users can create subscriptions"
  ON subscriptions FOR INSERT WITH CHECK (auth.uid() = subscriber_id);
CREATE POLICY "Subscribers can cancel own subscriptions"
  ON subscriptions FOR UPDATE USING (auth.uid() = subscriber_id);

-- Policies: Tips
DO $$ BEGIN
  DROP POLICY IF EXISTS "Tips are viewable by sender and receiver" ON tips;
  DROP POLICY IF EXISTS "Users can send tips" ON tips;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Tips are viewable by sender and receiver"
  ON tips FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY "Users can send tips"
  ON tips FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Policies: Wallets
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own wallet" ON wallets;
  DROP POLICY IF EXISTS "System can create wallets" ON wallets;
  DROP POLICY IF EXISTS "Users can update own wallet" ON wallets;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Users can view own wallet"
  ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create wallets"
  ON wallets FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own wallet"
  ON wallets FOR UPDATE USING (auth.uid() = user_id);

-- Policies: Transactions
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
  DROP POLICY IF EXISTS "System can create transactions" ON transactions;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can create transactions"
  ON transactions FOR INSERT WITH CHECK (true);

-- Policies: Platform Revenue (admin only)
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can view platform revenue" ON platform_revenue;
  DROP POLICY IF EXISTS "System can create platform revenue" ON platform_revenue;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Admins can view platform revenue"
  ON platform_revenue FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );
CREATE POLICY "System can create platform revenue"
  ON platform_revenue FOR INSERT WITH CHECK (true);

-- Policies: Payment Links
DO $$ BEGIN
  DROP POLICY IF EXISTS "Payment links are viewable by everyone" ON payment_links;
  DROP POLICY IF EXISTS "Users can manage own payment links" ON payment_links;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;
CREATE POLICY "Payment links are viewable by everyone"
  ON payment_links FOR SELECT USING (true);
CREATE POLICY "Users can manage own payment links"
  ON payment_links FOR ALL USING (auth.uid() = user_id);

-- Trigger: Update updated_at for creator_plans
DROP TRIGGER IF EXISTS trg_creator_plans_updated_at ON creator_plans;
CREATE TRIGGER trg_creator_plans_updated_at
  BEFORE UPDATE ON creator_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: Update updated_at for wallets
DROP TRIGGER IF EXISTS trg_wallets_updated_at ON wallets;
CREATE TRIGGER trg_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- STORAGE BUCKETS
-- ============================================

INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('post-videos', 'post-videos', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('shortvs', 'shortvs', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can upload an avatar" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
  DROP POLICY IF EXISTS "Post images are publicly accessible" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;
  DROP POLICY IF EXISTS "Cover images are publicly accessible" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can upload a cover" ON storage.objects;
  DROP POLICY IF EXISTS "Post videos are publicly accessible" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload post videos" ON storage.objects;
  DROP POLICY IF EXISTS "ShortV videos are publicly accessible" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload shortv videos" ON storage.objects;
  DROP POLICY IF EXISTS "Story images are publicly accessible" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can upload stories" ON storage.objects;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Anyone can upload an avatar"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars');
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Cover images are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'covers');
CREATE POLICY "Anyone can upload a cover"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'covers');

CREATE POLICY "Post images are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'post-images');
CREATE POLICY "Authenticated users can upload post images"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'post-images' AND auth.role() = 'authenticated');

CREATE POLICY "Post videos are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'post-videos');
CREATE POLICY "Authenticated users can upload post videos"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'post-videos' AND auth.role() = 'authenticated');

CREATE POLICY "ShortV videos are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'shortvs');
CREATE POLICY "Authenticated users can upload shortv videos"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'shortvs' AND auth.role() = 'authenticated');

CREATE POLICY "Story images are publicly accessible"
  ON storage.objects FOR SELECT USING (bucket_id = 'stories');
CREATE POLICY "Authenticated users can upload stories"
  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'stories' AND auth.role() = 'authenticated');

-- ============================================
-- HOW TO USE
-- ============================================
-- Verify a user:
--   UPDATE profiles SET is_verified = true WHERE id = 'USER_UUID';
--
-- Make admin:
--   UPDATE profiles SET is_admin = true WHERE id = 'USER_UUID';
--
-- Ban user:
--   UPDATE profiles SET is_banned = true WHERE id = 'USER_UUID';
