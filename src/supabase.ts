import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) throw new Error('Supabase configuration missing');

export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

export const PHOTO_BUCKET = 'wedding-photos';

export function getDeviceToken() {
  let token = localStorage.getItem('wedding_device_token');
  if (!token) {
    token = crypto.randomUUID() + crypto.randomUUID();
    localStorage.setItem('wedding_device_token', token);
  }
  return token;
}

export async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export function publicPhotoUrl(path: string) {
  return supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl;
}
