import { GIPHY_API_KEY } from '../config.js';

export async function searchGifs(query, { limit = 20, offset = 0 } = {}) {
  try {
    const url = `https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&rating=g&lang=en`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map(gif => ({
      id: gif.id,
      url: gif.images?.fixed_height?.url || gif.images?.original?.url,
      preview: gif.images?.preview_gif?.url || gif.images?.fixed_height_small?.url,
      title: gif.title || '',
      width: parseInt(gif.images?.fixed_height?.width) || 200,
      height: parseInt(gif.images?.fixed_height?.height) || 200,
    }));
  } catch (err) {
    console.error('GIPHY search failed:', err);
    return [];
  }
}

export async function getTrendingGifs({ limit = 20, offset = 0 } = {}) {
  try {
    const url = `https://api.giphy.com/v1/gifs/trending?api_key=${GIPHY_API_KEY}&limit=${limit}&offset=${offset}&rating=g`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []).map(gif => ({
      id: gif.id,
      url: gif.images?.fixed_height?.url || gif.images?.original?.url,
      preview: gif.images?.preview_gif?.url || gif.images?.fixed_height_small?.url,
      title: gif.title || '',
      width: parseInt(gif.images?.fixed_height?.width) || 200,
      height: parseInt(gif.images?.fixed_height?.height) || 200,
    }));
  } catch (err) {
    console.error('GIPHY trending failed:', err);
    return [];
  }
}
