import { supabase } from '../supabase.js';
import { compressImage } from '../utils/image.js';

export async function uploadImage(bucket, file, userId) {
  let uploadFile;
  let contentType;

  // Skip compression for GIFs to preserve animation
  if (file.type === 'image/gif' || (file.name && file.name.endsWith('.gif'))) {
    uploadFile = file;
    contentType = 'image/gif';
  } else {
    uploadFile = await compressImage(file, 1200, 0.85);
    contentType = 'image/jpeg';
  }

  const ext = uploadFile.name.split('.').pop() || 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, uploadFile, { contentType });

  if (error) throw error;

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
}

export function deleteImage(bucket, path) {
  return supabase.storage.from(bucket).remove([path]);
}

export function getPublicUrl(bucket, path) {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);
  return data.publicUrl;
}
