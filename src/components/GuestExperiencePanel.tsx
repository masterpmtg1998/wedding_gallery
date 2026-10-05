import { useState } from 'react';
import { ExternalLink, Eye, EyeOff, Images, MapPin, QrCode, Smartphone } from 'lucide-react';
import { readGuestExperienceSettings, updateGuestExperienceSettings, type GuestExperienceSettings } from '../api';

type Props={wedding:any;onChanged?:(settings:any)=>void};

export default function GuestExperiencePanel({wedding,onChanged}:Props){
  const [value,setValue]=useState<GuestExperienceSettings>(()=>readGuestExperienceSettings(wedding.settings));
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState('');
  const base=window.location.origin+'/w/'+wedding.slug;

  async function change(key:keyof GuestExperienceSettings,next:boolean){
    const updated={...value,[key]:next};
    setValue(updated); setSaving(true); setMessage('');
    try{
      const settings=await updateGuestExperienceSettings(wedding.id,updated);
      onChanged?.(settings);
      setMessage('Alterações guardadas.');
    }catch(e:any){
      setValue(value);
      setMessage(e.message||'Não foi possível guardar.');
    }finally{setSaving(false)}
  }

  const rows:[
    keyof GuestExperienceSettings,string,string,React.ReactNode
  ][]=[
    ['published','Página dos convidados','Disponibiliza ou retira a experiência pública do casamento.',<Smartphone size={18}/>],
    ['uploads','Publicar fotografias','Mostra aos convidados a opção para carregar fotografias.',<QrCode size={18}/>],
    ['album','Ver álbum','Mostra o álbum partilhado aos convidados.',<Images size={18}/>],
    ['tables','Ver mesas','Mostra a área de mesas e a mesa atribuída ao convidado.',<MapPin size={18}/>],
  ];

  return <div className="guest-space-shell">
    <section className="portal-card guest-space-hero">
      <div className="portal-section-title"><div><span>Special day</span><h2>Espaço dos convidados</h2><p>Controla exatamente o que os convidados podem ver quando entram pelo QR.</p></div><Smartphone size={25}/></div>
      <div className="guest-site-url">
        <div><span>Página pública</span><code>{base}</code></div>
        <a href={base} target="_blank" rel="noreferrer"><ExternalLink size={15}/> Abrir</a>
      </div>
      <div className={'guest-publish-state '+(value.published?'live':'hidden')}>
        {value.published?<Eye size={16}/>:<EyeOff size={16}/>}
        <span>{value.published?'Página publicada':'Página oculta'}</span>
      </div>
    </section>

    <section className="portal-card">
      <div className="portal-section-title"><div><span>Visibilidade</span><h2>O que aparece aos convidados</h2><p>Podes alterar isto a qualquer momento, inclusive durante o próprio casamento.</p></div></div>
      <div className="guest-toggle-list">
        {rows.map(([key,title,copy,icon])=><div className="guest-toggle-row" key={key}>
          <div className="guest-toggle-icon">{icon}</div>
          <div><strong>{title}</strong><span>{copy}</span></div>
          <button type="button" className={'toggle '+(value[key]?'on':'')} aria-pressed={value[key]} disabled={saving||(key!=='published'&&!value.published)} onClick={()=>change(key,!value[key])}><span/></button>
        </div>)}
      </div>
      {message&&<p className="portal-message">{message}</p>}
    </section>

    <section className="portal-card guest-preview-links">
      <div className="portal-section-title"><div><span>Pré-visualizar</span><h2>Atalhos do espaço público</h2></div></div>
      <div className="guest-preview-grid">
        <a href={base} target="_blank" rel="noreferrer"><Smartphone/><strong>Página inicial</strong><span>Experiência que abre pelo QR</span></a>
        <a href={base+'/adicionar'} target="_blank" rel="noreferrer" className={!value.uploads?'disabled':''}><QrCode/><strong>Publicar</strong><span>Upload de fotografias</span></a>
        <a href={base+'/album'} target="_blank" rel="noreferrer" className={!value.album?'disabled':''}><Images/><strong>Álbum</strong><span>Fotografias partilhadas</span></a>
        <a href={base+'/mesas'} target="_blank" rel="noreferrer" className={!value.tables?'disabled':''}><MapPin/><strong>Mesas</strong><span>Consulta do seating plan</span></a>
      </div>
    </section>
  </div>;
}
