export function getGuestId() {
  const value = localStorage.getItem('wedding_guest_id');
  return value ? Number(value) : null;
}
export function setGuestId(id:number) {
  localStorage.setItem('wedding_guest_id', String(id));
}
