import { supabase } from '../supabase.js';

function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function getOrCreateReferralCode(userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', userId)
    .single();

  if (profile?.referral_code) return profile.referral_code;

  const code = generateCode();
  await supabase
    .from('profiles')
    .update({ referral_code: code })
    .eq('id', userId);

  return code;
}

export async function applyReferral(newUserId, referralCode) {
  if (!referralCode) return false;

  // Find the referrer
  const { data: referrer } = await supabase
    .from('profiles')
    .select('id')
    .eq('referral_code', referralCode)
    .maybeSingle();

  if (!referrer) return false;

  // Update the new user's referred_by
  await supabase
    .from('profiles')
    .update({ referred_by: referrer.id })
    .eq('id', newUserId);

  return true;
}

export async function getReferralStats(userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code, referred_by')
    .eq('id', userId)
    .single();

  const { count: referralCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('referred_by', userId);

  return {
    code: profile?.referral_code || null,
    referredBy: profile?.referred_by || null,
    referralCount: referralCount || 0,
  };
}
