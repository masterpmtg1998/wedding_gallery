import { Page } from '../components/navigation';
export default function Admin(){
  return <Page title="Área dos noivos" showNav={false}><div className="admin-card"><strong>Backoffice</strong><p className="muted">A gestão administrativa será fechada depois do fluxo de convidados.</p></div></Page>;
}
