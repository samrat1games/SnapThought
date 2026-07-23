export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateUsername(username) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

export function validatePassword(password) {
  return password.length >= 6;
}

export function validateDisplayName(name) {
  return name.trim().length > 0 && name.length <= 50;
}

export function validateBio(bio) {
  return bio.length <= 160;
}

export function validatePostContent(content, imageUrl) {
  return (content.trim().length > 0 || imageUrl) && content.length <= 280;
}
