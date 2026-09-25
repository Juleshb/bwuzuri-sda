import {deviceId} from './offline';
const base=import.meta.env.VITE_API_URL||'http://localhost:8080/api';
export class ApiError extends Error{constructor(public status:number,message:string){super(message);this.name='ApiError'}}
export async function api(path:string,init:RequestInit={}){
 const token=localStorage.getItem('token');
 const r=await fetch(base+path,{...init,headers:{'Content-Type':'application/json','X-Device-Id':deviceId(),...(token?{Authorization:`Bearer ${token}`}:{}) ,...(init.headers||{})}});
 if(!r.ok){const payload=await r.json().catch(()=>({}));if(r.status===401&&token){localStorage.removeItem('token');localStorage.removeItem('user');window.dispatchEvent(new Event('bwuzuri:session-expired'))}throw new ApiError(r.status,payload.message||'Request failed')}
 if(r.status===204)return null;
 const text=await r.text();return text?JSON.parse(text):null;
}
