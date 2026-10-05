import { useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, CircleDollarSign, Clock3, FileText, HeartHandshake, Save, Sparkles } from 'lucide-react';
import { upsertPlannerJourneyState, type PlannerBudgetItem, type PlannerJourneyState, type PlannerTask, type PlannerVendor } from '../api';

type Props={
  weddingId:string;
  stage:{slug:string;label:string;keys:string[]};
  tasks:PlannerTask[];
  vendors:PlannerVendor[];
  budget:PlannerBudgetItem[];
  state?:PlannerJourneyState;
  onState:(value:PlannerJourneyState)=>void;
  onGo:(section:'gestao'|'planeamento',sub:string)=>void;
  onToggleTask:(task:PlannerTask)=>Promise<void>;
};

const categoryMap:Record<string,string[]>={
  'quinta':['espaco','quinta','venue'],
  'fotografia':['fotografia','photo','video'],
  'catering':['catering','menu'],
  'musica':['musica','dj','banda'],
  'decoracao':['decoracao','flores'],
  'convites':['convites','papelaria'],
  'aliancas':['aliancas'],
  'cerimonia':['cerimonia'],
  'lua-de-mel':['lua_de_mel','viagem'],
  'rsvp':['convidados'],
  'seating':['mesas'],
  'pagamentos':['orcamento'],
  'fecho':['logistica']
};

const statusLabel:Record<PlannerJourneyState['status'],string>={
  not_started:'Por iniciar',active:'Em curso',waiting:'A aguardar',done:'Concluída',skipped:'Não aplicável'
};

export default function JourneyWorkspace({weddingId,stage,tasks,vendors,budget,state,onState,onGo,onToggleTask}:Props){
  const [editing,setEditing]=useState(false);
  const [saving,setSaving]=useState(false);
  const [status,setStatus]=useState<PlannerJourneyState['status']>(state?.status||'active');
  const [focus,setFocus]=useState(state?.current_focus||'');
  const [waiting,setWaiting]=useState(state?.waiting_for||'');
  const [notes,setNotes]=useState(state?.notes||'');

  const parents=useMemo(()=>tasks.filter(t=>!t.parent_id&&stage.keys.includes(t.template_key||'')),[tasks,stage]);
  const children=useMemo(()=>parents.flatMap(p=>tasks.filter(t=>t.parent_id===p.id)),[parents,tasks]);
  const actions=(children.length?children:parents).sort((a,b)=>(a.due_date||'9999').localeCompare(b.due_date||'9999'));
  const open=actions.filter(t=>t.status!=='done');
  const next=open[0]||null;
  const done=actions.filter(t=>t.status==='done').length;
  const progress=actions.length?Math.round(done/actions.length*100):0;

  const cats=categoryMap[stage.slug]||[];
  const relatedVendors=vendors.filter(v=>cats.some(c=>(v.category||'').toLowerCase().includes(c)));
  const relatedBudget=budget.filter(b=>cats.some(c=>(b.category||'').toLowerCase().includes(c)));
  const budgeted=relatedBudget.reduce((s,b)=>s+Number(b.budgeted||0),0);
  const contracted=relatedBudget.reduce((s,b)=>s+Number(b.contracted||0),0);
  const paid=relatedBudget.reduce((s,b)=>s+Number(b.paid||0),0);
  const eur=(n:number)=>new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n||0);

  async function save(){
    setSaving(true);
    try{
      const updated=await upsertPlannerJourneyState(weddingId,stage.slug,{status,current_focus:focus||null,waiting_for:waiting||null,notes:notes||null,structured_data:state?.structured_data||{}});
      onState(updated);setEditing(false);
    }finally{setSaving(false)}
  }

  return <div className="journey-workspace">
    <section className="portal-card journey-overview">
      <div className="journey-overview-top">
        <div><span className="planner-kicker"><Sparkles size={14}/> Journey</span><h2>{stage.label}</h2><p>Vê o estado real desta área e trabalha apenas no próximo passo relevante.</p></div>
        <div className={'journey-status-badge '+(state?.status||status)}>{statusLabel[state?.status||status]}</div>
      </div>

      <div className="journey-progress-big"><span style={{width:progress+'%'}}/></div>
      <div className="journey-overview-stats">
        <div><span>Progresso</span><strong>{progress}%</strong></div>
        <div><span>Por tratar</span><strong>{open.length}</strong></div>
        <div><span>Concluídas</span><strong>{done}</strong></div>
      </div>

      <div className="journey-focus-grid">
        <article className="journey-focus-card primary">
          <span>Agora</span>
          <strong>{state?.current_focus||next?.title||'Definir o próximo passo'}</strong>
          <small>{next?.due_date?'Até '+new Date(next.due_date+'T12:00:00').toLocaleDateString('pt-PT'):'Sem prazo definido'}</small>
        </article>
        <article className="journey-focus-card">
          <span>A aguardar</span>
          <strong>{state?.waiting_for||'Nada pendente de terceiros'}</strong>
          <small>Propostas, confirmações ou decisões externas.</small>
        </article>
      </div>

      <button className="journey-edit-state" onClick={()=>setEditing(v=>!v)}>{editing?'Fechar edição':'Atualizar estado'}</button>
      {editing&&<div className="journey-state-editor">
        <label>Estado<select value={status} onChange={e=>setStatus(e.target.value as PlannerJourneyState['status'])}><option value="not_started">Por iniciar</option><option value="active">Em curso</option><option value="waiting">A aguardar</option><option value="done">Concluída</option><option value="skipped">Não aplicável</option></select></label>
        <label>Foco atual<input className="search" value={focus} onChange={e=>setFocus(e.target.value)} placeholder="Ex. visitar as duas quintas finalistas"/></label>
        <label>A aguardar<input className="search" value={waiting} onChange={e=>setWaiting(e.target.value)} placeholder="Ex. proposta revista da Quinta X"/></label>
        <label>Notas<textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Contexto importante desta etapa"/></label>
        <button className="primary" onClick={save} disabled={saving}><Save size={15}/>{saving?'A guardar…':'Guardar estado'}</button>
      </div>}
    </section>

    <div className="journey-module-grid">
      <button className="portal-card journey-module" onClick={()=>onGo('gestao','fornecedores')}>
        <HeartHandshake/><div><span>Fornecedores</span><strong>{relatedVendors.length?relatedVendors.length+' associados':'Adicionar / comparar'}</strong><small>{relatedVendors.filter(v=>['booked','paid'].includes(v.status)).length} adjudicados</small></div>
      </button>
      <button className="portal-card journey-module" onClick={()=>onGo('gestao','orcamento')}>
        <CircleDollarSign/><div><span>Orçamento</span><strong>{relatedBudget.length?eur(contracted||budgeted):'Configurar rubricas'}</strong><small>{eur(paid)} pago</small></div>
      </button>
      <article className="portal-card journey-module">
        <CalendarDays/><div><span>Próximo marco</span><strong>{next?.due_date?new Date(next.due_date+'T12:00:00').toLocaleDateString('pt-PT'):'Sem data'}</strong><small>{next?.title||'Nenhuma ação pendente'}</small></div>
      </article>
      <article className="portal-card journey-module">
        <FileText/><div><span>Documentos</span><strong>Central desta etapa</strong><small>Contratos, propostas e comprovativos ficam associados à journey.</small></div>
      </article>
    </div>

    <section className="portal-card journey-next-block">
      <div className="portal-section-title"><div><span>Próximos passos</span><h2>Ações desta etapa</h2><p>A checklist deixa de ser o centro: serve apenas para executar o workflow.</p></div><Clock3 size={22}/></div>
      <div className="journey-action-stack">
        {open.slice(0,4).map((task,i)=><button key={task.id} className={i===0?'next':''} onClick={()=>onToggleTask(task)}>
          <span className="journey-action-index">{i===0?'Agora':i+1}</span>
          <div><strong>{task.title}</strong><small>{task.due_date?new Date(task.due_date+'T12:00:00').toLocaleDateString('pt-PT'):'Sem prazo'} · {task.priority==='urgent'?'Urgente':task.priority==='high'?'Alta prioridade':'Normal'}</small></div>
          <span className="journey-action-check"><CheckCircle2/></span>
        </button>)}
        {!open.length&&<div className="planner-empty"><CheckCircle2/><strong>Etapa concluída.</strong><span>Não existem ações pendentes nesta journey.</span></div>}
      </div>
      {actions.length>4&&<button className="journey-show-all" onClick={()=>onGo('planeamento','cronograma')}>Ver todas as ações no cronograma</button>}
    </section>
  </div>;
}
