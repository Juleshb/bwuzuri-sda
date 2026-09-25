import {api} from './api'; import {deviceId,flushQueue,PendingWrite,refreshDeviceTrust} from './offline';
export async function syncNow(){
 const trusted=await refreshDeviceTrust(api); if(!trusted)throw new Error('Device awaiting offline approval');
 const pushed=await flushQueue(async(x:PendingWrite)=>{await api(x.path,{method:x.method,headers:{'X-Offline-Operation-Id':x.id},body:JSON.stringify({...((x.body as any)||{}),submissionId:(x.body as any)?.submissionId||x.id})});await api('/sync/receipt',{method:'POST',body:JSON.stringify({operationId:x.id,sourceDeviceId:deviceId()})})});
 const since=localStorage.getItem('bwuzuri.sync.last')||new Date(0).toISOString(); const changes=await api('/sync/changes?since='+encodeURIComponent(since));
 localStorage.setItem('bwuzuri.sync.last',changes.serverTime); localStorage.setItem('bwuzuri.sync.snapshot',JSON.stringify(changes)); return {...pushed,pulledAt:changes.serverTime};
}
