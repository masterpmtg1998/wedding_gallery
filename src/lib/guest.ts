const GUEST_VERSION='2';

export function getGuestId() {
  if(localStorage.getItem('wedding_guest_version')!==GUEST_VERSION) return null;
  const value=localStorage.getItem('wedding_guest_id');
  return value ? Number(value) : null;
}

export function setGuestId(id:number) {
  localStorage.setItem('wedding_guest_id',String(id));
  localStorage.setItem('wedding_guest_version',GUEST_VERSION);
}

export function clearGuestId() {
  localStorage.removeItem('wedding_guest_id');
  localStorage.removeItem('wedding_guest_version');
}
