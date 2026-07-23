import { GNEWS_API_KEY } from '../config.js';

export async function getTopNews({ country = 'ru', limit = 10 } = {}) {
  try {
    const url = `https://gnews.io/api/v4/top-headlines?country=${country}&max=${limit}&apikey=${GNEWS_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.articles || []).map(a => ({
      title: a.title,
      description: a.description,
      url: a.url,
      image: a.image,
      source: a.source?.name || '',
      publishedAt: a.publishedAt,
    }));
  } catch (err) {
    console.error('Failed to load news:', err);
    return [];
  }
}

export async function searchNews(query, { limit = 10 } = {}) {
  try {
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(query)}&max=${limit}&apikey=${GNEWS_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.articles || []).map(a => ({
      title: a.title,
      description: a.description,
      url: a.url,
      image: a.image,
      source: a.source?.name || '',
      publishedAt: a.publishedAt,
    }));
  } catch (err) {
    console.error('Failed to search news:', err);
    return [];
  }
}
