const STORAGE_KEY = 'snapthought-rate-limit';

function getRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveRecords(records) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function cleanOldRecords(records, windowMs) {
  const now = Date.now();
  const cutoff = now - windowMs;
  const cleaned = {};
  for (const [key, timestamps] of Object.entries(records)) {
    const filtered = timestamps.filter(t => t > cutoff);
    if (filtered.length > 0) cleaned[key] = filtered;
  }
  return cleaned;
}

export function checkRateLimit(action, maxCount, windowMinutes) {
  const records = getRecords();
  const windowMs = windowMinutes * 60 * 1000;
  const now = Date.now();

  const cleaned = cleanOldRecords(records, windowMs);
  const timestamps = cleaned[action] || [];
  const count = timestamps.length;

  if (count >= maxCount) {
    const oldestInWindow = Math.min(...timestamps);
    const waitMs = oldestInWindow + windowMs - now;
    const waitMinutes = Math.ceil(waitMs / 60000);
    return { allowed: false, waitMinutes };
  }

  return { allowed: true };
}

export function recordAction(action) {
  const records = getRecords();
  const now = Date.now();
  if (!records[action]) records[action] = [];
  records[action].push(now);
  saveRecords(records);
}

export function canCreatePost() {
  return checkRateLimit('post', 10, 60);
}

export function recordPostCreation() {
  recordAction('post');
}

export function canCreateComment() {
  return checkRateLimit('comment', 30, 60);
}

export function recordCommentCreation() {
  recordAction('comment');
}
