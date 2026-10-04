import { useEffect, useState } from 'react';
import { getCatalog, type Guest, type Moment } from '../api';

export function useCatalog() {
  const [guests,setGuests]=useState<Guest[]>([]);
  const [moments,setMoments]=useState<Moment[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  useEffect(()=>{
    getCatalog()
      .then(x=>{setGuests(x.guests);setMoments(x.moments)})
      .catch(e=>setError(e.message||'Erro'))
      .finally(()=>setLoading(false));
  },[]);
  return {guests,moments,loading,error};
}
