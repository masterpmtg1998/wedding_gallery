import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, ChevronRight, MapPin, Plus, Scale, Sparkles, UsersRound } from 'lucide-react';
import { createVenueOption, createVenueVisit, getVenueWorkspace, saveVenueRequirements, updateVenueOption, upsertVenuePricing, type VenueOption } from '../api';

const eur=(n:number)=>new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n||0);

export default function VenueJourney({weddingId}:{weddingId:string}){
  const [data,setData]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [step,setStep]=useState<'overview'|'criteria'|'options'|'compare'|'visit'>('overview');
  const [name,setName]=useState(''); const [location,setLocation]=useState('');
  const [saving,setSaving]=useState(false);

  async function load(){setLoading(true);try{setData(await getVenueWorkspace(weddingId))}finally{setLoading(false)}}
  useEffect(()=>{load()},[weddingId]);

  const pax=useMemo(()=>{
    const out:any={adult:0,child:0,baby:0,staff:0,unclassified:0};
    for(const x of data?.pax||[])out[x.pax_type]=Number(x.qty||0);
    return out;
  },[data]);

  const options:VenueOption[]=data?.options||[];
  const chosen=options.find(o=>o.status==='chosen');
  const finalists=options.filter(o=>o.status==='finalist');
  const nextVisit=(data?.visits||[]).filter((v:any)=>v.scheduled_at&&!v.completed_at).sort((a:any,b:any)=>a.scheduled_at.localeCompare(b.scheduled_at))[0];
  const req=data?.requirements;

  function optionTotal(optionId:string){
    const prices=(data?.pricing||[]).filter((p:any)=>p.option_id===optionId);
    return prices.reduce((sum:number,p:any)=>sum+(Number(p.unit_price)||0)*(pax[p.pax_type]||0),0);
  }

  const naturalStatus=chosen?'Quinta escolhida':nextVisit?'Visita agendada':finalists.length>=2?'A comparar finalistas':options.length?'A explorar opções':'A começar';
  const nextAction=chosen?'Formalizar reserva':nextVisit?'Preparar próxima visita':finalists.length>=2?'Comparar finalistas':options.length?'Completar informação das opções':'Definir critérios da quinta';

  if(loading)return <section className="portal-card"><div className="planner-empty"><Sparkles/><strong>A preparar a etapa da quinta…</strong></div></section>;

  return <div className="venue-journey">
    <section className="portal-card venue-hero">
      <div>
        <span className="planner-kicker"><MapPin size={14}/> Espaço / Quinta</span>
        <h2>{naturalStatus}</h2>
        <p>A app acompanha esta decisão desde os critérios iniciais até ao contrato e preparação final.</p>
      </div>
      <div className="venue-next-card">
        <span>Próximo passo</span>
        <strong>{nextAction}</strong>
        <button onClick={()=>setStep(chosen?'overview':nextVisit?'visit':finalists.length>=2?'compare':options.length?'options':'criteria')}>Continuar <ChevronRight size={14}/></button>
      </div>
    </section>

    <div className="venue-summary-grid">
      <article className="portal-card"><UsersRound/><span>Convidados</span><strong>{pax.adult+pax.child+pax.baby+pax.staff+pax.unclassified}</strong><small>{pax.unclassified?pax.unclassified+' por classificar':pax.adult+' adultos · '+pax.child+' crianças'}</small></article>
      <article className="portal-card"><MapPin/><span>Opções</span><strong>{options.filter(o=>o.status!=='rejected').length}</strong><small>{finalists.length} finalistas</small></article>
      <article className="portal-card"><CalendarDays/><span>Próxima visita</span><strong>{nextVisit?new Date(nextVisit.scheduled_at).toLocaleDateString('pt-PT'):'—'}</strong><small>{nextVisit?options.find(o=>o.id===nextVisit.option_id)?.name||'Visita':'Nada agendado'}</small></article>
      <article className="portal-card"><Scale/><span>Estimativa</span><strong>{chosen?eur(optionTotal(chosen.id)):finalists.length?eur(Math.min(...finalists.map(o=>optionTotal(o.id)).filter((n:number)=>n>0))):'—'}</strong><small>{chosen?'opção escolhida':'com base no PAX atual'}</small></article>
    </div>

    <section className="venue-stage-nav portal-card">
      <button className={step==='criteria'?'active':''} onClick={()=>setStep('criteria')}><span>1</span><div><strong>Critérios</strong><small>O que procuram</small></div></button>
      <button className={step==='options'?'active':''} onClick={()=>setStep('options')}><span>2</span><div><strong>Opções</strong><small>Quintas em análise</small></div></button>
      <button className={step==='visit'?'active':''} onClick={()=>setStep('visit')}><span>3</span><div><strong>Visitas</strong><small>Preparar e avaliar</small></div></button>
      <button className={step==='compare'?'active':''} onClick={()=>setStep('compare')}><span>4</span><div><strong>Comparar</strong><small>Decidir com dados</small></div></button>
      <button className={chosen?'done':''} onClick={()=>setStep('overview')}><span>{chosen?<CheckCircle2 size={15}/>:5}</span><div><strong>Escolher</strong><small>Reserva e contrato</small></div></button>
    </section>

    {step==='overview'&&<section className="portal-card venue-overview">
      <div className="portal-section-title"><div><span>Situação atual</span><h2>{chosen?chosen.name:'Quinta ainda por escolher'}</h2><p>{chosen?'A decisão está feita. O próximo objetivo é formalizar e preparar o evento.':'Continua a avançar pelas etapas sem precisares de gerir estados manualmente.'}</p></div></div>
      {chosen&&<div className="venue-chosen">
        <div><span>Escolhida</span><strong>{chosen.name}</strong><small>{chosen.location||'Localização por definir'}</small></div>
        <div><span>Estimativa atual</span><strong>{eur(optionTotal(chosen.id))}</strong><small>com base nos convidados classificados</small></div>
        <div><span>Sinal</span><strong>{chosen.deposit_amount?eur(Number(chosen.deposit_amount)):'Por definir'}</strong><small>valor da reserva</small></div>
      </div>}
      {!chosen&&<div className="venue-empty-guidance"><Sparkles/><strong>Não precisas de preencher tudo de uma vez.</strong><span>Começa pelos critérios básicos e adiciona quintas à medida que fores pesquisando.</span><button className="primary" onClick={()=>setStep('criteria')}>Começar pela quinta</button></div>}
    </section>}

    {step==='criteria'&&<Criteria req={req} pax={pax} onSave={async(v:any)=>{await saveVenueRequirements(weddingId,v);await load();setStep('options')}}/>}

    {step==='options'&&<section className="portal-card">
      <div className="portal-section-title"><div><span>Opções</span><h2>Quintas em análise</h2><p>Adiciona só o essencial. Preços, visitas e detalhes podem ser completados depois.</p></div></div>
      <form className="venue-add-option" onSubmit={async e=>{e.preventDefault();if(!name.trim())return;setSaving(true);try{await createVenueOption(weddingId,{name,location});setName('');setLocation('');await load()}finally{setSaving(false)}}>
        <input className="search" required placeholder="Nome da quinta" value={name} onChange={e=>setName(e.target.value)}/>
        <input className="search" placeholder="Localização" value={location} onChange={e=>setLocation(e.target.value)}/>
        <button className="primary" disabled={saving}><Plus size={15}/>Adicionar</button>
      </form>
      <div className="venue-option-list">{options.map(o=><VenueOptionCard key={o.id} option={o} prices={(data.pricing||[]).filter((p:any)=>p.option_id===o.id)} pax={pax} onChanged={load}/>)}</div>
      {!options.length&&<div className="planner-empty"><MapPin/><strong>Ainda não há quintas.</strong><span>Adiciona a primeira opção para começar a comparar.</span></div>}
    </section>}

    {step==='visit'&&<section className="portal-card">
      <div className="portal-section-title"><div><span>Visitas</span><h2>Preparar visitas</h2><p>A visita deve ajudar a decidir, não criar mais notas soltas.</p></div></div>
      <div className="venue-option-list">{options.filter(o=>o.status!=='rejected').map(o=>{
        const visits=(data.visits||[]).filter((v:any)=>v.option_id===o.id);
        return <article className="venue-visit-card" key={o.id}><div><strong>{o.name}</strong><small>{o.location||'Localização por definir'}</small></div>
          {visits.map((v:any)=><div className="venue-visit-row" key={v.id}><span>{v.scheduled_at?new Date(v.scheduled_at).toLocaleString('pt-PT',{dateStyle:'medium',timeStyle:'short'}):'Sem data'}</span><em>{v.completed_at?'Realizada':'Agendada'}</em></div>)}
          <button onClick={async()=>{const raw=prompt('Data e hora (AAAA-MM-DDTHH:MM)');if(raw){await createVenueVisit(o.id,new Date(raw).toISOString());await updateVenueOption(o.id,{status:'visit_scheduled'});await load()}}}>+ Marcar visita</button>
        </article>
      })}</div>
    </section>}

    {step==='compare'&&<section className="portal-card">
      <div className="portal-section-title"><div><span>Comparação</span><h2>Decidir lado a lado</h2><p>O objetivo é reduzir a decisão ao que realmente importa.</p></div></div>
      <div className="venue-compare-grid">{options.filter(o=>o.status!=='rejected').map(o=><article key={o.id} className={o.status==='finalist'?'finalist':''}>
        <div className="venue-compare-head"><strong>{o.name}</strong><small>{o.location||'—'}</small></div>
        <dl>
          <div><dt>Estimativa</dt><dd>{optionTotal(o.id)?eur(optionTotal(o.id)):'Por preencher'}</dd></div>
          <div><dt>Sinal</dt><dd>{o.deposit_amount?eur(Number(o.deposit_amount)):'—'}</dd></div>
          <div><dt>PAX mín.</dt><dd>{o.min_pax??'—'}</dd></div>
          <div><dt>Exterior</dt><dd>{o.outdoor_space==null?'—':o.outdoor_space?'Sim':'Não'}</dd></div>
          <div><dt>Plano chuva</dt><dd>{o.rain_plan==null?'—':o.rain_plan?'Sim':'Não'}</dd></div>
          <div><dt>Alojamento</dt><dd>{o.accommodation==null?'—':o.accommodation?'Sim':'Não'}</dd></div>
          <div><dt>Exclusividade</dt><dd>{o.exclusivity==null?'—':o.exclusivity?'Sim':'Não'}</dd></div>
        </dl>
        <div className="venue-compare-actions">
          <button onClick={async()=>{await updateVenueOption(o.id,{status:o.status==='finalist'?'visited':'finalist'});await load()}}>{o.status==='finalist'?'Retirar finalista':'Finalista'}</button>
          <button className="primary" onClick={async()=>{for(const other of options){if(other.id!==o.id&&other.status==='chosen')await updateVenueOption(other.id,{status:'finalist'})}await updateVenueOption(o.id,{status:'chosen'});await saveVenueRequirements(weddingId,{selected_option_id:o.id});await load();setStep('overview')}}>Escolher</button>
        </div>
      </article>)}</div>
    </section>}
  </div>;
}

function Criteria({req,pax,onSave}:{req:any;pax:any;onSave:(v:any)=>Promise<void>}){
  const [area,setArea]=useState(req?.preferred_area||'');
  const [budget,setBudget]=useState(req?.budget_target?String(req.budget_target):'');
  const [guests,setGuests]=useState(req?.estimated_guests?String(req.estimated_guests):String(pax.adult+pax.child+pax.baby+pax.staff+pax.unclassified||''));
  const [ceremony,setCeremony]=useState(req?.ceremony_on_site??null);
  const [outdoor,setOutdoor]=useState(req?.outdoor_preferred??null);
  const [accommodation,setAccommodation]=useState(req?.accommodation_needed??null);
  const [saving,setSaving]=useState(false);
  return <section className="portal-card venue-criteria">
    <div className="portal-section-title"><div><span>Critérios</span><h2>O que procuram numa quinta?</h2><p>Só o suficiente para filtrar opções. Tudo pode ser alterado mais tarde.</p></div></div>
    <div className="venue-criteria-grid">
      <label>Zona preferida<input className="search" value={area} onChange={e=>setArea(e.target.value)} placeholder="Ex. Viana do Castelo"/></label>
      <label>Orçamento alvo<input className="search" inputMode="decimal" value={budget} onChange={e=>setBudget(e.target.value)} placeholder="€"/></label>
      <label>Nº estimado de convidados<input className="search" inputMode="numeric" value={guests} onChange={e=>setGuests(e.target.value)}/></label>
    </div>
    <div className="venue-choice-grid">
      <Choice title="Cerimónia no local?" value={ceremony} onChange={setCeremony}/>
      <Choice title="Espaço exterior?" value={outdoor} onChange={setOutdoor}/>
      <Choice title="Alojamento necessário?" value={accommodation} onChange={setAccommodation}/>
    </div>
    <button className="primary" disabled={saving} onClick={async()=>{setSaving(true);try{await onSave({preferred_area:area||null,budget_target:budget?Number(budget):null,estimated_guests:guests?Number(guests):null,ceremony_on_site:ceremony,outdoor_preferred:outdoor,accommodation_needed:accommodation})}finally{setSaving(false)}}}>{saving?'A guardar…':'Continuar para as opções'}</button>
  </section>
}
function Choice({title,value,onChange}:{title:string;value:boolean|null;onChange:(v:boolean|null)=>void}){
  return <div className="venue-choice"><strong>{title}</strong><div><button className={value===true?'active':''} onClick={()=>onChange(true)}>Sim</button><button className={value===false?'active':''} onClick={()=>onChange(false)}>Não</button><button className={value===null?'active':''} onClick={()=>onChange(null)}>Indiferente</button></div></div>
}
function VenueOptionCard({option,prices,pax,onChanged}:{option:VenueOption;prices:any[];pax:any;onChanged:()=>Promise<void>}){
  const [editing,setEditing]=useState(false);
  const [adult,setAdult]=useState(String(prices.find(p=>p.pax_type==='adult')?.unit_price||''));
  const [child,setChild]=useState(String(prices.find(p=>p.pax_type==='child')?.unit_price||''));
  const [baby,setBaby]=useState(String(prices.find(p=>p.pax_type==='baby')?.unit_price||'0'));
  const [staff,setStaff]=useState(String(prices.find(p=>p.pax_type==='staff')?.unit_price||''));
  const total=(Number(adult)||0)*pax.adult+(Number(child)||0)*pax.child+(Number(baby)||0)*pax.baby+(Number(staff)||0)*pax.staff;
  return <article className="venue-option-card">
    <div className="venue-option-head"><div><span>{option.status==='finalist'?'Finalista':option.status==='chosen'?'Escolhida':'Em análise'}</span><strong>{option.name}</strong><small>{option.location||'Localização por definir'}</small></div><div><strong>{total?eur(total):'—'}</strong><small>estimativa PAX</small></div></div>
    <div className="venue-price-strip"><span>Adulto <strong>{adult?eur(Number(adult)):'—'}</strong></span><span>Criança <strong>{child?eur(Number(child)):'—'}</strong></span><span>Bebé <strong>{baby?eur(Number(baby)):'—'}</strong></span></div>
    <button onClick={()=>setEditing(v=>!v)}>{editing?'Fechar':'Completar preços'}</button>
    {editing&&<div className="venue-price-editor">
      <label>Adulto<input className="search" inputMode="decimal" value={adult} onChange={e=>setAdult(e.target.value)}/></label>
      <label>Criança<input className="search" inputMode="decimal" value={child} onChange={e=>setChild(e.target.value)}/></label>
      <label>Bebé<input className="search" inputMode="decimal" value={baby} onChange={e=>setBaby(e.target.value)}/></label>
      <label>Staff<input className="search" inputMode="decimal" value={staff} onChange={e=>setStaff(e.target.value)}/></label>
      <button className="primary" onClick={async()=>{await Promise.all([
        upsertVenuePricing(option.id,'adult',Number(adult)||0,'Adultos'),
        upsertVenuePricing(option.id,'child',Number(child)||0,'Crianças'),
        upsertVenuePricing(option.id,'baby',Number(baby)||0,'Bebés'),
        upsertVenuePricing(option.id,'staff',Number(staff)||0,'Staff / fornecedores')
      ]);setEditing(false);await onChanged()}}>Guardar preços</button>
    </div>}
  </article>
}
