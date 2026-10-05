import { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, QrCode as QrIcon, ShoppingBag } from 'lucide-react';

type Props={wedding:any};

type TemplateKey='editorial'|'minimal'|'botanical'|'night'|'classic'|'party';
const templates:{key:TemplateKey;name:string;subtitle:string;className:string}[]=[
  {key:'editorial',name:'Editorial',subtitle:'Elegante e contemporâneo',className:'qr-editorial'},
  {key:'minimal',name:'Minimal',subtitle:'Limpo e discreto',className:'qr-minimal'},
  {key:'botanical',name:'Botanical',subtitle:'Verde e romântico',className:'qr-botanical'},
  {key:'night',name:'Night',subtitle:'Escuro e premium',className:'qr-night'},
  {key:'classic',name:'Classic',subtitle:'Formal e intemporal',className:'qr-classic'},
  {key:'party',name:'Party',subtitle:'Mais descontraído',className:'qr-party'},
];

export default function QRPrintStudio({wedding}:Props){
  const [qrUrl,setQrUrl]=useState('');
  const [selected,setSelected]=useState<TemplateKey>('editorial');
  const [message,setMessage]=useState('');
  const publicUrl=useMemo(()=>window.location.origin+'/w/'+wedding.slug,[wedding.slug]);
  const couple=(wedding.couple_names||'O nosso casamento').replace('&','&');

  useEffect(()=>{let live=true;QRCode.toDataURL(publicUrl,{width:720,margin:1,errorCorrectionLevel:'H'}).then(v=>live&&setQrUrl(v)).catch(()=>live&&setMessage('Não foi possível gerar o QR.'));return()=>{live=false}},[publicUrl]);

  function downloadQr(){
    if(!qrUrl)return;
    const a=document.createElement('a');a.href=qrUrl;a.download='qr-'+wedding.slug+'.png';a.click();
  }
  function printCard(){
    setMessage('');
    setTimeout(()=>window.print(),20);
  }

  return <section className="portal-card qr-studio">
    <div className="portal-section-title"><div><span>QR & materiais</span><h2>Gerar QR para o casamento</h2><p>Escolhe um modelo, imprime e coloca nas mesas, bar, photobooth ou zona de receção.</p></div><QrIcon size={24}/></div>

    <div className="qr-studio-layout">
      <div className="qr-template-picker">
        {templates.map(t=><button key={t.key} className={selected===t.key?'active':''} onClick={()=>setSelected(t.key)}>
          <strong>{t.name}</strong><span>{t.subtitle}</span>
        </button>)}
      </div>

      <div className="qr-preview-wrap">
        <article className={'qr-print-card '+templates.find(t=>t.key===selected)!.className}>
          <div className="qr-print-eyebrow">PARTILHA CONNOSCO</div>
          <h3>{couple}</h3>
          <p>Fotografa. Publica. Revive este dia connosco.</p>
          <div className="qr-code-box">{qrUrl?<img src={qrUrl} alt="QR code do casamento"/>:<div className="qr-loading">A gerar QR…</div>}</div>
          <strong className="qr-scan">Aponta a câmara e entra</strong>
          <small>{new Date(wedding.wedding_date+'T12:00:00').toLocaleDateString('pt-PT',{day:'2-digit',month:'long',year:'numeric'})}</small>
        </article>
      </div>
    </div>

    <div className="qr-actions">
      <button className="primary" onClick={printCard}><Printer size={15}/> Imprimir modelo</button>
      <button onClick={downloadQr}><Download size={15}/> Descarregar QR</button>
    </div>
    {message&&<p className="portal-message">{message}</p>}

    <div className="qr-commerce-note">
      <ShoppingBag size={18}/>
      <div><strong>Pronto para a futura loja</strong><span>Estes modelos podem depois alimentar produtos físicos: placas acrílicas, cartões de mesa, autocolantes, porta-retratos, photobooth signs ou packs impressos.</span></div>
    </div>
  </section>;
}
