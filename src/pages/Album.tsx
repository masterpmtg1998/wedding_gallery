import { useEffect, useState } from 'react';
import { Images } from 'lucide-react';
import { Page } from '../components/navigation';
import { getGalleryPage, type Photo } from '../api';
import { useCatalog } from '../hooks/useCatalog';

const PAGE_SIZE=60;

export default function Album(){
  const {guests,moments}=useCatalog();
  const [photos,setPhotos]=useState<Photo[]>([]);
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(true);
  const [loadingMore,setLoadingMore]=useState(false);
  const [error,setError]=useState('');
  const [moment,setMoment]=useState<number|null>(null);
  const [person,setPerson]=useState<number|null>(null);

  const load=async(reset:boolean)=>{
    reset?setLoading(true):setLoadingMore(true);
    setError('');
    try{
      const offset=reset?0:photos.length;
      const result=await getGalleryPage(moment,person,offset,PAGE_SIZE);
      setTotal(result.total);
      setPhotos(v=>reset?result.photos:[...v,...result.photos]);
    }catch(e:any){
      setError(e?.message||'Erro ao carregar o álbum.');
    }finally{
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(()=>{
    void load(true);
  },[moment,person]);

  return <Page title="Álbum">
    <div className="album-intro">
      <span>{total} {total===1?'fotografia':'fotografias'}</span>
      <p>O nosso dia visto por quem esteve connosco.</p>
    </div>

    <div className="filter-block">
      <div className="chips horizontal">
        <button className={'chip '+(!moment?'active':'')} onClick={()=>setMoment(null)}>Todos</button>
        {moments.map(m=><button key={m.id} className={'chip '+(moment===m.id?'active':'')} onClick={()=>setMoment(m.id)}>{m.name}</button>)}
      </div>
      <select className="search" value={person??''} onChange={e=>setPerson(e.target.value?Number(e.target.value):null)}>
        <option value="">Todas as pessoas</option>
        {guests.map(g=><option key={g.id} value={g.id}>{g.name}{g.group_name?' — '+g.group_name:''}</option>)}
      </select>
    </div>

    {loading&&<div className="empty">A carregar álbum…</div>}
    {error&&<p className="notice">{error}</p>}

    {!loading&&!error&&(photos.length
      ?<>
        <div className="album-grid">{photos.map(p=>{
          const uploader=guests.find(g=>g.id===p.uploader_guest_id)?.name || 'Convidado';
          return <article className="album-card" key={p.id}>
            <img className="photo" src={p.url} alt="Fotografia do casamento" loading="lazy"/>
            <div className="photo-meta">Publicada por <strong>{uploader}</strong></div>
          </article>;
        })}</div>
        {photos.length<total&&<div className="load-more-wrap">
          <button className="load-more" disabled={loadingMore} onClick={()=>void load(false)}>
            {loadingMore?'A carregar…':'Carregar mais'}
          </button>
        </div>}
      </>
      :<div className="empty"><Images size={34}/><strong>Ainda não há fotos aqui</strong><span>Publica a primeira fotografia.</span></div>)}
  </Page>;
}
