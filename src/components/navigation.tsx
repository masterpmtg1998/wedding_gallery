import type { ReactNode } from 'react';
import { ArrowLeft, Images, Upload, UserRound } from 'lucide-react';
import { Link, useLocation } from 'wouter';

export function BottomNav() {
  const [location] = useLocation();
  const tabs = [
    { href:'/album', label:'Álbum', icon:Images },
    { href:'/adicionar', label:'Adicionar', icon:Upload, primary:true },
    { href:'/minhas-fotos', label:'Minhas fotos', icon:UserRound },
  ];
  return <nav className="bottom-nav"><div className="bottom-nav-inner">
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
        <div><div className="eyebrow">Pedro & Tânia</div><h1>{title}</h1></div>
      </header>
      {children}
    </main>
    {showNav&&<BottomNav/>}
  </>;
}
