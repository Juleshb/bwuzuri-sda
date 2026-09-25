import type {Request,Response,NextFunction} from 'express'; import jwt from 'jsonwebtoken'; import {jwtSecret} from '../config.js';
export type AuthUser={id:number;role:string;churchId?:number|null;sectionId?:number|null;groupId?:number|null};
export interface AuthedRequest extends Request{user?:AuthUser}
export function auth(req:AuthedRequest,res:Response,next:NextFunction){const h=req.headers.authorization;if(!h?.startsWith('Bearer '))return res.status(401).json({message:'Login required'});try{req.user=jwt.verify(h.slice(7),jwtSecret()) as AuthUser;next()}catch{return res.status(401).json({message:'Invalid session'})}}
export const requireRole=(...roles:string[])=>(req:AuthedRequest,res:Response,next:NextFunction)=>roles.includes(req.user!.role)?next():res.status(403).json({message:'Not permitted'});
