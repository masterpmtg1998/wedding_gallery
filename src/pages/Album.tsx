import { useEffect, useMemo, useState } from 'react';
import { Images } from 'lucide-react';
import { Page } from '../components/navigation';
import { getGallery, type Photo } from '../api';
import { useCatalog } from '../hooks/useCatalog';

export default function Album(){
  const {guests,moments}=useCatalog();
  const [photos,setPhotos]=useState<Photo[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [moment,setMoment]=useState<number|null>(null);
  const [person,setPerson]=useState<number|null>(null);

  useEffect(()=>{
    getGallery().then(setPhotos).catch(e=>setError(e.message||'Erro')).finally(()=>setLoading(false));
  },[]);

  const filtered=useMemo(()=>photos.filter(p=>(!moment||p.moment_id===moment)&&(!person||p.person_ids.includes(person))),[photos,moment,person]);

  return <Page title="Álbum">
    <div className="album-intro">
      <span>{filtered.length} {filtered.length===1?'fotografia':'fotografias'}</span>
      <p>O nosso dia visto por quem esteve connosco.</p>
    </div>
    <div className="filter-block">
      <div className="chips horizontal">
        <button className={'chip '+(!moment?'active':'')} onClick={()=>setMoment(null)}>Todos</button>
        {moments.map(m=><button key={m.id} className={'chip '+(moment===m.id?'active':'')} onClick={()=>setMoment(m.id)}>{m.name}</button>)}
      </div>
      <select className="search" value={person??''} onChange={e=>setPerson(e.target.value?Number(e.target.value):null)}>
        <option value="">Todas as pessoas</option>
        {guests.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
    </div>
    {loading&&<div className="empty">A carregar álbum…</div>}
    {error&&<p className="notice">{error}</p>}
    {!loading&&!error&&(filtered.length
      ?<div className="album-grid">{filtered.map(p=>{
        const uploader=guests.find(g=>g.id===p.uploader_guest_id)?.name || 'Convidado';
        return <article className="album-card" key={p.id}>
          <img className="photo" src={p.url} alt="Fotografia do casamento" loading="lazy"/>
          <div className="photo-meta">Publicada por <strong>{uploader}</strong></div>
        </article>;
      })}</div>
      :<div className="empty"><Images size={34}/><strong>Ainda não há fotos aqui</strong><span>Publica a primeira fotografia.</span></div>)}
  </Page>;
}
