import Marketplace from './Marketplace';
import { ArrowLeft, Store } from 'lucide-react';

export default function PublicMarketplace(){
  return <main className="public-marketplace-page">
    <header className="public-marketplace-header">
      <a href="/" className="public-marketplace-brand"><span className="public-marketplace-mark"><Store size={17}/></span><div><strong>Wedding Marketplace</strong><small>by Wedding Planner</small></div></a>
      <nav>
        <a href="/">Planner</a>
        <a href="/vender">Quero vender</a>
      </nav>
    </header>
    <div className="public-marketplace-wrap">
      <a className="public-marketplace-back" href="/"><ArrowLeft size={14}/> Voltar</a>
      <Marketplace publicView/>
    </div>
  </main>;
}
