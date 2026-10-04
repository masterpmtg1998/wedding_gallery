const GUEST_VERSION='3';
function scope(){
 const match=window.location.pathname.match(/^\/w\/([^/]+)/);
 return match?decodeURIComponent(match[1]):'legacy';
}
function key(name:string){return 'wedding_'+scope()+'_'+name}
export function getGuestId(){
 if(localStorage.getItem(key('guest_version'))!==GUEST_VERSION)return null;
 const value=localStorage.getItem(key('guest_id')); return value?Number(value):null;
}
export function setGuestId(id:number){localStorage.setItem(key('guest_id'),String(id));localStorage.setItem(key('guest_version'),GUEST_VERSION)}
export function clearGuestId(){localStorage.removeItem(key('guest_id'));localStorage.removeItem(key('guest_version'))}
