export type PendingWrite={id:string;path:string;method:'POST'|'PUT'|'PATCH';body:unknown;createdAt:string;status?:'pending'|'needsReview';lastError?:string};
const Q='bwuzuri.offline.queue.v1', DEVICE='bwuzuri.device.id', TRUST='bwuzuri.offline.trusted';
export const deviceId=()=>{let v=localStorage.getItem(DEVICE);if(!v){v=crypto.randomUUID();localStorage.setItem(DEVICE,v)}return v};
export const isOfflineTrusted=()=>localStorage.getItem(TRUST)==='yes';
export const setOfflineTrusted=(v:boolean)=>localStorage.setItem(TRUST,v?'yes':'no');
export async function refreshDeviceTrust(api:(p:string,i?:RequestInit)=>Promise<any>){const id=deviceId();await api('/devices/register',{method:'POST',body:JSON.stringify({deviceId:id})});const s=await api('/devices/status/'+encodeURIComponent(id));setOfflineTrusted(!!s.isApproved);return !!s.isApproved;}
const read=():PendingWrite[]=>{try{const v=JSON.parse(localStorage.getItem(Q)||'[]');return Array.isArray(v)?v:[]}catch{return []}};
const save=(q:PendingWrite[])=>localStorage.setItem(Q,JSON.stringify(q));
export function queueWrite(path:string,method:PendingWrite['method'],body:unknown){if(!isOfflineTrusted())throw new Error('Offline entry is disabled on this device. Connect to the internet and request device approval.');const item:PendingWrite={id:crypto.randomUUID(),path,method,body,createdAt:new Date().toISOString(),status:'pending'};save([...read(),item]);return item;}
export async function flushQueue(send:(x:PendingWrite)=>Promise<unknown>){
 if(!navigator.onLine)return {sent:0,pending:read().filter(x=>x.status!=='needsReview').length,needsReview:read().filter(x=>x.status==='needsReview').length};
 let q=read(),sent=0;
 for(const item of [...q]){
  if(item.status==='needsReview')continue;
  try{await send(item);q=q.filter(x=>x.id!==item.id);save(q);sent++}
  catch(e:any){
   const status=Number(e?.status||0), message=String(e?.message||'Synchronization failed');
   if(status===400||status===409||status===422){q=q.map(x=>x.id===item.id?{...x,status:'needsReview',lastError:message}:x);save(q);continue}
   if(status===401||status===403){if(status===403)setOfflineTrusted(false);break}
   break;
  }
 }
 return {sent,pending:q.filter(x=>x.status!=='needsReview').length,needsReview:q.filter(x=>x.status==='needsReview').length};
}
export const pendingCount=()=>read().filter(x=>x.status!=='needsReview').length;
export const needsReviewCount=()=>read().filter(x=>x.status==='needsReview').length;
