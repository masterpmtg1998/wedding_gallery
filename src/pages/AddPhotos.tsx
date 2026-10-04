import { useEffect, useRef, useState } from 'react';
import { Camera, Images, Users, X } from 'lucide-react';
import { useLocation } from 'wouter';
import { Page } from '../components/navigation';
import { uploadPhoto } from '../api';
import { useCatalog } from '../hooks/useCatalog';
import { getGuestId } from '../lib/guest';

export default function AddPhotos(){
  const [,nav]=useLocation();
  const {guests,moments,loading,error:catalogError}=useCatalog();
  const guestId=getGuestId();
  const [momentId,setMomentId]=useState<number|null>(null);
  const [people,setPeople]=useState<number[]>([]);
  const [showPeople,setShowPeople]=useState(false);
  const [files,setFiles]=useState<File[]>([]);
  const [previews,setPreviews]=useState<string[]>([]);
  const [error,setError]=useState('');
  const [sending,setSending]=useState(false);
  const [done,setDone]=useState(0);
  const camera=useRef<HTMLInputElement>(null);
  const gallery=useRef<HTMLInputElement>(null);

  useEffect(()=>()=>{previews.forEach(URL.revokeObjectURL)},[previews]);

  if(!guestId){
    return <Page title="Adicionar fotos" showNav={false}>
      <div className="empty"><strong>Primeiro escolhe o teu nome</strong><button className="empty-cta" onClick={()=>nav('/identificar?next=/adicionar')}>Continuar</button></div>
    </Page>;
  }

  const add=(list:FileList|null)=>{
    if(!list)return;
    const chosen=Array.from(list).slice(0,Math.max(0,30-files.length));
    setFiles(v=>[...v,...chosen]);
    setPreviews(v=>[...v,...chosen.map(f=>URL.createObjectURL(f))]);
  };
  const remove=(i:number)=>{
    URL.revokeObjectURL(previews[i]);
    setFiles(v=>v.filter((_,x)=>x!==i));
    setPreviews(v=>v.filter((_,x)=>x!==i));
  };
  const toggle=(id:number)=>setPeople(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);

  const send=async()=>{
    if(!momentId){setError('Escolhe o momento das fotografias.');return}
    if(!files.length){setError('Escolhe pelo menos uma fotografia.');return}
    setSending(true);setDone(0);setError('');
    try{
      for(let i=0;i<files.length;i++){
        await uploadPhoto(files[i],momentId,guestId,people);
        setDone(i+1);
      }
      previews.forEach(URL.revokeObjectURL);
      setFiles([]);setPreviews([]);
      nav('/minhas-fotos');
    }catch(e:any){
      setError(e?.message||'Não foi possível enviar as fotografias.');
    }finally{
      setSending(false);
    }
  };

  return <Page title="Adicionar fotos">
    {loading&&<div className="empty">A preparar…</div>}
    {catalogError&&<p className="notice">{catalogError}</p>}
    {!loading&&<>
      <section className="section first-section">
        <h2>Momento</h2><p className="section-copy">Aplica-se a todas as fotos deste envio.</p>
        <div className="chips">{moments.map(m=><button key={m.id} className={'chip '+(momentId===m.id?'active':'')} onClick={()=>setMomentId(m.id)}>{m.name}</button>)}</div>
      </section>

      <section className="section">
        <h2>Quem aparece? <small>opcional</small></h2>
        <button className="people-trigger" onClick={()=>setShowPeople(v=>!v)}><Users size={17}/>{people.length?people.length+' selecionada(s)':'Identificar pessoas'}</button>
        {showPeople&&<div className="picker">{guests.map(g=><label className="picker-row" key={g.id}><input type="checkbox" checked={people.includes(g.id)} onChange={()=>toggle(g.id)}/><span>{g.name}</span></label>)}</div>}
      </section>

      <section className="section">
        <h2>Fotografias</h2>
        <div className="upload-grid">
          <button className="upload-choice primary" onClick={()=>gallery.current?.click()}><Images size={24}/>Galeria</button>
          <button className="upload-choice" onClick={()=>camera.current?.click()}><Camera size={24}/>Câmara</button>
        </div>
        <input ref={camera} hidden type="file" accept="image/*" capture="environment" onChange={e=>{add(e.target.files);e.currentTarget.value=''}}/>
        <input ref={gallery} hidden type="file" accept="image/*,.heic,.heif" multiple onChange={e=>{add(e.target.files);e.currentTarget.value=''}}/>
        <p className="file-help muted">Até 30 fotografias por envio.</p>
        <div className="items">{files.map((f,i)=><div className="item" key={previews[i]}>
          <img className="thumb" src={previews[i]} alt=""/>
          <div className="item-main"><div className="item-name">{f.name}</div><div className="item-meta">{sending?'A enviar '+done+'/'+files.length:'Pronta para enviar'}</div></div>
          {!sending&&<button className="remove" onClick={()=>remove(i)} aria-label="Remover"><X size={18}/></button>}
        </div>)}</div>
        {error&&<p className="notice">{error}</p>}
      </section>

      {files.length>0&&<div className="bottom-action"><div className="bottom-inner"><button className="send" disabled={sending} onClick={send}>{sending?'A enviar '+done+'/'+files.length+'…':'Enviar '+files.length+' '+(files.length===1?'fotografia':'fotografias')}</button></div></div>}
    </>}
  </Page>;
}
