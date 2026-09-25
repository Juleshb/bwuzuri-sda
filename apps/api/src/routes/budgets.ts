import {Router} from 'express';
import {db} from '../index.js';
import {auth,requireRole,type AuthedRequest} from '../middleware/auth.js'; import {requireApprovedOfflineDevice} from '../middleware/offlineDevice.js';
export const budgetsRouter=Router(); budgetsRouter.use(auth); budgetsRouter.use(requireApprovedOfflineDevice);
const bi=(v:any)=>BigInt(String(v??0));
const serialize=(x:any):any=>typeof x==='bigint'?x.toString():x instanceof Date?x.toISOString():Array.isArray(x)?x.map(serialize):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,serialize(v)])):x;
function scopeWhere(u:any){const w:any={}; if(u.role==='CHURCH')w.churchId=u.churchId; if(u.role==='SECTION')w.sectionIdAtEntry=u.sectionId; if(u.role==='GROUP')w.groupIdAtEntry=u.groupId; return w}
async function achievement(metric:any,b:any,u:any){
 if(!metric.contributionTypeId)return 0n;
 const a=await db.contribution.aggregate({_sum:{amountRwf:true},where:{...scopeWhere(u),contributionTypeId:metric.contributionTypeId,isCancelled:false,receivedAt:{gte:b.startDate,lte:b.endDate}}}); return a._sum.amountRwf??0n;
}
async function target(metric:any,u:any){
 if(u.role==='CHURCH')return (await db.budgetChurchAllocation.findUnique({where:{budgetMetricId_churchId:{budgetMetricId:metric.id,churchId:u.churchId}}}))?.targetValue??0n;
 if(u.role==='SECTION')return (await db.budgetSectionAllocation.findUnique({where:{budgetMetricId_sectionId:{budgetMetricId:metric.id,sectionId:u.sectionId}}}))?.targetValue??0n;
 if(u.role==='GROUP')return (await db.budgetGroupAllocation.findUnique({where:{budgetMetricId_groupId:{budgetMetricId:metric.id,groupId:u.groupId}}}))?.targetValue??0n;
 const a=await db.budgetChurchAllocation.aggregate({_sum:{targetValue:true},where:{budgetMetricId:metric.id}}); return a._sum.targetValue??0n;
}
budgetsRouter.get('/',async(req:AuthedRequest,res)=>{const rows=await db.budget.findMany({include:{metrics:true},orderBy:{startDate:'desc'}}); const out=[];for(const b of rows){const metrics=[];for(const m of b.metrics){const t=await target(m,req.user!);let a=await achievement(m,b,req.user!);if(!m.contributionTypeId){const w:any={budgetMetricId:m.id};const u=req.user!;if(u.role==='CHURCH')w.churchId=u.churchId;if(u.role==='SECTION')w.sectionId=u.sectionId;if(u.role==='GROUP')w.groupId=u.groupId;const q=await db.budgetAchievement.aggregate({_sum:{quantity:true},where:w});a=q._sum.quantity??0n}const rem=t>a? t-a:0n;metrics.push({...m,target:t,achievement:a,remaining:rem,percentage:t===0n?0:Number(a*10000n/t)/100})}out.push({...b,metrics})}res.json(serialize(out))});
budgetsRouter.post('/',requireRole('REGIONAL_LEADER'),async(req:AuthedRequest,res)=>{const{name,startDate,endDate}=req.body;const submissionId=String(req.body.submissionId||'').trim();if(submissionId.length<8)return res.status(400).json({message:'submissionId is required'});const duplicate=await db.budget.findUnique({where:{submissionId}});if(duplicate)return res.json(duplicate);if(!name||!startDate||!endDate||new Date(endDate)<new Date(startDate))return res.status(400).json({message:'Valid name and date range required'});res.status(201).json(await db.budget.create({data:{name,startDate:new Date(startDate),endDate:new Date(endDate),submissionId}}))});
budgetsRouter.patch('/:id/status',requireRole('REGIONAL_LEADER'),async(req,res)=>{const id=Number(req.params.id);const b=await db.budget.findUnique({where:{id}});if(!b)return res.status(404).json({message:'Budget not found'});const next:Record<string,string>={Draft:'Active',Active:'Completed',Completed:'Archived'};if(req.body.status!==next[b.status])return res.status(400).json({message:`Invalid lifecycle transition: ${b.status} -> ${String(req.body.status)}`});res.json(await db.budget.update({where:{id},data:{status:req.body.status,completedAt:req.body.status==='Completed'?new Date():b.completedAt}}))});
budgetsRouter.post('/:id/metrics',requireRole('REGIONAL_LEADER'),async(req,res)=>{const budgetId=Number(req.params.id);const{name,unit='RWF',targetQuantity=0,unitPriceRwf,contributionTypeId}=req.body;if(!Number.isInteger(budgetId))return res.status(400).json({message:'Valid budget is required'});const budget=await db.budget.findUnique({where:{id:budgetId}});if(!budget)return res.status(404).json({message:'Budget not found'});if(budget.status!=='Draft')return res.status(400).json({message:'Metrics can only be changed while the budget is Draft'});if(!String(name||'').trim())return res.status(400).json({message:'Metric name is required'});const qty=bi(targetQuantity);const price=unitPriceRwf==null||unitPriceRwf===''?null:bi(unitPriceRwf);if(qty<0n||price!==null&&price<0n)return res.status(400).json({message:'Targets and unit price must not be negative'});if(contributionTypeId){const ct=await db.contributionType.findUnique({where:{id:Number(contributionTypeId)}});if(!ct)return res.status(400).json({message:'Contribution type not found'})}res.status(201).json(serialize(await db.budgetMetric.create({data:{budgetId,name:String(name).trim(),unit:String(unit||'RWF').trim()||'RWF',targetQuantity:qty,unitPriceRwf:price,contributionTypeId:contributionTypeId?Number(contributionTypeId):null}})))});
budgetsRouter.put('/metrics/:metricId/allocations',requireRole('REGIONAL_LEADER'),async(req,res)=>{const mid=Number(req.params.metricId);const metric=await db.budgetMetric.findUnique({where:{id:mid},include:{budget:true}});if(!metric)return res.status(404).json({message:'Budget metric not found'});if(metric.budget.status!=='Draft')return res.status(400).json({message:'Allocations can only be changed while the budget is Draft'});const {church=[],section=[],group=[],member=[]}=req.body;await db.$transaction(async tx=>{for(const x of church)await tx.budgetChurchAllocation.upsert({where:{budgetMetricId_churchId:{budgetMetricId:mid,churchId:Number(x.id)}},create:{budgetMetricId:mid,churchId:Number(x.id),targetValue:bi(x.target)},update:{targetValue:bi(x.target)}});for(const x of section)await tx.budgetSectionAllocation.upsert({where:{budgetMetricId_sectionId:{budgetMetricId:mid,sectionId:Number(x.id)}},create:{budgetMetricId:mid,sectionId:Number(x.id),targetValue:bi(x.target)},update:{targetValue:bi(x.target)}});for(const x of group)await tx.budgetGroupAllocation.upsert({where:{budgetMetricId_groupId:{budgetMetricId:mid,groupId:Number(x.id)}},create:{budgetMetricId:mid,groupId:Number(x.id),targetValue:bi(x.target)},update:{targetValue:bi(x.target)}});for(const x of member)await tx.budgetMemberAllocation.upsert({where:{budgetMetricId_memberId:{budgetMetricId:mid,memberId:Number(x.id)}},create:{budgetMetricId:mid,groupId:Number(x.groupId),memberId:Number(x.id),targetValue:bi(x.target)},update:{targetValue:bi(x.target),groupId:Number(x.groupId)}})});res.json({ok:true})});
budgetsRouter.post('/metrics/:metricId/achievement',requireRole('REGIONAL_LEADER','CHURCH','SECTION','GROUP'),async(req:AuthedRequest,res)=>{
 const m=await db.budgetMetric.findUnique({where:{id:Number(req.params.metricId)}});
 if(!m||m.contributionTypeId)return res.status(400).json({message:'Manual achievement is only for non-financial metrics'});
 const u=req.user!; const quantity=bi(req.body.quantity);
 if(quantity<0n)return res.status(400).json({message:'quantity must not be negative'});
 let churchId:number|undefined=u.churchId??undefined; let sectionId:number|undefined=u.sectionId??undefined; let groupId:number|undefined=u.groupId??undefined; let memberId:number|undefined=req.body.memberId?Number(req.body.memberId):undefined;
 if(u.role==='REGIONAL_LEADER'){churchId=Number(req.body.churchId)||undefined;sectionId=req.body.sectionId?Number(req.body.sectionId):undefined;groupId=req.body.groupId?Number(req.body.groupId):undefined}
 if(!churchId)return res.status(400).json({message:'churchId is required'});
 // Resolve every requested lower scope through the hierarchy; never trust client-provided nested IDs.
 if(sectionId){const section=await db.section.findFirst({where:{id:sectionId,churchId,isActive:true}});if(!section)return res.status(400).json({message:'Section is outside the permitted church scope'})}
 if(groupId){const group=await db.group.findFirst({where:{id:groupId,isActive:true,section:{churchId,...(sectionId?{id:sectionId}:{})}}});if(!group)return res.status(400).json({message:'Group is outside the permitted scope'});sectionId=group.sectionId}
 if(memberId){const member=await db.member.findFirst({where:{id:memberId,isActive:true,group:{section:{churchId},...(groupId?{id:groupId}:{})}}});if(!member)return res.status(400).json({message:'Member is outside the permitted scope'});groupId=member.groupId;const group=await db.group.findUnique({where:{id:member.groupId}});sectionId=group?.sectionId??sectionId}
 if(u.role==='SECTION'&&sectionId!==u.sectionId)return res.status(403).json({message:'Achievement is outside section scope'});
 if(u.role==='GROUP'&&groupId!==u.groupId)return res.status(403).json({message:'Achievement is outside group scope'});
 res.status(201).json(serialize(await db.budgetAchievement.create({data:{budgetMetricId:m.id,churchId,sectionId:sectionId??null,groupId:groupId??null,memberId:memberId??null,quantity,createdByUserId:u.id}})))
});
budgetsRouter.patch('/:id',requireRole('REGIONAL_LEADER'),async(req,res)=>{
 const id=Number(req.params.id); const b=await db.budget.findUnique({where:{id}}); if(!b)return res.status(404).json({message:'Budget not found'});
 if(b.status!=='Draft')return res.status(400).json({message:'Only a draft budget can be edited'});
 const name=String(req.body.name||'').trim(); const startDate=new Date(req.body.startDate); const endDate=new Date(req.body.endDate);
 if(!name||Number.isNaN(startDate.getTime())||Number.isNaN(endDate.getTime())||endDate<startDate)return res.status(400).json({message:'Valid name and date range required'});
 res.json(await db.budget.update({where:{id},data:{name,startDate,endDate}}));
});
budgetsRouter.delete('/:id',requireRole('REGIONAL_LEADER'),async(req,res)=>{
 const id=Number(req.params.id); const b=await db.budget.findUnique({where:{id}}); if(!b)return res.status(404).json({message:'Budget not found'});
 if(b.status!=='Draft')return res.status(400).json({message:'Only a draft budget can be deleted'});
 await db.budget.delete({where:{id}}); res.status(204).end();
});
budgetsRouter.patch('/metrics/:metricId',requireRole('REGIONAL_LEADER'),async(req,res)=>{
 const id=Number(req.params.metricId); const metric=await db.budgetMetric.findUnique({where:{id},include:{budget:true}}); if(!metric)return res.status(404).json({message:'Budget metric not found'});
 if(metric.budget.status!=='Draft')return res.status(400).json({message:'Metrics can only be changed while the budget is Draft'});
 const name=String(req.body.name||'').trim(); if(!name)return res.status(400).json({message:'Metric name is required'});
 const qty=bi(req.body.targetQuantity); const price=req.body.unitPriceRwf==null||req.body.unitPriceRwf===''?null:bi(req.body.unitPriceRwf);
 if(qty<0n||price!==null&&price<0n)return res.status(400).json({message:'Targets and unit price must not be negative'});
 if(req.body.contributionTypeId){const ct=await db.contributionType.findUnique({where:{id:Number(req.body.contributionTypeId)}});if(!ct)return res.status(400).json({message:'Contribution type not found'})}
 res.json(serialize(await db.budgetMetric.update({where:{id},data:{name,unit:String(req.body.unit||metric.unit).trim()||'RWF',targetQuantity:qty,unitPriceRwf:price,contributionTypeId:req.body.contributionTypeId?Number(req.body.contributionTypeId):null}})));
});
budgetsRouter.delete('/metrics/:metricId',requireRole('REGIONAL_LEADER'),async(req,res)=>{
 const id=Number(req.params.metricId); const metric=await db.budgetMetric.findUnique({where:{id},include:{budget:true}}); if(!metric)return res.status(404).json({message:'Budget metric not found'});
 if(metric.budget.status!=='Draft')return res.status(400).json({message:'Metrics can only be removed while the budget is Draft'});
 await db.budgetMetric.delete({where:{id}}); res.status(204).end();
});
