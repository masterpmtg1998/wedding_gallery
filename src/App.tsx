import { Route, Switch } from 'wouter';
import Landing from './pages/Landing';
import Identify from './pages/Identify';
import AddPhotos from './pages/AddPhotos';
import Album from './pages/Album';
import MyPhotos from './pages/MyPhotos';
import Admin from './pages/Admin';

export default function App(){
  return <Switch>
    <Route path="/" component={Landing}/>
    <Route path="/identificar" component={Identify}/>
    <Route path="/adicionar" component={AddPhotos}/>
    <Route path="/album" component={Album}/>
    <Route path="/minhas-fotos" component={MyPhotos}/>
    <Route path="/admin" component={Admin}/>
    <Route><Landing/></Route>
  </Switch>;
}
