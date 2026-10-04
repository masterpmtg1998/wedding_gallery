import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import CommercialLanding from './pages/CommercialLanding';
import Landing from './pages/Landing';
import { getGuestId } from './lib/guest';

const Identify=lazy(()=>import('./pages/Identify'));
const AddPhotos=lazy(()=>import('./pages/AddPhotos'));
const Album=lazy(()=>import('./pages/Album'));
const Tables=lazy(()=>import('./pages/Tables'));
const Portal=lazy(()=>import('./pages/Portal'));

function Loading(){return <main className="route-loading"><div className="route-loading-mark">M</div><span>A preparar…</span></main>}
function GuestGate({next,children}:{next:string;children:ReactNode}){
 const [,nav]=useLocation(); const guestId=getGuestId();
 useEffect(()=>{if(!guestId)nav(next)},[guestId,nav,next]);
 if(!guestId)return <Loading/>; return <>{children}</>;
}
export default function App(){
 return <Switch>
  <Route path="/" component={CommercialLanding}/>
  <Route path="/portal"><Suspense fallback={<Loading/>}><Portal/></Suspense></Route>

  <Route path="/w/:slug" component={Landing}/>
  <Route path="/w/:slug/identificar"><Suspense fallback={<Loading/>}><Identify/></Suspense></Route>
  <Route path="/w/:slug/adicionar">{params=><GuestGate next={'/w/'+params.slug+'/identificar?next='+encodeURIComponent('/w/'+params.slug+'/adicionar')}><Suspense fallback={<Loading/>}><AddPhotos/></Suspense></GuestGate>}</Route>
  <Route path="/w/:slug/album">{params=><GuestGate next={'/w/'+params.slug+'/identificar?next='+encodeURIComponent('/w/'+params.slug+'/album')}><Suspense fallback={<Loading/>}><Album/></Suspense></GuestGate>}</Route>
  <Route path="/w/:slug/mesas">{params=><GuestGate next={'/w/'+params.slug+'/identificar?next='+encodeURIComponent('/w/'+params.slug+'/mesas')}><Suspense fallback={<Loading/>}><Tables/></Suspense></GuestGate>}</Route>

  <Route path="/identificar"><Suspense fallback={<Loading/>}><Identify/></Suspense></Route>
  <Route path="/adicionar"><GuestGate next="/identificar?next=/adicionar"><Suspense fallback={<Loading/>}><AddPhotos/></Suspense></GuestGate></Route>
  <Route path="/album"><GuestGate next="/identificar?next=/album"><Suspense fallback={<Loading/>}><Album/></Suspense></GuestGate></Route>
  <Route path="/mesas"><GuestGate next="/identificar?next=/mesas"><Suspense fallback={<Loading/>}><Tables/></Suspense></GuestGate></Route>
  <Route component={CommercialLanding}/>
 </Switch>;
}