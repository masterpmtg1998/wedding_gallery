import { BRANDING_BUCKET, PHOTO_BUCKET, getDeviceToken, publicBrandingUrl, publicPhotoUrl, sha256, supabase } from './supabase';

export type Guest = { id:number; name:string; side:string|null; group_name:string|null; entry_group:'familia_noivo'|'familia_noiva'|'amigos'|null; table_id:number|null; active:boolean };
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
    supabase.from('guests').select('id,name,side,group_name,entry_group,table_id,active').eq('active', true).order('name'),
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



export async function togglePhotoLove(photoId:string) {
  const voterHash = await sha256(getDeviceToken());
  const {data,error} = await supabase.rpc('toggle_photo_love',{
    p_photo_id:photoId,
    p_voter_hash:voterHash,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function getLoveStats(photoIds:string[]) {
  if(!photoIds.length) return new Map<string,number>();
  const {data,error} = await supabase
    .from('photo_love_stats')
    .select('photo_id,love_count')
    .in('photo_id',photoIds);
  if(error) throw error;
  return new Map((data??[]).map((row:any)=>[row.photo_id,Number(row.love_count??0)]));
}

export async function getTrendingPhotos(limit=10) {
  const {data:stats,error:statsError} = await supabase
    .from('photo_love_stats')
    .select('photo_id,love_count,last_loved_at')
    .gt('love_count',0)
    .order('love_count',{ascending:false})
    .order('last_loved_at',{ascending:false})
    .limit(Math.min(Math.max(limit,1),10));
  if (statsError) throw statsError;
  if (!stats?.length) return [];

  const ids=stats.map((row:any)=>row.photo_id);
  const {data:photos,error:photosError} = await supabase
    .from('photos')
    .select('id,storage_path')
    .in('id',ids);
  if (photosError) throw photosError;

  const byId=new Map((photos??[]).map((row:any)=>[row.id,row.storage_path]));
  return stats.flatMap((row:any)=>{
    const path=byId.get(row.photo_id);
    return path ? [{
      id:row.photo_id as string,
      url:publicPhotoUrl(path),
      love_count:Number(row.love_count ?? 0),
    }] : [];
  });
}


export type LandingMedia = { slot:number; storage_path:string; focal_x:number; focal_y:number; url:string };

export async function getLandingMedia(slug='pedro-tania') {
  const {data,error}=await supabase.rpc('get_public_landing_media',{p_slug:slug});
  if(error) throw error;
  return (data??[]).map((row:any)=>({
    slot:Number(row.slot),
    storage_path:row.storage_path,
    focal_x:Number(row.focal_x??50),
    focal_y:Number(row.focal_y??50),
    url:publicBrandingUrl(row.storage_path),
  })) as LandingMedia[];
}

export async function getMyWedding() {
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) return null;
  const {data:membership,error:me}=await supabase.from('wedding_members').select('wedding_id,role').eq('user_id',user.id).limit(1).maybeSingle();
  if(me) throw me;
  if(!membership) return null;
  const {data:wedding,error:we}=await supabase.from('weddings').select('id,slug,couple_names,wedding_date').eq('id',membership.wedding_id).single();
  if(we) throw we;
  return {...wedding,role:membership.role};
}

export async function getManagedLandingMedia(weddingId:string) {
  const {data,error}=await supabase.from('landing_media').select('id,slot,storage_path,original_name,focal_x,focal_y').eq('wedding_id',weddingId).order('slot');
  if(error) throw error;
  return (data??[]).map((row:any)=>({...row,url:publicBrandingUrl(row.storage_path)}));
}

export async function uploadLandingMedia(weddingId:string,slot:number,file:File) {
  const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
  const path=`${weddingId}/landing/${slot}-${crypto.randomUUID()}.${ext}`;
  const {error:ue}=await supabase.storage.from(BRANDING_BUCKET).upload(path,file,{contentType:file.type||undefined,upsert:false});
  if(ue) throw ue;
  const {data:old}=await supabase.from('landing_media').select('storage_path').eq('wedding_id',weddingId).eq('slot',slot).maybeSingle();
  const {error:de}=await supabase.from('landing_media').upsert({
    wedding_id:weddingId,slot,storage_path:path,original_name:file.name.slice(0,240),updated_at:new Date().toISOString()
  },{onConflict:'wedding_id,slot'});
  if(de){ await supabase.storage.from(BRANDING_BUCKET).remove([path]); throw de; }
  if(old?.storage_path && old.storage_path!==path) await supabase.storage.from(BRANDING_BUCKET).remove([old.storage_path]);
}

export async function updateLandingFocal(weddingId:string,slot:number,x:number,y:number) {
  const {error}=await supabase.from('landing_media').update({focal_x:x,focal_y:y,updated_at:new Date().toISOString()}).eq('wedding_id',weddingId).eq('slot',slot);
  if(error) throw error;
}


export async function acceptMyInvitations(){
  const {error}=await supabase.rpc('accept_wedding_invitations');
  if(error) throw error;
}
export async function getMyWeddings(){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)return [];
  await acceptMyInvitations();
  const {data:members,error}=await supabase.from('wedding_members').select('wedding_id,role').eq('user_id',user.id);
  if(error)throw error;
  if(!members?.length)return [];
  const {data:weddings,error:we}=await supabase.from('weddings').select('id,slug,couple_names,wedding_date').in('id',members.map((m:any)=>m.wedding_id));
  if(we)throw we;
  const roles=new Map(members.map((m:any)=>[m.wedding_id,m.role]));
  return (weddings??[]).map((w:any)=>({...w,role:roles.get(w.id)}));
}
export async function createWeddingWorkspace(coupleNames:string,weddingDate:string){
  const {data,error}=await supabase.rpc('create_wedding_workspace',{p_couple_names:coupleNames,p_wedding_date:weddingDate,p_slug:null});
  if(error)throw error;return data as string;
}
export async function inviteWeddingMember(weddingId:string,email:string,role='editor'){
  const {data:{user}}=await supabase.auth.getUser();
  if(!user)throw new Error('Sessão inválida');
  const {error}=await supabase.from('wedding_invitations').upsert({wedding_id:weddingId,email:email.trim().toLowerCase(),role,invited_by:user.id},{onConflict:'wedding_id,email'});
  if(error)throw error;
}
