import {Router} from 'express';
import {db} from '../index.js';
import {auth,AuthedRequest} from '../middleware/auth.js';
export const devicesRouter=Router(); devicesRouter.use(auth);

devicesRouter.post('/register',async(req:AuthedRequest,res)=>{
 const deviceId=String(req.body?.deviceId||'').trim(),label=String(req.body?.label||'').slice(0,120);
 if(!deviceId)return res.status(400).json({message:'deviceId is required'});
 const existing=await db.trustedDevice.findUnique({where:{deviceId}});
 if(existing && existing.userId!==req.user!.id)return res.status(403).json({message:'This device belongs to another user'});
 const d=existing?await db.trustedDevice.update({where:{deviceId},data:{label,lastSeenAt:new Date()}}):await db.trustedDevice.create({data:{deviceId,userId:req.user!.id,label,lastSeenAt:new Date()}});
 res.status(existing?200:201).json({deviceId:d.deviceId,isApproved:d.isApproved&& !d.revokedAt,approvedAt:d.approvedAt,revokedAt:d.revokedAt});
});
devicesRouter.get('/status/:deviceId',async(req:AuthedRequest,res)=>{
 const d=await db.trustedDevice.findFirst({where:{deviceId:req.params.deviceId,userId:req.user!.id}});
 res.json({registered:!!d,isApproved:!!d?.isApproved&&!d?.revokedAt,approvedAt:d?.approvedAt??null,revokedAt:d?.revokedAt??null});
});
devicesRouter.get('/',async(req:AuthedRequest,res)=>{
 if(req.user!.role!=='REGIONAL_LEADER')return res.status(403).json({message:'Regional Leader only'});
 res.json(await db.trustedDevice.findMany({include:{user:{select:{id:true,username:true,fullName:true,role:true}}},orderBy:{createdAt:'desc'}}));
});
devicesRouter.post('/:id/approve',async(req:AuthedRequest,res)=>{
 if(req.user!.role!=='REGIONAL_LEADER')return res.status(403).json({message:'Regional Leader only'});
 const id=Number(req.params.id); res.json(await db.trustedDevice.update({where:{id},data:{isApproved:true,approvedAt:new Date(),revokedAt:null}}));
});
devicesRouter.post('/:id/revoke',async(req:AuthedRequest,res)=>{
 if(req.user!.role!=='REGIONAL_LEADER')return res.status(403).json({message:'Regional Leader only'});
 const id=Number(req.params.id); res.json(await db.trustedDevice.update({where:{id},data:{isApproved:false,revokedAt:new Date()}}));
});
