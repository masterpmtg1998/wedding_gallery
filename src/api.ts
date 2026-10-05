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

export const DEFAULT_WEDDING_SLUG='pedro-tania';
export async function getPublicWedding(slug=DEFAULT_WEDDING_SLUG){const {data,error}=await supabase.rpc('get_public_wedding',{p_slug:slug});if(error)throw error;return data?.[0]??null;}

export async function getCatalog(slug=DEFAULT_WEDDING_SLUG) {
  const [{data: guests, error: ge}, {data: moments, error: me}, {data: tables, error: te}] = await Promise.all([
    supabase.rpc('get_public_guests',{p_slug:slug}),
    supabase.rpc('get_public_moments',{p_slug:slug}),
    supabase.rpc('get_public_tables',{p_slug:slug}),
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

export async function getGalleryPage(momentId:number|null, personId:number|null, offset=0, limit=60,slug=DEFAULT_WEDDING_SLUG) {
  const {data,error} = await supabase.rpc('get_public_photos',{p_slug:slug,p_moment_id:momentId,p_person_id:personId,p_offset:offset,p_limit:limit});
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

export async function uploadPhoto(file:File, momentId:number, guestId:number|null, personIds:number[],slug=DEFAULT_WEDDING_SLUG) {
  const token = getDeviceToken();
  const sessionHash = await sha256(token);
  const id = crypto.randomUUID();
  const prepared = await preparePhoto(file);
  if(guestId==null) throw new Error('Convidado obrigatório');
  const {data:weddingId,error:contextError}=await supabase.rpc('get_public_upload_context',{p_slug:slug});
  if(contextError||!weddingId) throw contextError||new Error('Casamento inválido');
  const path = `${weddingId}/uploads/${sessionHash.slice(0,16)}/${id}.jpg`;

  const {error: uploadError} = await supabase.storage.from(PHOTO_BUCKET).upload(path,prepared,{
    cacheControl:'3600',
    contentType:'image/jpeg',
    upsert:false,
  });
  if (uploadError) throw uploadError;

  const {data: photo,error: photoError} = await supabase.rpc('create_public_photo',{
    p_slug:slug,p_photo_id:id,p_storage_path:path,p_moment_id:momentId,p_guest_id:guestId,
    p_session_hash:sessionHash,p_original_name:file.name,p_width:1,p_height:1,p_file_size:prepared.size,
  });

  if (photoError) {
    throw photoError;
  }


  if (personIds.length) {
    const {error: peopleError} = await supabase.rpc('set_photo_people',{
      p_photo_id:photo,
      p_guest_ids:personIds,
      p_session_token:token,
    });
    if (peopleError) throw peopleError;
  }
  return photo as string;
}



export async function togglePhotoLove(photoId:string,slug=DEFAULT_WEDDING_SLUG) {
  const voterHash = await sha256(getDeviceToken());
  const {data,error} = await supabase.rpc('toggle_photo_love',{
    p_slug:slug,
    p_photo_id:photoId,
    p_voter_hash:voterHash,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function getLoveStats(photoIds:string[],slug=DEFAULT_WEDDING_SLUG) {
  if(!photoIds.length) return new Map<string,number>();
  const {data,error}=await supabase.rpc('get_public_love_stats',{p_slug:slug,p_photo_ids:photoIds});
  if(error) throw error;
  return new Map<string,number>((data??[]).map((row:any):[string,number]=>[String(row.photo_id),Number(row.love_count??0)]));
}

export async function getTrendingPhotos(limit=10,slug=DEFAULT_WEDDING_SLUG) {
  const {data,error}=await supabase.rpc('get_public_trending_photos',{p_slug:slug,p_limit:limit});
  if(error) throw error;
  return (data??[]).map((row:any)=>({id:row.id as string,url:publicPhotoUrl(row.storage_path),love_count:Number(row.love_count??0)}));

}


export type LandingMedia = { slot:number; storage_path:string; focal_x:number; focal_y:number; url:string };

export async function getLandingMedia(slug=DEFAULT_WEDDING_SLUG) {
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
  const {data,error}=await supabase.functions.invoke('invite-wedding-manager',{body:{weddingId,email:email.trim().toLowerCase(),role}});
  if(error){
    let detail='';
    try{detail=(await error.context?.json?.())?.error||''}catch{}
    if(detail.toLowerCase().includes('rate limit')||detail.toLowerCase().includes('email rate')) throw new Error('Limite temporário de envio de emails atingido. Tenta novamente dentro de alguns minutos.');
    throw new Error(detail||error.message);
  }
  if(data?.error)throw new Error(data.error);
}
export async function getWeddingTeam(weddingId:string){
  const {data,error}=await supabase.rpc('get_wedding_team',{p_wedding_id:weddingId});
  if(error)throw error;return data??[];
}
export async function cancelWeddingInvitation(weddingId:string,email:string){
  const {error}=await supabase.rpc('cancel_wedding_invitation',{p_wedding_id:weddingId,p_email:email});
  if(error)throw error;
}


export type PlannerTask={
  id:string; wedding_id:string; title:string; category:string; status:'todo'|'doing'|'done';
  priority:'low'|'normal'|'high'|'urgent'; due_date:string|null; owner_label:'pedro'|'tania'|'ambos'|'outro';
  supplier_name:string|null; budget_amount:number|null; notes:string|null; sort_order:number;
  parent_id:string|null; phase_key:string|null; phase_order:number; template_key:string|null; auto_generated:boolean;
};
export type PlannerVendor={
  id:string; wedding_id:string; category:string; name:string; contact_name:string|null; email:string|null; phone:string|null;
  website:string|null; status:'researching'|'contacted'|'proposal'|'booked'|'paid'|'rejected';
  quoted_amount:number|null; contracted_amount:number|null; paid_amount:number; next_action:string|null; next_action_date:string|null; notes:string|null;
};
export type PlannerBudgetItem={
  id:string; wedding_id:string; category:string; description:string; supplier_id:string|null; budgeted:number;
  contracted:number|null; paid:number; due_date:string|null; status:'planned'|'contracted'|'partial'|'paid'|'cancelled'; notes:string|null;
};

export async function getPlannerTasks(weddingId:string){
  const {data,error}=await supabase.from('planner_tasks').select('*').eq('wedding_id',weddingId).order('phase_order').order('due_date',{ascending:true,nullsFirst:false}).order('sort_order');
  if(error)throw error; return (data??[]) as PlannerTask[];
}
export async function createPlannerTask(weddingId:string,input:Partial<PlannerTask>&{title:string}){
  const {data:{user}}=await supabase.auth.getUser();
  const {data,error}=await supabase.from('planner_tasks').insert({
    wedding_id:weddingId,title:input.title.trim(),category:input.category||'geral',status:input.status||'todo',
    priority:input.priority||'normal',due_date:input.due_date||null,owner_label:input.owner_label||'ambos',
    supplier_name:input.supplier_name||null,budget_amount:input.budget_amount??null,notes:input.notes||null,created_by:user?.id??null
  }).select('*').single();
  if(error)throw error; return data as PlannerTask;
}
export async function updatePlannerTask(id:string,patch:Partial<PlannerTask>){
  const {data,error}=await supabase.from('planner_tasks').update({...patch,updated_at:new Date().toISOString()}).eq('id',id).select('*').single();
  if(error)throw error; return data as PlannerTask;
}
export async function deletePlannerTask(id:string){const {error}=await supabase.from('planner_tasks').delete().eq('id',id);if(error)throw error;}

export async function getPlannerVendors(weddingId:string){
  const {data,error}=await supabase.from('planner_vendors').select('*').eq('wedding_id',weddingId).order('name');
  if(error)throw error; return (data??[]) as PlannerVendor[];
}
export async function createPlannerVendor(weddingId:string,input:{name:string;category?:string;status?:PlannerVendor['status'];contracted_amount?:number|null;paid_amount?:number;next_action?:string|null;next_action_date?:string|null}){
  const {data,error}=await supabase.from('planner_vendors').insert({wedding_id:weddingId,name:input.name.trim(),category:input.category||'outro',status:input.status||'researching',contracted_amount:input.contracted_amount??null,paid_amount:input.paid_amount??0,next_action:input.next_action||null,next_action_date:input.next_action_date||null}).select('*').single();
  if(error)throw error; return data as PlannerVendor;
}
export async function updatePlannerVendor(id:string,patch:Partial<PlannerVendor>){
  const {data,error}=await supabase.from('planner_vendors').update({...patch,updated_at:new Date().toISOString()}).eq('id',id).select('*').single();
  if(error)throw error; return data as PlannerVendor;
}

export async function getPlannerBudget(weddingId:string){
  const {data,error}=await supabase.from('planner_budget_items').select('*').eq('wedding_id',weddingId).order('category').order('description');
  if(error)throw error; return (data??[]) as PlannerBudgetItem[];
}
export async function createPlannerBudgetItem(weddingId:string,input:{description:string;category?:string;budgeted?:number;contracted?:number|null;paid?:number;due_date?:string|null;status?:PlannerBudgetItem['status']}){
  const {data,error}=await supabase.from('planner_budget_items').insert({wedding_id:weddingId,description:input.description.trim(),category:input.category||'outro',budgeted:input.budgeted??0,contracted:input.contracted??null,paid:input.paid??0,due_date:input.due_date||null,status:input.status||'planned'}).select('*').single();
  if(error)throw error; return data as PlannerBudgetItem;
}
export async function updatePlannerBudgetItem(id:string,patch:Partial<PlannerBudgetItem>){
  const {data,error}=await supabase.from('planner_budget_items').update({...patch,updated_at:new Date().toISOString()}).eq('id',id).select('*').single();
  if(error)throw error; return data as PlannerBudgetItem;
}


export type PlannerDecision={id:string;wedding_id:string;title:string;category:string;status:'open'|'decided'|'discarded';options:any[];decision:string|null;owner_label:string;due_date:string|null;notes:string|null};
export type PlannerMeeting={id:string;wedding_id:string;title:string;starts_at:string;location:string|null;supplier_id:string|null;agenda:string|null;notes:string|null;status:'scheduled'|'done'|'cancelled'};
export type PlannerPayment={id:string;wedding_id:string;supplier_id:string|null;budget_item_id:string|null;description:string;amount:number;due_date:string|null;paid_at:string|null;status:'pending'|'paid'|'cancelled';notes:string|null};
export type PlannerDocument={id:string;wedding_id:string;title:string;category:string;supplier_id:string|null;storage_path:string|null;external_url:string|null;expires_at:string|null;signed:boolean;notes:string|null};
export type PlannerScheduleItem={id:string;wedding_id:string;domain:'cerimonia'|'musica'|'decoracao'|'logistica'|'lua_de_mel'|'outro';title:string;starts_at:string|null;ends_at:string|null;location:string|null;responsible:string|null;status:'planned'|'confirmed'|'done'|'cancelled';details:string|null;sort_order:number};

export async function getPlannerGuestStats(weddingId:string){
  const {data,error}=await supabase.rpc('get_planner_guest_stats',{p_wedding_id:weddingId}); if(error)throw error; return data?.[0]??{total:0,accepted:0,declined:0,pending:0,maybe:0,seated:0,unseated:0};
}
export async function getManagedGuests(weddingId:string){
  const {data,error}=await supabase.from('guests').select('id,name,side,group_name,entry_group,table_id,active,email,phone,rsvp_status,invitation_sent_at,rsvp_at,dietary_notes,guest_notes,seat_locked,seating_notes').eq('wedding_id',weddingId).eq('active',true).order('name');
  if(error)throw error; return data??[];
}
export async function updateManagedGuest(id:number,patch:any){const {error}=await supabase.from('guests').update(patch).eq('id',id);if(error)throw error;}
export async function getManagedTables(weddingId:string){
  const {data,error}=await supabase.from('wedding_tables').select('id,name,sort_order,active,capacity,notes,locked').eq('wedding_id',weddingId).eq('active',true).order('sort_order');if(error)throw error;return data??[];
}
export async function createManagedTable(weddingId:string,name:string,capacity=10){
  const {data,error}=await supabase.from('wedding_tables').insert({wedding_id:weddingId,name:name.trim(),capacity,active:true}).select('*').single();if(error)throw error;return data;
}
export async function assignGuestToTable(guestId:number,tableId:number|null){const {error}=await supabase.from('guests').update({table_id:tableId}).eq('id',guestId);if(error)throw error;}
export async function getTableSuggestions(tableId:number,limit=8){const {data,error}=await supabase.rpc('suggest_guests_for_table',{p_table_id:tableId,p_limit:limit});if(error)throw error;return data??[];}

export async function getPlannerDecisions(weddingId:string){const {data,error}=await supabase.from('planner_decisions').select('*').eq('wedding_id',weddingId).order('status').order('due_date',{ascending:true,nullsFirst:false});if(error)throw error;return (data??[]) as PlannerDecision[];}
export async function createPlannerDecision(weddingId:string,title:string,category='geral'){const {data,error}=await supabase.from('planner_decisions').insert({wedding_id:weddingId,title:title.trim(),category}).select('*').single();if(error)throw error;return data as PlannerDecision;}
export async function updatePlannerDecision(id:string,patch:Partial<PlannerDecision>){const {error}=await supabase.from('planner_decisions').update({...patch,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;}

export async function getPlannerMeetings(weddingId:string){const {data,error}=await supabase.from('planner_meetings').select('*').eq('wedding_id',weddingId).order('starts_at');if(error)throw error;return (data??[]) as PlannerMeeting[];}
export async function createPlannerMeeting(weddingId:string,title:string,startsAt:string){const {data,error}=await supabase.from('planner_meetings').insert({wedding_id:weddingId,title:title.trim(),starts_at:startsAt}).select('*').single();if(error)throw error;return data as PlannerMeeting;}
export async function updatePlannerMeeting(id:string,patch:Partial<PlannerMeeting>){const {error}=await supabase.from('planner_meetings').update({...patch,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;}

export async function getPlannerPayments(weddingId:string){const {data,error}=await supabase.from('planner_payments').select('*').eq('wedding_id',weddingId).order('status').order('due_date',{ascending:true,nullsFirst:false});if(error)throw error;return (data??[]) as PlannerPayment[];}
export async function createPlannerPayment(weddingId:string,description:string,amount:number,dueDate:string|null){const {data,error}=await supabase.from('planner_payments').insert({wedding_id:weddingId,description:description.trim(),amount,due_date:dueDate}).select('*').single();if(error)throw error;return data as PlannerPayment;}
export async function updatePlannerPayment(id:string,patch:Partial<PlannerPayment>){const {error}=await supabase.from('planner_payments').update(patch).eq('id',id);if(error)throw error;}

export async function getPlannerDocuments(weddingId:string){const {data,error}=await supabase.from('planner_documents').select('*').eq('wedding_id',weddingId).order('created_at',{ascending:false});if(error)throw error;return (data??[]) as PlannerDocument[];}
export async function createPlannerDocument(weddingId:string,title:string,category='outro'){const {data,error}=await supabase.from('planner_documents').insert({wedding_id:weddingId,title:title.trim(),category}).select('*').single();if(error)throw error;return data as PlannerDocument;}
export async function updatePlannerDocument(id:string,patch:Partial<PlannerDocument>){const {error}=await supabase.from('planner_documents').update(patch).eq('id',id);if(error)throw error;}

export async function getPlannerSchedule(weddingId:string){const {data,error}=await supabase.from('planner_schedule').select('*').eq('wedding_id',weddingId).order('domain').order('starts_at',{ascending:true,nullsFirst:false}).order('sort_order');if(error)throw error;return (data??[]) as PlannerScheduleItem[];}
export async function createPlannerScheduleItem(weddingId:string,domain:PlannerScheduleItem['domain'],title:string){const {data,error}=await supabase.from('planner_schedule').insert({wedding_id:weddingId,domain,title:title.trim()}).select('*').single();if(error)throw error;return data as PlannerScheduleItem;}
export async function updatePlannerScheduleItem(id:string,patch:Partial<PlannerScheduleItem>){const {error}=await supabase.from('planner_schedule').update({...patch,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;}


export async function seedPlannerDefaults(weddingId:string){
  const {data,error}=await supabase.rpc('seed_wedding_planner_defaults',{p_wedding_id:weddingId});if(error)throw error;return Number(data||0);
}
export async function createManagedGuest(weddingId:string,name:string,entryGroup:'familia_noivo'|'familia_noiva'|'amigos'='amigos'){
  const {data,error}=await supabase.from('guests').insert({wedding_id:weddingId,name:name.trim(),entry_group:entryGroup,active:true,rsvp_status:'pending'}).select('*').single();if(error)throw error;return data;
}
export async function archiveManagedGuest(id:number){const {error}=await supabase.from('guests').update({active:false,table_id:null}).eq('id',id);if(error)throw error;}

export async function uploadPlannerDocumentFile(weddingId:string,documentId:string,file:File){
  const ext=(file.name.split('.').pop()||'bin').toLowerCase().replace(/[^a-z0-9]/g,'')||'bin';
  const path=weddingId+'/documents/'+documentId+'-'+crypto.randomUUID()+'.'+ext;
  const {error:ue}=await supabase.storage.from('wedding-documents').upload(path,file,{contentType:file.type||undefined,upsert:false});
  if(ue)throw ue;
  const {error:de}=await supabase.from('planner_documents').update({storage_path:path}).eq('id',documentId);
  if(de){await supabase.storage.from('wedding-documents').remove([path]);throw de}
  return path;
}
export async function getPlannerDocumentUrl(path:string){
  const {data,error}=await supabase.storage.from('wedding-documents').createSignedUrl(path,900);if(error)throw error;return data.signedUrl;
}


export async function setPlannerTaskTreeStatus(taskId:string,status:'todo'|'doing'|'done'){
  const {error}=await supabase.rpc('set_planner_task_tree_status',{p_task_id:taskId,p_status:status});if(error)throw error;
}
