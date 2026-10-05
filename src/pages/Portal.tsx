import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { CalendarDays, CheckCircle2, CircleDollarSign, ClipboardList, HeartHandshake, ImagePlus, LogOut, Save, Sparkles, Upload, UsersRound, Menu, X, Home, CalendarRange, Store, ExternalLink, MapPin, Camera, UtensilsCrossed, Music2, Palette, Mail, Gem, Plane, Church, CreditCard } from 'lucide-react';
import {
  cancelWeddingInvitation, createPlannerBudgetItem, createPlannerTask, createPlannerVendor, createWeddingWorkspace,
  getManagedLandingMedia, getMyWeddings, getPlannerBudget, getPlannerTasks, getPlannerVendors, getWeddingTeam,
  inviteWeddingMember, updateLandingFocal, updatePlannerBudgetItem, updatePlannerTask, updatePlannerVendor,
  uploadLandingMedia, seedPlannerDefaults, setPlannerTaskTreeStatus, getPlannerJourneyStates, type PlannerJourneyState, type PlannerBudgetItem, type PlannerTask, type PlannerVendor
} from '../api';
import { supabase } from '../supabase';
import PlannerSuite from '../components/PlannerSuite';
import GuestExperiencePanel from '../components/GuestExperiencePanel';
import JourneyWorkspace from '../components/JourneyWorkspace';

type Item={id:string;slot:number;url:string;focal_x:number;focal_y:number;original_name:string|null};
type AuthMode='login'|'signup'|'forgot';
type Section='dashboard'|'planeamento'|'convidados'|'gestao'|'equipa'|'specialday';

const eur=(n:number)=>new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n||0);
const dayDiff=(iso:string)=>Math.ceil((new Date(iso+'T12:00:00').getTime()-Date.now())/86400000);


const planningStages:{slug:string;label:string;keys:string[];icon:any}[]=[
  {slug:'quinta',label:'Espaço / Quinta',keys:['venue'],icon:MapPin},
  {slug:'fotografia',label:'Fotografia & vídeo',keys:['photo'],icon:Camera},
  {slug:'catering',label:'Catering & menu',keys:['catering'],icon:UtensilsCrossed},
  {slug:'musica',label:'Música',keys:['music','music_final'],icon:Music2},
  {slug:'decoracao',label:'Decoração',keys:['decor','decor_final'],icon:Palette},
  {slug:'convites',label:'Convites',keys:['save_date','invites'],icon:Mail},
  {slug:'aliancas',label:'Alianças',keys:['rings'],icon:Gem},
  {slug:'cerimonia',label:'Cerimónia',keys:['ceremony'],icon:Church},
  {slug:'lua-de-mel',label:'Lua de mel',keys:['honeymoon'],icon:Plane},
  {slug:'rsvp',label:'Fechar RSVP',keys:['rsvp'],icon:UsersRound},
  {slug:'seating',label:'Seating plan',keys:['seating'],icon:UsersRound},
  {slug:'pagamentos',label:'Pagamentos finais',keys:['payments_final'],icon:CreditCard},
  {slug:'fecho',label:'Fecho do casamento',keys:['supplier_final','day_timeline','final_docs'],icon:Sparkles},
];

export default function Portal(){
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [mode,setMode]=useState<AuthMode>('login');
  const [loading,setLoading]=useState(true); const [wedding,setWedding]=useState<any>(null); const [signedIn,setSignedIn]=useState(false);
  const [items,setItems]=useState<Item[]>([]); const [coupleNames,setCoupleNames]=useState(''); const [weddingDate,setWeddingDate]=useState('');
  const [inviteEmail,setInviteEmail]=useState(''); const [message,setMessage]=useState(''); const [inviting,setInviting]=useState(false);
  const [resending,setResending]=useState(''); const [team,setTeam]=useState<any[]>([]);
  const [location,navigate]=useLocation();
  const [drawerOpen,setDrawerOpen]=useState(false);
  const parts=location.split('/').filter(Boolean);
  const pathSection=parts[1]||'assistente';
  const pathSub=parts[2]||'';
  const legacy:Record<string,{section:Section;sub?:string}>={
    tarefas:{section:'planeamento',sub:'cronograma'},
    mesas:{section:'convidados',sub:'mesas'},
    fornecedores:{section:'gestao',sub:'fornecedores'},
    orcamento:{section:'gestao',sub:'orcamento'},
    loja:{section:'dashboard'}
  };
  const sectionMap:Record<string,Section>={assistente:'dashboard',planeamento:'planeamento',convidados:'convidados',gestao:'gestao',equipa:'equipa',specialday:'specialday'};
  const legacyTarget=legacy[pathSection];
  const section:Section=legacyTarget?.section||sectionMap[pathSection]||'dashboard';
  const sub=legacyTarget?.sub||pathSub||(
    section==='planeamento'?'agora':
    section==='convidados'?'lista':
    section==='gestao'?'fornecedores':''
  );
  const go=(next:Section,nextSub?:string)=>{
    const base=next==='dashboard'?'assistente':next;
    navigate('/portal/'+base+(nextSub?'/'+nextSub:''));
    setDrawerOpen(false);
  };
  const [tasks,setTasks]=useState<PlannerTask[]>([]); const [vendors,setVendors]=useState<PlannerVendor[]>([]); const [budget,setBudget]=useState<PlannerBudgetItem[]>([]); const [journeyStates,setJourneyStates]=useState<PlannerJourneyState[]>([]);
  const [taskTitle,setTaskTitle]=useState(''); const [taskDue,setTaskDue]=useState(''); const [taskFilter,setTaskFilter]=useState<'pending'|'done'|'all'>('pending'); const [vendorName,setVendorName]=useState('');
  const [budgetDesc,setBudgetDesc]=useState(''); const [budgetValue,setBudgetValue]=useState('');

  async function load(){
    setLoading(true);
    try{
      const {data:{session}}=await supabase.auth.getSession(); setSignedIn(Boolean(session));
      const ws=session?await getMyWeddings():[]; const w=ws[0]??null; setWedding(w);
      if(w){
        try{await seedPlannerDefaults(w.id)}catch{}
        const [media,members,t,v,b,j]=await Promise.all([getManagedLandingMedia(w.id),getWeddingTeam(w.id),getPlannerTasks(w.id),getPlannerVendors(w.id),getPlannerBudget(w.id),getPlannerJourneyStates(w.id)]);
        setItems(media as Item[]); setTeam(members); setTasks(t); setVendors(v); setBudget(b); setJourneyStates(j);
      }else{setItems([]);setTeam([]);setTasks([]);setVendors([]);setBudget([]);setJourneyStates([])}
    }catch(e:any){setMessage(e.message||'Não foi possível abrir o portal.')} finally{setLoading(false)}
  }
  useEffect(()=>{load();const {data}=supabase.auth.onAuthStateChange(()=>setTimeout(load,0));return()=>data.subscription.unsubscribe()},[]);
  useEffect(()=>{if(!loading&&signedIn&&pathSection==='login')navigate('/portal/assistente')},[loading,signedIn,pathSection,navigate]);
  useEffect(()=>{if(!loading&&signedIn&&legacyTarget){const base=legacyTarget.section==='dashboard'?'assistente':legacyTarget.section;navigate('/portal/'+base+(legacyTarget.sub?'/'+legacyTarget.sub:''),{replace:true})}},[loading,signedIn,pathSection]);

  async function authenticate(e:React.FormEvent){
    e.preventDefault(); setMessage('');
    if(mode==='forgot'){const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/portal'});setMessage(error?error.message:'Enviámos as instruções para o teu email.');return}
    if(mode==='signup'){const {error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin+'/portal'}});setMessage(error?error.message:'Conta criada. Já podes entrar.');return}
    const {error}=await supabase.auth.signInWithPassword({email,password}); if(error)setMessage('Email ou palavra-passe incorretos.');
  }
  async function createWorkspace(e:React.FormEvent){e.preventDefault();setMessage('');try{await createWeddingWorkspace(coupleNames,weddingDate);await load()}catch(e:any){setMessage(e.message||'Não foi possível criar o casamento.')}}
  async function invite(e:React.FormEvent){e.preventDefault();if(!wedding||inviting)return;setInviting(true);setMessage('');try{const target=inviteEmail.trim().toLowerCase();await inviteWeddingMember(wedding.id,target);setInviteEmail('');setMessage('Convite criado.');setTeam(await getWeddingTeam(wedding.id))}catch(e:any){setMessage(e.message||'Não foi possível criar o convite.')}finally{setInviting(false)}}
  async function replace(slot:number,file?:File){if(!file||!wedding)return;setMessage('A carregar original…');try{await uploadLandingMedia(wedding.id,slot,file);await load();setMessage('Foto atualizada.')}catch(e:any){setMessage(e.message||'Erro no upload.')}}
  async function focal(item:Item,x:number,y:number){if(!wedding)return;setItems(v=>v.map(i=>i.slot===item.slot?{...i,focal_x:x,focal_y:y}:i));await updateLandingFocal(wedding.id,item.slot,x,y)}

  const leafTasks=tasks.filter(t=>!tasks.some(c=>c.parent_id===t.id));
  const openTasks=leafTasks.filter(t=>t.status!=='done');
  const completed=leafTasks.filter(t=>t.status==='done').length;
  const totalBudget=budget.reduce((s,b)=>s+Number(b.budgeted||0),0);
  const totalContracted=budget.reduce((s,b)=>s+Number(b.contracted??b.budgeted??0),0);
  const totalPaid=budget.reduce((s,b)=>s+Number(b.paid||0),0);
  const countdown=wedding?.wedding_date?dayDiff(wedding.wedding_date):null;
  const priorities=useMemo(()=>openTasks.slice().sort((a,b)=>{
    const p={urgent:0,high:1,normal:2,low:3}; const pa=p[a.priority],pb=p[b.priority]; if(pa!==pb)return pa-pb;
    if(a.due_date&&!b.due_date)return -1;if(!a.due_date&&b.due_date)return 1;return (a.due_date||'9999').localeCompare(b.due_date||'9999')
  }).slice(0,5),[tasks]);

  const phaseLabels:Record<string,string>={
    '12_9m':'12–9 meses antes','9_6m':'9–6 meses antes','6_3m':'6–3 meses antes','3_1m':'3–1 meses antes','final_month':'Último mês','final_week':'Última semana','manual':'Tarefas adicionais'
  };
  const taskParents=tasks.filter(t=>!t.parent_id);
  const visibleTask=(t:PlannerTask)=>taskFilter==='all'||(taskFilter==='pending'?t.status!=='done':t.status==='done');
  const taskPhases=[...new Set(taskParents.map(t=>t.phase_key||'manual'))].sort((a,b)=>Math.min(...taskParents.filter(t=>(t.phase_key||'manual')===a).map(t=>t.phase_order||999))-Math.min(...taskParents.filter(t=>(t.phase_key||'manual')===b).map(t=>t.phase_order||999)));


  if(loading)return <main className="portal-shell"><div className="portal-card">A preparar o portal…</div></main>;
  if(!signedIn)return <main className="portal-shell"><section className="portal-card portal-login">
    <div className="landing-kicker">Wedding Planner</div><h1>{mode==='login'?'Entrar':mode==='signup'?'Criar conta':'Recuperar acesso'}</h1>
    <p>{mode==='login'?'Planeamento, orçamento, fornecedores, convidados, mesas e fotografias num só lugar.':mode==='signup'?'Cria a tua conta e começa a organizar o casamento.':'Indica o email da tua conta.'}</p>
    <form onSubmit={authenticate}><input className="search" type="email" autoComplete="email" required placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)}/>
    {mode!=='forgot'&&<input className="search" type="password" autoComplete={mode==='login'?'current-password':'new-password'} required minLength={8} placeholder="Palavra-passe" value={password} onChange={e=>setPassword(e.target.value)}/>}
    <button className="primary" type="submit">{mode==='login'?'Entrar':mode==='signup'?'Criar conta':'Recuperar palavra-passe'}</button></form>
    <div className="auth-links">{mode==='login'?<><button onClick={()=>setMode('forgot')}>Esqueci-me da palavra-passe</button><button onClick={()=>setMode('signup')}>Criar conta</button></>:<button onClick={()=>setMode('login')}>← Voltar ao login</button>}</div>
    {message&&<p className="notice">{message}</p>}
  </section></main>;

  if(!wedding)return <main className="portal-shell"><section className="portal-card portal-login"><div className="landing-kicker">Bem-vindo</div><h1>Cria o teu casamento</h1><p>Este será o teu espaço de planeamento.</p>
    <form onSubmit={createWorkspace}><input className="search" required placeholder="Nomes do casal" value={coupleNames} onChange={e=>setCoupleNames(e.target.value)}/><input className="search" type="date" required value={weddingDate} onChange={e=>setWeddingDate(e.target.value)}/><button className="primary" type="submit">Criar casamento</button></form>
    {message&&<p className="notice">{message}</p>}<div className="auth-links"><button onClick={()=>supabase.auth.signOut()}>Sair</button></div>
  </section></main>;

  const sectionTitle:Record<Section,string>={dashboard:'Assistente',planeamento:'Planeamento',convidados:'Convidados',gestao:'Gestão',specialday:'Special Day',equipa:'Equipa'};
  const selectedStage=planningStages.find(s=>s.slug===sub);
  const selectedStageParents=selectedStage?taskParents.filter(t=>selectedStage.keys.includes(t.template_key||'')):[];
  const stageIsDone=(stage:{slug:string;keys:string[]})=>{
    const explicit=journeyStates.find(j=>j.journey_key===stage.slug);
    if(explicit?.status==='done'||explicit?.status==='skipped')return true;
    const parents=taskParents.filter(t=>stage.keys.includes(t.template_key||''));
    const children=parents.flatMap(p=>tasks.filter(t=>t.parent_id===p.id));
    const relevant=children.length?children:parents;
    return relevant.length>0&&relevant.every(t=>t.status==='done');
  };
  const sortedPlanningStages=[...planningStages].sort((a,b)=>Number(stageIsDone(a))-Number(stageIsDone(b)));
  const bottomSection:Section=section==='equipa'?'dashboard':section;

  return <main className="portal-shell"><div className="portal-wrap">
    <header className="portal-head portal-head-compact">
      <button className="portal-menu-button" aria-label="Abrir navegação" onClick={()=>setDrawerOpen(true)}><Menu size={20}/></button>
      <div className="portal-head-title"><span>{sectionTitle[section]}</span><h1>{wedding.couple_names}</h1></div>
      <button className="portal-logout" onClick={()=>supabase.auth.signOut()}><LogOut size={16}/><span>Sair</span></button>
    </header>

    <div className={'portal-drawer-backdrop '+(drawerOpen?'open':'')} onClick={()=>setDrawerOpen(false)}/>
    <aside className={'portal-drawer contextual '+(drawerOpen?'open':'')} aria-hidden={!drawerOpen}>
      <div className="portal-drawer-head"><div><span>{sectionTitle[section]}</span><strong>{wedding.couple_names}</strong></div><button onClick={()=>setDrawerOpen(false)}><X size={20}/></button></div>
      <nav className="portal-drawer-nav">
        {section==='dashboard'&&<>
          <div className="portal-nav-group"><span>Início</span>
            <button className={pathSection==='assistente'?'active':''} onClick={()=>go('dashboard')}><Home/><div><strong>Assistente</strong><small>Agora, prioridades e próximos passos</small></div></button>
          </div>
          <div className="portal-nav-group"><span>Conta & extras</span>
            <button onClick={()=>go('equipa')}><UsersRound/><div><strong>Equipa</strong><small>Noivos e co-gestores</small></div></button>
            <a href="/marketplace"><Store/><div><strong>Marketplace</strong><small>Abrir a loja pública</small></div><ExternalLink size={14}/></a>
          </div>
        </>}

        {section==='planeamento'&&<>
          <div className="portal-nav-group"><span>Planeamento</span>
            <button className={sub==='agora'?'active':''} onClick={()=>go('planeamento','agora')}><Sparkles/><div><strong>Agora</strong><small>O que merece atenção neste momento</small></div></button>
            <button className={sub==='cronograma'?'active':''} onClick={()=>go('planeamento','cronograma')}><CalendarRange/><div><strong>Cronograma completo</strong><small>Todos os marcos por data</small></div></button>
            <button className={sub==='organizacao'?'active':''} onClick={()=>go('planeamento','organizacao')}><ClipboardList/><div><strong>Organização</strong><small>Decisões, reuniões e documentos</small></div></button>
          </div>
          <div className="portal-nav-group planning-stage-nav"><span>Etapas do casamento</span>
            {sortedPlanningStages.map(stage=>{
              const Icon=stage.icon;
              const parents=taskParents.filter(t=>stage.keys.includes(t.template_key||''));
              const children=parents.flatMap(p=>tasks.filter(t=>t.parent_id===p.id));
              const relevant=children.length?children:parents;
              const done=relevant.filter(t=>t.status==='done').length;
              return <button key={stage.slug} className={(sub===stage.slug?'active ':'')+(stageIsDone(stage)?'stage-complete':'')} onClick={()=>go('planeamento',stage.slug)}>
                <Icon/><div><strong>{stage.label}</strong><small>{relevant.length?done+'/'+relevant.length+' concluídos':'Preparar etapa'}</small></div>{relevant.length>0&&<span className="stage-nav-progress">{Math.round(done/relevant.length*100)}%</span>}
              </button>
            })}
          </div>
        </>}

        {section==='convidados'&&<div className="portal-nav-group"><span>Convidados</span>
          <button className={sub==='lista'?'active':''} onClick={()=>go('convidados','lista')}><UsersRound/><div><strong>Lista & RSVP</strong><small>Convidados, respostas e restrições</small></div></button>
          <button className={sub==='mesas'?'active':''} onClick={()=>go('convidados','mesas')}><MapPin/><div><strong>Mesas</strong><small>Seating plan e capacidades</small></div></button>
        </div>}

        {section==='gestao'&&<div className="portal-nav-group"><span>Gestão</span>
          <button className={sub==='fornecedores'?'active':''} onClick={()=>go('gestao','fornecedores')}><HeartHandshake/><div><strong>Fornecedores</strong><small>Pesquisa, propostas e contratos</small></div></button>
          <button className={sub==='orcamento'?'active':''} onClick={()=>go('gestao','orcamento')}><CircleDollarSign/><div><strong>Orçamento</strong><small>Previsto, contratado e pago</small></div></button>
        </div>}

        {section==='specialday'&&<div className="portal-nav-group"><span>Special Day</span>
          <button className="active" onClick={()=>go('specialday')}><Sparkles/><div><strong>Experiência dos convidados</strong><small>Publicação, QR, álbum e site</small></div></button>
          <a href={'/w/'+wedding.slug} target="_blank" rel="noreferrer"><ExternalLink/><div><strong>Ver página pública</strong><small>Abrir como convidado</small></div></a>
        </div>}

        {section==='equipa'&&<div className="portal-nav-group"><span>Conta</span>
          <button className="active" onClick={()=>go('equipa')}><UsersRound/><div><strong>Equipa</strong><small>Noivos e co-gestores</small></div></button>
          <button onClick={()=>go('dashboard')}><Home/><div><strong>Voltar ao Assistente</strong><small>Página inicial do casamento</small></div></button>
        </div>}
      </nav>
    </aside>

    {section==='dashboard'&&<div className="planner-dashboard">
      <section className="planner-hero portal-card">
        <div><span className="planner-kicker"><Sparkles size={14}/> Assistente de planeamento</span><h2>{countdown!=null&&countdown>=0?'Faltam '+countdown+' dias':'O grande dia chegou'}</h2><p>O objetivo é manter-vos focados apenas no que precisa de atenção agora.</p></div>
        <div className="planner-score"><strong>{leafTasks.length?Math.round((completed/leafTasks.length)*100):0}%</strong><span>tarefas concluídas</span></div>
      </section>
      <div className="planner-metrics">
        <button className="planner-metric" onClick={()=>go('planeamento','cronograma')}><ClipboardList/><span>Pendentes</span><strong>{openTasks.length}</strong></button>
        <button className="planner-metric" onClick={()=>go('gestao','fornecedores')}><HeartHandshake/><span>Fornecedores</span><strong>{vendors.filter(v=>['booked','paid'].includes(v.status)).length}/{vendors.length}</strong></button>
        <button className="planner-metric" onClick={()=>go('gestao','orcamento')}><CircleDollarSign/><span>Contratado</span><strong>{eur(totalContracted)}</strong><small>{eur(totalPaid)} pago</small></button>
        <div className="planner-metric"><CalendarDays/><span>Data</span><strong>{new Date(wedding.wedding_date+'T12:00:00').toLocaleDateString('pt-PT',{day:'2-digit',month:'short',year:'numeric'})}</strong></div>
      </div>
      <section className="portal-card">
        <div className="portal-section-title"><div><span>Prioridades</span><h2>O que eu trataria a seguir</h2><p>Ordenado por urgência e prazo.</p></div><Sparkles size={24}/></div>
        <div className="planner-priorities">{priorities.length?priorities.map(t=><button key={t.id} onClick={()=>go('planeamento','cronograma')} className="planner-priority"><span className={'priority-dot '+t.priority}/><div><strong>{t.title}</strong><small>{t.due_date?'Até '+new Date(t.due_date+'T12:00:00').toLocaleDateString('pt-PT'):'Sem prazo'} · {t.owner_label==='ambos'?'Ambos':t.owner_label}</small></div></button>):<div className="planner-empty"><CheckCircle2/><strong>Nada urgente.</strong><span>Adiciona tarefas para eu começar a priorizar o planeamento.</span></div>}</div>
      </section>
    </div>}

    {section==='planeamento'&&<div className="portal-section-shell">
      {sub==='agora'&&<div className="planning-now">
        <section className="portal-card planner-hero">
          <div><span className="planner-kicker"><Sparkles size={14}/> Planeamento guiado</span><h2>O que precisa da vossa atenção agora</h2><p>As etapas podem decorrer em simultâneo. Abre o menu para navegar por cada journey do casamento.</p></div>
          <div className="planner-score"><strong>{openTasks.length}</strong><span>ações pendentes</span></div>
        </section>
        <section className="portal-card">
          <div className="portal-section-title"><div><span>Próximas ações</span><h2>Continuar a organizar</h2><p>Prioridade e prazo, sem mostrar o casamento inteiro de uma vez.</p></div></div>
          <div className="planner-priorities">{priorities.length?priorities.map(t=><button key={t.id} onClick={()=>{const parent=t.parent_id?tasks.find(p=>p.id===t.parent_id):t;const stage=planningStages.find(s=>s.keys.includes(parent?.template_key||''));go('planeamento',stage?.slug||'cronograma')}} className="planner-priority"><span className={'priority-dot '+t.priority}/><div><strong>{t.title}</strong><small>{t.due_date?'Até '+new Date(t.due_date+'T12:00:00').toLocaleDateString('pt-PT'):'Sem prazo'}</small></div></button>):<div className="planner-empty"><CheckCircle2/><strong>Nada urgente.</strong><span>O planeamento está em dia.</span></div>}</div>
        </section>
      </div>}
      {sub==='cronograma'&&<section className="portal-card task-timeline-card">
      <div className="portal-section-title"><div><span>Cronograma</span><h2>Tarefas & subtarefas</h2><p>Cada objetivo principal abre o respetivo processo. Por defeito, o que está concluído fica oculto.</p></div><ClipboardList size={24}/></div>
      <div className="task-toolbar">
        <div className="task-filters">
          <button className={taskFilter==='pending'?'active':''} onClick={()=>setTaskFilter('pending')}>Pendentes</button>
          <button className={taskFilter==='done'?'active':''} onClick={()=>setTaskFilter('done')}>Done</button>
          <button className={taskFilter==='all'?'active':''} onClick={()=>setTaskFilter('all')}>Tudo</button>
        </div>
        <span>{openTasks.length} pendentes · {completed} concluídas</span>
      </div>
      <form className="planner-inline-form" onSubmit={async e=>{e.preventDefault();if(!taskTitle.trim())return;await createPlannerTask(wedding.id,{title:taskTitle,due_date:taskDue||null,phase_key:'manual',phase_order:999});setTaskTitle('');setTaskDue('');setTasks(await getPlannerTasks(wedding.id))}}>
        <input className="search" placeholder="Adicionar tarefa pontual" value={taskTitle} onChange={e=>setTaskTitle(e.target.value)}/><input className="search" type="date" value={taskDue} onChange={e=>setTaskDue(e.target.value)}/><button className="primary">Adicionar</button>
      </form>
      <div className="task-timeline">
        {taskPhases.map(phase=>{
          const parents=taskParents.filter(t=>(t.phase_key||'manual')===phase).filter(p=>{
            const children=tasks.filter(c=>c.parent_id===p.id);
            if(children.length) return visibleTask(p)||children.some(visibleTask);
            return visibleTask(p);
          });
          if(!parents.length)return null;
          return <section className="task-phase" key={phase}>
            <div className="task-phase-head"><span>{phaseLabels[phase]||phase}</span></div>
            <div className="task-tree-list">{parents.map(parent=>{
              const children=tasks.filter(c=>c.parent_id===parent.id).sort((a,b)=>(a.due_date||'9999').localeCompare(b.due_date||'9999'));
              const visibleChildren=children.filter(visibleTask);
              const doneChildren=children.filter(c=>c.status==='done').length;
              const hasChildren=children.length>0;
              return <article className={'task-parent '+(parent.status==='done'?'done':'')} key={parent.id}>
                <div className="task-parent-head">
                  <button className="planner-check" onClick={async()=>{await setPlannerTaskTreeStatus(parent.id,parent.status==='done'?'todo':'done');setTasks(await getPlannerTasks(wedding.id))}}>{parent.status==='done'?<CheckCircle2/>:<span/>}</button>
                  <div className="task-parent-main">
                    <div className="task-parent-title"><strong>{parent.title}</strong>{hasChildren&&<span>{doneChildren}/{children.length}</span>}</div>
                    <small>{parent.due_date?'Objetivo até '+new Date(parent.due_date+'T12:00:00').toLocaleDateString('pt-PT'):'Sem prazo'} · {parent.owner_label==='ambos'?'Ambos':parent.owner_label}</small>
                  </div>
                  <span className={'priority-pill '+parent.priority}>{parent.priority==='urgent'?'Urgente':parent.priority==='high'?'Alta':parent.priority==='low'?'Baixa':'Normal'}</span>
                </div>
                {hasChildren&&visibleChildren.length>0&&<div className="task-children">{visibleChildren.map(child=><div className={'task-child '+(child.status==='done'?'done':'')} key={child.id}>
                  <button className="planner-check small" onClick={async()=>{await setPlannerTaskTreeStatus(child.id,child.status==='done'?'todo':'done');setTasks(await getPlannerTasks(wedding.id))}}>{child.status==='done'?<CheckCircle2/>:<span/>}</button>
                  <div><strong>{child.title}</strong><small>{child.due_date?new Date(child.due_date+'T12:00:00').toLocaleDateString('pt-PT'):'Sem prazo'}</small></div>
                  <select value={child.priority} onChange={async e=>{await updatePlannerTask(child.id,{priority:e.target.value as any});setTasks(await getPlannerTasks(wedding.id))}}><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="urgent">Urgente</option></select>
                </div>)}</div>}
              </article>
            })}</div>
          </section>
        })}
      </div>
    </section>}
      {sub==='organizacao'&&<PlannerSuite weddingId={wedding.id} mode="planning"/>}
      {selectedStage&&<JourneyWorkspace
        weddingId={wedding.id}
        stage={selectedStage}
        tasks={tasks}
        vendors={vendors}
        budget={budget}
        state={journeyStates.find(j=>j.journey_key===selectedStage.slug)}
        onState={(value)=>setJourneyStates(prev=>[...prev.filter(j=>j.journey_key!==value.journey_key),value])}
        onGo={(target,targetSub)=>go(target,targetSub)}
        onToggleTask={async(task)=>{await setPlannerTaskTreeStatus(task.id,task.status==='done'?'todo':'done');setTasks(await getPlannerTasks(wedding.id))}}
      />}
    </div>}

    {section==='convidados'&&<div className="portal-section-shell">
      <div className="portal-subnav">
        <button className={sub==='lista'?'active':''} onClick={()=>go('convidados','lista')}>Lista & RSVP</button>
        <button className={sub==='mesas'?'active':''} onClick={()=>go('convidados','mesas')}>Mesas</button>
      </div>
      {sub==='lista'&&<PlannerSuite weddingId={wedding.id} mode="guests"/>}
      {sub==='mesas'&&<PlannerSuite weddingId={wedding.id} mode="tables"/>}
    </div>}

    {section==='gestao'&&<div className="portal-section-shell">
      <div className="portal-subnav">
        <button className={sub==='fornecedores'?'active':''} onClick={()=>go('gestao','fornecedores')}>Fornecedores</button>
        <button className={sub==='orcamento'?'active':''} onClick={()=>go('gestao','orcamento')}>Orçamento</button>
      </div>
      {sub==='fornecedores'&&<section className="portal-card">
      <div className="portal-section-title"><div><span>Rede de fornecedores</span><h2>Fornecedores</h2><p>Pesquisa, propostas, adjudicação, próximos passos e pagamentos.</p></div><HeartHandshake size={24}/></div>
      <form className="planner-inline-form two" onSubmit={async e=>{e.preventDefault();if(!vendorName.trim())return;await createPlannerVendor(wedding.id,{name:vendorName});setVendorName('');setVendors(await getPlannerVendors(wedding.id))}}><input className="search" placeholder="Nome do fornecedor" value={vendorName} onChange={e=>setVendorName(e.target.value)}/><button className="primary">Adicionar</button></form>
      <div className="planner-list">{vendors.map(v=><div className="planner-row vendor" key={v.id}><div className="planner-row-main"><strong>{v.name}</strong><small>{v.category}{v.next_action?' · Próximo: '+v.next_action:''}</small></div><select value={v.status} onChange={async e=>{await updatePlannerVendor(v.id,{status:e.target.value as any});setVendors(await getPlannerVendors(wedding.id))}}><option value="researching">A pesquisar</option><option value="contacted">Contactado</option><option value="proposal">Proposta</option><option value="booked">Adjudicado</option><option value="paid">Pago</option><option value="rejected">Descartado</option></select></div>)}</div>
    </section>}

      {sub==='orcamento'&&<section className="portal-card">
      <div className="portal-section-title"><div><span>Finanças</span><h2>Orçamento & pagamentos</h2><p>Planeado, contratado e pago sem perder de vista o desvio.</p></div><CircleDollarSign size={24}/></div>
      <div className="budget-summary"><div><span>Orçamento</span><strong>{eur(totalBudget)}</strong></div><div><span>Contratado</span><strong>{eur(totalContracted)}</strong></div><div><span>Pago</span><strong>{eur(totalPaid)}</strong></div><div><span>Por pagar</span><strong>{eur(Math.max(0,totalContracted-totalPaid))}</strong></div></div>
      <form className="planner-inline-form budget" onSubmit={async e=>{e.preventDefault();if(!budgetDesc.trim())return;await createPlannerBudgetItem(wedding.id,{description:budgetDesc,budgeted:Number(budgetValue)||0});setBudgetDesc('');setBudgetValue('');setBudget(await getPlannerBudget(wedding.id))}}><input className="search" placeholder="Rubrica" value={budgetDesc} onChange={e=>setBudgetDesc(e.target.value)}/><input className="search" inputMode="decimal" placeholder="Orçamento €" value={budgetValue} onChange={e=>setBudgetValue(e.target.value)}/><button className="primary">Adicionar</button></form>
      <div className="planner-list">{budget.map(b=><div className="planner-row budget-row" key={b.id}><div className="planner-row-main"><strong>{b.description}</strong><small>{b.category}</small></div><div className="budget-values"><span>{eur(Number(b.budgeted))}</span><strong>{eur(Number(b.paid))} pago</strong></div><select value={b.status} onChange={async e=>{await updatePlannerBudgetItem(b.id,{status:e.target.value as any});setBudget(await getPlannerBudget(wedding.id))}}><option value="planned">Planeado</option><option value="contracted">Contratado</option><option value="partial">Parcial</option><option value="paid">Pago</option><option value="cancelled">Cancelado</option></select></div>)}</div>
    </section>}
    </div>}

    {section==='equipa'&&<section className="portal-card portal-invite">
      <div className="portal-section-title"><div><span>Equipa do casamento</span><h2>Noivos e co-gestores</h2><p>Quem pode gerir o planeamento convosco.</p></div><UsersRound size={24}/></div>
      <form onSubmit={invite}><input className="search" type="email" required placeholder="Email da pessoa a convidar" value={inviteEmail} onChange={e=>setInviteEmail(e.target.value)}/><button className="primary" type="submit" disabled={inviting}>{inviting?'A convidar…':'Convidar co-gestor'}</button></form>
      {message&&<p className="portal-message"><Save size={14}/>{message}</p>}<div className="team-list">{team.map((m:any)=><div className="team-row" key={m.kind+'-'+m.email}><div><strong>{m.email}</strong><span>{m.role==='owner'?'Proprietário':m.role==='editor'?'Co-gestor':'Leitura'} · {m.status==='pending'?'Convite pendente':'Ativo'}</span></div>{m.status==='pending'&&<div className="team-actions"><button type="button" disabled={resending===m.email} onClick={async()=>{try{setResending(m.email);await inviteWeddingMember(wedding.id,m.email,m.role);setMessage('Convite reenviado.')}finally{setResending('')}}}>{resending===m.email?'A reenviar…':'Reenviar'}</button><button type="button" onClick={async()=>{await cancelWeddingInvitation(wedding.id,m.email);setTeam(await getWeddingTeam(wedding.id))}}>Cancelar</button></div>}</div>)}</div>
    </section>}

    {section==='specialday'&&<><GuestExperiencePanel wedding={wedding} onChanged={(settings)=>setWedding((w:any)=>({...w,settings}))}/><section className="portal-card">
      <div className="portal-section-title"><div><span>Site do casamento</span><h2>Fotos de abertura</h2><p>Carrega os originais e ajusta o enquadramento para a experiência mobile.</p></div><ImagePlus size={25}/></div>
      <div className="branding-grid">{[1,2,3,4].map(slot=>{const item=items.find(i=>i.slot===slot);return <article className="branding-card" key={slot}><div className="branding-preview">{item?<img src={item.url} style={{objectPosition:item.focal_x+'% '+item.focal_y+'%'}}/>:<span>Foto {slot}</span>}</div><div className="branding-controls"><label className="upload-control"><Upload size={15}/>{item?'Substituir original':'Carregar original'}<input type="file" accept="image/*,.heic,.heif" onChange={e=>replace(slot,e.target.files?.[0])}/></label>{item&&<><label>Horizontal <input type="range" min="0" max="100" value={item.focal_x} onChange={e=>focal(item,Number(e.target.value),item.focal_y)}/></label><label>Vertical <input type="range" min="0" max="100" value={item.focal_y} onChange={e=>focal(item,item.focal_x,Number(e.target.value))}/></label></>}</div></article>})}</div>
      {message&&<p className="portal-message"><Save size={14}/>{message}</p>}
    </section></>}

    <nav className="portal-bottom-nav" aria-label="Navegação principal">
      <button className={bottomSection==='dashboard'?'active':''} onClick={()=>go('dashboard')}><Home/><span>Início</span></button>
      <button className={bottomSection==='planeamento'?'active':''} onClick={()=>go('planeamento','agora')}><CalendarRange/><span>Planear</span></button>
      <button className={bottomSection==='convidados'?'active':''} onClick={()=>go('convidados','lista')}><UsersRound/><span>Convidados</span></button>
      <button className={bottomSection==='gestao'?'active':''} onClick={()=>go('gestao','fornecedores')}><CircleDollarSign/><span>Gestão</span></button>
      <button className={bottomSection==='specialday'?'active':''} onClick={()=>go('specialday')}><Sparkles/><span>Special Day</span></button>
    </nav>
  </div></main>;
}
