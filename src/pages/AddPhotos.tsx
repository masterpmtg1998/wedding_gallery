import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Images, Trash2, Users } from 'lucide-react';
import { useLocation } from 'wouter';
import { Page } from '../components/navigation';
import { uploadPhoto } from '../api';
import { useCatalog } from '../hooks/useCatalog';
import { getGuestId } from '../lib/guest';
import { getWeddingSlug, weddingPath } from '../lib/wedding';

type PendingPhoto = {
  id:string;
  file:File;
  preview:string;
  momentId:number|null;
  personIds:number[];
};

export default function AddPhotos(){
  const slug=getWeddingSlug();
  const [,nav]=useLocation();
  const {guests,moments,loading,error:catalogError}=useCatalog();
  const guestId=getGuestId();

  const [batchMoment,setBatchMoment]=useState<number|null>(null);
  const [photos,setPhotos]=useState<PendingPhoto[]>([]);
  const [current,setCurrent]=useState(0);
  const [showPeople,setShowPeople]=useState(false);
  const [error,setError]=useState('');
  const [sending,setSending]=useState(false);
  const [done,setDone]=useState(0);

  const gallery=useRef<HTMLInputElement>(null);
  const touchStartX=useRef<number|null>(null);

  const knownGuest = !!guestId && guests.some(g=>g.id===guestId);

  if(loading) return <Page title="Adicionar fotos"><div className="empty">A preparar…</div></Page>;

  if(!knownGuest){
    return <Page title="Quem és?" showNav={false}>
      <div className="empty">
        <strong>Precisamos de saber quem és</strong>
        <span>Se este navegador já te reconhecer, não voltaremos a perguntar.</span>
        <button className="empty-cta" onClick={()=>nav(weddingPath('/identificar')+'?next='+encodeURIComponent(weddingPath('/adicionar')))}>Escolher o meu nome</button>
      </div>
    </Page>;
  }

  const addFiles=(list:FileList|null)=>{
    if(!list)return;
    const room=Math.max(0,30-photos.length);
    const chosen=Array.from(list).slice(0,room);
    const added=chosen.map(file=>({
      id:crypto.randomUUID(),
      file,
      preview:URL.createObjectURL(file),
      momentId:batchMoment,
      personIds:[],
    }));
    setPhotos(v=>[...v,...added]);
    setCurrent(photos.length);
    setError(Array.from(list).length>room?'Limite de 30 fotografias por envio.':'');
  };

  const updateCurrent=(patch:Partial<PendingPhoto>)=>{
    setPhotos(v=>v.map((p,i)=>i===current?{...p,...patch}:p));
  };

  const removeCurrent=()=>{
    const photo=photos[current];
    if(photo) URL.revokeObjectURL(photo.preview);
    const next=photos.filter((_,i)=>i!==current);
    setPhotos(next);
    setCurrent(Math.max(0,Math.min(current,next.length-1)));
    setShowPeople(false);
  };

  const chooseBatchMoment=(id:number|null)=>{
    setBatchMoment(id);
    setPhotos(v=>v.map(p=>({...p,momentId:id})));
  };

  const togglePerson=(id:number)=>{
    const photo=photos[current];
    if(!photo)return;
    const ids=photo.personIds.includes(id)
      ? photo.personIds.filter(x=>x!==id)
      : [...photo.personIds,id];
    updateCurrent({personIds:ids});
  };

  const go=(index:number)=>{
    if(!photos.length)return;
    setCurrent(Math.max(0,Math.min(index,photos.length-1)));
    setShowPeople(false);
  };

  const onTouchStart=(e:React.TouchEvent)=>{touchStartX.current=e.touches[0]?.clientX??null};
  const onTouchEnd=(e:React.TouchEvent)=>{
    if(touchStartX.current==null)return;
    const end=e.changedTouches[0]?.clientX??touchStartX.current;
    const delta=end-touchStartX.current;
    touchStartX.current=null;
    if(Math.abs(delta)<45)return;
    go(current+(delta<0?1:-1));
  };

  const send=async()=>{
    if(!photos.length){setError('Escolhe pelo menos uma fotografia.');return}
    const withoutMoment=photos.findIndex(p=>!p.momentId);
    if(withoutMoment>=0){
      setCurrent(withoutMoment);
      setError('Define o momento desta fotografia.');
      return;
    }

    setSending(true);
    setDone(0);
    setError('');
    try{
      for(let i=0;i<photos.length;i++){
        const p=photos[i];
        await uploadPhoto(p.file,p.momentId!,guestId!,p.personIds,slug);
        setDone(i+1);
      }
      photos.forEach(p=>URL.revokeObjectURL(p.preview));
      nav(weddingPath('/album'));
    }catch(e:any){
      setError(e?.message||'Não foi possível enviar as fotografias.');
    }finally{
      setSending(false);
    }
  };

  const photo=photos[current];

  return <Page title="Adicionar fotos">
    {catalogError&&<p className="notice">{catalogError}</p>}

    {!photos.length ? <>
      <section className="section first-section">
        <h2>Momento do lote <small>opcional</small></h2>
        <p className="section-copy">Se todas as fotos forem do mesmo momento, define-o já. Podes alterar depois foto a foto.</p>
        <div className="chips">
          {moments.map(m=><button key={m.id} className={'chip '+(batchMoment===m.id?'active':'')} onClick={()=>chooseBatchMoment(m.id)}>{m.name}</button>)}
        </div>
      </section>

      <section className="section">
        <h2>Escolher fotografias</h2>
        <button className="gallery-only" onClick={()=>gallery.current?.click()}>
          <Images size={26}/>
          <div><strong>Abrir galeria</strong><span>Seleciona até 30 fotografias</span></div>
        </button>
        <input ref={gallery} hidden type="file" accept="image/*,.heic,.heif" multiple onChange={e=>{addFiles(e.target.files);e.currentTarget.value=''}}/>
      </section>
    </> : <>
      <div className="review-head">
        <div><strong>{current+1}</strong> / {photos.length}</div>
        <button onClick={removeCurrent} disabled={sending}><Trash2 size={17}/>Remover</button>
      </div>

      <div className="photo-review" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <img src={photo.preview} alt={'Pré-visualização '+(current+1)}/>
        {current>0&&<button className="review-arrow left" onClick={()=>go(current-1)} aria-label="Anterior"><ChevronLeft size={26}/></button>}
        {current<photos.length-1&&<button className="review-arrow right" onClick={()=>go(current+1)} aria-label="Seguinte"><ChevronRight size={26}/></button>}
      </div>

      <div className="review-dots">
        {photos.map((_,i)=><button key={i} className={i===current?'active':''} onClick={()=>go(i)} aria-label={'Foto '+(i+1)}/>)}
      </div>

      <section className="section">
        <h2>Momento</h2>
        <div className="chips horizontal">
          {moments.map(m=><button key={m.id} className={'chip '+(photo.momentId===m.id?'active':'')} onClick={()=>{updateCurrent({momentId:m.id});setError('')}}>{m.name}</button>)}
        </div>
      </section>

      <section className="section">
        <h2>Pessoas <small>opcional</small></h2>
        <button className="people-trigger" onClick={()=>setShowPeople(v=>!v)}>
          <Users size={17}/>
          {photo.personIds.length?photo.personIds.length+' selecionada(s)':'Identificar pessoas'}
        </button>
        {showPeople&&<div className="picker">
          {guests.map(g=><label className="picker-row" key={g.id}>
            <input type="checkbox" checked={photo.personIds.includes(g.id)} onChange={()=>togglePerson(g.id)}/>
            <span className="guest-label"><strong>{g.name}</strong>{g.group_name&&<small>{g.group_name}</small>}</span>
          </label>)}
        </div>}
      </section>

      <section className="section">
        <button className="add-more" onClick={()=>gallery.current?.click()} disabled={sending}><Images size={17}/>Adicionar mais fotos</button>
        <input ref={gallery} hidden type="file" accept="image/*,.heic,.heif" multiple onChange={e=>{addFiles(e.target.files);e.currentTarget.value=''}}/>
      </section>

      {error&&<p className="notice">{error}</p>}

      <div className="bottom-action"><div className="bottom-inner">
        <button className="send" disabled={sending} onClick={send}>
          {sending?'A publicar '+done+'/'+photos.length+'…':'Publicar '+photos.length+' '+(photos.length===1?'fotografia':'fotografias')}
        </button>
      </div></div>
    </>}
  </Page>;
}
