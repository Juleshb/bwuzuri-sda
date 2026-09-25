import {loadEnv} from './env.js';
import express from 'express'; import cors from 'cors'; import {PrismaClient} from '@prisma/client';
import {validateProductionConfig,allowedOrigins} from './config.js';
import {syncRouter} from './routes/sync.js'; import {devicesRouter} from './routes/devices.js'; import {reportsRouter} from './routes/reports.js'; import {authRouter} from './routes/auth.js'; import {expensesRouter} from './routes/expenses.js'; import {assetsRouter} from './routes/assets.js'; import {membersRouter} from './routes/members.js'; import {contributionsRouter} from './routes/contributions.js'; import {coreRouter} from './routes/core.js'; import {budgetsRouter} from './routes/budgets.js'; import {sabbathSchoolRouter} from './routes/sabbathSchool.js'; import {usersRouter} from './routes/users.js';
loadEnv();
validateProductionConfig(); export const db=new PrismaClient(); const app=express(); app.disable('x-powered-by'); app.set('trust proxy',1);
const origins=allowedOrigins();
app.use((req,res,next)=>{
  const origin=req.header('origin')||'';
  const desktop=origin==='bwuzuri://app'||origin.startsWith('http://127.0.0.1:')||origin.startsWith('http://localhost:');
  if (desktop && req.header('access-control-request-private-network')==='true') res.setHeader('Access-Control-Allow-Private-Network','true');
  next();
});
app.use(cors({origin:(origin,cb)=>!origin||origins.includes(origin)?cb(null,true):cb(new Error('Origin not allowed')),credentials:false})); app.use(express.json({limit:'2mb'}));
app.use((_q,r,next)=>{r.setHeader('X-Content-Type-Options','nosniff');r.setHeader('X-Frame-Options','DENY');r.setHeader('Referrer-Policy','no-referrer');r.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');if(process.env.NODE_ENV==='production')r.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');next();});
app.use((req,res,next)=>{
  const client=String(req.header('x-bwuzuri-client')||'').toLowerCase();
  const offline=String(req.header('x-offline-operation-id')||'').trim();
  if(client==='mobile' && (offline || req.originalUrl.startsWith('/api/sync'))){
    return res.status(403).json({message:'Mobile client is online-only. Offline synchronization is not permitted.'});
  }
  next();
});
app.get('/health/live',(_q,r)=>r.json({status:'ok',build:'0.17-ts.1'})); app.get('/health/ready',async(_q,r)=>{try{await db.$queryRaw`SELECT 1`;r.json({status:'ready'})}catch{r.status(503).json({status:'not-ready'})}});
app.use('/api/sync',syncRouter); app.use('/api/devices',devicesRouter); app.use('/api/reports',reportsRouter); app.use('/api/auth',authRouter); app.use('/api/users',usersRouter); app.use('/api/expenses',expensesRouter); app.use('/api/assets',assetsRouter); app.use('/api/sabbath-school',sabbathSchoolRouter); app.use('/api/members',membersRouter); app.use('/api/contributions',contributionsRouter); app.use('/api/budgets',budgetsRouter); app.use('/api',coreRouter);
app.use((_q,r)=>r.status(404).json({message:'Not found'}));
const port=Number(process.env.PORT||8080); app.listen(port,()=>console.log(`Bwuzuri API listening on ${port}`));
