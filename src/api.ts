import { PHOTO_BUCKET, getDeviceToken, publicPhotoUrl, sha256, supabase } from './supabase';

export type Guest = { id:number; name:string; side:string|null; group_name:string|null; table_id:number|null; active:boolean };
export type WeddingTable = { id:number; name:string; sort_order:number; active:boolean };
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
  const [{data: guests, error: ge}, {data: moments, error: me}, {data: tables, error: te}] = await Promise.all([
    supabase.from('guests').select('id,name,side,group_name,table_id,active').eq('active', true).order('name'),
    supabase.from('moments').select('id,name,sort_order,active').eq('active', true).order('sort_order'),
    supabase.from('wedding_tables').select('id,name,sort_order,active').eq('active', true).order('sort_order'),
  ]);
  if (ge) throw ge;
  if (me) throw me;
  if (te) throw te;
  return {
    guests: (guests ?? []) as Guest[],
    moments: (moments ?? []) as Moment[],
    tables: (tables ?? []) as WeddingTable[],
  };
}

export async function getGalleryPage(momentId:number|null, personId:number|null, offset=0, limit=60) {
  const {data,error} = await supabase.rpc('get_gallery_page',{
    p_moment_id:momentId,
    p_person_id:personId,
    p_offset:offset,
    p_limit:limit,
  });
  if (error) throw error;
  const rows = data ?? [];
  const total = rows.length ? Number(rows[0].total_count ?? rows.length) : 0;
  const photos = rows.map((r:any) => ({
    id:r.id,
    storage_path:r.storage_path,
    moment_id:Number(r.moment_id),
    uploader_guest_id:r.uploader_guest_id == null ? null : Number(r.uploader_guest_id),
    original_name:r.original_name,
    width:r.width,
    height:r.height,
    file_size:r.file_size,
    created_at:r.created_at,
    url:publicPhotoUrl(r.storage_path),
    person_ids:(r.person_ids ?? []).map(Number),
  })) as Photo[];
  return {photos,total};
}

async function preparePhoto(file: File) {
  const { compress } = await import('compresso.js');
  const result = await compress(file, {
    quality: 0.9,
    maxWidth: 4096,
    maxHeight: 4096,
    maxSizeMB: 4,
    format: 'jpeg',
  });
  return result.file;
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
    const {error: peopleError} = await supabase.rpc('set_photo_people',{
      p_photo_id:photo.id,
      p_guest_ids:personIds,
      p_session_token:token,
    });
    if (peopleError) throw peopleError;
  }
  return photo.id as string;
}



export async function recordPhotoView(photoId:string) {
  const viewerHash = await sha256(getDeviceToken());
  const {error} = await supabase.from('photo_views').insert({
    photo_id:photoId,
    viewer_hash:viewerHash,
  });
  if (error && error.code !== '23505') throw error;
}

export async function getTrendingPhotos(limit=10) {
  const {data:stats,error:statsError} = await supabase
    .from('photo_stats')
    .select('photo_id,view_count,last_viewed_at')
    .order('view_count',{ascending:false})
    .order('last_viewed_at',{ascending:false})
    .limit(Math.min(Math.max(limit,1),10));
  if (statsError) throw statsError;
  if (!stats?.length) return [];

  const ids=stats.map(row=>row.photo_id);
  const {data:photos,error:photosError} = await supabase
    .from('photos')
    .select('id,storage_path')
    .in('id',ids);
  if (photosError) throw photosError;

  const byId=new Map((photos??[]).map(row=>[row.id,row.storage_path]));
  return stats.flatMap(row=>{
    const path=byId.get(row.photo_id);
    return path ? [{
      id:row.photo_id as string,
      url:publicPhotoUrl(path),
      view_count:Number(row.view_count ?? 0),
    }] : [];
  });
}
