// Simple markdown renderer for posts
// Supports: **bold**, *italic*, ~~strikethrough~~, `code`, ```code blocks```, [links](url), #hashtags, @mentions

export function renderMarkdown(text) {
  if (!text) return '';

  let html = escapeHtml(text);

  // Code blocks (``` ... ```)
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

  // Inline code (` ... `)
  html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

  // Bold (** ... **)
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Italic (* ... *)
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Strikethrough (~~ ... ~~)
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');

  // Links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="md-link">$1</a>');

  // Hashtags (#word) - clickable links
  html = html.replace(/(^|\s)#(\w+)/g, '$1<a href="#/search?q=%23$2" class="md-hashtag" onclick="event.stopPropagation()">#$2</a>');

  // @mentions - clickable links
  html = html.replace(/(^|\s)@(\w+)/g, '$1<a href="#/user/$2" class="md-mention" onclick="event.stopPropagation()">@$2</a>');

  // Line breaks
  html = html.replace(/\n/g, '<br>');

  return html;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
