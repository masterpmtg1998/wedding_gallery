import { lazy, Suspense } from 'react';
import { Route, Switch } from 'wouter';
import Landing from './pages/Landing';

const Identify = lazy(()=>import('./pages/Identify'));
const AddPhotos = lazy(()=>import('./pages/AddPhotos'));
const Album = lazy(()=>import('./pages/Album'));
const Tables = lazy(()=>import('./pages/Tables'));
const Admin = lazy(()=>import('./pages/Admin'));

function Loading(){
  return <main className="route-loading"><div className="route-loading-mark">P&T</div><span>A preparar…</span></main>;
}

export default function App(){
  return <Switch>
    <Route path="/" component={Landing}/>
    <Route path="/identificar"><Suspense fallback={<Loading/>}><Identify/></Suspense></Route>
    <Route path="/adicionar"><Suspense fallback={<Loading/>}><AddPhotos/></Suspense></Route>
    <Route path="/album"><Suspense fallback={<Loading/>}><Album/></Suspense></Route>
    <Route path="/mesas"><Suspense fallback={<Loading/>}><Tables/></Suspense></Route>
    <Route path="/admin"><Suspense fallback={<Loading/>}><Admin/></Suspense></Route>
    <Route><Landing/></Route>
  </Switch>;
}
