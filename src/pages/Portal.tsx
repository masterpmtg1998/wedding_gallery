import { useEffect, useState } from 'react';
import { ImagePlus, LogOut, Save, Upload } from 'lucide-react';
import { createWeddingWorkspace, getManagedLandingMedia, getMyWedding, getMyWeddings, inviteWeddingMember, updateLandingFocal, uploadLandingMedia } from '../api';
import { supabase } from '../supabase';

type Item={id:string;slot:number;url:string;focal_x:number;focal_y:number;original_name:string|null};
type AuthMode='login'|'signup'|'forgot';

export default function Portal(){
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [mode,setMode]=useState<AuthMode>('login');
  const [loading,setLoading]=useState(true);
  const [wedding,setWedding]=useState<any>(null);
  const [signedIn,setSignedIn]=useState(false);
  const [items,setItems]=useState<Item[]>([]);
  const [workspaces,setWorkspaces]=useState<any[]>([]);
  const [coupleNames,setCoupleNames]=useState('');
  const [weddingDate,setWeddingDate]=useState('');
  const [inviteEmail,setInviteEmail]=useState('');
  const [message,setMessage]=useState('');

  async function load(){
    setLoading(true);
    try{
      const {data:{session}}=await supabase.auth.getSession();
      setSignedIn(Boolean(session));
      const ws=session?await getMyWeddings():[];
      setWorkspaces(ws);
      const w=ws[0]??null;
      setWedding(w);
      if(w)setItems(await getManagedLandingMedia(w.id) as Item[]);
      else setItems([]);
    }catch(e:any){setMessage(e.message||'Não foi possível abrir o portal.')}
    finally{setLoading(false)}
  }
  useEffect(()=>{load();const {data}=supabase.auth.onAuthStateChange(()=>setTimeout(load,0));return()=>data.subscription.unsubscribe()},[]);

  async function authenticate(e:React.FormEvent){
    e.preventDefault();setMessage('');
    if(mode==='forgot'){
      const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/portal'});
      setMessage(error?error.message:'Enviámos as instruções de recuperação para o teu email.');
      return;
    }
    if(mode==='signup'){
      const {error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+'/portal'}});
      setMessage(error?error.message:'Conta criada. Confirma o teu email para continuar.');
      return;
    }
    const {error}=await supabase.auth.signInWithPassword({email,password});
    if(error)setMessage('Email ou palavra-passe incorretos.');
  }

  async function createWorkspace(e:React.FormEvent){
    e.preventDefault();setMessage('');
    try{await createWeddingWorkspace(coupleNames,weddingDate);await load();}
    catch(e:any){setMessage(e.message||'Não foi possível criar o casamento.')}
  }
  async function invite(e:React.FormEvent){
    e.preventDefault();if(!wedding)return;
    try{await inviteWeddingMember(wedding.id,inviteEmail);setInviteEmail('');setMessage('Convite preparado. Quando essa pessoa criar/entrar na conta com este email, terá acesso ao casamento.');}
    catch(e:any){setMessage(e.message||'Não foi possível criar o convite.')}
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

  if(!signedIn)return <main className="portal-shell"><section className="portal-card portal-login">
    <div className="landing-kicker">Portal dos Noivos</div>
    <h1>{mode==='login'?'Entrar':mode==='signup'?'Criar conta':'Recuperar acesso'}</h1>
    <p>{mode==='login'?'Gere o teu casamento, convidados, mesas e fotografias num só lugar.':mode==='signup'?'Cria a tua conta. Depois poderás criar ou aceitar acesso a um casamento.':'Indica o email da tua conta e enviamos as instruções.'}</p>
    <form onSubmit={authenticate}>
      <input className="search" type="email" autoComplete="email" required placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/>
      {mode!=='forgot'&&<input className="search" type="password" autoComplete={mode==='login'?'current-password':'new-password'} required minLength={8} placeholder="Palavra-passe" value={password} onChange={e=>setPassword(e.target.value)}/>}
      <button className="primary" type="submit">{mode==='login'?'Entrar':mode==='signup'?'Criar conta':'Recuperar palavra-passe'}</button>
    </form>
    <div className="auth-links">
      {mode==='login'&&<><button onClick={()=>{setMode('forgot');setMessage('')}}>Esqueci-me da palavra-passe</button><button onClick={()=>{setMode('signup');setMessage('')}}>Criar conta</button></>}
      {mode!=='login'&&<button onClick={()=>{setMode('login');setMessage('')}}>← Voltar ao login</button>}
    </div>
    {message&&<p className="notice">{message}</p>}
  </section></main>;

  if(!wedding)return <main className="portal-shell"><section className="portal-card portal-login">
    <div className="landing-kicker">Bem-vindo</div><h1>Cria o teu casamento</h1>
    <p>Este será o teu workspace. Depois podes convidar a outra pessoa do casal ou alguém da organização.</p>
    <form onSubmit={createWorkspace}>
      <input className="search" required placeholder="Nomes do casal · ex. Pedro & Tânia" value={coupleNames} onChange={e=>setCoupleNames(e.target.value)}/>
      <input className="search" type="date" required value={weddingDate} onChange={e=>setWeddingDate(e.target.value)}/>
      <button className="primary" type="submit">Criar casamento</button>
    </form>
    {message&&<p className="notice">{message}</p>}
    <div className="auth-links"><button onClick={()=>supabase.auth.signOut()}>Sair</button></div>
  </section></main>;

  return <main className="portal-shell"><div className="portal-wrap">
    <header className="portal-head"><div><span>Portal dos Noivos</span><h1>{wedding.couple_names}</h1></div><button onClick={()=>supabase.auth.signOut()}><LogOut size={16}/>Sair</button></header>
    <nav className="portal-tabs"><button className="active">Personalização</button><button disabled>Convidados</button><button disabled>Mesas</button><button disabled>Fotografias</button></nav>
    <section className="portal-card portal-invite">
      <div className="portal-section-title"><div><span>Equipa</span><h2>Partilhar gestão</h2><p>Convida a outra pessoa do casal ou um organizador. O acesso fica ligado ao workspace.</p></div></div>
      <form onSubmit={invite}><input className="search" type="email" required placeholder="Email a convidar" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)}/><button className="primary" type="submit">Convidar</button></form>
    </section>
    <section className="portal-card">
      <div className="portal-section-title"><div><span>Landing page</span><h2>Fotos de abertura</h2><p>Carrega os originais. Depois ajusta o ponto principal da imagem sem alterar o ficheiro.</p></div><ImagePlus size={25}/></div>
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