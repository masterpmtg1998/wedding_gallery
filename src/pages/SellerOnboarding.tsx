import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, LogIn, Store, UserPlus } from 'lucide-react';
import { createSellerApplication, getMarketplaceCategories, getMySellerApplications, type MarketplaceCategory } from '../api';
import { supabase } from '../supabase';

export default function SellerOnboarding(){
  const [user,setUser]=useState<any>(null);
  const [mode,setMode]=useState<'login'|'signup'>('login');
  const [email,setEmail]=useState(''); const [password,setPassword]=useState('');
  const [categories,setCategories]=useState<MarketplaceCategory[]>([]);
  const [apps,setApps]=useState<any[]>([]);
  const [sellerType,setSellerType]=useState<'maker'|'dropship'>('maker');
  const [displayName,setDisplayName]=useState(''); const [contactName,setContactName]=useState('');
  const [phone,setPhone]=useState(''); const [countryCode,setCountryCode]=useState('PT'); const [city,setCity]=useState('');
  const [website,setWebsite]=useState(''); const [instagram,setInstagram]=useState(''); const [selected,setSelected]=useState<string[]>([]);
  const [leadTime,setLeadTime]=useState(''); const [personalization,setPersonalization]=useState(''); const [fulfillment,setFulfillment]=useState('');
  const [message,setMessage]=useState(''); const [saving,setSaving]=useState(false);

  async function load(){
    const {data:{user}}=await supabase.auth.getUser(); setUser(user);
    const cats=await getMarketplaceCategories(); setCategories(cats.filter(c=>!c.parent_id));
    if(user){setEmail(user.email||'');setApps(await getMySellerApplications())}
  }
  useEffect(()=>{load();const {data}=supabase.auth.onAuthStateChange(()=>setTimeout(load,0));return()=>data.subscription.unsubscribe()},[]);

  async function auth(e:React.FormEvent){
    e.preventDefault();setMessage('');
    const res=mode==='login'?await supabase.auth.signInWithPassword({email,password}):await supabase.auth.signUp({email,password});
    if(res.error)setMessage(res.error.message);else setMessage(mode==='signup'?'Conta criada. Já podes preencher a candidatura.':'Sessão iniciada.');
  }

  async function submit(e:React.FormEvent){
    e.preventDefault();if(!user)return;setSaving(true);setMessage('');
    try{
      await createSellerApplication({
        seller_type:sellerType,display_name:displayName,contact_name:contactName,email,phone,country_code:countryCode,city,
        website,instagram,categories:selected,average_lead_time_days:leadTime?Number(leadTime):null,
        personalization_capabilities:personalization,fulfillment_notes:fulfillment,ships_to:['PT']
      });
      setMessage('Candidatura enviada.');setApps(await getMySellerApplications());
    }catch(e:any){setMessage(e.message||'Não foi possível enviar a candidatura.')}finally{setSaving(false)}
  }

  if(!user)return <main className="seller-page"><div className="seller-wrap">
    <a href="/" className="seller-back"><ArrowLeft size={15}/> Voltar</a>
    <section className="seller-auth-card">
      <div className="seller-mark"><Store/></div><span>Marketplace</span><h1>Vender no marketplace</h1>
      <p>Para pequenos negócios, makers e parceiros de fulfillment. Os noivos veem uma única loja; nós tratamos a origem do produto por trás.</p>
      <form onSubmit={auth}><input className="search" type="email" required placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/><input className="search" type="password" minLength={8} required placeholder="Palavra-passe" value={password} onChange={e=>setPassword(e.target.value)}/><button className="primary">{mode==='login'?<><LogIn size={15}/> Entrar</>:<><UserPlus size={15}/> Criar conta</>}</button></form>
      <button className="seller-switch" onClick={()=>setMode(mode==='login'?'signup':'login')}>{mode==='login'?'Ainda não tens conta? Criar conta':'Já tens conta? Entrar'}</button>
      {message&&<p className="portal-message">{message}</p>}
    </section>
  </div></main>;

  return <main className="seller-page"><div className="seller-wrap">
    <div className="seller-top"><a href="/" className="seller-back"><ArrowLeft size={15}/> Marketplace</a><button onClick={()=>supabase.auth.signOut()}>Sair</button></div>
    <section className="seller-hero"><span>Vender connosco</span><h1>Leva os teus produtos a casais que já estão a planear o casamento.</h1><p>Artesanato, brindes, arranjos, produtos personalizados ou catálogo com fulfillment externo.</p></section>

    {apps.length>0&&<section className="seller-status-card"><CheckCircle2/><div><strong>Candidatura recebida</strong><span>Estado: {apps[0].status}</span></div></section>}

    <form className="seller-form" onSubmit={submit}>
      <section className="portal-card">
        <div className="portal-section-title"><div><span>Tipo de parceiro</span><h2>Como trabalhas?</h2></div></div>
        <div className="seller-type-grid">
          <button type="button" className={sellerType==='maker'?'active':''} onClick={()=>setSellerType('maker')}><strong>Pequeno negócio / maker</strong><span>Produzes ou preparas os teus próprios artigos.</span></button>
          <button type="button" className={sellerType==='dropship'?'active':''} onClick={()=>setSellerType('dropship')}><strong>Dropshipping / fulfillment</strong><span>Operas catálogo, stock ou produção e envio em escala.</span></button>
        </div>
      </section>

      <section className="portal-card seller-fields">
        <div className="portal-section-title"><div><span>Negócio</span><h2>Dados principais</h2></div></div>
        <div className="seller-field-grid">
          <label>Nome da marca<input className="search" required value={displayName} onChange={e=>setDisplayName(e.target.value)}/></label>
          <label>Nome de contacto<input className="search" required value={contactName} onChange={e=>setContactName(e.target.value)}/></label>
          <label>Email<input className="search" type="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
          <label>Telefone<input className="search" value={phone} onChange={e=>setPhone(e.target.value)}/></label>
          <label>País<input className="search" value={countryCode} onChange={e=>setCountryCode(e.target.value.toUpperCase())}/></label>
          <label>Cidade<input className="search" value={city} onChange={e=>setCity(e.target.value)}/></label>
          <label>Website<input className="search" value={website} onChange={e=>setWebsite(e.target.value)}/></label>
          <label>Instagram<input className="search" value={instagram} onChange={e=>setInstagram(e.target.value)}/></label>
        </div>
      </section>

      <section className="portal-card">
        <div className="portal-section-title"><div><span>Catálogo</span><h2>O que vendes?</h2><p>Escolhe as áreas principais. Depois o catálogo terá subcategorias próprias.</p></div></div>
        <div className="seller-category-grid">{categories.map(c=><button type="button" key={c.id} className={selected.includes(c.slug)?'active':''} onClick={()=>setSelected(v=>v.includes(c.slug)?v.filter(x=>x!==c.slug):[...v,c.slug])}><strong>{c.name}</strong><span>{c.description}</span></button>)}</div>
      </section>

      <section className="portal-card seller-fields">
        <div className="portal-section-title"><div><span>Operação</span><h2>Produção & fulfillment</h2></div></div>
        <div className="seller-field-grid single">
          <label>Lead time médio (dias)<input className="search" inputMode="numeric" value={leadTime} onChange={e=>setLeadTime(e.target.value)}/></label>
          <label>Personalização<textarea value={personalization} onChange={e=>setPersonalization(e.target.value)} placeholder="Ex. nomes, data, monograma, cores, fotografia..."/></label>
          <label>Como preparas e envias as encomendas?<textarea value={fulfillment} onChange={e=>setFulfillment(e.target.value)} placeholder="Produção, embalagem, transportadora, limites geográficos..."/></label>
        </div>
      </section>
      <button className="primary seller-submit" disabled={saving}>{saving?'A enviar…':'Enviar candidatura'}</button>
      {message&&<p className="portal-message">{message}</p>}
    </form>
  </div></main>;
}
