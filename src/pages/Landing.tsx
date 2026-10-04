import { useEffect, useState } from 'react';
import { Camera } from 'lucide-react';
import { Link, useLocation } from 'wouter';

const slides=['/couple/1.svg','/couple/2.svg','/couple/3.svg','/couple/4.svg'];

export default function Landing(){
  const [,nav]=useLocation();
  const [slide,setSlide]=useState(0);
  useEffect(()=>{
    const t=setInterval(()=>setSlide(v=>(v+1)%slides.length),3200);
    return()=>clearInterval(t);
  },[]);
  const publish=()=>nav('/identificar?next=/adicionar');
  return <main className="landing">
    <div className="landing-slides">
      {slides.map((src,i)=><img key={src} src={src} className={'landing-slide '+(slide===i?'show':'')} alt="Pedro e Tânia"/>)}
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
      <p>Vive, fotografa e partilha connosco os momentos que só tu viste.</p>
      <button className="landing-cta" onClick={publish}><Camera size={19}/>Publicar fotografias</button>
      <Link href="/album" className="landing-link">Entrar no álbum</Link>
      <div className="slide-dots">{slides.map((_,i)=><button key={i} className={slide===i?'active':''} onClick={()=>setSlide(i)} aria-label={'Foto '+(i+1)}/>)}</div>
    </div>
  </main>;
}
