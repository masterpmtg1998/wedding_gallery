import { useEffect, useMemo, useState } from 'react';
import { Camera, Images, MapPin } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { clearGuestId, getGuestId } from '../lib/guest';
import { getWeddingSlug, weddingPath } from '../lib/wedding';
import { readGuestExperienceSettings } from '../api';

type Slide={url:string;focal_x:number;focal_y:number};
const fallbackSlides:Slide[]=['/couple/1.svg','/couple/2.svg','/couple/3.svg','/couple/4.svg'].map(url=>({url,focal_x:50,focal_y:50}));

export default function Landing(){
  const slug=getWeddingSlug();
  const [,nav]=useLocation();
  const [slide,setSlide]=useState(0);
  const [slides,setSlides]=useState<Slide[]>(fallbackSlides);
  const [guestName,setGuestName]=useState('');
  const [tableName,setTableName]=useState('');
  const [wedding,setWedding]=useState<any>(null);

  useEffect(()=>{
    const guestId=getGuestId();
    if(!guestId){
      nav(weddingPath('/identificar')+'?next='+encodeURIComponent(weddingPath('/')));
      return;
    }

    let cancelled=false;
    (async()=>{
      try{
        const {getCatalog,getTrendingPhotos,getLandingMedia,getPublicWedding}=await import('../api');
        const [{guests,tables},trending,branding,weddingInfo]=await Promise.all([
          getCatalog(slug),
          getTrendingPhotos(10,slug),
          getLandingMedia(slug),
          getPublicWedding(slug),
        ]);
        if(cancelled)return;
        setWedding(weddingInfo);

        const guest=guests.find(g=>g.id===guestId);
        if(!guest){
          clearGuestId();
          nav('/identificar?next=/');
          return;
        }

        setGuestName(guest.name);
        const table=tables.find(t=>t.id===guest.table_id);
        setTableName(table?.name||'');

        if(branding.length){
          setSlides(branding.map((m:any)=>({url:m.url,focal_x:m.focal_x,focal_y:m.focal_y})));
        } else {
          const popular=trending.map((p:{url:string})=>({url:p.url,focal_x:50,focal_y:50}));
          if(popular.length>=4) setSlides(popular);
          else if(popular.length) setSlides([...popular,...fallbackSlides].slice(0,4));
        }
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
  const guestSettings=readGuestExperienceSettings(wedding?.settings);

  return <main className="landing">
    <div className="landing-slides">
      {slides.map((item,i)=><img key={item.url} src={item.url} style={{objectPosition:`${item.focal_x}% ${item.focal_y}%`}} className={'landing-slide '+(currentSlide===i?'show':'')} alt="Memórias do casamento"/>)}
      <div className="landing-overlay"/>
    </div>

    <div className="landing-topline">
      <span>O nosso dia</span>
      <span>{wedding?.wedding_date?new Date(wedding.wedding_date+'T00:00:00').toLocaleDateString('pt-PT',{day:'2-digit',month:'2-digit',year:'numeric'}).split('/').join(' · '):''}</span>
    </div>

    <div className="landing-content">
      <div className="landing-kicker">{wedding?.couple_names||'O nosso casamento'}</div>
      <h1>Um dia<br/><em>para sempre.</em></h1>
      <div className="landing-rule"><span>✦</span></div>

      {guestName&&<div className="welcome-chip">
        <span>Olá, {guestName}</span>
        <span>·</span>
        <strong>{tableName||'Mesa por definir'}</strong>
        <button onClick={()=>nav('/identificar?next=/')}>trocar</button>
      </div>}

      <p>Vive, fotografa e partilha connosco os momentos que só tu viste.</p>

      {guestSettings.uploads&&<button className="landing-cta" onClick={()=>nav(weddingPath('/adicionar'))}>
        <Camera size={19}/>Publicar fotografias
      </button>}

      {(guestSettings.album||guestSettings.tables)&&<div className="landing-actions">
        {guestSettings.album&&<Link href={weddingPath('/album')} className="landing-secondary"><Images size={16}/>Álbum</Link>}
        {guestSettings.tables&&<Link href={weddingPath('/mesas')} className="landing-secondary"><MapPin size={16}/>Mesas</Link>}
      </div>}

      <div className="slide-dots">{slides.map((_,i)=><button key={i} className={currentSlide===i?'active':''} onClick={()=>setSlide(i)} aria-label={'Foto '+(i+1)}/>)}</div>
    </div>
  </main>;
}
