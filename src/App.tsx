import { useMemo, useRef, useState } from 'react';
import { Route, Switch, Link, useLocation } from 'wouter';
import { ArrowLeft, Camera, Check, Images, Search, Trash2, Users, X } from 'lucide-react';
import { guests, moments, loadGuest, saveGuest, loadPhotos, savePhotos, type LocalPhoto } from './data';

function Page({title, children}:{title:string; children:React.ReactNode}) {
  const [, nav] = useLocation();
  return <main className="page">
    <header className="pagehead">
      <button className="back" onClick={() => nav('/')} aria-label="Voltar"><ArrowLeft size={20}/></button>
      <h1>{title}</h1>
    </header>
    {children}
  </main>
}

function Identify() {
  const [, nav] = useLocation();
  const [q,setQ] = useState('');
  const current = loadGuest();
  const list = guests.filter(g => g.active && g.name.toLowerCase().includes(q.toLowerCase()));
  return <Page title="Quem é você?">
    <p className="muted">Escolha o seu nome na lista para associarmos as suas fotografias ao evento.</p>
    <div style={{position:'relative', marginTop:16}}>
      <Search size={18} style={{position:'absolute',left:16,top:17,color:'#69756f'}}/>
      <input className="search" style={{paddingLeft:44}} placeholder="Procurar o seu nome" value={q} onChange={e=>setQ(e.target.value)}/>
    </div>
    <div className="list">
      {list.map(g => <button className="guest" key={g.id} onClick={()=>{saveGuest(g.id); nav('/')}}>
        <span>{g.name}</span>{current===g.id && <Check size={17}/>}
      </button>)}
    </div>
    <p className="muted" style={{fontSize:12,lineHeight:1.5}}>A escolha fica memorizada neste navegador. Só os noivos podem consultar quem enviou cada fotografia.</p>
  </Page>
}

function Home() {
  const [, nav] = useLocation();
  const id = loadGuest();
  const guest = guests.find(g=>g.id===id);
  const count = loadPhotos().length;
  if (!guest) return <Identify/>;
  return <main className="app home">
    <section className="hero">
      <div className="rings">◌ ◌</div>
      <h1 className="serif title">O nosso dia</h1>
      <p className="muted">Partilhe as fotografias deste dia em poucos segundos.</p>
      <p className="muted" style={{fontSize:13}}>{count} {count===1?'fotografia':'fotografias'}</p>
      <span style={{border:'1px solid #d7b9aa',color:'#a85a3f',borderRadius:999,padding:'5px 10px',fontSize:11}}>Listas de demonstração</span>
    </section>
    <nav className="actions">
      <Link href="/adicionar" className="card-btn primary"><Camera size={28}/><span>Adicionar fotos</span></Link>
      <Link href="/album" className="card-btn"><Images size={28}/><span>Ver álbum</span></Link>
    </nav>
    <div className="footerline">{guest.name} · <button className="link" style={{border:0,background:'none',color:'inherit',padding:0}} onClick={()=>{localStorage.removeItem('wedding_guest_id');nav('/identificar')}}>Não sou eu</button></div>
  </main>
}

type Pending = { id:string; file:File; preview:string; people:number[]|null };

function AddPhotos() {
  const [, nav] = useLocation();
  const guestId = loadGuest();
  const [momentId,setMomentId] = useState<number|null>(null);
  const [shared,setShared] = useState<number[]>([]);
  const [showPeople,setShowPeople] = useState(false);
  const [items,setItems] = useState<Pending[]>([]);
  const [error,setError] = useState('');
  const camera = useRef<HTMLInputElement>(null);
  const gallery = useRef<HTMLInputElement>(null);

  if (!guestId) {
    return <Page title="Adicionar fotos"><div className="empty">Primeiro, escolha o seu nome.<br/><button className="send" style={{marginTop:16}} onClick={()=>nav('/identificar')}>Escolher o meu nome</button></div></Page>
  }

  const addFiles = (fs:FileList|null) => {
    if (!fs) return;
    const room = Math.max(0, 30-items.length);
    const accepted = Array.from(fs).slice(0,room).filter(f=>f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name));
    setItems(prev => [...prev, ...accepted.map(file=>({id:crypto.randomUUID(),file,preview:URL.createObjectURL(file),people:null}))]);
    if (Array.from(fs).length > room) setError('Limite de 30 fotografias por envio.');
  };

  const toggle = (id:number) => setShared(a=>a.includes(id)?a.filter(x=>x!==id):[...a,id]);

  const send = () => {
    if (!momentId) { setError('Escolha primeiro o momento das fotografias.'); return; }
    if (!items.length) { setError('Escolha pelo menos uma fotografia.'); return; }
    const existing = loadPhotos();
    const now = new Date().toISOString();
    const added:LocalPhoto[] = items.map(i=>({
      id:i.id, url:i.preview, momentId, personIds:i.people ?? shared, uploaderGuestId:guestId, createdAt:now
    }));
    savePhotos([...existing,...added]);
    setItems([]);
    setError('');
    nav('/album');
  };

  return <Page title="Adicionar fotos">
    <section className="section">
      <h2>1. Momento <small style={{fontFamily:'DM Sans',fontSize:13,color:'#a85a3f'}}>obrigatório</small></h2>
      <div className="chips">{moments.filter(m=>m.active).map(m=><button key={m.id} className={'chip '+(momentId===m.id?'active':'')} onClick={()=>setMomentId(m.id)}>{m.name}</button>)}</div>
    </section>

    <section className="section">
      <h2>2. Quem aparece <small style={{fontFamily:'DM Sans',fontSize:13,color:'#69756f'}}>opcional</small></h2>
      <button className="chip" onClick={()=>setShowPeople(v=>!v)}><Users size={15} style={{verticalAlign:'middle',marginRight:6}}/>{shared.length?shared.length+' selecionadas':'Escolher pessoas'}</button>
      {showPeople && <div className="picker">{guests.filter(g=>g.active).map(g=><label key={g.id} className="picker-row"><input type="checkbox" checked={shared.includes(g.id)} onChange={()=>toggle(g.id)}/><span>{g.name}</span></label>)}</div>}
    </section>

    <section className="section">
      <h2>3. Fotografias</h2>
      <div className="upload-grid">
        <button className="upload-choice primary" onClick={()=>camera.current?.click()}><Camera size={25}/>Tirar foto</button>
        <button className="upload-choice" onClick={()=>gallery.current?.click()}><Images size={25}/>Da galeria</button>
      </div>
      <input ref={camera} hidden type="file" accept="image/*" capture="environment" onChange={e=>{addFiles(e.target.files);e.currentTarget.value=''}}/>
      <input ref={gallery} hidden type="file" accept="image/*,.heic,.heif" multiple onChange={e=>{addFiles(e.target.files);e.currentTarget.value=''}}/>
      <p className="muted" style={{fontSize:12}}>Até 30 fotografias por envio. JPEG, PNG, WEBP ou HEIC.</p>
      {error && <p className="notice">{error}</p>}
      <div className="items">{items.map(i=><div className="item" key={i.id}>
        <img className="thumb" src={i.preview} alt=""/>
        <div className="item-main"><div className="item-name">{i.file.name}</div><div className="item-meta">Pessoas: {i.people?.length ?? shared.length ? 'selecionadas' : 'como definido acima'}</div></div>
        <button className="remove" onClick={()=>{URL.revokeObjectURL(i.preview);setItems(a=>a.filter(x=>x.id!==i.id))}} aria-label="Remover"><X size={18}/></button>
      </div>)}</div>
    </section>
    {items.length>0 && <div className="bottom"><div className="bottom-inner"><button className="send" onClick={send}>Enviar {items.length} {items.length===1?'fotografia':'fotografias'}</button></div></div>}
  </Page>
}

function Album() {
  const [moment,setMoment] = useState<number|null>(null);
  const [person,setPerson] = useState<number|null>(null);
  const photos = loadPhotos();
  const filtered = useMemo(()=>photos.filter(p=>(!moment||p.momentId===moment)&&(!person||p.personIds.includes(person))),[photos,moment,person]);
  return <Page title="Álbum">
    <div className="section" style={{marginTop:0}}>
      <div className="chips"><button className={'chip '+(!moment?'active':'')} onClick={()=>setMoment(null)}>Todos</button>{moments.map(m=><button key={m.id} className={'chip '+(moment===m.id?'active':'')} onClick={()=>setMoment(m.id)}>{m.name}</button>)}</div>
      <select className="search" value={person ?? ''} onChange={e=>setPerson(e.target.value?Number(e.target.value):null)} style={{marginTop:12}}>
        <option value="">Todas as pessoas</option>{guests.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
    </div>
    {filtered.length ? <div className="album-grid" style={{marginTop:18}}>{filtered.map(p=><img key={p.id} className="photo" src={p.url} alt="Fotografia do casamento"/>)}</div> : <div className="empty">Ainda não há fotografias neste filtro.</div>}
  </Page>
}

function Admin() {
  const photos = loadPhotos();
  const byMoment = moments.map(m=>({name:m.name,count:photos.filter(p=>p.momentId===m.id).length}));
  return <Page title="Área dos noivos">
    <div className="admin-card"><strong>{photos.length}</strong><div className="muted">fotografias carregadas</div></div>
    {byMoment.map(m=><div className="admin-card" key={m.name}><strong>{m.name}</strong><div className="muted">{m.count} fotografias</div></div>)}
    <button className="send" style={{background:'#9a4337',marginTop:8}} onClick={()=>{if(confirm('Apagar todas as fotografias de demonstração?')){savePhotos([]);location.reload()}}}><Trash2 size={16} style={{verticalAlign:'middle',marginRight:6}}/>Limpar dados de demonstração</button>
  </Page>
}

function NotFound() { return <Page title="Página não encontrada"><div className="empty">Esta página não existe.</div></Page> }

export default function App() {
  return <Switch>
    <Route path="/" component={Home}/>
    <Route path="/identificar" component={Identify}/>
    <Route path="/adicionar" component={AddPhotos}/>
    <Route path="/album" component={Album}/>
    <Route path="/admin" component={Admin}/>
    <Route component={NotFound}/>
  </Switch>;
}
