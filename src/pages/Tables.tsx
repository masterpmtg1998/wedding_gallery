import { Users } from 'lucide-react';
import { Page } from '../components/navigation';
import { useCatalog } from '../hooks/useCatalog';
import { getGuestId } from '../lib/guest';

export default function Tables(){
  const {guests,tables,loading,error}=useCatalog();
  const guestId=getGuestId();
  const me=guests.find(g=>g.id===guestId);
  const myTable=me?.table_id ? tables.find(t=>t.id===me.table_id) : undefined;

  if(loading) return <Page title="Mesas"><div className="empty">A preparar as mesas…</div></Page>;

  return <Page title="Mesas">
    {error&&<p className="notice">{error}</p>}

    <div className={'my-table-card '+(myTable?'ready':'pending')}>
      <span>A tua mesa</span>
      <strong>{myTable?.name||'Ainda por definir'}</strong>
      {myTable
        ?<small>{guests.filter(g=>g.table_id===myTable.id).length} pessoas</small>
        :<small>Quando o seating plan estiver fechado, aparece aqui automaticamente.</small>}
    </div>

    {tables.length ? <div className="tables-list">
      {tables.map(table=>{
        const people=guests.filter(g=>g.table_id===table.id);
        return <section className={'table-card '+(table.id===myTable?.id?'mine':'')} key={table.id}>
          <div className="table-card-head">
            <div><span>Mesa</span><h2>{table.name}</h2></div>
            <div className="table-count"><Users size={15}/>{people.length}</div>
          </div>
          <div className="table-people">
            {people.map(g=><span key={g.id}>{g.name}</span>)}
          </div>
        </section>;
      })}
    </div> : <div className="empty tables-empty">
      <Users size={34}/>
      <strong>As mesas ainda estão a ser organizadas</strong>
      <span>Assim que estiverem definidas, vais poder ver aqui a tua mesa e quem se senta contigo.</span>
    </div>}
  </Page>;
}
