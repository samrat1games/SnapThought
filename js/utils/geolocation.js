export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000,
    });
  });
}

export async function reverseGeocode(lat, lng) {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`
    );
    const data = await resp.json();
    if (data.address) {
      const parts = [];
      if (data.address.city || data.address.town || data.address.village) {
        parts.push(data.address.city || data.address.town || data.address.village);
      }
      if (data.address.country) {
        parts.push(data.address.country);
      }
      return parts.join(', ') || data.display_name?.split(',').slice(0, 2).join(',') || '';
    }
    return '';
  } catch {
    return '';
  }
}

export async function getLocationString() {
  try {
    const pos = await getCurrentPosition();
    const name = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
    return {
      name,
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
    };
  } catch {
    return null;
  }
}
