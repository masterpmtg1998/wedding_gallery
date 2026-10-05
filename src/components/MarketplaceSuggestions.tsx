import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ShoppingBag, Store } from 'lucide-react';
import { getMarketplaceCatalog, type MarketplaceProduct } from '../api';

const config:Record<string,{title:string;query:string;terms:string[]}>={
  quinta:{title:'Espaços e serviços relacionados',query:'quinta casamento',terms:['quinta','espaço','venue','catering','menu']},
  fotografia:{title:'Fotografia & vídeo',query:'fotografia casamento',terms:['fotografia','foto','vídeo','video']},
  catering:{title:'Catering & mesa',query:'catering casamento',terms:['catering','menu','bolo','bar','mesa']},
  musica:{title:'Música & entretenimento',query:'música casamento',terms:['dj','música','musica','banda','som','photobooth']},
  decoracao:{title:'Decoração & flores',query:'decoração casamento',terms:['decoração','decoracao','flores','centros','iluminação','velas']},
  convites:{title:'Convites & papelaria',query:'convites casamento',terms:['convites','save the date','papelaria','sinalética','sinaletica','personalizado']},
  aliancas:{title:'Alianças & personalizados',query:'alianças casamento',terms:['alianças','aliancas','joalharia','personalizado']},
  cerimonia:{title:'Cerimónia',query:'cerimónia casamento',terms:['cerimónia','cerimonia','celebrante','flores','decoração']},
  'lua-de-mel':{title:'Lua de mel',query:'lua de mel',terms:['lua de mel','viagem','hotel','transfer']},
  seating:{title:'Mesa & experiência',query:'mesa casamento',terms:['mesa','menus','place cards','números de mesa','numeros de mesa','centros']},
  fecho:{title:'Últimos detalhes',query:'kits casamento',terms:['kits','emergência','emergencia','chinelos','leques','sparkler','brindes','lembranças']}
};

const norm=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const eur=(n:number)=>new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR'}).format(n||0);

export default function MarketplaceSuggestions({stage}:{stage:string}){
  const cfg=config[stage];
  const [products,setProducts]=useState<MarketplaceProduct[]>([]);
  useEffect(()=>{if(cfg)getMarketplaceCatalog().then(setProducts).catch(()=>{})},[stage]);

  const matches=useMemo(()=>{
    if(!cfg)return[];
    return products.filter(p=>{
      const hay=norm([p.title,p.short_description,p.category_name,p.parent_category_name].filter(Boolean).join(' '));
      return cfg.terms.some(t=>hay.includes(norm(t)));
    }).slice(0,3);
  },[products,stage]);

  if(!cfg)return null;
  const url='/marketplace?q='+encodeURIComponent(cfg.query);

  return <section className="portal-card marketplace-context">
    <div className="marketplace-context-head">
      <div><span className="planner-kicker"><ShoppingBag size={14}/> Marketplace</span><h2>{cfg.title}</h2><p>Opções do marketplace relacionadas com esta etapa, sem sair do contexto do planeamento.</p></div>
      <a href={url}>Ver tudo <ArrowRight size={14}/></a>
    </div>
    {matches.length>0?<div className="marketplace-context-grid">{matches.map(p=><a key={p.id} href={'/marketplace?product='+encodeURIComponent(p.slug)} className="marketplace-context-card">
      <div className="marketplace-context-icon"><Store/></div>
      <div><span>{p.category_name||'Marketplace'}</span><strong>{p.title}</strong><small>{p.seller_name}</small></div>
      <em>{eur(Number(p.base_price))}</em>
    </a>)}</div>:<a className="marketplace-context-empty" href={url}><Store/><div><strong>Explorar opções no Marketplace</strong><span>Quando existirem produtos ou serviços ativos desta categoria, aparecem aqui automaticamente.</span></div><ArrowRight/></a>}
  </section>;
}
