import { useState } from 'react';
import { Check, Search } from 'lucide-react';
import { useLocation } from 'wouter';
import { Page } from '../components/navigation';
import { useCatalog } from '../hooks/useCatalog';
import { getGuestId, setGuestId } from '../lib/guest';

export default function Identify(){
  const [,nav]=useLocation();
  const {guests,loading,error}=useCatalog();
  const [q,setQ]=useState('');
  const next=new URLSearchParams(window.location.search).get('next')||'/adicionar';
  const list=guests.filter(g=>g.name.toLowerCase().includes(q.toLowerCase()));
  return <Page title="Quem és?" showNav={false}>
    <p className="muted intro">Escolhe o teu nome para associarmos as fotografias a este dispositivo.</p>
    <div style={{position:'relative',marginTop:18}}>
      <Search size={18} style={{position:'absolute',left:16,top:17,color:'#69756f'}}/>
      <input className="search" style={{paddingLeft:44}} placeholder="Procurar nome" value={q} onChange={e=>setQ(e.target.value)}/>
    </div>
    {loading&&<div className="empty">A carregar convidados…</div>}
    {error&&<p className="notice">{error}</p>}
    {!loading&&<div className="list">{list.map(g=><button className="guest" key={g.id} onClick={()=>{setGuestId(g.id);nav(next)}}>
      <span>{g.name}</span>{getGuestId()===g.id&&<Check size={17}/>}
    </button>)}</div>}
    <p className="privacy-note">Fica memorizado apenas neste navegador e podes trocar depois.</p>
  </Page>;
}
