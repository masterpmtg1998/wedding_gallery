import { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { getGuestId } from '../lib/guest';

const slides=['/couple/1.svg','/couple/2.svg','/couple/3.svg','/couple/4.svg'];

export default function Landing(){
  const [,nav]=useLocation();
  const [slide,setSlide]=useState(0);
  useEffect(()=>{
    const t=setInterval(()=>setSlide(v=>(v+1)%slides.length),3200);
    return()=>clearInterval(t);
  },[]);
  const publish=()=>nav(getGuestId()?'/adicionar':'/identificar?next=/adicionar');
  return <main className="landing">
    <div className="landing-slides">
      {slides.map((src,i)=><img key={src} src={src} className={'landing-slide '+(slide===i?'show':'')} alt="Pedro e Tânia"/>)}
      <div className="landing-overlay"/>
    </div>
    <div className="landing-content">
      <div className="landing-date">04 · 09 · 2027</div>
      <h1>Pedro <span>&</span> Tânia</h1>
      <p>Ajuda-nos a guardar o nosso dia pelos teus olhos.</p>
      <button className="landing-cta" onClick={publish}><Camera size={20}/>Publicar Fotografias</button>
      <Link href="/album" className="landing-link">Ver álbum</Link>
      <div className="slide-dots">{slides.map((_,i)=><button key={i} className={slide===i?'active':''} onClick={()=>setSlide(i)} aria-label={'Foto '+(i+1)}/>)}</div>
    </div>
  </main>;
}
