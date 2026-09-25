function required(name:string){const value=process.env[name];if(!value||value.trim()===''||value.includes('CHANGE_ME'))throw new Error(`Missing or unsafe required environment variable: ${name}`);return value;}
export function validateProductionConfig(){if(process.env.NODE_ENV==='production'){required('DATABASE_URL');const secret=required('JWT_SECRET');if(secret.length<32)throw new Error('JWT_SECRET must be at least 32 characters in production');}}
export function jwtSecret(){const value=process.env.JWT_SECRET;if(process.env.NODE_ENV==='production'){return required('JWT_SECRET');}return value||'dev-only-secret-change-before-production';}
export function allowedOrigins(){
  const configured=(process.env.CORS_ORIGINS||'http://localhost:5173,http://localhost:5174').split(',').map(x=>x.trim()).filter(Boolean);
  for (const origin of ['bwuzuri://app']) if (!configured.includes(origin)) configured.push(origin);
  return configured;
}
