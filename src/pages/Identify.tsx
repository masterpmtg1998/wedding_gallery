import { useMemo, useState } from 'react';
import { Check, HeartHandshake, Search, UsersRound } from 'lucide-react';
import { useLocation } from 'wouter';
import { Page } from '../components/navigation';
import { useCatalog } from '../hooks/useCatalog';
import { getGuestId, setGuestId } from '../lib/guest';

type EntryGroup='familia_noivo'|'familia_noiva'|'amigos';

const groups:{id:EntryGroup;title:string;subtitle:string;icon:typeof UsersRound}[]=[
  {id:'familia_noivo',title:'Família Noivo',subtitle:'Família do Pedro',icon:UsersRound},
  {id:'familia_noiva',title:'Família Noiva',subtitle:'Família da Tânia',icon:UsersRound},
  {id:'amigos',title:'Amigos',subtitle:'Amigos dos dois',icon:HeartHandshake},
];

export default function Identify(){
  const [,nav]=useLocation();
  const {guests,loading,error}=useCatalog();
  const [group,setGroup]=useState<EntryGroup|null>(null);
  const [q,setQ]=useState('');
  const next=new URLSearchParams(window.location.search).get('next')||'/';

  const list=useMemo(()=>guests
    .filter(g=>!group||g.entry_group===group)
    .filter(g=>g.name.toLowerCase().includes(q.toLowerCase()))
  ,[guests,group,q]);

  return <Page title="Quem és?" showNav={false}>
    <p className="muted intro">Primeiro escolhe onde te encaixas. Depois é só encontrar o teu nome.</p>

    <div className="identity-groups">
      {groups.map(item=>{
        const Icon=item.icon;
        return <button key={item.id} className={'identity-group-card '+(group===item.id?'active':'')} onClick={()=>{setGroup(item.id);setQ('')}}>
          <span className="identity-group-icon"><Icon size={20}/></span>
          <strong>{item.title}</strong>
          <small>{item.subtitle}</small>
        </button>;
      })}
    </div>

    {group&&<>
      <div className="identity-section-head">
        <button onClick={()=>{setGroup(null);setQ('')}}>← Voltar aos grupos</button>
        <span>{list.length} nomes</span>
      </div>

      <div style={{position:'relative'}}>
        <Search size={18} style={{position:'absolute',left:16,top:17,color:'#69756f'}}/>
        <input className="search" style={{paddingLeft:44}} placeholder="Escreve o teu nome" value={q} onChange={e=>setQ(e.target.value)}/>
      </div>
    </>}

    {loading&&<div className="empty">A carregar convidados…</div>}
    {error&&<p className="notice">{error}</p>}

    {!loading&&group&&<div className="list">
      {list.map(g=><button className="guest" key={g.id} onClick={()=>{setGuestId(g.id);nav(next)}}>
        <span className="guest-label"><strong>{g.name}</strong>{g.group_name&&<small>{g.group_name}</small>}</span>
        {getGuestId()===g.id&&<Check size={17}/>}
      </button>)}
    </div>}

    {!loading&&group&&list.length===0&&<div className="empty compact-empty">
      <strong>Não encontrámos esse nome</strong>
      <span>Experimenta pesquisar apenas pelo primeiro nome.</span>
    </div>}

    <p className="privacy-note">Assim mostramos a tua mesa e identificamos as fotografias que publicares.</p>
  </Page>;
}
