import type { ReactNode } from 'react';
import { ArrowLeft, Images, Upload } from 'lucide-react';
import { Link, useLocation } from 'wouter';

export function BottomNav() {
  const [location] = useLocation();
  const tabs = [
    { href:'/album', label:'Álbum', icon:Images },
    { href:'/adicionar', label:'Adicionar', icon:Upload, primary:true },
  ];
  return <nav className="bottom-nav"><div className="bottom-nav-inner two-tabs">
    {tabs.map(tab=>{
      const Icon=tab.icon;
      return <Link key={tab.href} href={tab.href} className={'nav-tab '+(location===tab.href?'active ':'')+(tab.primary?'primary':'')}>
        <span className="nav-icon"><Icon size={21}/></span><span>{tab.label}</span>
      </Link>
    })}
  </div></nav>;
}

export function Page({title,children,showNav=true}:{title:string;children:ReactNode;showNav?:boolean}) {
  const [,nav]=useLocation();
  return <>
    <main className={'page '+(showNav?'with-nav':'')}>
      <header className="pagehead">
        <button className="back" onClick={()=>nav('/')} aria-label="Voltar"><ArrowLeft size={20}/></button>
        <div className="page-title-wrap"><div className="eyebrow">Pedro & Tânia · 04.09.2027</div><h1>{title}</h1></div>
      </header>
      {children}
    </main>
    {showNav&&<BottomNav/>}
  </>;
}
