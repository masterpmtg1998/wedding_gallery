export function getWeddingSlug(){
  const match=window.location.pathname.match(/^\/w\/([^/]+)/);
  return match?decodeURIComponent(match[1]):'pedro-tania';
}
export function weddingBase(){
  const match=window.location.pathname.match(/^\/w\/([^/]+)/);
  return match?`/w/${match[1]}`:'';
}
export function weddingPath(path='/'){
  const base=weddingBase();
  if(!base)return path;
  return base+(path==='/'?'':path);
}
