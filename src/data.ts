export type Guest = { id:number; name:string; active:boolean };
export type Moment = { id:number; name:string; active:boolean };
export type LocalPhoto = {
  id:string;
  url:string;
  momentId:number;
  personIds:number[];
  uploaderGuestId:number | null;
  createdAt:string;
};

export const guests: Guest[] = [
  { id: 1, name: 'Pedro Gomes', active: true },
  { id: 2, name: 'Tânia', active: true },
  { id: 3, name: 'Ana Silva', active: true },
  { id: 4, name: 'João Costa', active: true },
  { id: 5, name: 'Maria Gomes', active: true },
];

export const moments: Moment[] = [
  { id: 1, name: 'Preparativos', active: true },
  { id: 2, name: 'Cerimónia', active: true },
  { id: 3, name: 'Cocktail', active: true },
  { id: 4, name: 'Jantar', active: true },
  { id: 5, name: 'Discursos', active: true },
  { id: 6, name: 'Primeira dança', active: true },
  { id: 7, name: 'Festa', active: true },
  { id: 8, name: 'Corte do bolo', active: true },
];

export const loadGuest = () => {
  const v = localStorage.getItem('wedding_guest_id');
  return v ? Number(v) : null;
};

export const saveGuest = (id:number) => localStorage.setItem('wedding_guest_id', String(id));

export const loadPhotos = ():LocalPhoto[] => {
  try { return JSON.parse(localStorage.getItem('wedding_photos') || '[]'); } catch { return []; }
};

export const savePhotos = (photos:LocalPhoto[]) => localStorage.setItem('wedding_photos', JSON.stringify(photos));
