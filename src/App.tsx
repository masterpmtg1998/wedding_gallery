import { useMemo, useRef, useState } from 'react';
import { Route, Switch, Link, useLocation } from 'wouter';
import { ArrowLeft, Camera, Check, Heart, Home as HomeIcon, Images, Search, Trash2, Upload, UserRound, Users, X } from 'lucide-react';
import { guests, moments, loadGuest, saveGuest, loadPhotos, savePhotos, type LocalPhoto } from './data';

function BottomNav() {
  const [location] = useLocation();
  const tabs = [
    { href: '/album', label: 'Álbum', icon: Images },
    { href: '/adicionar', label: 'Adicionar', icon: Upload, primary: true },
    { href: '/minhas-fotos', label: 'Minhas fotos', icon: UserRound },
  ];
  return <nav className="bottom-nav" aria-label="Navegação principal">
    <div className="bottom-nav-inner">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const active = location === tab.href;
        return <Link key={tab.href} href={tab.href} className={'nav-tab '+(active?'active ':'')+(tab.primary?'primary':'')}>
          <span className="nav-icon"><Icon size={21} strokeWidth={1.8}/></span>
          <span>{tab.label}</span>
        </Link>
      })}
    </div>
  </nav>;
}

function Page({title, children, showNav=true}:{title:string; children:React.ReactNode; showNav?:boolean}) {
  const [, nav] = useLocation();
  return <>
    <main className={'page '+(showNav?'with-nav':'')}>
      <header className="pagehead">
        <button className="back" onClick={() => nav('/')} aria-label="Voltar"><ArrowLeft size={20}/></button>
        <div>
          <div className="eyebrow">O nosso dia</div>
          <h1>{title}</h1>
        </div>
      </header>
      {children}
    </main>
    {showNav && <BottomNav/>}
  </>;
}

function Identify() {
  const [, nav] = useLocation();
  const [q,setQ] = useState('');
  const current = loadGuest();
  const list = guests.filter(g => g.active && g.name.toLowerCase().includes(q.toLowerCase()));
  return <Page title="Quem é você?" showNav={false}>
    <p className="muted intro">Escolha o seu nome para identificarmos os seus envios neste telemóvel.</p>
    <div style={{position:'relative', marginTop:18}}>
      <Search size={18} style={{position:'absolute',left:16,top:17,color:'#69756f'}}/>
      <input className="search" style={{paddingLeft:44}} placeholder="Procurar o seu nome" value={q} onChange={e=>setQ(e.target.value)} autoFocus/>
    </div>
    <div className="list">
      {list.map(g => <button className="guest" key={g.id} onClick={()=>{saveGuest(g.id); nav('/')}}>
        <span>{g.name}</span>{current===g.id && <Check size={17}/>}
      </button>)}
    </div>
    <p className="privacy-note">A escolha fica memorizada neste navegador. Só os noivos podem consultar quem enviou cada fotografia.</p>
  </Page>
}

function Home() {
  const [, nav] = useLocation();
  const id = loadGuest();
  const guest = guests.find(g=>g.id===id);
  const count = loadPhotos().length;
  if (!guest) return <Identify/>;
  return <main className="app home">
    <section className="home-top">
      <div className="home-mark"><Heart size={22} strokeWidth={1.5}/></div>
      <div className="home-event">04 · 07 · 2027</div>
      <h1 className="serif title">O nosso dia</h1>
      <p className="home-copy">Guarde aqui os momentos que viveu connosco.</p>
      <div className="photo-counter">{count} {count===1?'fotografia partilhada':'fotografias partilhadas'}</div>
    </section>

    <section className="home-actions">
      <Link href="/adicionar" className="hero-action">
        <div className="hero-action-icon"><Camera size={28} strokeWidth={1.5}/></div>
        <div>
          <strong>Adicionar fotos</strong>
          <span>Escolher da galeria ou tirar agora</span>
        </div>
      </Link>
      <div className="quick-grid">
        <Link href="/album" className="quick-card"><Images size={22}/><span>Ver álbum</span></Link>
        <Link href="/minhas-fotos" className="quick-card"><UserRound size={22}/><span>Minhas fotos</span></Link>
      </div>
    </section>

    <footer className="home-footer">
      <div><span className="guest-dot"></span>{guest.name}</div>
      <button onClick={()=>{localStorage.removeItem('wedding_guest_id');nav('/identificar')}}>Trocar pessoa</button>
      <Link href="/admin">Área dos noivos</Link>
    </footer>
    <BottomNav/>
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
    return <Page title="Adicionar fotos" showNav={false}><div className="empty">Primeiro, escolha o seu nome.<br/><button className="send" style={{marginTop:16}} onClick={()=>nav('/identificar')}>Escolher o meu nome</button></div></Page>
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
    nav('/minhas-fotos');
  };

  return <Page title="Adicionar fotos">
    <div className="step-strip">
      <span className={momentId?'done':'active'}>1</span>
      <i></i>
      <span className={items.length?'done':momentId?'active':''}>2</span>
      <i></i>
      <span>3</span>
    </div>

    <section className="section first-section">
      <h2>Escolha o momento</h2>
      <p className="section-copy">Aplica-se a todas as fotos deste envio.</p>
      <div className="chips">{moments.filter(m=>m.active).map(m=><button key={m.id} className={'chip '+(momentId===m.id?'active':'')} onClick={()=>{setMomentId(m.id);setError('')}}>{m.name}</button>)}</div>
    </section>

    <section className="section">
      <h2>Quem aparece? <small>opcional</small></h2>
      <button className="people-trigger" onClick={()=>setShowPeople(v=>!v)}><Users size={17}/>{shared.length?shared.length+' pessoa(s) selecionada(s)':'Identificar pessoas'}</button>
      {showPeople && <div className="picker">{guests.filter(g=>g.active).map(g=><label key={g.id} className="picker-row"><input type="checkbox" checked={shared.includes(g.id)} onChange={()=>toggle(g.id)}/><span>{g.name}</span></label>)}</div>}
    </section>

    <section className="section">
      <h2>Adicionar fotografias</h2>
      <div className="upload-grid">
        <button className="upload-choice primary" onClick={()=>gallery.current?.click()}><Images size={24}/>Galeria</button>
        <button className="upload-choice" onClick={()=>camera.current?.click()}><Camera size={24}/>Câmara</button>
      </div>
      <input ref={camera} hidden type="file" accept="image/*" capture="environment" onChange={e=>{addFiles(e.target.files);e.currentTarget.value=''}}/>
      <input ref={gallery} hidden type="file" accept="image/*,.heic,.heif" multiple onChange={e=>{addFiles(e.target.files);e.currentTarget.value=''}}/>
      <p className="muted file-help">Até 30 fotografias por envio · JPEG, PNG, WEBP ou HEIC</p>
      {error && <p className="notice">{error}</p>}
      <div className="items">{items.map(i=><div className="item" key={i.id}>
        <img className="thumb" src={i.preview} alt=""/>
        <div className="item-main"><div className="item-name">{i.file.name}</div><div className="item-meta">Pronta para enviar</div></div>
        <button className="remove" onClick={()=>{URL.revokeObjectURL(i.preview);setItems(a=>a.filter(x=>x.id!==i.id))}} aria-label="Remover"><X size={18}/></button>
      </div>)}</div>
    </section>
    {items.length>0 && <div className="bottom-action"><div className="bottom-inner"><button className="send" onClick={send}>Enviar {items.length} {items.length===1?'fotografia':'fotografias'}</button></div></div>}
  </Page>
}

function Album() {
  const [moment,setMoment] = useState<number|null>(null);
  const [person,setPerson] = useState<number|null>(null);
  const photos = loadPhotos();
  const filtered = useMemo(()=>photos.filter(p=>(!moment||p.momentId===moment)&&(!person||p.personIds.includes(person))),[photos,moment,person]);
  return <Page title="Álbum">
    <div className="filter-block">
      <div className="chips horizontal"><button className={'chip '+(!moment?'active':'')} onClick={()=>setMoment(null)}>Todos</button>{moments.map(m=><button key={m.id} className={'chip '+(moment===m.id?'active':'')} onClick={()=>setMoment(m.id)}>{m.name}</button>)}</div>
      <select className="search" value={person ?? ''} onChange={e=>setPerson(e.target.value?Number(e.target.value):null)}>
        <option value="">Todas as pessoas</option>{guests.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}
      </select>
    </div>
    {filtered.length ? <div className="album-grid">{filtered.map(p=><img key={p.id} className="photo" src={p.url} alt="Fotografia do casamento"/>)}</div> : <div className="empty"><Images size={34} strokeWidth={1.3}/><strong>Ainda não há fotos aqui</strong><span>Experimente outro filtro ou adicione uma fotografia.</span></div>}
  </Page>
}

function MyPhotos() {
  const guestId = loadGuest();
  const [, nav] = useLocation();
  const all = loadPhotos();
  const mine = all.filter(p=>p.uploaderGuestId===guestId);
  const removePhoto = (id:string) => {
    if (!window.confirm('Apagar esta fotografia?')) return;
    savePhotos(all.filter(p=>p.id!==id));
    location.reload();
  };

  return <Page title="Minhas fotos">
    <div className="my-summary">
      <div><strong>{mine.length}</strong><span>{mine.length===1?'foto enviada':'fotos enviadas'}</span></div>
      <button onClick={()=>nav('/adicionar')}><Camera size={17}/>Adicionar mais</button>
    </div>
    {mine.length ? <div className="my-grid">
      {mine.map(p=><article className="my-photo" key={p.id}>
        <img src={p.url} alt="Fotografia enviada por mim"/>
        <button onClick={()=>removePhoto(p.id)} aria-label="Apagar fotografia"><Trash2 size={17}/></button>
      </article>)}
    </div> : <div className="empty"><UserRound size={34} strokeWidth={1.3}/><strong>Ainda não enviou fotografias</strong><span>As suas fotos aparecerão aqui depois do envio.</span><Link href="/adicionar" className="empty-cta">Adicionar fotos</Link></div>}
  </Page>
}

function Admin() {
  const photos = loadPhotos();
  const byMoment = moments.map(m=>({name:m.name,count:photos.filter(p=>p.momentId===m.id).length}));
  return <Page title="Área dos noivos" showNav={false}>
    <div className="admin-card"><strong>{photos.length}</strong><div className="muted">fotografias carregadas</div></div>
    {byMoment.map(m=><div className="admin-card" key={m.name}><strong>{m.name}</strong><div className="muted">{m.count} fotografias</div></div>)}
    <button className="send danger" onClick={()=>{if(confirm('Apagar todas as fotografias de demonstração?')){savePhotos([]);location.reload()}}}><Trash2 size={16}/>Limpar dados de demonstração</button>
  </Page>
}

function NotFound() { return <Page title="Página não encontrada" showNav={false}><div className="empty"><HomeIcon size={34}/><strong>Esta página não existe</strong><Link href="/" className="empty-cta">Voltar ao início</Link></div></Page> }

export default function App() {
  return <Switch>
    <Route path="/" component={Home}/>
    <Route path="/identificar" component={Identify}/>
    <Route path="/adicionar" component={AddPhotos}/>
    <Route path="/album" component={Album}/>
    <Route path="/minhas-fotos" component={MyPhotos}/>
    <Route path="/admin" component={Admin}/>
    <Route component={NotFound}/>
  </Switch>;
}
