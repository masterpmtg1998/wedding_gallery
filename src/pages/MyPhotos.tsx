import { useEffect, useState } from 'react';
import { Camera, Trash2, UserRound } from 'lucide-react';
import { useLocation } from 'wouter';
import { Page } from '../components/navigation';
import { deleteMyPhoto, getMyPhotos, type Photo } from '../api';

export default function MyPhotos(){
  const [,nav]=useLocation();
  const [photos,setPhotos]=useState<Photo[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');

  useEffect(()=>{
    getMyPhotos().then(setPhotos).catch(e=>setError(e.message||'Erro')).finally(()=>setLoading(false));
  },[]);

  const remove=async(id:string)=>{
    if(!window.confirm('Apagar esta fotografia?'))return;
    try{
      await deleteMyPhoto(id);
      setPhotos(v=>v.filter(p=>p.id!==id));
    }catch(e:any){setError(e?.message||'Não foi possível apagar.')}
  };

  return <Page title="Minhas fotos">
    <div className="my-summary">
      <div><strong>{photos.length}</strong><span>{photos.length===1?'foto enviada':'fotos enviadas'}</span></div>
      <button onClick={()=>nav('/adicionar')}><Camera size={17}/>Adicionar mais</button>
    </div>
    {loading&&<div className="empty">A carregar…</div>}
    {error&&<p className="notice">{error}</p>}
    {!loading&&!error&&(photos.length
      ?<div className="my-grid">{photos.map(p=><article className="my-photo" key={p.id}><img src={p.url} alt="Fotografia enviada por mim"/><button onClick={()=>remove(p.id)} aria-label="Apagar"><Trash2 size={17}/></button></article>)}</div>
      :<div className="empty"><UserRound size={34}/><strong>Ainda não enviaste fotografias</strong><button className="empty-cta" onClick={()=>nav('/adicionar')}>Adicionar fotos</button></div>)}
  </Page>;
}
