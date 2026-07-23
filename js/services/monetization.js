import { supabase } from '../supabase.js';

const PLATFORM_FEE_PCT = 20; // Platform takes 20% of all transactions

// ============================================
// Creator Plans
// ============================================

export async function createCreatorPlan(creatorId, { name, description, price_cents, interval = 'month', features = [] }) {
  const { data, error } = await supabase
    .from('creator_plans')
    .insert({
      creator_id: creatorId,
      name,
      description,
      price_cents,
      interval,
      features,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCreatorPlan(planId, updates) {
  const { data, error } = await supabase
    .from('creator_plans')
    .update(updates)
    .eq('id', planId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCreatorPlan(planId) {
  const { error } = await supabase
    .from('creator_plans')
    .delete()
    .eq('id', planId);
  if (error) throw error;
}

export async function getCreatorPlans(creatorId) {
  const { data, error } = await supabase
    .from('creator_plans')
    .select('*')
    .eq('creator_id', creatorId)
    .eq('is_active', true)
    .order('price_cents', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getAllCreatorPlans() {
  const { data, error } = await supabase
    .from('creator_plans')
    .select('*, creator:creator_id(username, display_name, avatar_url)')
    .eq('is_active', true)
    .order('subscriber_count', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ============================================
// Subscriptions
// ============================================

export async function subscribe(subscriberId, creatorId, planId) {
  const { data: plan } = await supabase
    .from('creator_plans')
    .select('price_cents')
    .eq('id', planId)
    .single();

  if (!plan) throw new Error('Plan not found');

  const platformFee = Math.floor(plan.price_cents * PLATFORM_FEE_PCT / 100);

  const { data, error } = await supabase
    .from('subscriptions')
    .upsert({
      subscriber_id: subscriberId,
      creator_id: creatorId,
      plan_id: planId,
      status: 'active',
      platform_fee_pct: PLATFORM_FEE_PCT,
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'subscriber_id,creator_id' })
    .select()
    .single();
  if (error) throw error;

  // Credit creator wallet
  const creatorEarning = plan.price_cents - platformFee;
  await creditWallet(creatorId, creatorEarning, 'subscription_received');
  await logTransaction(creatorId, 'subscription_received', plan.price_cents, platformFee, { related_subscription_id: data.id });
  await logPlatformRevenue('subscription_fee', platformFee, subscriberId, creatorId);

  // Update subscriber count
  await supabase.rpc('increment_plan_subscribers', { pid: planId }).catch(() => {
    supabase.from('creator_plans').update({ subscriber_count: supabase.rpc ? 0 : 0 }).eq('id', planId);
  });

  return data;
}

export async function cancelSubscription(subscriptionId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .update({ status: 'cancelled' })
    .eq('id', subscriptionId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getMySubscriptions(userId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, creator:creator_id(username, display_name, avatar_url), plan:plan_id(*)')
    .eq('subscriber_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getCreatorSubscribers(creatorId) {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*, subscriber:subscriber_id(username, display_name, avatar_url), plan:plan_id(*)')
    .eq('creator_id', creatorId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function isSubscribed(subscriberId, creatorId) {
  const { data } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('subscriber_id', subscriberId)
    .eq('creator_id', creatorId)
    .eq('status', 'active')
    .maybeSingle();
  return !!data;
}

// ============================================
// Tips
// ============================================

export async function sendTip(fromUserId, toUserId, amountCents, { postId = null, message = '' } = {}) {
  const platformFee = Math.floor(amountCents * PLATFORM_FEE_PCT / 100);

  const { data, error } = await supabase
    .from('tips')
    .insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      post_id: postId,
      amount_cents: amountCents,
      platform_fee_pct: PLATFORM_FEE_PCT,
      message,
    })
    .select()
    .single();
  if (error) throw error;

  // Credit creator wallet
  const creatorEarning = amountCents - platformFee;
  await creditWallet(toUserId, creatorEarning, 'tip_received');
  await logTransaction(toUserId, 'tip_received', amountCents, platformFee, { related_tip_id: data.id });
  await logTransaction(fromUserId, 'tip_sent', amountCents, 0, { related_tip_id: data.id });
  await logPlatformRevenue('tip_fee', platformFee, fromUserId, toUserId);

  return data;
}

export async function getTipsReceived(userId, { limit = 50 } = {}) {
  const { data, error } = await supabase
    .from('tips')
    .select('*, from_user:from_user_id(username, display_name, avatar_url), post:post_id(content)')
    .eq('to_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function getTipsSent(userId, { limit = 50 } = {}) {
  const { data, error } = await supabase
    .from('tips')
    .select('*, to_user:to_user_id(username, display_name, avatar_url)')
    .eq('from_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

// ============================================
// Wallet
// ============================================

async function creditWallet(userId, amountCents, description) {
  const { data: existing } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('wallets')
      .update({
        balance_cents: existing.balance_cents + amountCents,
        total_earned_cents: existing.total_earned_cents + amountCents,
      })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('wallets')
      .insert({
        user_id: userId,
        balance_cents: amountCents,
        total_earned_cents: amountCents,
      });
  }
}

export async function getWallet(userId) {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getTransactions(userId, { limit = 50 } = {}) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

async function logTransaction(userId, type, amountCents, platformFeeCents, extras = {}) {
  await supabase.from('transactions').insert({
    user_id: userId,
    type,
    amount_cents: amountCents,
    platform_fee_cents: platformFeeCents,
    ...extras,
  });
}

async function logPlatformRevenue(source, amountCents, fromUserId, toUserId) {
  await supabase.from('platform_revenue').insert({
    source,
    amount_cents: amountCents,
    from_user_id: fromUserId,
    to_user_id: toUserId,
  });
}

// ============================================
// Analytics (for creator dashboard)
// ============================================

export async function getCreatorEarnings(creatorId) {
  const [wallet, subscriptions, tipsReceived] = await Promise.all([
    getWallet(creatorId),
    supabase
      .from('subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', creatorId)
      .eq('status', 'active'),
    supabase
      .from('tips')
      .select('amount_cents, platform_fee_pct')
      .eq('to_user_id', creatorId),
  ]);

  const totalTips = (tipsReceived.data || []).reduce((sum, t) => sum + t.amount_cents, 0);
  const totalTipFees = (tipsReceived.data || []).reduce((sum, t) => sum + Math.floor(t.amount_cents * t.platform_fee_pct / 100), 0);

  return {
    balance: wallet?.balance_cents || 0,
    totalEarned: wallet?.total_earned_cents || 0,
    activeSubscribers: subscriptions.count || 0,
    totalTipsReceived: totalTips,
    totalTipFeesPaid: totalTipFees,
  };
}

export async function getPlatformRevenue() {
  const { data, error } = await supabase
    .from('platform_revenue')
    .select('amount_cents, source, created_at')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;

  const total = (data || []).reduce((sum, r) => sum + r.amount_cents, 0);
  const bySource = {};
  for (const r of data || []) {
    bySource[r.source] = (bySource[r.source] || 0) + r.amount_cents;
  }

  return { total, bySource, transactions: data || [] };
}

// ============================================
// Payment Links (external donation platforms)
// ============================================

export const PAYMENT_PLATFORMS = {
  stripe: { name: 'Stripe', icon: '💳', color: '#635bff', placeholder: 'https://checkout.stripe.com/pay/...' },
  paypal: { name: 'PayPal', icon: '🅿️', color: '#00457C', placeholder: 'https://paypal.me/yourname' },
  ko_fi: { name: 'Ko-fi', icon: '☕', color: '#ff5e5b', placeholder: 'https://ko-fi.com/yourname' },
  buy_me_a_coffee: { name: 'Buy Me a Coffee', icon: '☕', color: '#ffdd00', placeholder: 'https://buymeacoffee.com/yourname' },
  boosty: { name: 'Boosty', icon: '🚀', color: '#3b82f6', placeholder: 'https://boosty.to/yourname' },
  donationalerts: { name: 'DonationAlerts', icon: '🎁', color: '#ff6b35', placeholder: 'https://www.donationalerts.com/r/yourname' },
  qiwi: { name: 'QIWI', icon: '🥝', color: '#ff8c00', placeholder: 'https://qiwi.com/n/yourname' },
  yoomoney: { name: 'YooMoney', icon: '💰', color: '#000', placeholder: 'https://yoomoney.ru/payments/...' },
  crypto: { name: 'Crypto (BTC/USDT)', icon: '₿', color: '#f7931a', placeholder: 'Your wallet address' },
  other: { name: 'Other', icon: '🔗', color: '#888', placeholder: 'https://...' },
};

export async function addPaymentLink(userId, { platform, url, label = '' }) {
  const { data, error } = await supabase
    .from('payment_links')
    .insert({ user_id: userId, platform, url, label })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function removePaymentLink(linkId) {
  const { error } = await supabase
    .from('payment_links')
    .delete()
    .eq('id', linkId);
  if (error) throw error;
}

export async function getPaymentLinks(userId) {
  const { data, error } = await supabase
    .from('payment_links')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function getAllPaymentLinks(userId) {
  const { data, error } = await supabase
    .from('payment_links')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}
