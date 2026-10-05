import { useEffect, useMemo, useState } from 'react';
import { Gift, Search, ShoppingBag, Sparkles, Store, ArrowRight } from 'lucide-react';
import { getMarketplaceCatalog, getMarketplaceCategories, type MarketplaceCategory, type MarketplaceProduct } from '../api';

const eur=(n:number)=>new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'}).format(n||0);

export default function Marketplace({publicView=false}:{publicView?:boolean}){
  const [categories,setCategories]=useState<MarketplaceCategory[]>([]);
  const [products,setProducts]=useState<MarketplaceProduct[]>([]);
  const [category,setCategory]=useState('all');
  const [query,setQuery]=useState('');
  const [loading,setLoading]=useState(true);

  useEffect(()=>{(async()=>{try{const [c,p]=await Promise.all([getMarketplaceCategories(),getMarketplaceCatalog()]);setCategories(c);setProducts(p)}finally{setLoading(false)}})()},[]);

  const topCategories=useMemo(()=>categories.filter(c=>!c.parent_id),[categories]);
  const filtered=useMemo(()=>products.filter(p=>(category==='all'||p.category_slug===category||p.parent_category_slug===category)&&(!query||[p.title,p.short_description,p.category_name,p.parent_category_name].some(v=>(v||'').toLowerCase().includes(query.toLowerCase())))),[products,category,query]);

  return <div className={'marketplace-shell '+(publicView?'public-view':'')}>
    <section className="portal-card marketplace-hero">
      {publicView&&<div className="marketplace-public-badge">Aberto ao público · sem conta</div>}
      <div><span className="planner-kicker"><ShoppingBag size={14}/> Marketplace do casamento</span><h2>Tudo para o grande dia, num só sítio.</h2><p>Brindes, decoração, charutos, acessórios, arranjos, personalizados e muito mais — de parceiros profissionais e pequenos criadores.</p>{publicView&&<p className="marketplace-public-copy">Qualquer pessoa pode explorar o catálogo. A conta só será necessária quando houver checkout, favoritos ou gestão de encomendas.</p>}</div>
      <div className="marketplace-hero-mark"><Gift/></div>
    </section>

    <section className="portal-card">
      <div className="marketplace-tools">
        <div className="planner-search"><Search size={16}/><input value={query} onChange={e=>{if(publicView)setQuery(e.target.value);else window.location.assign('/marketplace?q='+encodeURIComponent(e.target.value))}} onFocus={()=>{if(!publicView)window.location.assign('/marketplace')}} placeholder="Pesquisar produtos, ideias ou categorias"/></div>
        <div className="marketplace-categories">
          <button className={category==='all'?'active':''} onClick={()=>publicView?setCategory('all'):window.location.assign('/marketplace')}>Tudo</button>
          {topCategories.map(c=><button key={c.id} className={category===c.slug?'active':''} onClick={()=>publicView?setCategory(c.slug):window.location.assign('/marketplace?category='+encodeURIComponent(c.slug))}>{c.name}</button>)}
        </div>
      </div>

      {loading?<div className="planner-empty"><Sparkles/><strong>A preparar o marketplace…</strong></div>:filtered.length?(
        <div className="marketplace-grid">{filtered.map(p=><article className="marketplace-card" key={p.id}>
          <div className="marketplace-image-placeholder"><Store/></div>
          <div className="marketplace-card-body">
            <span>{p.category_name||'Wedding marketplace'}</span>
            <h3>{p.title}</h3>
            <p>{p.short_description||'Produto selecionado para o teu casamento.'}</p>
            <div className="marketplace-meta"><strong>{eur(Number(p.base_price))}</strong>{p.personalization_mode!=='none'&&<em>Personalizável</em>}</div>
            <button className="primary" onClick={()=>window.location.assign('/marketplace/produto/'+p.slug)}>Ver produto</button>
          </div>
        </article>)}</div>
      ):<div className="marketplace-empty">
        <ShoppingBag size={26}/>
        <strong>O marketplace está preparado.</strong>
        <span>Os primeiros produtos aparecem aqui assim que os fornecedores forem ativados. Para o casal será sempre uma única loja, independentemente de o fulfillment ser dropshipping ou feito por um pequeno negócio.</span>
      </div>}
    </section>

    <section className="portal-card marketplace-sell-cta">
      <div><span className="planner-kicker"><Store size={14}/> Para vendedores</span><h2>Fazes produtos para casamentos?</h2><p>Pequenos negócios, makers e parceiros de fulfillment podem vender no mesmo marketplace, mantendo a operação independente.</p></div>
      <a href={publicView?'/vender':'/marketplace'}>{publicView?'Quero vender':'Abrir marketplace'} <ArrowRight size={15}/></a>
    </section>
  </div>;
}
