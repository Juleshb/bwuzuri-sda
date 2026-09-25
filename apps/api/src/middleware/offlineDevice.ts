import type {NextFunction,Response} from 'express';
import {db} from '../index.js';
import type {AuthedRequest} from './auth.js';

// Normal online writes do not require an approved offline device. A write replayed
// from the offline queue MUST carry X-Offline-Operation-Id and is accepted only
// when the authenticated user owns an approved, non-revoked device.
export async function requireApprovedOfflineDevice(req:AuthedRequest,res:Response,next:NextFunction){
  const operationId=String(req.header('x-offline-operation-id')||'').trim();
  if(!operationId) return next();
  const deviceId=String(req.header('x-device-id')||'').trim();
  if(!deviceId) return res.status(403).json({message:'Approved device required for offline synchronization'});
  const device=await db.trustedDevice.findFirst({where:{deviceId,userId:req.user!.id,isApproved:true,revokedAt:null}});
  if(!device) return res.status(403).json({message:'This device is not approved for offline synchronization'});
  await db.trustedDevice.update({where:{id:device.id},data:{lastSeenAt:new Date()}});
  next();
}
