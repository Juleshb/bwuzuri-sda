import {Router} from 'express';
import {db} from '../index.js';
import {auth,AuthedRequest} from '../middleware/auth.js';
export const syncRouter=Router(); syncRouter.use(auth);

async function approvedDevice(req:AuthedRequest,res:any,next:any){ const deviceId=String(req.header('x-device-id')||'').trim(); if(!deviceId)return res.status(403).json({message:'Approved device required for synchronization'}); const d=await db.trustedDevice.findFirst({where:{deviceId,userId:req.user!.id,isApproved:true,revokedAt:null}}); if(!d)return res.status(403).json({message:'This device is not approved for offline synchronization'}); await db.trustedDevice.update({where:{id:d.id},data:{lastSeenAt:new Date()}}); next(); }

syncRouter.use(approvedDevice);
syncRouter.post('/receipt',async(req,res)=>{
  const {operationId}=req.body||{}; const sourceDeviceId=String(req.header('x-device-id')||'').trim();
  if(!operationId)return res.status(400).json({message:'operationId is required'});
  const existing=await db.syncReceipt.findUnique({where:{operationId}});
  if(existing)return res.json({ok:true,duplicate:true,appliedAtUtc:existing.appliedAtUtc});
  const row=await db.syncReceipt.create({data:{operationId,sourceDeviceId:sourceDeviceId||null}});
  res.status(201).json({ok:true,duplicate:false,appliedAtUtc:row.appliedAtUtc});
});

function memberScope(u:NonNullable<AuthedRequest['user']>){
  if(u.role==='REGIONAL_LEADER') return {};
  if(u.role==='CHURCH') return {group:{section:{churchId:u.churchId!}}};
  if(u.role==='SECTION') return {group:{sectionId:u.sectionId!}};
  if(u.role==='GROUP') return {groupId:u.groupId!};
  return {id:-1};
}
function contributionScope(u:NonNullable<AuthedRequest['user']>){
  if(u.role==='REGIONAL_LEADER') return {};
  if(u.role==='CHURCH') return {churchId:u.churchId!};
  if(u.role==='SECTION') return {sectionIdAtEntry:u.sectionId!};
  if(u.role==='GROUP') return {groupIdAtEntry:u.groupId!};
  return {id:-1};
}
function sabbathScope(u:NonNullable<AuthedRequest['user']>){
  if(u.role==='REGIONAL_LEADER') return {};
  if(u.role==='CHURCH') return {churchId:u.churchId!};
  if(u.role==='SECTION') return {sectionId:u.sectionId!};
  if(u.role==='GROUP') return {groupId:u.groupId!};
  return {id:-1};
}

syncRouter.get('/changes',async(req:AuthedRequest,res)=>{
  const since=req.query.since?new Date(String(req.query.since)):new Date(0);
  if(Number.isNaN(since.getTime()))return res.status(400).json({message:'Invalid since'});
  const u=req.user!;
  const [members,contributions,sabbathSchool]=await Promise.all([
    db.member.findMany({where:{...memberScope(u),updatedAt:{gt:since}},orderBy:{updatedAt:'asc'},take:1000}),
    db.contribution.findMany({where:{...contributionScope(u),receivedAt:{gt:since}},orderBy:{receivedAt:'asc'},take:1000}),
    db.sabbathSchoolEntry.findMany({where:{...sabbathScope(u),updatedAt:{gt:since}},orderBy:{updatedAt:'asc'},take:1000})
  ]);
  const contributionRows=contributions.map(x=>{
    const base={...x,id:x.id.toString(),amountRwf:x.amountRwf.toString()};
    // Igihande/Itsinda offline snapshots must preserve the same amount privacy as reports/API.
    if(u.role==='SECTION'||u.role==='GROUP'){const {amountRwf,createdByUserId,...safe}=base;return safe}
    return base;
  });
  res.json({serverTime:new Date().toISOString(),members,contributions:contributionRows,sabbathSchool});
});
