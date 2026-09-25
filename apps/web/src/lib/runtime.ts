export const runtime = {
  isDesktop: navigator.userAgent.toLowerCase().includes('electron'),
  isInstalledPwa: window.matchMedia('(display-mode: standalone)').matches,
  isOnline: () => navigator.onLine,
};
export function watchConnectivity(cb:(online:boolean)=>void){
  const f=()=>cb(navigator.onLine); window.addEventListener('online',f); window.addEventListener('offline',f);
  return()=>{window.removeEventListener('online',f);window.removeEventListener('offline',f)};
}
