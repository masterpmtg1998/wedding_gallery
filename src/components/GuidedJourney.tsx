import { useMemo } from 'react';
import { CalendarDays, CheckCircle2, CircleDollarSign, FileText, HeartHandshake, Sparkles, UsersRound } from 'lucide-react';
import { upsertPlannerJourneyState, type PlannerBudgetItem, type PlannerJourneyState, type PlannerTask, type PlannerVendor } from '../api';
import MarketplaceSuggestions from './MarketplaceSuggestions';

type Stage={slug:string;label:string;keys:string[]};
type Props={
  weddingId:string;stage:Stage;tasks:PlannerTask[];vendors:PlannerVendor[];budget:PlannerBudgetItem[];
  state?:PlannerJourneyState;onState:(v:PlannerJourneyState)=>void;
  onGo:(section:'gestao'|'planeamento'|'convidados',sub:string)=>void;
  onToggleTask:(task:PlannerTask)=>Promise<void>;
};

type JourneyConfig={
  intro:string;
  phases:{label:string;hint:string}[];
  vendorTerms:string[];
  budgetTerms:string[];
  optional?:boolean;
  guestDriven?:boolean;
};

const configs:Record<string,JourneyConfig>={
  fotografia:{
    intro:'Da escolha do estilo ao briefing final, tudo deve ficar ligado ao mesmo processo.',
    phases:[
      {label:'Definir estilo',hint:'Foto, vídeo, estética e prioridades'},
      {label:'Pesquisar',hint:'Criar shortlist de profissionais'},
      {label:'Comparar',hint:'Propostas, horas, equipa e entregáveis'},
      {label:'Contratar',hint:'Escolha, contrato e sinal'},
      {label:'Preparar',hint:'Briefing, momentos-chave e horários'},
      {label:'Fechar',hint:'Pagamentos e entrega final'}
    ],
    vendorTerms:['fotografia','foto','video'],budgetTerms:['fotografia','vídeo']
  },
  catering:{
    intro:'O menu deve evoluir com o número de convidados, restrições e prova final.',
    phases:[
      {label:'Requisitos',hint:'Formato, horários e necessidades'},
      {label:'Propostas',hint:'Menus e preço por PAX'},
      {label:'Prova',hint:'Experimentar e afinar'},
      {label:'Escolher menu',hint:'Pratos, bebidas e extras'},
      {label:'Fechar PAX',hint:'Adultos, crianças e restrições'},
      {label:'Liquidar',hint:'Pagamento e confirmação final'}
    ],
    vendorTerms:['catering','quinta','menu'],budgetTerms:['catering','menu','bar','bolo','ceia'],guestDriven:true
  },
  musica:{
    intro:'A música atravessa cerimónia, cocktail, jantar e festa; não é uma única contratação.',
    phases:[
      {label:'Definir ambiente',hint:'DJ, banda, cerimónia e momentos'},
      {label:'Pesquisar',hint:'Shortlist e disponibilidade'},
      {label:'Comparar',hint:'Propostas e condições'},
      {label:'Contratar',hint:'Escolha, contrato e sinal'},
      {label:'Preparar repertório',hint:'Entradas, primeira dança e festa'},
      {label:'Fechar horários',hint:'Coordenação com quinta e restantes fornecedores'}
    ],
    vendorTerms:['dj','musica','banda','som'],budgetTerms:['dj','banda','som','música']
  },
  decoracao:{
    intro:'Da identidade visual à montagem final, a decoração deve ser tratada como um conceito único.',
    phases:[
      {label:'Conceito',hint:'Paleta, estilo e referências'},
      {label:'Necessidades',hint:'Flores, mesas, cerimónia e sinalética'},
      {label:'Propostas',hint:'Fornecedores e alternativas'},
      {label:'Escolher',hint:'Adjudicar e fechar materiais'},
      {label:'Detalhar',hint:'Quantidades, mesas e layout'},
      {label:'Montagem',hint:'Horários, acessos e desmontagem'}
    ],
    vendorTerms:['decor','flores','florista'],budgetTerms:['decoração','flores','centros','iluminação']
  },
  convites:{
    intro:'Convites e comunicação devem nascer diretamente da lista de convidados e do calendário.',
    phases:[
      {label:'Definir formato',hint:'Digital, impresso ou misto'},
      {label:'Preparar dados',hint:'Nomes, contactos e moradas'},
      {label:'Design',hint:'Identidade e conteúdos'},
      {label:'Enviar',hint:'Save the date e convite'},
      {label:'Acompanhar',hint:'Entregas e respostas'},
      {label:'Fechar RSVP',hint:'Lista final para o evento'}
    ],
    vendorTerms:['papelaria','convites'],budgetTerms:['save the date','convites','papelaria'],guestDriven:true
  },
  aliancas:{
    intro:'Uma compra pequena no número de passos, mas importante em medidas, prazos e gravações.',
    phases:[
      {label:'Definir estilo',hint:'Material, perfil e orçamento'},
      {label:'Experimentar',hint:'Modelos e medidas'},
      {label:'Escolher',hint:'Modelo final e fornecedor'},
      {label:'Encomendar',hint:'Medidas e gravação'},
      {label:'Levantar',hint:'Confirmar acabamento e tamanho'}
    ],
    vendorTerms:['joalharia','alianças'],budgetTerms:['alianças']
  },
  cerimonia:{
    intro:'A cerimónia junta documentação, celebrante, música e sequência do momento.',
    phases:[
      {label:'Definir formato',hint:'Civil, religioso ou simbólico'},
      {label:'Documentação',hint:'Requisitos e prazos legais'},
      {label:'Celebrante',hint:'Escolha e alinhamento'},
      {label:'Conteúdo',hint:'Leituras, votos e música'},
      {label:'Ensaio',hint:'Entradas e posições'},
      {label:'Confirmar',hint:'Documentos, horários e intervenientes'}
    ],
    vendorTerms:['celebrante','igreja','cerimónia'],budgetTerms:['cerimónia','igreja','celebrante']
  },
  'lua-de-mel':{
    intro:'A lua de mel deve ser planeada como uma viagem completa, não apenas reservar voos.',
    phases:[
      {label:'Destino',hint:'Datas, duração e orçamento'},
      {label:'Pesquisar',hint:'Voos, hotéis e roteiros'},
      {label:'Reservar',hint:'Transportes e alojamento'},
      {label:'Documentos',hint:'Passaportes, vistos e seguros'},
      {label:'Experiências',hint:'Atividades e restaurantes'},
      {label:'Preparar viagem',hint:'Check-in, transfers e documentos finais'}
    ],
    vendorTerms:['viagem','agência'],budgetTerms:['lua de mel','voos','alojamento lua','atividades']
  },
  rsvp:{
    intro:'O RSVP deve ser conduzido pela própria lista, mostrando apenas quem ainda precisa de atenção.',
    phases:[
      {label:'Preparar lista',hint:'Contactos e agregados completos'},
      {label:'Enviar',hint:'Convites entregues'},
      {label:'Receber respostas',hint:'Confirmados, recusas e dúvidas'},
      {label:'Lembrar',hint:'Follow-up de pendentes'},
      {label:'Fechar lista',hint:'Número final e restrições'}
    ],
    vendorTerms:[],budgetTerms:[],guestDriven:true
  },
  seating:{
    intro:'As mesas só devem ganhar protagonismo quando a lista estiver suficientemente estável.',
    phases:[
      {label:'Definir mesas',hint:'Capacidades e layout'},
      {label:'Agrupar',hint:'Famílias, amigos e afinidades'},
      {label:'Distribuir',hint:'Primeira versão do seating'},
      {label:'Resolver conflitos',hint:'Capacidade e incompatibilidades'},
      {label:'Bloquear',hint:'Versão final'},
      {label:'Publicar',hint:'Disponibilizar aos convidados quando quiserem'}
    ],
    vendorTerms:[],budgetTerms:['menus','place cards','seating'],guestDriven:true
  },
  pagamentos:{
    intro:'Aqui interessa apenas o que falta pagar, quando e a quem.',
    phases:[
      {label:'Rever contratos',hint:'Valores e datas de vencimento'},
      {label:'Calendarizar',hint:'Pagamentos futuros'},
      {label:'Confirmar saldos',hint:'Diferenças e extras'},
      {label:'Liquidar',hint:'Pagamentos finais'},
      {label:'Arquivar',hint:'Faturas e comprovativos'}
    ],
    vendorTerms:[],budgetTerms:[]
  },
  fecho:{
    intro:'A reta final junta fornecedores, horários, documentos e responsabilidades do próprio dia.',
    phases:[
      {label:'Reunião final',hint:'Todos os fornecedores alinhados'},
      {label:'Cronograma do dia',hint:'Horários e responsáveis'},
      {label:'Documentos',hint:'Contratos, contactos e comprovativos'},
      {label:'Plano B',hint:'Chuva, atrasos e imprevistos'},
      {label:'Delegar',hint:'Quem resolve o quê no dia'},
      {label:'Dia do casamento',hint:'Tudo pronto para executar'}
    ],
    vendorTerms:[],budgetTerms:[],optional:false
  }
};

const normalize=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

export default function GuidedJourney({weddingId,stage,tasks,vendors,budget,state,onState,onGo,onToggleTask}:Props){
  const cfg=configs[stage.slug];
  const parents=useMemo(()=>tasks.filter(t=>!t.parent_id&&stage.keys.includes(t.template_key||'')),[tasks,stage]);
  const children=useMemo(()=>parents.flatMap(p=>tasks.filter(t=>t.parent_id===p.id)),[parents,tasks]);
  const actions=(children.length?children:parents).sort((a,b)=>(a.due_date||'9999').localeCompare(b.due_date||'9999'));
  const done=actions.filter(t=>t.status==='done').length;
  const open=actions.filter(t=>t.status!=='done');
  const ratio=actions.length?done/actions.length:0;

  if(!cfg)return null;

  const explicitDone=state?.status==='done'||state?.status==='skipped';
  const phaseIndex=explicitDone?cfg.phases.length-1:Math.min(cfg.phases.length-1,Math.floor(ratio*cfg.phases.length));
  const currentPhase=cfg.phases[phaseIndex];
  const relatedVendors=vendors.filter(v=>cfg.vendorTerms.some(term=>normalize(v.category+' '+v.name).includes(normalize(term))));
  const relatedBudget=budget.filter(b=>cfg.budgetTerms.some(term=>normalize(b.category+' '+b.description).includes(normalize(term))));
  const contracted=relatedBudget.reduce((s,b)=>s+Number(b.contracted||0),0);
  const paid=relatedBudget.reduce((s,b)=>s+Number(b.paid||0),0);
  const eur=(n:number)=>new Intl.NumberFormat('pt-PT',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(n||0);

  async function setApplicability(status:'active'|'skipped'){
    const updated=await upsertPlannerJourneyState(weddingId,stage.slug,{status,current_focus:state?.current_focus||null,waiting_for:state?.waiting_for||null,notes:state?.notes||null,structured_data:state?.structured_data||{}});
    onState(updated);
  }

  return <div className="guided-journey">
    <section className="portal-card guided-hero">
      <div>
        <span className="planner-kicker"><Sparkles size={14}/> {stage.label}</span>
        <h2>{state?.status==='skipped'?'Não se aplica':currentPhase.label}</h2>
        <p>{cfg.intro}</p>
      </div>
      <div className="guided-next">
        <span>Próximo passo</span>
        <strong>{open[0]?.title||currentPhase.hint}</strong>
        {open[0]?.due_date&&<small>Até {new Date(open[0].due_date+'T12:00:00').toLocaleDateString('pt-PT')}</small>}
      </div>
    </section>

    <section className="portal-card guided-phase-rail">
      {cfg.phases.map((p,i)=><div key={p.label} className={(i<phaseIndex?'done ':i===phaseIndex?'active ':'')+(state?.status==='skipped'?'muted':'')}>
        <span>{i<phaseIndex?<CheckCircle2 size={15}/>:i+1}</span>
        <div><strong>{p.label}</strong><small>{p.hint}</small></div>
      </div>)}
    </section>

    {state?.status!=='skipped'&&<div className="guided-module-grid">
      {cfg.guestDriven&&<button className="portal-card guided-module" onClick={()=>onGo('convidados','lista')}><UsersRound/><div><span>Convidados</span><strong>Usar dados reais</strong><small>A lista alimenta esta etapa automaticamente.</small></div></button>}
      {cfg.vendorTerms.length>0&&<button className="portal-card guided-module" onClick={()=>onGo('gestao','fornecedores')}><HeartHandshake/><div><span>Fornecedores</span><strong>{relatedVendors.length||'Adicionar'}</strong><small>{relatedVendors.filter(v=>['booked','paid'].includes(v.status)).length} adjudicados</small></div></button>}
      {cfg.budgetTerms.length>0&&<button className="portal-card guided-module" onClick={()=>onGo('gestao','orcamento')}><CircleDollarSign/><div><span>Orçamento</span><strong>{relatedBudget.length?eur(contracted):'Configurar'}</strong><small>{eur(paid)} pago</small></div></button>}
      <article className="portal-card guided-module"><CalendarDays/><div><span>Próximo marco</span><strong>{open[0]?.due_date?new Date(open[0].due_date+'T12:00:00').toLocaleDateString('pt-PT'):'Sem data'}</strong><small>{open[0]?.title||'Nada pendente'}</small></div></article>
      <article className="portal-card guided-module"><FileText/><div><span>Documentos</span><strong>Contexto da etapa</strong><small>Contratos, propostas e comprovativos devem ficar associados aqui.</small></div></article>
    </div>}

    {state?.status!=='skipped'&&<section className="portal-card guided-actions">
      <div className="portal-section-title"><div><span>Agora</span><h2>O que falta nesta etapa</h2><p>As ações existem para servir o processo — não são o processo.</p></div></div>
      <div className="journey-action-stack">
        {open.slice(0,4).map((task,i)=><button key={task.id} className={i===0?'next':''} onClick={()=>onToggleTask(task)}>
          <span className="journey-action-index">{i===0?'Agora':i+1}</span>
          <div><strong>{task.title}</strong><small>{task.due_date?new Date(task.due_date+'T12:00:00').toLocaleDateString('pt-PT'):'Sem prazo'}</small></div>
          <span className="journey-action-check"><CheckCircle2/></span>
        </button>)}
        {!open.length&&<div className="planner-empty"><CheckCircle2/><strong>Sem ações pendentes.</strong><span>Esta etapa está em dia.</span></div>}
      </div>
    </section>}

    <MarketplaceSuggestions stage={stage.slug}/>

    <div className="guided-footer-actions">
      {state?.status==='skipped'?<button onClick={()=>setApplicability('active')}>Reativar esta etapa</button>:cfg.optional!==false&&<button onClick={()=>setApplicability('skipped')}>Isto não se aplica ao nosso casamento</button>}
      <button onClick={()=>onGo('planeamento','cronograma')}>Ver cronograma completo</button>
    </div>
  </div>;
}
