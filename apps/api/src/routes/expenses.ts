import {Router} from 'express';
import {z} from 'zod';
import {db} from '../index.js';
import {auth,requireRole,type AuthedRequest} from '../middleware/auth.js'; import {requireApprovedOfflineDevice} from '../middleware/offlineDevice.js';
export const expensesRouter=Router(); expensesRouter.use(auth); expensesRouter.use(requireApprovedOfflineDevice);
const serialize=(x:any):any=>typeof x==='bigint'?x.toString():Array.isArray(x)?x.map(serialize):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,serialize(v)])):x;
const input=z.object({expenseTypeId:z.coerce.number().int().positive(),amountRwf:z.coerce.bigint().positive(),paidOn:z.coerce.date().optional(),description:z.string().min(1),payee:z.string().optional().default(''),reference:z.string().optional().default(''),submissionId:z.string().min(8)});
function scope(u:any){return u.role==='REGIONAL_LEADER'?{}:{churchId:u.churchId??-1};}
expensesRouter.get('/types',async(req:AuthedRequest,res)=>{
  const all=req.query.all==='1'&&req.user?.role==='REGIONAL_LEADER';
  res.json(await db.expenseType.findMany({where:all?{}:{isActive:true},orderBy:{name:'asc'}}));
});
expensesRouter.post('/types',requireRole('REGIONAL_LEADER'),async(req,res)=>{const name=String(req.body.name||'').trim();if(!name)return res.status(400).json({message:'Name is required'});try{res.status(201).json(await db.expenseType.create({data:{name}}))}catch{res.status(409).json({message:'That expense type already exists'})}});
expensesRouter.patch('/types/:id',requireRole('REGIONAL_LEADER'),async(req,res)=>{const name=String(req.body.name||'').trim();if(!name)return res.status(400).json({message:'Name is required'});try{res.json(await db.expenseType.update({where:{id:Number(req.params.id)},data:{name}}))}catch{res.status(409).json({message:'That expense type already exists'})}});
expensesRouter.post('/types/:id/active',requireRole('REGIONAL_LEADER'),async(req,res)=>res.json(await db.expenseType.update({where:{id:Number(req.params.id)},data:{isActive:req.body.isActive!==false}})));
expensesRouter.get('/',async(req:AuthedRequest,res)=>res.json(serialize(await db.expense.findMany({where:{...scope(req.user!),isCancelled:false},orderBy:{paidOn:'desc'}}))));
expensesRouter.post('/',requireRole('CHURCH'),async(req:AuthedRequest,res)=>{const p=input.safeParse(req.body);if(!p.success)return res.status(400).json({message:'Invalid expense',issues:p.error.issues});const u=req.user!;const x=await db.expense.create({data:{...p.data,paidOn:p.data.paidOn??new Date(),churchId:u.churchId!,createdByUserId:u.id}});res.status(201).json(serialize(x))});
expensesRouter.patch('/:id',requireRole('CHURCH'),async(req:AuthedRequest,res)=>{const id=Number(req.params.id),u=req.user!;const old=await db.expense.findFirst({where:{id,churchId:u.churchId!,createdByUserId:u.id,isCancelled:false}});if(!old)return res.status(404).json({message:'Expense not found or not editable'});const p=input.omit({submissionId:true}).partial().safeParse(req.body);if(!p.success)return res.status(400).json({message:'Invalid expense'});res.json(serialize(await db.expense.update({where:{id},data:p.data})))});
expensesRouter.post('/:id/cancel',requireRole('CHURCH'),async(req:AuthedRequest,res)=>{const id=Number(req.params.id),u=req.user!;const old=await db.expense.findFirst({where:{id,churchId:u.churchId!,createdByUserId:u.id,isCancelled:false}});if(!old)return res.status(404).json({message:'Expense not found or not editable'});res.json(serialize(await db.expense.update({where:{id},data:{isCancelled:true,cancellationReason:String(req.body.reason||'Corrected by church user'),cancelledByUserId:u.id,cancelledAt:new Date()}})))});
