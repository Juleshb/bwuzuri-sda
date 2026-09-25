import {Router} from 'express';
import {db} from '../index.js';
import {auth,requireRole,type AuthedRequest} from '../middleware/auth.js';

export const coreRouter=Router();
coreRouter.use(auth);

// Hierarchy metadata is scope-filtered too. This prevents lower-scope users from
// discovering churches/sections/groups outside the area they are authorized to manage.
coreRouter.get('/churches',async(req:AuthedRequest,res)=>{
  const u=req.user!;
  if(u.role==='REGIONAL_LEADER'){
    const all=req.query.all==='1';
    return res.json(await db.church.findMany({
      where:all?{}:{isActive:true},
      include:{sections:{where:all?{}:{isActive:true},include:{groups:{where:all?{}:{isActive:true}}}}},
      orderBy:{name:'asc'}
    }));
  }
  if(u.role==='CHURCH'){
    return res.json(await db.church.findMany({
      where:{id:u.churchId!,isActive:true},
      include:{sections:{where:{isActive:true},include:{groups:{where:{isActive:true}}}}}
    }));
  }
  if(u.role==='SECTION'){
    return res.json(await db.church.findMany({
      where:{sections:{some:{id:u.sectionId!,isActive:true}}},
      include:{sections:{where:{id:u.sectionId!,isActive:true},include:{groups:{where:{isActive:true}}}}}
    }));
  }
  if(u.role==='GROUP'){
    return res.json(await db.church.findMany({
      where:{sections:{some:{groups:{some:{id:u.groupId!,isActive:true}}}}},
      include:{sections:{where:{groups:{some:{id:u.groupId!,isActive:true}}},include:{groups:{where:{id:u.groupId!,isActive:true}}}}}
    }));
  }
  return res.status(403).json({message:'Not permitted'});
});

coreRouter.get('/contribution-types',async(req:AuthedRequest,res)=>{
  const all=req.query.all==='1'&&req.user?.role==='REGIONAL_LEADER';
  res.json(await db.contributionType.findMany({where:all?{}:{isActive:true},orderBy:{name:'asc'}}));
});

coreRouter.post('/churches',requireRole('REGIONAL_LEADER'),async(req,res)=>{
  const name=String(req.body.name||'').trim();
  if(!name)return res.status(400).json({message:'Church name is required'});
  try{res.status(201).json(await db.church.create({data:{name}}))}catch{res.status(409).json({message:'A church with that name already exists'})}
});
coreRouter.patch('/churches/:id',requireRole('REGIONAL_LEADER'),async(req,res)=>{
  const id=Number(req.params.id); const name=String(req.body.name||'').trim();
  if(!name)return res.status(400).json({message:'Church name is required'});
  try{res.json(await db.church.update({where:{id},data:{name}}))}catch{res.status(409).json({message:'A church with that name already exists'})}
});
coreRouter.post('/churches/:id/active',requireRole('REGIONAL_LEADER'),async(req,res)=>{
  const id=Number(req.params.id);
  res.json(await db.church.update({where:{id},data:{isActive:req.body.isActive!==false}}));
});
coreRouter.post('/sections',requireRole('REGIONAL_LEADER'),async(req,res)=>{
  const churchId=Number(req.body.churchId); const name=String(req.body.name||'').trim();
  if(!churchId||!name)return res.status(400).json({message:'Church and section name are required'});
  try{res.status(201).json(await db.section.create({data:{churchId,name}}))}catch{res.status(409).json({message:'That section already exists in this church'})}
});
coreRouter.patch('/sections/:id',requireRole('REGIONAL_LEADER'),async(req,res)=>{
  const id=Number(req.params.id); const name=String(req.body.name||'').trim();
  if(!name)return res.status(400).json({message:'Section name is required'});
  try{res.json(await db.section.update({where:{id},data:{name}}))}catch{res.status(409).json({message:'That section already exists in this church'})}
});
coreRouter.post('/sections/:id/active',requireRole('REGIONAL_LEADER'),async(req,res)=>{
  res.json(await db.section.update({where:{id:Number(req.params.id)},data:{isActive:req.body.isActive!==false}}));
});
coreRouter.post('/groups',requireRole('REGIONAL_LEADER'),async(req,res)=>{
  const sectionId=Number(req.body.sectionId); const name=String(req.body.name||'').trim();
  if(!sectionId||!name)return res.status(400).json({message:'Section and group name are required'});
  try{res.status(201).json(await db.group.create({data:{sectionId,name}}))}catch{res.status(409).json({message:'That group already exists in this section'})}
});
coreRouter.patch('/groups/:id',requireRole('REGIONAL_LEADER'),async(req,res)=>{
  const id=Number(req.params.id); const name=String(req.body.name||'').trim();
  if(!name)return res.status(400).json({message:'Group name is required'});
  try{res.json(await db.group.update({where:{id},data:{name}}))}catch{res.status(409).json({message:'That group already exists in this section'})}
});
coreRouter.post('/groups/:id/active',requireRole('REGIONAL_LEADER'),async(req,res)=>{
  res.json(await db.group.update({where:{id:Number(req.params.id)},data:{isActive:req.body.isActive!==false}}));
});
coreRouter.post('/contribution-types',requireRole('REGIONAL_LEADER'),async(req,res)=>{
  const name=String(req.body.name||'').trim();
  if(!name)return res.status(400).json({message:'Name is required'});
  try{res.status(201).json(await db.contributionType.create({data:{name}}))}catch{res.status(409).json({message:'That contribution type already exists'})}
});
coreRouter.patch('/contribution-types/:id',requireRole('REGIONAL_LEADER'),async(req,res)=>{
  const name=String(req.body.name||'').trim();
  if(!name)return res.status(400).json({message:'Name is required'});
  try{res.json(await db.contributionType.update({where:{id:Number(req.params.id)},data:{name}}))}catch{res.status(409).json({message:'That contribution type already exists'})}
});
coreRouter.post('/contribution-types/:id/active',requireRole('REGIONAL_LEADER'),async(req,res)=>{
  res.json(await db.contributionType.update({where:{id:Number(req.params.id)},data:{isActive:req.body.isActive!==false}}));
});
