/**
 * Live Stream Components
 */

export function createLiveCard(stream) {
  const div = document.createElement('div');
  div.className = 'live-card';
  div.innerHTML = `
    <div class="live-card__thumbnail">
      ${stream.thumbnail_url ? `<img src="${stream.thumbnail_url}" alt="${stream.title}">` : '<div class="live-card__placeholder">📺</div>'}
      <div class="live-card__badge">🔴 LIVE</div>
      <div class="live-card__viewers">👁️ ${stream.viewer_count}</div>
    </div>

    <div class="live-card__content">
      <h3 class="live-card__title">${stream.title}</h3>
      <p class="live-card__description">${stream.description || 'No description'}</p>
      
      <div class="live-card__streamer">
        <img src="${stream.streamer.avatar_url || '/assets/default-avatar.png'}" alt="${stream.streamer.username}" class="live-card__streamer-avatar">
        <span>${stream.streamer.display_name}${stream.streamer.is_verified ? ' ✓' : ''}</span>
      </div>

      <div class="live-card__stats">
        <span>❤️ ${stream.like_count}</span>
        <span>💬 ${stream.comment_count}</span>
      </div>

      <button class="live-card__button btn btn-primary" onclick="window.location.hash = '#live/${stream.id}'">
        Watch Live
      </button>
    </div>
  `;

  return div;
}

export function createLivePlayer(stream) {
  const div = document.createElement('div');
  div.className = 'live-player';
  div.innerHTML = `
    <div class="live-player__video">
      <div class="live-player__placeholder">
        <div class="live-player__badge">🔴 LIVE</div>
        ${stream.thumbnail_url ? `<img src="${stream.thumbnail_url}" alt="${stream.title}">` : ''}
      </div>
    </div>

    <div class="live-player__info">
      <div class="live-player__header">
        <div class="live-player__streamer">
          <img src="${stream.streamer.avatar_url}" alt="${stream.streamer.username}" class="avatar">
          <div>
            <h3>${stream.streamer.display_name}</h3>
            <p>@${stream.streamer.username}</p>
          </div>
        </div>
        <button class="btn btn-secondary">Follow</button>
      </div>

      <div class="live-player__title">
        <h2>${stream.title}</h2>
        <p>${stream.description}</p>
      </div>

      <div class="live-player__actions">
        <button class="btn btn-icon" title="Like" onclick="alert('Like!')">❤️ ${stream.like_count}</button>
        <button class="btn btn-icon" title="Share" onclick="alert('Share!')">🔗</button>
        <button class="btn btn-icon" title="More" onclick="alert('More')">⋮</button>
      </div>

      <div class="live-player__stats">
        <span>👁️ ${stream.viewer_count} watching</span>
        <span>⏱️ Started ${new Date(stream.started_at).toLocaleTimeString()}</span>
      </div>
    </div>
  `;

  return div;
}

export function createLiveChat(messages = []) {
  const div = document.createElement('div');
  div.className = 'live-chat';
  
  div.innerHTML = `
    <div class="live-chat__header">
      <h4>Live Chat</h4>
      <button class="btn btn-icon">⚙️</button>
    </div>

    <div class="live-chat__messages" id="liveMessages">
      ${messages.map(msg => `
        <div class="live-chat__message">
          <img src="${msg.sender.avatar_url}" alt="${msg.sender.username}" class="live-chat__avatar">
          <div class="live-chat__bubble">
            <strong>${msg.sender.display_name}</strong>
            <p>${msg.message}</p>
          </div>
        </div>
      `).join('') || '<p class="live-chat__empty">No messages yet</p>'}
    </div>

    <div class="live-chat__input">
      <input type="text" placeholder="Say something..." class="live-chat__text" id="chatInput">
      <button class="btn btn-primary" id="sendChatBtn">Send</button>
    </div>
  `;

  return div;
}

export function createGiftPanel() {
  const gifts = ['🎁', '🎉', '🎊', '💝', '🌹', '⭐', '💎', '🔥'];
  
  const div = document.createElement('div');
  div.className = 'gift-panel';
  div.innerHTML = `
    <div class="gift-panel__header">
      <h4>Send a Gift</h4>
      <button class="btn btn-icon" onclick="this.closest('.gift-panel').remove()">✕</button>
    </div>

    <div class="gift-panel__grid">
      ${gifts.map((gift, i) => `
        <button class="gift-panel__item" onclick="alert('Sent ${gift}!')">
          <span class="gift-panel__emoji">${gift}</span>
          <span class="gift-panel__name">Gift ${i + 1}</span>
        </button>
      `).join('')}
    </div>
  `;

  return div;
}
