import { el, clearElement } from '../utils/dom.js';
import { getCurrentUser } from '../state.js';
import { supabase } from '../supabase.js';

const FAQ_ITEMS = [
  {
    q: 'How to create a post?',
    a: 'Click the "Post" button in the sidebar or the "+" icon on mobile. You can add text, images, videos, polls, or geolocation.',
  },
  {
    q: 'How does verification work?',
    a: 'Go to Settings > Verify and submit a request. Mention your reason — public figure, brand, or notable creator. The team will review it.',
  },
  {
    q: 'How to export my data?',
    a: 'Go to Settings and click "Export my data". Your data will be available in JSON and CSV formats.',
  },
  {
    q: 'What is ShortV?',
    a: 'ShortV is short-form video (similar to Reels/Shorts). Create and watch short vertical videos from other users.',
  },
  {
    q: 'How to manage privacy?',
    a: 'In Settings > Privacy you can block and mute users. Manage your blocked and muted accounts there.',
  },
  {
    q: 'What keyboard shortcuts are available?',
    a: 'N — new post, / — search, J — next post, K — previous post. Works on desktop.',
  },
  {
    q: 'How does the follow system work?',
    a: 'Follow users to see their posts in your feed. If the follow is mutual — you become friends and can exchange messages.',
  },
  {
    q: 'How to create a poll?',
    a: 'When creating a post, click the poll icon, add answer options (2 to 6), and publish.',
  },
];

let currentView = 'hub';

export async function render(container) {
  const user = getCurrentUser();
  if (!user) return;

  clearElement(container);
  currentView = 'hub';
  renderHub(container, user);
}

function renderHub(container, user) {
  container.innerHTML = '';

  const header = el('div', { className: 'page-header' }, [
    el('h1', { className: 'page-header-title', textContent: 'Support' }),
  ]);

  const welcome = el('div', { className: 'support-welcome' }, [
    el('div', { className: 'support-welcome-icon', innerHTML: '<svg viewBox="0 0 24 24" width="32" height="32"><path fill="var(--accent)" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>' }),
    el('div', { className: 'support-welcome-text' }, [
      el('h2', { textContent: 'Need help?' }),
      el('p', { textContent: 'Choose a way to get in touch or find answers yourself' }),
    ]),
  ]);

  const actions = el('div', { className: 'support-actions' });

  const myQuestionsCard = el('div', {
    className: 'support-action-card',
    onClick: () => openView('my-questions', container, user),
  }, [
    el('div', { className: 'support-action-icon', innerHTML: '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>' }),
    el('div', { className: 'support-action-info' }, [
      el('div', { className: 'support-action-label', textContent: 'My Questions' }),
      el('div', { className: 'support-action-desc', textContent: 'View your tickets and replies' }),
    ]),
    el('div', { className: 'support-action-arrow', innerHTML: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>' }),
  ]);

  const faqCard = el('div', {
    className: 'support-action-card',
    onClick: () => openView('faq', container, user),
  }, [
    el('div', { className: 'support-action-icon', innerHTML: '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/></svg>' }),
    el('div', { className: 'support-action-info' }, [
      el('div', { className: 'support-action-label', textContent: 'FAQ' }),
      el('div', { className: 'support-action-desc', textContent: 'Answers to common questions' }),
    ]),
    el('div', { className: 'support-action-arrow', innerHTML: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>' }),
  ]);

  const contactCard = el('div', {
    className: 'support-action-card',
    onClick: () => openView('contact', container, user),
  }, [
    el('div', { className: 'support-action-icon', innerHTML: '<svg viewBox="0 0 24 24" width="24" height="24"><path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>' }),
    el('div', { className: 'support-action-info' }, [
      el('div', { className: 'support-action-label', textContent: 'Contact Support' }),
      el('div', { className: 'support-action-desc', textContent: 'Reach out to the team' }),
    ]),
    el('div', { className: 'support-action-arrow', innerHTML: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>' }),
  ]);

  actions.append(myQuestionsCard, faqCard, contactCard);

  const faqPreview = el('div', { className: 'support-faq-preview' }, [
    el('div', { className: 'support-section-header' }, [
      el('h3', { textContent: 'FAQ' }),
      el('button', {
        className: 'support-see-all-btn',
        textContent: 'See all →',
        onClick: () => openView('faq', container, user),
      }),
    ]),
  ]);

  for (const item of FAQ_ITEMS.slice(0, 4)) {
    faqPreview.appendChild(el('div', { className: 'support-faq-item' }, [
      el('div', { className: 'support-faq-q', textContent: item.q }),
      el('div', { className: 'support-faq-a', textContent: item.a }),
    ]));
  }

  const contactInfo = el('div', { className: 'support-contact-info' }, [
    el('div', { className: 'support-section-header' }, [
      el('h3', { textContent: 'Contact' }),
    ]),
    el('div', { className: 'support-contact-item' }, [
      el('div', { className: 'support-contact-icon', innerHTML: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>' }),
      el('div', { textContent: 'orange.SnapThought@gmail.com' }),
    ]),
  ]);

  container.append(header, welcome, actions, faqPreview, contactInfo);
}

function openView(view, container, user) {
  currentView = view;
  container.innerHTML = '';

  if (view === 'my-questions') renderMyQuestions(container, user);
  else if (view === 'contact') renderContactView(container, user);
  else if (view === 'faq') renderFaqView(container, user);
}

function renderBackBtn(container, user, title) {
  return el('div', { className: 'page-header' }, [
    el('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } }, [
      el('button', {
        className: 'ai-support-back-btn',
        innerHTML: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>',
        onClick: () => renderHub(container, user),
      }),
      el('h1', { className: 'page-header-title', textContent: title }),
    ]),
  ]);
}

// ===== MY QUESTIONS =====
async function renderMyQuestions(container, user) {
  container.append(renderBackBtn(container, user, 'My Questions'));

  const list = el('div', { style: { padding: '16px' } });
  list.appendChild(el('div', { className: 'empty-state', textContent: 'Loading...' }));
  container.appendChild(list);

  try {
    const { data: questions } = await supabase
      .from('questions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    list.innerHTML = '';

    if (!questions || questions.length === 0) {
      list.appendChild(el('div', { className: 'empty-state', style: { padding: '40px 16px' } }, [
        el('div', { textContent: 'No questions yet', style: { fontSize: '16px', fontWeight: '600', marginBottom: '8px' } }),
        el('div', { textContent: 'Submit a question and we\'ll get back to you', style: { fontSize: '14px', color: 'var(--text-secondary)' } }),
      ]));
      return;
    }

    for (const q of questions) {
      const card = el('div', { className: 'support-question-card' });

      const statusClass = q.status === 'open' ? 'open' : 'closed';
      card.appendChild(el('div', { className: 'support-question-header' }, [
        el('div', { className: 'support-question-subject', textContent: q.subject || 'No subject' }),
        el('span', { className: 'support-question-status ' + statusClass, textContent: q.status }),
      ]));

      card.appendChild(el('div', { className: 'support-question-body', textContent: q.message }));

      card.appendChild(el('div', { className: 'support-question-time', textContent: new Date(q.created_at).toLocaleDateString() }));

      // Replies
      const { data: replies } = await supabase
        .from('question_replies')
        .select('*, profiles:user_id(username, display_name)')
        .eq('question_id', q.id)
        .order('created_at');

      if (replies && replies.length > 0) {
        const repliesDiv = el('div', { className: 'support-question-replies' });
        for (const r of replies) {
          repliesDiv.appendChild(el('div', { className: 'support-question-reply' }, [
            el('div', { className: 'support-question-reply-author', textContent: r.profiles?.display_name || 'Admin' }),
            el('div', { textContent: r.message }),
          ]));
        }
        card.appendChild(repliesDiv);
      }

      list.appendChild(card);
    }
  } catch (err) {
    list.innerHTML = '';
    list.appendChild(el('div', { className: 'empty-state', textContent: 'Failed to load questions' }));
  }
}

// ===== CONTACT =====
function renderContactView(container, user) {
  container.append(renderBackBtn(container, user, 'Contact Support'));

  const subjectInput = el('input', { className: 'input', placeholder: 'Subject' });
  const messageInput = el('textarea', { className: 'settings-textarea', placeholder: 'Describe your issue in detail...', rows: '6' });
  const errorDiv = el('div', { className: 'auth-error', style: { display: 'none' } });
  const successDiv = el('div', { className: 'support-success', style: { display: 'none' } });

  const submitBtn = el('button', {
    className: 'btn btn-primary btn-lg',
    textContent: 'Send',
    onClick: async () => {
      const subject = subjectInput.value.trim();
      const message = messageInput.value.trim();
      if (!message) {
        errorDiv.textContent = 'Please describe your issue';
        errorDiv.style.display = 'block';
        return;
      }
      submitBtn.disabled = true;
      submitBtn.textContent = 'Sending...';
      errorDiv.style.display = 'none';

      try {
        await supabase.from('questions').insert({
          user_id: user.id,
          subject: subject || 'Support request',
          message,
        });
        subjectInput.value = '';
        messageInput.value = '';
        successDiv.textContent = 'Sent! We\'ll reply soon.';
        successDiv.style.display = 'block';
        submitBtn.textContent = 'Send';
        setTimeout(() => { successDiv.style.display = 'none'; }, 5000);
      } catch (err) {
        errorDiv.textContent = 'Failed to send. Try again later.';
        errorDiv.style.display = 'block';
      }
      submitBtn.disabled = false;
    },
  });

  const form = el('div', { className: 'settings-form' }, [
    el('h3', { textContent: 'Send us a message', style: { fontSize: '18px', fontWeight: '700', marginBottom: '8px' } }),
    el('p', { textContent: 'Describe your question or issue — moderators and developers will reply.', style: { color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px' } }),
    el('div', { className: 'input-group' }, [el('label', { className: 'input-label', textContent: 'Subject' }), subjectInput]),
    el('div', { className: 'input-group' }, [el('label', { className: 'input-label', textContent: 'Message' }), messageInput]),
    errorDiv,
    successDiv,
    submitBtn,
  ]);

  container.appendChild(form);
}

// ===== FAQ =====
function renderFaqView(container, user) {
  container.append(renderBackBtn(container, user, 'FAQ'));

  const searchInput = el('input', {
    className: 'input',
    placeholder: 'Search questions...',
    style: { margin: '12px 16px', width: 'calc(100% - 32px)' },
  });

  const faqList = el('div', { className: 'support-faq-list' });

  function renderFaqItems(filter = '') {
    faqList.innerHTML = '';
    const filtered = FAQ_ITEMS.filter(item =>
      !filter || item.q.toLowerCase().includes(filter.toLowerCase()) || item.a.toLowerCase().includes(filter.toLowerCase())
    );

    if (filtered.length === 0) {
      faqList.appendChild(el('div', { className: 'empty-state', textContent: 'No results found', style: { padding: '32px' } }));
      return;
    }

    for (const item of filtered) {
      const faqItem = el('div', { className: 'support-faq-item-full' });
      const q = el('div', {
        className: 'support-faq-item-q',
        onClick: () => {
          const isOpen = faqItem.classList.contains('open');
          document.querySelectorAll('.support-faq-item-full.open').forEach(el => el.classList.remove('open'));
          if (!isOpen) faqItem.classList.add('open');
        },
      }, [
        el('span', { textContent: item.q }),
        el('span', { className: 'support-faq-chevron', innerHTML: '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="currentColor" d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/></svg>' }),
      ]);
      const a = el('div', { className: 'support-faq-item-a', textContent: item.a });
      faqItem.append(q, a);
      faqList.appendChild(faqItem);
    }
  }

  searchInput.addEventListener('input', () => renderFaqItems(searchInput.value.trim()));
  renderFaqItems();

  container.append(searchInput, faqList);
}

export function cleanup() {}
