export function getPostUrl(postId) {
  return window.location.origin + window.location.pathname + '#/post/' + postId;
}

export async function sharePost(postId, postContent = '') {
  const url = getPostUrl(postId);

  if (navigator.share) {
    try {
      await navigator.share({
        title: postContent.slice(0, 100) || 'SnapThought Post',
        text: postContent.slice(0, 200),
        url,
      });
      return true;
    } catch (err) {
      if (err.name === 'AbortError') return false;
    }
  }

  await navigator.clipboard.writeText(url);
  return 'copied';
}

export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
