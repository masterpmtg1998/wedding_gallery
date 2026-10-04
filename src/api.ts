import { PHOTO_BUCKET, getDeviceToken, publicPhotoUrl, sha256, supabase } from './supabase';

export type Guest = { id:number; name:string; side:string|null; group_name:string|null; active:boolean };
export type Moment = { id:number; name:string; sort_order:number; active:boolean };
export type Photo = {
  id:string;
  storage_path:string;
  moment_id:number;
  uploader_guest_id:number|null;
  original_name:string|null;
  width:number|null;
  height:number|null;
  file_size:number|null;
  created_at:string;
  url:string;
  person_ids:number[];
};

export async function getCatalog() {
  const [{data: guests, error: ge}, {data: moments, error: me}] = await Promise.all([
    supabase.from('guests').select('id,name,side,group_name,active').eq('active', true).order('name'),
    supabase.from('moments').select('id,name,sort_order,active').eq('active', true).order('sort_order'),
  ]);
  if (ge) throw ge;
  if (me) throw me;
  return { guests: (guests ?? []) as Guest[], moments: (moments ?? []) as Moment[] };
}

async function getPeopleFor(photoIds:string[]) {
  if (!photoIds.length) return new Map<string, number[]>();
  const {data,error} = await supabase.from('photo_people').select('photo_id,guest_id').in('photo_id', photoIds);
  if (error) throw error;
  const map = new Map<string, number[]>();
  for (const row of data ?? []) {
    const list = map.get(row.photo_id) ?? [];
    list.push(Number(row.guest_id));
    map.set(row.photo_id, list);
  }
  return map;
}

export async function getGallery() {
  const {data,error} = await supabase.from('photos').select('id,storage_path,moment_id,uploader_guest_id,original_name,width,height,file_size,created_at').order('created_at',{ascending:false});
  if (error) throw error;
  const rows = data ?? [];
  const people = await getPeopleFor(rows.map(r=>r.id));
  return rows.map(r => ({
    ...r,
    moment_id: Number(r.moment_id),
    uploader_guest_id: r.uploader_guest_id == null ? null : Number(r.uploader_guest_id),
    url: publicPhotoUrl(r.storage_path),
    person_ids: people.get(r.id) ?? [],
  })) as Photo[];
}

export async function uploadPhoto(file:File, momentId:number, guestId:number|null, personIds:number[]) {
  const token = getDeviceToken();
  const sessionHash = await sha256(token);
  const id = crypto.randomUUID();
  const prepared = await preparePhoto(file);
  const path = `uploads/${sessionHash.slice(0,16)}/${id}.jpg`;

  const {error: uploadError} = await supabase.storage.from(PHOTO_BUCKET).upload(path,prepared,{
    cacheControl:'3600',
    contentType:'image/jpeg',
    upsert:false,
  });
  if (uploadError) throw uploadError;

  const {data: photo,error: photoError} = await supabase.from('photos').insert({
    id,
    storage_path:path,
    moment_id:momentId,
    uploader_guest_id:guestId,
    uploader_session_hash:sessionHash,
    original_name:file.name.slice(0,240),
    file_size:prepared.size,
  }).select('id').single();

  if (photoError) {
    await supabase.storage.from(PHOTO_BUCKET).remove([path]);
    throw photoError;
  }

  if (personIds.length) {
    const {error: peopleError} = await supabase.from('photo_people').insert(personIds.map(guest_id=>({photo_id:photo.id,guest_id})));
    if (peopleError) throw peopleError;
  }
  return photo.id as string;
}

