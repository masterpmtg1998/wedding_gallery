import { useEffect, useState } from 'react';
import { ImagePlus, LogOut, Save, Upload } from 'lucide-react';
import { getManagedLandingMedia, getMyWedding, updateLandingFocal, uploadLandingMedia } from '../api';
import { supabase } from '../supabase';

type Item={id:string;slot:number;url:string;focal_x:number;focal_y:number;original_name:string|null};

export default function Portal(){
  const [email,setEmail]=useState('');
  const [sent,setSent]=useState(false);
  const [loading,setLoading]=useState(true);
  const [wedding,setWedding]=useState<any>(null);
  const [items,setItems]=useState<Item[]>([]);
  const [message,setMessage]=useState('');

  async function load(){
    setLoading(true);
    try{
      const w=await getMyWedding();
      setWedding(w);
      if(w) setItems(await getManagedLandingMedia(w.id) as Item[]);
    }catch(e:any){setMessage(e.message||'Não foi possível abrir o portal.')}
    finally{setLoading(false)}
  }
  useEffect(()=>{load(); const {data}=supabase.auth.onAuthStateChange(()=>setTimeout(load,0)); return()=>data.subscription.unsubscribe()},[]);

  async function login(e:React.FormEvent){
    e.preventDefault(); setMessage('');
    const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.origin+'/portal',shouldCreateUser:false}});
    if(error)setMessage(error.message); else setSent(true);
  }
  async function replace(slot:number,file?:File){
    if(!file||!wedding)return;
    setMessage('A carregar original…');
    try{await uploadLandingMedia(wedding.id,slot,file);await load();setMessage('Foto atualizada.');}
    catch(e:any){setMessage(e.message||'Erro no upload.')}
  }
  async function focal(item:Item,x:number,y:number){
    if(!wedding)return;
    setItems(v=>v.map(i=>i.slot===item.slot?{...i,focal_x:x,focal_y:y}:i));
    await updateLandingFocal(wedding.id,item.slot,x,y);
  }

  if(loading)return <main className="portal-shell"><div className="portal-card">A preparar o portal…</div></main>;
  if(!wedding)return <main className="portal-shell"><section className="portal-card portal-login">
    <div className="landing-kicker">Portal dos Noivos</div><h1>Gerir casamento</h1>
    <p>Entra com o email autorizado para este casamento.</p>
    {sent?<div className="notice">Enviámos-te um link de acesso. Abre o email neste dispositivo.</div>:
    <form onSubmit={login}><input className="search" type="email" required placeholder="O teu email" value={email} onChange={e=>setEmail(e.target.value)}/><button className="primary" type="submit">Enviar link de acesso</button></form>}
    {message&&<p className="notice">{message}</p>}
  </section></main>;

  return <main className="portal-shell"><div className="portal-wrap">
    <header className="portal-head"><div><span>Portal dos Noivos</span><h1>{wedding.couple_names}</h1></div><button onClick={()=>supabase.auth.signOut()}><LogOut size={16}/>Sair</button></header>
    <nav className="portal-tabs"><button className="active">Personalização</button><button disabled>Convidados</button><button disabled>Mesas</button><button disabled>Fotografias</button></nav>
    <section className="portal-card">
      <div className="portal-section-title"><div><span>Landing page</span><h2>Fotos de abertura</h2><p>Carrega os originais. Depois ajusta o ponto principal da imagem sem cortar ou alterar o ficheiro.</p></div><ImagePlus size={25}/></div>
      <div className="branding-grid">{[1,2,3,4].map(slot=>{
        const item=items.find(i=>i.slot===slot);
        return <article className="branding-card" key={slot}>
          <div className="branding-preview">{item?<img src={item.url} style={{objectPosition:`${item.focal_x}% ${item.focal_y}%`}}/>:<span>Foto {slot}</span>}</div>
          <div className="branding-controls">
            <label className="upload-control"><Upload size={15}/>{item?'Substituir original':'Carregar original'}<input type="file" accept="image/*,.heic,.heif" onChange={e=>replace(slot,e.target.files?.[0])}/></label>
            {item&&<><label>Horizontal <input type="range" min="0" max="100" value={item.focal_x} onChange={e=>focal(item,Number(e.target.value),item.focal_y)}/></label>
            <label>Vertical <input type="range" min="0" max="100" value={item.focal_y} onChange={e=>focal(item,item.focal_x,Number(e.target.value))}/></label></>}
          </div>
        </article>
      })}</div>
      {message&&<p className="portal-message"><Save size={14}/>{message}</p>}
    </section>
  </div></main>;
}