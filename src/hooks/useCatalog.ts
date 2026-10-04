import { useEffect, useState } from 'react';
import { getCatalog, type Guest, type Moment, type WeddingTable } from '../api';
import { getWeddingSlug } from '../lib/wedding';

export function useCatalog() {
  const [guests,setGuests]=useState<Guest[]>([]);
  const [moments,setMoments]=useState<Moment[]>([]);
  const [tables,setTables]=useState<WeddingTable[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const slug=getWeddingSlug();
  useEffect(()=>{
    getCatalog(slug).then(x=>{setGuests(x.guests);setMoments(x.moments);setTables(x.tables)})
      .catch(e=>setError(e.message||'Erro')).finally(()=>setLoading(false));
  },[slug]);
  return {guests,moments,tables,loading,error};
}