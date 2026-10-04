import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import Landing from './pages/Landing';
import { getGuestId } from './lib/guest';

const Identify = lazy(()=>import('./pages/Identify'));
const AddPhotos = lazy(()=>import('./pages/AddPhotos'));
const Album = lazy(()=>import('./pages/Album'));
const Tables = lazy(()=>import('./pages/Tables'));

function Loading(){
  return <main className="route-loading"><div className="route-loading-mark">P&T</div><span>A preparar…</span></main>;
}

function GuestGate({next,children}:{next:string;children:ReactNode}){
  const [,nav]=useLocation();
  const guestId=getGuestId();

  useEffect(()=>{
    if(!guestId) nav('/identificar?next='+encodeURIComponent(next));
  },[guestId,nav,next]);

  if(!guestId) return <Loading/>;
  return <>{children}</>;
}

export default function App(){
  return <Switch>
    <Route path="/" component={Landing}/>
    <Route path="/identificar"><Suspense fallback={<Loading/>}><Identify/></Suspense></Route>
    <Route path="/adicionar"><GuestGate next="/adicionar"><Suspense fallback={<Loading/>}><AddPhotos/></Suspense></GuestGate></Route>
    <Route path="/album"><GuestGate next="/album"><Suspense fallback={<Loading/>}><Album/></Suspense></GuestGate></Route>
    <Route path="/mesas"><GuestGate next="/mesas"><Suspense fallback={<Loading/>}><Tables/></Suspense></GuestGate></Route>
    <Route><Landing/></Route>
  </Switch>;
}
