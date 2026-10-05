import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import CommercialLanding from './pages/CommercialLanding';
import Landing from './pages/Landing';
import { getGuestId } from './lib/guest';
import { getPublicWedding, readGuestExperienceSettings, type GuestExperienceSettings } from './api';

const Identify=lazy(()=>import('./pages/Identify'));
const AddPhotos=lazy(()=>import('./pages/AddPhotos'));
const Album=lazy(()=>import('./pages/Album'));
const Tables=lazy(()=>import('./pages/Tables'));
const Portal=lazy(()=>import('./pages/Portal'));
const SellerOnboarding=lazy(()=>import('./pages/SellerOnboarding'));

function Loading(){return <main className="route-loading"><div className="route-loading-mark">M</div><span>A preparar…</span></main>}
function GuestGate({next,children}:{next:string;children:ReactNode}){
 const [,nav]=useLocation(); const guestId=getGuestId();
 useEffect(()=>{if(!guestId)nav(next)},[guestId,nav,next]);
 if(!guestId)return <Loading/>; return <>{children}</>;
}
function FeatureUnavailable(){return <main className="route-loading"><div className="route-loading-mark">✦</div><strong>Esta área não está disponível.</strong><span>Os noivos ainda não a publicaram.</span></main>}
function PublicFeatureGate({slug,feature,children}:{slug:string;feature:keyof GuestExperienceSettings;children:ReactNode}){
 const [allowed,setAllowed]=useState<boolean|null>(null);
 useEffect(()=>{let live=true;(async()=>{try{const w=await getPublicWedding(slug);const settings=readGuestExperienceSettings(w?.settings);if(live)setAllowed(Boolean(w)&&settings.published&&(feature==='published'||settings[feature]))}catch{if(live)setAllowed(false)}})();return()=>{live=false}},[slug,feature]);
 if(allowed===null)return <Loading/>; if(!allowed)return <FeatureUnavailable/>; return <>{children}</>;
}
export default function App(){
 return <Switch>
  <Route path="/" component={CommercialLanding}/>
  <Route path="/portal/:section"><Suspense fallback={<Loading/>}><Portal/></Suspense></Route>
  <Route path="/portal"><Suspense fallback={<Loading/>}><Portal/></Suspense></Route>
  <Route path="/vender"><Suspense fallback={<Loading/>}><SellerOnboarding/></Suspense></Route>

  <Route path="/w/:slug">{params=><PublicFeatureGate slug={params.slug} feature="published"><Landing/></PublicFeatureGate>}</Route>
  <Route path="/w/:slug/identificar">{params=><PublicFeatureGate slug={params.slug} feature="published"><Suspense fallback={<Loading/>}><Identify/></Suspense></PublicFeatureGate>}</Route>
  <Route path="/w/:slug/adicionar">{params=><PublicFeatureGate slug={params.slug} feature="uploads"><GuestGate next={'/w/'+params.slug+'/identificar?next='+encodeURIComponent('/w/'+params.slug+'/adicionar')}><Suspense fallback={<Loading/>}><AddPhotos/></Suspense></GuestGate></PublicFeatureGate>}</Route>
  <Route path="/w/:slug/album">{params=><PublicFeatureGate slug={params.slug} feature="album"><GuestGate next={'/w/'+params.slug+'/identificar?next='+encodeURIComponent('/w/'+params.slug+'/album')}><Suspense fallback={<Loading/>}><Album/></Suspense></GuestGate></PublicFeatureGate>}</Route>
  <Route path="/w/:slug/mesas">{params=><PublicFeatureGate slug={params.slug} feature="tables"><GuestGate next={'/w/'+params.slug+'/identificar?next='+encodeURIComponent('/w/'+params.slug+'/mesas')}><Suspense fallback={<Loading/>}><Tables/></Suspense></GuestGate></PublicFeatureGate>}</Route>

  <Route path="/identificar"><Suspense fallback={<Loading/>}><Identify/></Suspense></Route>
  <Route path="/adicionar"><GuestGate next="/identificar?next=/adicionar"><Suspense fallback={<Loading/>}><AddPhotos/></Suspense></GuestGate></Route>
  <Route path="/album"><GuestGate next="/identificar?next=/album"><Suspense fallback={<Loading/>}><Album/></Suspense></GuestGate></Route>
  <Route path="/mesas"><GuestGate next="/identificar?next=/mesas"><Suspense fallback={<Loading/>}><Tables/></Suspense></GuestGate></Route>
  <Route component={CommercialLanding}/>
 </Switch>;
}
