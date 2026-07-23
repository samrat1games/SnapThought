import { getSupabase } from './supabase.js';
import { setCurrentUser } from './state.js';

async function ensureProfile(user) {
  const supabase = await getSupabase();
  // First try to get existing profile
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  const meta = user.user_metadata || {};
  const fullName = meta.full_name || meta.name || 'User';
  const avatar = meta.avatar_url || meta.picture || '';

  if (existing) {
    // Check if profile needs update (generic username, missing avatar, etc.)
    const needsUpdate = existing.username === 'user' ||
      !existing.display_name ||
      existing.display_name === 'User' ||
      (avatar && !existing.avatar_url);

    if (needsUpdate && fullName !== 'User') {
      let baseUsername = fullName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
      let username = baseUsername;
      let counter = 0;

      for (let i = 0; i < 100; i++) {
        const { data: taken } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', username)
          .neq('id', user.id)
          .maybeSingle();
        if (!taken) break;
        counter++;
        username = baseUsername + counter;
      }

      const { data: updated } = await supabase.from('profiles').update({
        username: username,
        display_name: fullName,
        avatar_url: avatar || existing.avatar_url,
      }).eq('id', user.id).select().single();

      return updated || existing;
    }
    return existing;
  }

  // Profile doesn't exist - create it
  let baseUsername = fullName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
  let username = baseUsername;
  let counter = 0;

  for (let i = 0; i < 100; i++) {
    const { data: taken } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username)
      .maybeSingle();
    if (!taken) break;
    counter++;
    username = baseUsername + counter;
  }

  const { data: created, error } = await supabase.from('profiles').insert({
    id: user.id,
    username: username,
    display_name: fullName,
    avatar_url: avatar,
    bio: '',
    cover_url: '',
    website: '',
    is_verified: false,
    is_banned: false,
    is_best: false,
  }).select().single();

  if (error) {
    console.error('Profile insert error:', error.message);
    // Return a local profile object so the app still works
    return {
      id: user.id,
      username: username,
      display_name: fullName,
      avatar_url: avatar,
      bio: '',
      cover_url: '',
      website: '',
      is_verified: false,
      is_banned: false,
      is_best: false,
      created_at: new Date().toISOString(),
    };
  }

  return created;
}

export async function signUp({ email, password, displayName, username }) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: displayName, username },
    },
  });
  if (error) throw error;
  // Mark profile as having password
  if (data.user) {
    await supabase.from('profiles').update({ has_password: true }).eq('id', data.user.id);
  }
  return data;
}

export async function signIn({ email, password }) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  // Mark profile as having password (user can log in with email)
  if (data.user) {
    await supabase.from('profiles').update({ has_password: true }).eq('id', data.user.id);
  }
  return data;
}

export async function signInWithGoogle() {
  const supabase = await getSupabase();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + window.location.pathname,
    },
  });
  if (error) throw error;
}

export async function signInWithGitHub() {
  const supabase = await getSupabase();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: window.location.origin + window.location.pathname,
    },
  });
  if (error) throw error;
}

export async function signInWithDiscord() {
  const supabase = await getSupabase();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'discord',
    options: {
      redirectTo: window.location.origin + window.location.pathname,
    },
  });
  if (error) throw error;
}

export async function setPasswordForOAuthUser(newPassword) {
  const supabase = await getSupabase();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
  // Mark user as having a password
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase.from('profiles').update({ has_password: true }).eq('id', user.id);
    // Clear the prompted flag so it won't ask again
    localStorage.removeItem('snapthought-pw-prompted-' + user.id);
  }
}

export async function signOut() {
  const supabase = await getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  setCurrentUser(null);
}

export async function getSession() {
  const supabase = await getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getUserProfile(userId) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}

export function onAuthStateChange(callback) {
  const supabase = getSupabase();
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      try {
        const profile = await ensureProfile(session.user);

        // Apply referral code if present in URL
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          const urlParams = new URLSearchParams(window.location.search);
          const refCode = urlParams.get('ref');
          if (refCode && !profile.referred_by) {
            const { applyReferral } = await import('./services/referrals.js');
            await applyReferral(profile.id, refCode);
            window.history.replaceState({}, '', window.location.pathname + window.location.hash);
          }

          const { checkAndAwardBadges } = await import('./services/achievements.js');
          checkAndAwardBadges(profile.id).then(awarded => {
            if (awarded.length > 0) console.log('New achievements:', awarded);
          });

          // Detect OAuth-only users who need to set a password
          const providers = session.user.app_metadata?.providers || [];
          const isOAuthOnly = providers.length > 0 && !providers.includes('email');
          if (isOAuthOnly && !profile.has_password) {
            // Check if we already prompted this user in this browser
            const promptedKey = 'snapthought-pw-prompted-' + session.user.id;
            const alreadyPrompted = localStorage.getItem(promptedKey);
            if (!alreadyPrompted) {
              localStorage.setItem(promptedKey, '1');
              // Show mandatory password modal immediately
              window.dispatchEvent(new CustomEvent('oauth-needs-password', {
                detail: { user: session.user, profile, mandatory: true }
              }));
            }
          }
        }

        setCurrentUser(profile);
      } catch (err) {
        console.error('Auth error:', err);
        const meta = session.user.user_metadata || {};
        setCurrentUser({
          id: session.user.id,
          username: meta.full_name?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user',
          display_name: meta.full_name || meta.name || 'User',
          avatar_url: meta.avatar_url || meta.picture || '',
          bio: '',
          cover_url: '',
          website: '',
          is_verified: false,
          is_banned: false,
          is_best: false,
        });
      }
    } else {
      setCurrentUser(null);
    }
    callback(event, session);
  });
}
