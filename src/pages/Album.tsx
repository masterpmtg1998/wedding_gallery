import { useEffect, useMemo, useState } from 'react';
import { Heart, Images, X } from 'lucide-react';
import { Page } from '../components/navigation';
import { getGalleryPage, getLoveStats, togglePhotoLove, type Photo } from '../api';
import { useCatalog } from '../hooks/useCatalog';
import { getWeddingSlug } from '../lib/wedding';

const PAGE_SIZE=60;
const LOVE_KEY='wedding_loved_photos';

function readLoved(){
  try{return new Set<string>(JSON.parse(localStorage.getItem(LOVE_KEY)||'[]'))}
  catch{return new Set<string>()}
}
function persistLoved(set:Set<string>){
  localStorage.setItem(LOVE_KEY,JSON.stringify([...set]));
}

export default function Album(){
  const slug=getWeddingSlug();
  const {guests,moments}=useCatalog();
  const [photos,setPhotos]=useState<Photo[]>([]);
  const [total,setTotal]=useState(0);
  const [loading,setLoading]=useState(true);
  const [loadingMore,setLoadingMore]=useState(false);
  const [error,setError]=useState('');
  const [moment,setMoment]=useState<number|null>(null);
  const [person,setPerson]=useState<number|null>(null);
  const [selected,setSelected]=useState<Photo|null>(null);
  const [loveCounts,setLoveCounts]=useState<Map<string,number>>(new Map());
  const [loved,setLoved]=useState<Set<string>>(()=>readLoved());

  const load=async(reset:boolean)=>{
    reset?setLoading(true):setLoadingMore(true);
    setError('');
    try{
      const offset=reset?0:photos.length;
      const result=await getGalleryPage(moment,person,offset,PAGE_SIZE,slug);
      setTotal(result.total);
      setPhotos(v=>reset?result.photos:[...v,...result.photos]);
      const counts=await getLoveStats(result.photos.map(p=>p.id),slug);
      setLoveCounts(v=>{
        const next=reset?new Map<string,number>():new Map(v);
        counts.forEach((count,id)=>next.set(id,count));
        return next;
      });
    }catch(e:any){
      setError(e?.message||'Erro ao carregar o álbum.');
    }finally{
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(()=>{ void load(true); },[moment,person]);

  const toggleLove=async(photoId:string)=>{
    try{
      const nowLoved=await togglePhotoLove(photoId,slug);
      setLoved(prev=>{
        const next=new Set(prev);
        nowLoved?next.add(photoId):next.delete(photoId);
        persistLoved(next);
        return next;
      });
      setLoveCounts(prev=>{
        const next=new Map(prev);
        const current=next.get(photoId)||0;
        next.set(photoId,Math.max(0,current+(nowLoved?1:-1)));
        return next;
      });
    }catch(e:any){
      setError(e?.message||'Não foi possível guardar o adoro.');
    }
  };

  const selectedUploader=useMemo(
    ()=>selected?guests.find(g=>g.id===selected.uploader_guest_id)?.name||'Convidado':'',
    [selected,guests]
  );

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
          const uploader=guests.find(g=>g.id===p.uploader_guest_id)?.name||'Convidado';
          const count=loveCounts.get(p.id)||0;
          const isLoved=loved.has(p.id);
          return <article className="album-card" key={p.id}>
            <button className="photo-open" onClick={()=>setSelected(p)} aria-label="Abrir fotografia">
              <img className="photo" src={p.url} alt="Fotografia do casamento" loading="lazy"/>
            </button>
            <div className="photo-card-footer">
              <div className="photo-meta">Publicada por <strong>{uploader}</strong></div>
              <button className={'love-button '+(isLoved?'loved':'')} onClick={()=>void toggleLove(p.id)} aria-label={isLoved?'Retirar adoro':'Adoro'}>
                <Heart size={15} fill={isLoved?'currentColor':'none'}/>
                {count>0&&<span>{count}</span>}
              </button>
            </div>
          </article>;
        })}</div>
        {photos.length<total&&<div className="load-more-wrap">
          <button className="load-more" disabled={loadingMore} onClick={()=>void load(false)}>
            {loadingMore?'A carregar…':'Carregar mais'}
          </button>
        </div>}
      </>
      :<div className="empty"><Images size={34}/><strong>Ainda não há fotos aqui</strong><span>Publica a primeira fotografia.</span></div>)}

    {selected&&<div className="lightbox" role="dialog" aria-modal="true" onClick={()=>setSelected(null)}>
      <button className="lightbox-close" onClick={()=>setSelected(null)} aria-label="Fechar"><X size={22}/></button>
      <img src={selected.url} alt="Fotografia ampliada" onClick={e=>e.stopPropagation()}/>
      <div className="lightbox-actions" onClick={e=>e.stopPropagation()}>
        <div className="lightbox-meta">Publicada por <strong>{selectedUploader}</strong></div>
        <button className={'love-button lightbox-love '+(loved.has(selected.id)?'loved':'')} onClick={()=>void toggleLove(selected.id)}>
          <Heart size={17} fill={loved.has(selected.id)?'currentColor':'none'}/>
          <span>{loveCounts.get(selected.id)||0}</span>
        </button>
      </div>
    </div>}
  </Page>;
}
