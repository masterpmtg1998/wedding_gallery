import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, CheckCircle2, FileText, ListChecks, MapPin, Music2, Palette, Plane, Plus, Scale, Search, Sparkles, UsersRound } from 'lucide-react';
import {
  assignGuestToTable, createManagedTable, createPlannerDecision, createPlannerDocument, createPlannerMeeting, createPlannerPayment,
  createPlannerScheduleItem, getManagedGuests, getManagedTables, getPlannerDecisions, getPlannerDocuments, getPlannerGuestStats,
  getPlannerMeetings, getPlannerPayments, getPlannerSchedule, getTableSuggestions, updateManagedGuest, updatePlannerDecision,
  updatePlannerDocument, updatePlannerMeeting, updatePlannerPayment, updatePlannerScheduleItem,
  type PlannerDecision, type PlannerDocument, type PlannerMeeting, type PlannerPayment, type PlannerScheduleItem
} from '../api';

type Mode='planning'|'guests'|'tables';
type Props={weddingId:string;mode:Mode};

const domainLabels:Record<PlannerScheduleItem['domain'],string>={
  cerimonia:'Cerimónia',musica:'Música',decoracao:'Decoração',logistica:'Logística',lua_de_mel:'Lua de mel',outro:'Outros'
};
const domains:PlannerScheduleItem['domain'][]=['cerimonia','musica','decoracao','logistica','lua_de_mel'];

export default function PlannerSuite({weddingId,mode}:Props){
  const [loading,setLoading]=useState(true);
  const [message,setMessage]=useState('');
  const [guests,setGuests]=useState<any[]>([]);
  const [tables,setTables]=useState<any[]>([]);
  const [stats,setStats]=useState<any>({total:0,accepted:0,declined:0,pending:0,maybe:0,seated:0,unseated:0});
  const [decisions,setDecisions]=useState<PlannerDecision[]>([]);
  const [meetings,setMeetings]=useState<PlannerMeeting[]>([]);
  const [payments,setPayments]=useState<PlannerPayment[]>([]);
  const [documents,setDocuments]=useState<PlannerDocument[]>([]);
  const [schedule,setSchedule]=useState<PlannerScheduleItem[]>([]);
  const [query,setQuery]=useState('');
  const [tableName,setTableName]=useState('');
  const [tableCapacity,setTableCapacity]=useState('10');
  const [selectedTable,setSelectedTable]=useState<number|null>(null);
  const [suggestions,setSuggestions]=useState<any[]>([]);
  const [newDecision,setNewDecision]=useState('');
  const [meetingTitle,setMeetingTitle]=useState('');
  const [meetingDate,setMeetingDate]=useState('');
  const [paymentTitle,setPaymentTitle]=useState('');
  const [paymentAmount,setPaymentAmount]=useState('');
  const [paymentDue,setPaymentDue]=useState('');
  const [documentTitle,setDocumentTitle]=useState('');
  const [domain,setDomain]=useState<PlannerScheduleItem['domain']>('cerimonia');
  const [domainTitle,setDomainTitle]=useState('');

  async function load(){
    setLoading(true);
    try{
      const [g,t,s,d,m,p,docs,sch]=await Promise.all([
        getManagedGuests(weddingId),getManagedTables(weddingId),getPlannerGuestStats(weddingId),getPlannerDecisions(weddingId),
        getPlannerMeetings(weddingId),getPlannerPayments(weddingId),getPlannerDocuments(weddingId),getPlannerSchedule(weddingId)
      ]);
      setGuests(g as any[]);setTables(t as any[]);setStats(s);setDecisions(d);setMeetings(m);setPayments(p);setDocuments(docs);setSchedule(sch);
    }catch(e:any){setMessage(e.message||'Não foi possível carregar o planeamento.')}
    finally{setLoading(false)}
  }
  useEffect(()=>{void load()},[weddingId]);

  const filteredGuests=useMemo(()=>guests.filter(g=>g.name.toLowerCase().includes(query.toLowerCase())||(g.group_name||'').toLowerCase().includes(query.toLowerCase())),[guests,query]);
  const byDomain=(d:PlannerScheduleItem['domain'])=>schedule.filter(x=>x.domain===d);
  const pendingPayments=payments.filter(p=>p.status==='pending');
  const openDecisions=decisions.filter(d=>d.status==='open');

  async function refreshGuests(){setGuests(await getManagedGuests(weddingId) as any[]);setStats(await getPlannerGuestStats(weddingId))}
  async function chooseTable(id:number){
    setSelectedTable(id);
    try{setSuggestions(await getTableSuggestions(id,10))}catch{setSuggestions([])}
  }

  if(loading)return <section className="portal-card">A preparar o wedding planner…</section>;

  if(mode==='guests')return <section className="portal-card">
    <div className="portal-section-title"><div><span>RSVP & convidados</span><h2>Lista de convidados</h2><p>Confirmações, contactos, restrições alimentares e estado de cada convite.</p></div><UsersRound size={24}/></div>
    <div className="planner-mini-stats">
      <div><span>Total</span><strong>{stats.total}</strong></div><div><span>Confirmados</span><strong>{stats.accepted}</strong></div>
      <div><span>Pendentes</span><strong>{stats.pending}</strong></div><div><span>Recusados</span><strong>{stats.declined}</strong></div>
    </div>
    <div className="planner-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Pesquisar convidado ou grupo"/></div>
    <div className="guest-admin-list">{filteredGuests.map(g=><div className="guest-admin-row" key={g.id}>
      <div className="guest-admin-main"><strong>{g.name}</strong><small>{g.group_name||g.entry_group||'Sem grupo'}</small></div>
      <select value={g.rsvp_status} onChange={async e=>{await updateManagedGuest(g.id,{rsvp_status:e.target.value,rsvp_at:e.target.value==='accepted'||e.target.value==='declined'?new Date().toISOString():null});await refreshGuests()}}>
        <option value="pending">Pendente</option><option value="accepted">Confirmado</option><option value="maybe">Talvez</option><option value="declined">Não vem</option>
      </select>
      <input placeholder="Alergias / alimentação" value={g.dietary_notes||''} onChange={e=>setGuests(v=>v.map(x=>x.id===g.id?{...x,dietary_notes:e.target.value}:x))} onBlur={e=>updateManagedGuest(g.id,{dietary_notes:e.target.value||null})}/>
    </div>)}</div>
    {message&&<p className="portal-message">{message}</p>}
  </section>;

  if(mode==='tables')return <div className="planner-grid-two">
    <section className="portal-card">
      <div className="portal-section-title"><div><span>Seating plan</span><h2>Mesas</h2><p>Cria mesas, controla lotação e atribui convidados.</p></div><MapPin size={24}/></div>
      <form className="planner-inline-form table-form" onSubmit={async e=>{e.preventDefault();if(!tableName.trim())return;await createManagedTable(weddingId,tableName,Number(tableCapacity)||10);setTableName('');setTables(await getManagedTables(weddingId) as any[])}}>
        <input className="search" placeholder="Nome da mesa" value={tableName} onChange={e=>setTableName(e.target.value)}/><input className="search" inputMode="numeric" value={tableCapacity} onChange={e=>setTableCapacity(e.target.value)}/><button className="primary"><Plus size={15}/> Mesa</button>
      </form>
      <div className="table-admin-grid">{tables.map(t=>{
        const members=guests.filter(g=>g.table_id===t.id&&g.rsvp_status!=='declined'); const full=members.length>=Number(t.capacity||10);
        return <button key={t.id} className={'table-admin-card '+(selectedTable===t.id?'active':'')} onClick={()=>chooseTable(t.id)}>
          <div><strong>{t.name}</strong><span>{members.length}/{t.capacity||10}</span></div><small>{full?'Lotação atingida':(Number(t.capacity||10)-members.length)+' lugares disponíveis'}</small>
        </button>
      })}</div>
    </section>
    <section className="portal-card">
      <div className="portal-section-title"><div><span>Atribuição</span><h2>{selectedTable?tables.find(t=>t.id===selectedTable)?.name:'Seleciona uma mesa'}</h2><p>{selectedTable?'Primeiro aparecem sugestões de compatibilidade.':'Escolhe uma mesa para começar.'}</p></div><Sparkles size={24}/></div>
      {selectedTable&&<>
        <div className="seat-section"><span>Já sentados</span>{guests.filter(g=>g.table_id===selectedTable).map(g=><div className="seat-person" key={g.id}><strong>{g.name}</strong><button onClick={async()=>{await assignGuestToTable(g.id,null);await refreshGuests();await chooseTable(selectedTable)}}>Retirar</button></div>)}</div>
        <div className="seat-section"><span>Sugestões</span>{suggestions.filter(s=>!guests.find(g=>g.id===Number(s.guest_id))?.table_id).slice(0,8).map((s:any)=><div className="seat-person suggestion" key={s.guest_id}><div><strong>{s.guest_name||guests.find(g=>g.id===Number(s.guest_id))?.name||'Convidado'}</strong><small>{s.reason||s.reasons||'Compatibilidade calculada'}</small></div><button onClick={async()=>{await assignGuestToTable(Number(s.guest_id),selectedTable);await refreshGuests();await chooseTable(selectedTable)}}>Adicionar</button></div>)}</div>
      </>}
    </section>
  </div>;

  return <div className="planner-suite">
    <section className="portal-card">
      <div className="portal-section-title"><div><span>Centro de decisões</span><h2>Planeamento detalhado</h2><p>Decisões, reuniões, pagamentos, documentos e todos os blocos do casamento.</p></div><Sparkles size={24}/></div>
      <div className="planner-mini-stats">
        <div><span>Decisões abertas</span><strong>{openDecisions.length}</strong></div><div><span>Reuniões</span><strong>{meetings.filter(m=>m.status==='scheduled').length}</strong></div>
        <div><span>Pagamentos</span><strong>{pendingPayments.length}</strong></div><div><span>Documentos</span><strong>{documents.length}</strong></div>
      </div>
    </section>

    <div className="planner-grid-two">
      <section className="portal-card compact-planner">
        <div className="portal-section-title"><div><span>Escolhas</span><h2>Decisões pendentes</h2></div><Scale size={22}/></div>
        <form className="planner-quick-add" onSubmit={async e=>{e.preventDefault();if(!newDecision.trim())return;await createPlannerDecision(weddingId,newDecision);setNewDecision('');setDecisions(await getPlannerDecisions(weddingId))}}><input className="search" value={newDecision} onChange={e=>setNewDecision(e.target.value)} placeholder="Ex. Escolher fotógrafo"/><button className="primary"><Plus size={14}/></button></form>
        <div className="mini-list">{decisions.map(d=><div className="mini-row" key={d.id}><div><strong>{d.title}</strong><small>{d.category}</small></div><button className={d.status==='decided'?'done':''} onClick={async()=>{await updatePlannerDecision(d.id,{status:d.status==='decided'?'open':'decided'});setDecisions(await getPlannerDecisions(weddingId))}}>{d.status==='decided'?<CheckCircle2/>:'Decidir'}</button></div>)}</div>
      </section>

      <section className="portal-card compact-planner">
        <div className="portal-section-title"><div><span>Agenda</span><h2>Reuniões</h2></div><CalendarClock size={22}/></div>
        <form className="planner-quick-add meeting" onSubmit={async e=>{e.preventDefault();if(!meetingTitle.trim()||!meetingDate)return;await createPlannerMeeting(weddingId,meetingTitle,new Date(meetingDate).toISOString());setMeetingTitle('');setMeetingDate('');setMeetings(await getPlannerMeetings(weddingId))}}><input className="search" value={meetingTitle} onChange={e=>setMeetingTitle(e.target.value)} placeholder="Reunião / visita"/><input className="search" type="datetime-local" value={meetingDate} onChange={e=>setMeetingDate(e.target.value)}/><button className="primary"><Plus size={14}/></button></form>
        <div className="mini-list">{meetings.map(m=><div className="mini-row" key={m.id}><div><strong>{m.title}</strong><small>{new Date(m.starts_at).toLocaleString('pt-PT',{dateStyle:'short',timeStyle:'short'})}</small></div><button onClick={async()=>{await updatePlannerMeeting(m.id,{status:m.status==='done'?'scheduled':'done'});setMeetings(await getPlannerMeetings(weddingId))}}>{m.status==='done'?<CheckCircle2/>:'Feito'}</button></div>)}</div>
      </section>

      <section className="portal-card compact-planner">
        <div className="portal-section-title"><div><span>Tesouraria</span><h2>Pagamentos futuros</h2></div><ListChecks size={22}/></div>
        <form className="planner-quick-add payment" onSubmit={async e=>{e.preventDefault();if(!paymentTitle.trim())return;await createPlannerPayment(weddingId,paymentTitle,Number(paymentAmount)||0,paymentDue||null);setPaymentTitle('');setPaymentAmount('');setPaymentDue('');setPayments(await getPlannerPayments(weddingId))}}><input className="search" value={paymentTitle} onChange={e=>setPaymentTitle(e.target.value)} placeholder="Sinal / tranche"/><input className="search" inputMode="decimal" value={paymentAmount} onChange={e=>setPaymentAmount(e.target.value)} placeholder="€"/><input className="search" type="date" value={paymentDue} onChange={e=>setPaymentDue(e.target.value)}/><button className="primary"><Plus size={14}/></button></form>
        <div className="mini-list">{payments.map(p=><div className="mini-row" key={p.id}><div><strong>{p.description} · {Number(p.amount).toLocaleString('pt-PT')} €</strong><small>{p.due_date?'Vence '+new Date(p.due_date+'T12:00:00').toLocaleDateString('pt-PT'):'Sem vencimento'}</small></div><button onClick={async()=>{await updatePlannerPayment(p.id,{status:p.status==='paid'?'pending':'paid',paid_at:p.status==='paid'?null:new Date().toISOString().slice(0,10)});setPayments(await getPlannerPayments(weddingId))}}>{p.status==='paid'?<CheckCircle2/>:'Pagar'}</button></div>)}</div>
      </section>

      <section className="portal-card compact-planner">
        <div className="portal-section-title"><div><span>Arquivo</span><h2>Contratos & documentos</h2></div><FileText size={22}/></div>
        <form className="planner-quick-add" onSubmit={async e=>{e.preventDefault();if(!documentTitle.trim())return;await createPlannerDocument(weddingId,documentTitle);setDocumentTitle('');setDocuments(await getPlannerDocuments(weddingId))}}><input className="search" value={documentTitle} onChange={e=>setDocumentTitle(e.target.value)} placeholder="Ex. Contrato do espaço"/><button className="primary"><Plus size={14}/></button></form>
        <div className="mini-list">{documents.map(d=><div className="mini-row" key={d.id}><div><strong>{d.title}</strong><small>{d.category}</small></div><button onClick={async()=>{await updatePlannerDocument(d.id,{signed:!d.signed});setDocuments(await getPlannerDocuments(weddingId))}}>{d.signed?<CheckCircle2/>:'Assinar'}</button></div>)}</div>
      </section>
    </div>

    <section className="portal-card">
      <div className="portal-section-title"><div><span>Wedding book</span><h2>Cerimónia, música, decoração, logística e lua de mel</h2><p>Cada área tem a sua própria lista operacional.</p></div></div>
      <form className="planner-domain-add" onSubmit={async e=>{e.preventDefault();if(!domainTitle.trim())return;await createPlannerScheduleItem(weddingId,domain,domainTitle);setDomainTitle('');setSchedule(await getPlannerSchedule(weddingId))}}>
        <select value={domain} onChange={e=>setDomain(e.target.value as any)}><option value="cerimonia">Cerimónia</option><option value="musica">Música</option><option value="decoracao">Decoração</option><option value="logistica">Logística</option><option value="lua_de_mel">Lua de mel</option></select>
        <input className="search" value={domainTitle} onChange={e=>setDomainTitle(e.target.value)} placeholder="Novo ponto a tratar"/><button className="primary"><Plus size={15}/> Adicionar</button>
      </form>
      <div className="domain-grid">{domains.map(d=><article className="domain-card" key={d}>
        <div className="domain-head">{d==='musica'?<Music2/>:d==='decoracao'?<Palette/>:d==='lua_de_mel'?<Plane/>:d==='logistica'?<MapPin/>:<ListChecks/>}<strong>{domainLabels[d]}</strong><span>{byDomain(d).length}</span></div>
        <div>{byDomain(d).map(i=><div className={'domain-row '+(i.status==='done'?'done':'')} key={i.id}><button onClick={async()=>{await updatePlannerScheduleItem(i.id,{status:i.status==='done'?'planned':'done'});setSchedule(await getPlannerSchedule(weddingId))}}>{i.status==='done'?<CheckCircle2/>:<span/>}</button><strong>{i.title}</strong></div>)}</div>
      </article>)}</div>
    </section>
  </div>;
}
