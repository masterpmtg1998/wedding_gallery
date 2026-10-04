import { useEffect, useMemo, useState } from 'react';
import { Camera, Images, MapPin } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { getGuestId } from '../lib/guest';

const fallbackSlides=['/couple/1.svg','/couple/2.svg','/couple/3.svg','/couple/4.svg'];

export default function Landing(){
  const [,nav]=useLocation();
  const [slide,setSlide]=useState(0);
  const [slides,setSlides]=useState(fallbackSlides);
  const [guestName,setGuestName]=useState('');
  const [tableName,setTableName]=useState('');

  useEffect(()=>{
    const guestId=getGuestId();
    if(!guestId){
      nav('/identificar?next=/');
      return;
    }

    let cancelled=false;
    (async()=>{
      try{
        const {getCatalog,getTrendingPhotos}=await import('../api');
        const [{guests,tables},trending]=await Promise.all([
          getCatalog(),
          getTrendingPhotos(10),
        ]);
        if(cancelled)return;

        const guest=guests.find(g=>g.id===guestId);
        if(!guest){
          localStorage.removeItem('wedding_guest_id');
          nav('/identificar?next=/');
          return;
        }

        setGuestName(guest.name);
        const table=tables.find(t=>t.id===guest.table_id);
        setTableName(table?.name||'');

        const popular=trending.map((p:{url:string})=>p.url);
        if(popular.length>=4) setSlides(popular);
        else if(popular.length) setSlides([...popular,...fallbackSlides].slice(0,4));
      }catch{
        // A landing continua utilizável com os placeholders.
      }
    })();

    return()=>{cancelled=true};
  },[nav]);

  useEffect(()=>{
    setSlide(0);
    if(slides.length<2)return;
    const t=setInterval(()=>setSlide(v=>(v+1)%slides.length),3600);
    return()=>clearInterval(t);
  },[slides]);

  const currentSlide=useMemo(()=>Math.min(slide,slides.length-1),[slide,slides.length]);

  return <main className="landing">
    <div className="landing-slides">
      {slides.map((src,i)=><img key={src} src={src} className={'landing-slide '+(currentSlide===i?'show':'')} alt="Memórias de Pedro e Tânia"/>)}
      <div className="landing-overlay"/>
    </div>

    <div className="landing-topline">
      <span>O nosso dia</span>
      <span>04 · 09 · 2027</span>
    </div>

    <div className="landing-content">
      <div className="landing-kicker">Pedro & Tânia</div>
      <h1>Um dia<br/><em>para sempre.</em></h1>
      <div className="landing-rule"><span>✦</span></div>

      {guestName&&<div className="welcome-chip">
        <span>Olá, {guestName}</span>
        <span>·</span>
        <strong>{tableName||'Mesa por definir'}</strong>
      </div>}

      <p>Vive, fotografa e partilha connosco os momentos que só tu viste.</p>

      <button className="landing-cta" onClick={()=>nav('/adicionar')}>
        <Camera size={19}/>Publicar fotografias
      </button>

      <div className="landing-actions">
        <Link href="/album" className="landing-secondary"><Images size={16}/>Álbum</Link>
        <Link href="/mesas" className="landing-secondary"><MapPin size={16}/>Mesas</Link>
      </div>

      <div className="slide-dots">{slides.map((_,i)=><button key={i} className={currentSlide===i?'active':''} onClick={()=>setSlide(i)} aria-label={'Foto '+(i+1)}/>)}</div>
    </div>
  </main>;
}
