import { ArrowRight, Camera, QrCode, UsersRound } from 'lucide-react';
import { Link } from 'wouter';

export default function CommercialLanding(){
  return <main className="commercial-landing">
    <header className="commercial-nav"><strong>Memórias</strong><Link href="/portal">Entrar</Link></header>
    <section className="commercial-hero">
      <span className="landing-kicker">O casamento visto por todos</span>
      <h1>As fotografias dos teus convidados.<br/><em>Num só lugar.</em></h1>
      <p>Cria o espaço do teu casamento, partilha um QR Code e recebe as fotografias de todos sem contas, apps ou complicações.</p>
      <div className="commercial-actions"><Link href="/portal" className="primary">Criar casamento <ArrowRight size={17}/></Link><Link href="/portal" className="commercial-login">Já tenho conta</Link></div>
    </section>
    <section className="commercial-features">
      <article><QrCode/><strong>Um QR para o teu dia</strong><span>Link, QR Code e material pronto para imprimir.</span></article>
      <article><Camera/><strong>Fotos sem instalar nada</strong><span>Os convidados abrem, escolhem o nome e publicam.</span></article>
      <article><UsersRound/><strong>Gestão num só portal</strong><span>Convidados, mesas, fotografias e personalização.</span></article>
    </section>
  </main>;
}