import {Router} from 'express'; import {db} from '../index.js'; import {auth,requireRole,type AuthedRequest} from '../middleware/auth.js'; import {requireApprovedOfflineDevice} from '../middleware/offlineDevice.js'; export const contributionsRouter=Router(); contributionsRouter.use(auth); contributionsRouter.use(requireApprovedOfflineDevice);
const serialize=(x:any):any=>typeof x==='bigint'?x.toString():Array.isArray(x)?x.map(serialize):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,serialize(v)])):x;
contributionsRouter.get('/',async(req:AuthedRequest,res)=>{
 const u=req.user!; const where:any={isCancelled:false};
 if(u.role==='CHURCH')where.churchId=u.churchId;
 else if(u.role==='SECTION')where.sectionIdAtEntry=u.sectionId;
 else if(u.role==='GROUP')where.groupIdAtEntry=u.groupId;
 else if(u.role!=='REGIONAL_LEADER')return res.status(403).json({message:'Not permitted'});
 const rows=serialize(await db.contribution.findMany({where,include:{member:true,contributionType:true},orderBy:{receivedAt:'desc'},take:500}));
 // Individual amounts are private outside Regional Leader and Church data-entry scope.
 if(u.role==='SECTION'||u.role==='GROUP')return res.json(rows.map((r:any)=>{const {amountRwf,...safe}=r;return {...safe,contributed:true}}));
 res.json(rows);
});
contributionsRouter.post('/',requireRole('CHURCH'),async(req:AuthedRequest,res)=>{const u=req.user!;const memberId=req.body.memberId?Number(req.body.memberId):null;let sectionIdAtEntry=null,groupIdAtEntry=null;if(memberId){const m=await db.member.findUnique({where:{id:memberId},include:{group:{include:{section:true}}}});if(!m||m.group.section.churchId!==u.churchId)return res.status(400).json({message:'Member is outside church scope'});sectionIdAtEntry=m.group.sectionId;groupIdAtEntry=m.groupId}try{const row=await db.contribution.create({data:{churchId:u.churchId!,memberId,sectionIdAtEntry,groupIdAtEntry,contributionTypeId:Number(req.body.contributionTypeId),amountRwf:BigInt(req.body.amountRwf),createdByUserId:u.id,submissionId:String(req.body.submissionId),submissionItemIndex:Number(req.body.submissionItemIndex||0)}});res.status(201).json({...row,id:String(row.id),amountRwf:String(row.amountRwf)})}catch{return res.status(409).json({message:'Duplicate submission or invalid contribution'})}});
contributionsRouter.patch('/:id',requireRole('CHURCH'),async(req:AuthedRequest,res)=>{
 const u=req.user!; const id=BigInt(req.params.id);
 const row=await db.contribution.findFirst({where:{id,churchId:u.churchId!,isCancelled:false}});
 if(!row)return res.status(404).json({message:'Contribution not found'});
 const amount=BigInt(req.body.amountRwf); if(amount<=0n)return res.status(400).json({message:'Amount must be greater than 0'});
 const memberId=req.body.memberId?Number(req.body.memberId):null; let sectionIdAtEntry=null,groupIdAtEntry=null;
 if(memberId){const m=await db.member.findUnique({where:{id:memberId},include:{group:{include:{section:true}}}}); if(!m||m.group.section.churchId!==u.churchId)return res.status(400).json({message:'Member is outside church scope'}); sectionIdAtEntry=m.group.sectionId; groupIdAtEntry=m.groupId}
 const updated=await db.contribution.update({where:{id},data:{amountRwf:amount,contributionTypeId:Number(req.body.contributionTypeId),memberId,sectionIdAtEntry,groupIdAtEntry}});
 res.json({...updated,id:String(updated.id),amountRwf:String(updated.amountRwf)});
});
contributionsRouter.post('/:id/cancel',requireRole('CHURCH'),async(req:AuthedRequest,res)=>{
 const id=BigInt(req.params.id); const row=await db.contribution.findFirst({where:{id,churchId:req.user!.churchId!,isCancelled:false}});
 if(!row)return res.status(404).json({message:'Contribution not found'});
 const reason=String(req.body.reason||'').trim(); if(!reason)return res.status(400).json({message:'A cancellation reason is required'});
 const updated=await db.contribution.update({where:{id},data:{isCancelled:true,cancellationReason:reason,cancelledAt:new Date()}});
 res.json({...updated,id:String(updated.id),amountRwf:String(updated.amountRwf)});
});
