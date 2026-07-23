import { el, clearElement } from '../utils/dom.js';
import { getCurrentUser, setCurrentUser } from '../state.js';
import {
  getCreatorPlans, createCreatorPlan, deleteCreatorPlan,
  getCreatorEarnings, getMySubscriptions, getCreatorSubscribers,
  getWallet, getTransactions, getTipsReceived, getTipsSent,
  getAllPaymentLinks, addPaymentLink, removePaymentLink, PAYMENT_PLATFORMS,
} from '../services/monetization.js';
import { t } from '../i18n.js';

function formatCents(cents) {
  return '$' + (cents / 100).toFixed(2);
}

export async function render(container) {
  const user = getCurrentUser();
  if (!user) return;
  clearElement(container);

  const header = el('div', { className: 'page-header' }, [
    el('h1', { className: 'page-header-title', textContent: t('earnings') }),
  ]);

  const tabs = el('div', { className: 'tabs' }, [
    el('div', { className: 'tab active', textContent: 'Dashboard', dataset: { tab: 'dashboard' } }),
    el('div', { className: 'tab', textContent: t('createPlan'), dataset: { tab: 'plans' } }),
    el('div', { className: 'tab', textContent: t('paymentMethods'), dataset: { tab: 'payments' } }),
    el('div', { className: 'tab', textContent: t('subscribers'), dataset: { tab: 'subscribers' } }),
    el('div', { className: 'tab', textContent: t('tipsReceived'), dataset: { tab: 'tips' } }),
    el('div', { className: 'tab', textContent: t('subscribe'), dataset: { tab: 'my-subs' } }),
    el('div', { className: 'tab', textContent: t('balance'), dataset: { tab: 'wallet' } }),
  ]);

  const content = el('div', { id: 'earnings-content' });

  tabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    tabs.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderTab(content, user, tab.dataset.tab);
  });

  container.append(header, tabs, content);
  renderTab(content, user, 'dashboard');
}

async function renderTab(container, user, tab) {
  container.innerHTML = '';
  container.appendChild(el('div', { className: 'loading-spinner', textContent: 'Loading...' }));

  try {
    if (tab === 'dashboard') await renderDashboard(container, user);
    else if (tab === 'plans') await renderPlans(container, user);
    else if (tab === 'payments') await renderPaymentLinks(container, user);
    else if (tab === 'subscribers') await renderSubscribers(container, user);
    else if (tab === 'tips') await renderTips(container, user);
    else if (tab === 'my-subs') await renderMySubs(container, user);
    else if (tab === 'wallet') await renderWallet(container, user);
  } catch (err) {
    container.innerHTML = '';
    container.appendChild(el('div', { className: 'auth-error', style: { display: 'block' }, textContent: err.message }));
  }
}

async function renderDashboard(container, user) {
  const earnings = await getCreatorEarnings(user.id);
  container.innerHTML = '';

  const stats = el('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' } }, [
    statCard(t('balance'), formatCents(earnings.balance), '#10b981'),
    statCard(t('totalEarned'), formatCents(earnings.totalEarned), '#6366f1'),
    statCard(t('activeSubscribers'), String(earnings.activeSubscribers), '#f59e0b'),
    statCard(t('tipsReceived'), formatCents(earnings.totalTipsReceived), '#ec4899'),
  ]);

  const infoBox = el('div', { style: { padding: '20px', background: 'var(--bg-secondary)', borderRadius: '12px', marginTop: '16px' } }, [
    el('h3', { textContent: t('howMonetizationWorks'), style: { margin: '0 0 8px', fontSize: '16px', fontWeight: '700' } }),
    el('p', { textContent: t('createPlan'), style: { margin: 0, color: 'var(--text-secondary)', fontSize: '14px' } }),
    el('div', { style: { marginTop: '12px', padding: '12px', background: 'rgba(99,102,241,0.1)', borderRadius: '8px', fontSize: '14px' } }, [
      el('strong', { textContent: (t('earnings') || 'Earnings') + ': ' }),
      el('span', { textContent: '80% / 20%' }),
    ]),
  ]);

  container.append(stats, infoBox);
}

function statCard(label, value, color) {
  return el('div', { style: { padding: '20px', background: 'var(--bg-secondary)', borderRadius: '12px', textAlign: 'center' } }, [
    el('div', { textContent: value, style: { fontSize: '28px', fontWeight: '800', color } }),
    el('div', { textContent: label, style: { fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' } }),
  ]);
}

async function renderPlans(container, user) {
  const plans = await getCreatorPlans(user.id);
  container.innerHTML = '';

  container.appendChild(el('div', { style: { marginBottom: '16px' } }, [
    el('h3', { textContent: t('createPlan'), style: { margin: '0 0 4px', fontSize: '18px', fontWeight: '700' } }),
    el('p', { textContent: t('createPlan'), style: { margin: 0, color: 'var(--text-secondary)', fontSize: '14px' } }),
  ]));

  if (plans.length === 0) {
    container.appendChild(el('p', { textContent: t('createPlan') + '!', style: { color: 'var(--text-secondary)', marginBottom: '16px' } }));
  } else {
    for (const plan of plans) {
      const card = el('div', { style: { padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' } }, [
        el('div', {}, [
          el('div', { textContent: plan.name, style: { fontWeight: '700', fontSize: '16px' } }),
          el('div', { textContent: formatCents(plan.price_cents) + '/' + plan.interval, style: { color: 'var(--accent)', fontWeight: '600' } }),
          el('div', { textContent: plan.description || 'No description', style: { color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' } }),
          el('div', { textContent: plan.subscriber_count + ' ' + t('subscribers'), style: { fontSize: '13px', color: 'var(--text-tertiary)', marginTop: '4px' } }),
        ]),
        el('button', {
          className: 'btn btn-outline btn-sm',
          textContent: t('delete'),
          onClick: async () => {
            if (confirm('Delete this plan?')) {
              await deleteCreatorPlan(plan.id);
              card.remove();
            }
          },
        }),
      ]);
      container.appendChild(card);
    }
  }

  // Create new plan form
  const nameInput = el('input', { className: 'input', placeholder: 'Plan name (e.g. Premium)', style: { marginBottom: '8px' } });
  const descInput = el('input', { className: 'input', placeholder: 'Description (optional)', style: { marginBottom: '8px' } });
  const priceInput = el('input', { className: 'input', type: 'number', placeholder: 'Price in cents (e.g. 500 = $5.00)', min: '100', style: { marginBottom: '8px' } });
  const intervalSelect = el('select', { className: 'input', style: { marginBottom: '8px' } }, [
    el('option', { textContent: 'Monthly', value: 'month' }),
    el('option', { textContent: 'Yearly', value: 'year' }),
  ]);

  const createBtn = el('button', {
    className: 'btn btn-primary',
    textContent: 'Create Plan',
    style: { width: '100%' },
    onClick: async () => {
      const name = nameInput.value.trim();
      const price = parseInt(priceInput.value);
      if (!name || !price || price < 100) return alert('Enter name and price (min $1.00)');
      createBtn.disabled = true;
      try {
        await createCreatorPlan(user.id, {
          name,
          description: descInput.value.trim(),
          price_cents: price,
          interval: intervalSelect.value,
        });
        renderPlans(container, user);
      } catch (err) {
        alert('Error: ' + err.message);
      }
      createBtn.disabled = false;
    },
  });

  container.appendChild(el('div', { style: { padding: '20px', background: 'var(--bg-secondary)', borderRadius: '12px', marginTop: '16px' } }, [
    el('h4', { textContent: t('createPlan'), style: { margin: '0 0 12px', fontSize: '16px', fontWeight: '700' } }),
    nameInput,
    descInput,
    priceInput,
    intervalSelect,
    createBtn,
  ]));
}

async function renderSubscribers(container, user) {
  const subs = await getCreatorSubscribers(user.id);
  container.innerHTML = '';

  container.appendChild(el('h3', { textContent: t('subscribers') + ' (' + subs.length + ')', style: { margin: '0 0 16px', fontSize: '18px', fontWeight: '700' } }));

  if (subs.length === 0) {
    container.appendChild(el('p', { textContent: t('noResults'), style: { color: 'var(--text-secondary)' } }));
    return;
  }

  for (const sub of subs) {
    const row = el('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border-color)' } }, [
      el('div', { style: { flex: 1 } }, [
        el('div', { textContent: sub.subscriber?.display_name || 'Unknown', style: { fontWeight: '600' } }),
        el('div', { textContent: '@' + (sub.subscriber?.username || ''), style: { color: 'var(--text-secondary)', fontSize: '13px' } }),
      ]),
      el('div', { textContent: formatCents(sub.plan?.price_cents || 0) + '/' + (sub.plan?.interval || 'month'), style: { color: 'var(--accent)', fontWeight: '600', fontSize: '14px' } }),
    ]);
    container.appendChild(row);
  }
}

async function renderTips(container, user) {
  const [received, sent] = await Promise.all([getTipsReceived(user.id), getTipsSent(user.id)]);
  container.innerHTML = '';

  container.appendChild(el('h3', { textContent: t('tipsReceived') + ' (' + received.length + ')', style: { margin: '0 0 12px', fontSize: '18px', fontWeight: '700' } }));

  if (received.length === 0) {
    container.appendChild(el('p', { textContent: t('noResults'), style: { color: 'var(--text-secondary)', marginBottom: '24px' } }));
  } else {
    for (const tip of received) {
      const row = el('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border-color)' } }, [
        el('div', { style: { flex: 1 } }, [
          el('div', { textContent: (tip.from_user?.display_name || 'Anonymous'), style: { fontWeight: '600' } }),
          tip.message ? el('div', { textContent: tip.message, style: { color: 'var(--text-secondary)', fontSize: '13px', fontStyle: 'italic' } }) : null,
        ].filter(Boolean)),
        el('div', { textContent: '+' + formatCents(tip.amount_cents), style: { color: '#10b981', fontWeight: '700', fontSize: '16px' } }),
      ]);
      container.appendChild(row);
    }
  }

  container.appendChild(el('h3', { textContent: (t('tip') || 'Tips') + ' Sent (' + sent.length + ')', style: { margin: '24px 0 12px', fontSize: '18px', fontWeight: '700' } }));

  if (sent.length === 0) {
    container.appendChild(el('p', { textContent: t('noResults'), style: { color: 'var(--text-secondary)' } }));
  } else {
    for (const tip of sent) {
      const row = el('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border-color)' } }, [
        el('div', { style: { flex: 1 } }, [
          el('div', { textContent: 'To: ' + (tip.to_user?.display_name || 'Unknown'), style: { fontWeight: '600' } }),
        ]),
        el('div', { textContent: '-' + formatCents(tip.amount_cents), style: { color: 'var(--danger)', fontWeight: '700', fontSize: '16px' } }),
      ]);
      container.appendChild(row);
    }
  }
}

async function renderMySubs(container, user) {
  const subs = await getMySubscriptions(user.id);
  container.innerHTML = '';

  container.appendChild(el('h3', { textContent: t('subscribe') + ' (' + subs.length + ')', style: { margin: '0 0 16px', fontSize: '18px', fontWeight: '700' } }));

  if (subs.length === 0) {
    container.appendChild(el('p', { textContent: t('noResults'), style: { color: 'var(--text-secondary)' } }));
    return;
  }

  for (const sub of subs) {
    const row = el('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border-color)' } }, [
      el('div', { style: { flex: 1 } }, [
        el('div', { textContent: sub.creator?.display_name || 'Unknown', style: { fontWeight: '600' } }),
        el('div', { textContent: '@' + (sub.creator?.username || ''), style: { color: 'var(--text-secondary)', fontSize: '13px' } }),
      ]),
      el('div', { style: { textAlign: 'right' } }, [
        el('div', { textContent: formatCents(sub.plan?.price_cents || 0) + '/' + (sub.plan?.interval || 'month'), style: { color: 'var(--accent)', fontWeight: '600' } }),
      ]),
    ]);
    container.appendChild(row);
  }
}

async function renderWallet(container, user) {
  const [wallet, transactions] = await Promise.all([getWallet(user.id), getTransactions(user.id)]);
  container.innerHTML = '';

  const balance = wallet?.balance_cents || 0;
  const totalEarned = wallet?.total_earned_cents || 0;
  const totalWithdrawn = wallet?.total_withdrawn_cents || 0;

  container.appendChild(el('div', { style: { padding: '24px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '16px', marginBottom: '24px', color: 'white', textAlign: 'center' } }, [
    el('div', { textContent: t('balance'), style: { fontSize: '14px', opacity: 0.8 } }),
    el('div', { textContent: formatCents(balance), style: { fontSize: '40px', fontWeight: '800', margin: '8px 0' } }),
    el('div', { style: { display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '8px' } }, [
      el('div', { textContent: t('totalEarned') + ': ' + formatCents(totalEarned), style: { fontSize: '13px', opacity: 0.8 } }),
      el('div', { textContent: t('balance') + ': ' + formatCents(totalWithdrawn), style: { fontSize: '13px', opacity: 0.8 } }),
    ]),
  ]));

  container.appendChild(el('h3', { textContent: t('transactions') || 'Transactions', style: { margin: '0 0 12px', fontSize: '18px', fontWeight: '700' } }));

  if (transactions.length === 0) {
    container.appendChild(el('p', { textContent: t('noResults'), style: { color: 'var(--text-secondary)' } }));
    return;
  }

  for (const tx of transactions) {
    const isCredit = tx.type.includes('received');
    const icon = isCredit ? '+' : '-';
    const color = isCredit ? '#10b981' : 'var(--danger)';
    const label = tx.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    const row = el('div', { style: { display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', borderBottom: '1px solid var(--border-color)' } }, [
      el('div', { style: { flex: 1 } }, [
        el('div', { textContent: label, style: { fontWeight: '600', fontSize: '14px' } }),
        el('div', { textContent: new Date(tx.created_at).toLocaleDateString(), style: { color: 'var(--text-secondary)', fontSize: '12px' } }),
      ]),
      el('div', { textContent: icon + formatCents(tx.amount_cents), style: { color, fontWeight: '700', fontSize: '16px' } }),
    ]);
    container.appendChild(row);
  }
}

async function renderPaymentLinks(container, user) {
  const links = await getAllPaymentLinks(user.id);
  container.innerHTML = '';

  container.appendChild(el('div', { style: { marginBottom: '16px' } }, [
    el('h3', { textContent: t('paymentMethods'), style: { margin: '0 0 4px', fontSize: '18px', fontWeight: '700' } }),
    el('p', { textContent: 'Add your payment links so users can tip you directly. They\'ll see a redirect warning before leaving SnapThought.', style: { color: 'var(--text-secondary)', fontSize: '14px', margin: 0 } }),
  ]));

  // Existing links
  if (links.length > 0) {
    for (const link of links) {
      const platform = PAYMENT_PLATFORMS[link.platform] || PAYMENT_PLATFORMS.other;
      const row = el('div', { style: {
        display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
        background: 'var(--bg-secondary)', borderRadius: '12px', marginBottom: '10px',
      }}, [
        el('span', { textContent: platform.icon, style: { fontSize: '28px', flexShrink: '0' } }),
        el('div', { style: { flex: 1, minWidth: 0 } }, [
          el('div', { textContent: platform.name, style: { fontWeight: '700', fontSize: '15px' } }),
          el('div', { textContent: link.url, style: { fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } }),
          link.label ? el('div', { textContent: link.label, style: { fontSize: '12px', color: 'var(--accent)' } }) : null,
        ].filter(Boolean)),
        el('button', {
          className: 'btn btn-outline btn-sm',
          textContent: t('remove'),
          onClick: async () => {
            if (confirm('Remove this payment method?')) {
              await removePaymentLink(link.id);
              renderPaymentLinks(container, user);
            }
          },
        }),
      ]);
      container.appendChild(row);
    }
  } else {
    container.appendChild(el('div', {
      style: { padding: '24px', background: 'var(--bg-secondary)', borderRadius: '12px', textAlign: 'center', marginBottom: '20px' },
    }, [
      el('div', { textContent: t('noResults'), style: { fontSize: '16px', fontWeight: '600', marginBottom: '4px' } }),
      el('div', { textContent: t('addPayment') + '!', style: { color: 'var(--text-secondary)', fontSize: '14px' } }),
    ]));
  }

  // Add new form
  const platformSelect = el('select', { className: 'input', style: { marginBottom: '8px' } });
  for (const [key, p] of Object.entries(PAYMENT_PLATFORMS)) {
    platformSelect.appendChild(el('option', { textContent: p.icon + ' ' + p.name, value: key }));
  }

  const urlInput = el('input', { className: 'input', placeholder: PAYMENT_PLATFORMS.stripe.placeholder, style: { marginBottom: '8px' } });
  const labelInput = el('input', { className: 'input', placeholder: 'Label (optional)', style: { marginBottom: '8px' } });

  platformSelect.addEventListener('change', () => {
    const p = PAYMENT_PLATFORMS[platformSelect.value];
    urlInput.placeholder = p ? p.placeholder : 'https://...';
  });

  const addBtn = el('button', {
    className: 'btn btn-primary',
    textContent: t('addPayment'),
    style: { width: '100%' },
    onClick: async () => {
      const platform = platformSelect.value;
      const url = urlInput.value.trim();
      if (!url) return alert('Enter a payment URL');
      addBtn.disabled = true;
      try {
        await addPaymentLink(user.id, { platform, url, label: labelInput.value.trim() });
        urlInput.value = '';
        labelInput.value = '';
        renderPaymentLinks(container, user);
      } catch (err) {
        alert('Error: ' + err.message);
      }
      addBtn.disabled = false;
    },
  });

  container.appendChild(el('div', { style: {
    padding: '20px', background: 'var(--bg-secondary)', borderRadius: '12px', marginTop: '20px',
  }}, [
    el('h4', { textContent: t('addPayment'), style: { margin: '0 0 12px', fontSize: '16px', fontWeight: '700' } }),
    platformSelect,
    urlInput,
    labelInput,
    addBtn,
  ]));

  // Supported platforms info
  container.appendChild(el('div', { style: {
    padding: '16px', background: 'var(--bg-secondary)', borderRadius: '12px', marginTop: '16px',
  }}, [
    el('h4', { textContent: t('paymentMethods'), style: { margin: '0 0 10px', fontSize: '14px', fontWeight: '700' } }),
    el('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px' } },
      Object.values(PAYMENT_PLATFORMS).map(p =>
        el('span', {
          textContent: p.icon + ' ' + p.name,
          style: {
            padding: '4px 10px', background: 'var(--bg-primary)', borderRadius: '6px',
            fontSize: '12px', fontWeight: '500',
          },
        })
      )
    ),
  ]));
}

export function cleanup() {}
