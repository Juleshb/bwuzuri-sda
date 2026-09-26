export type Role = 'REGIONAL_LEADER'|'CHURCH'|'SECTION'|'GROUP';
export interface SessionUser { id:number; username:string; fullName:string; role:Role; churchId?:number|null; sectionId?:number|null; groupId?:number|null }
export const can = {
  contributionsCreate:(r:Role)=>r==='CHURCH',
  memberCreate:(r:Role)=>r==='CHURCH'||r==='SECTION'||r==='GROUP',
  memberEdit:(r:Role)=>r==='CHURCH',
  budgetAdmin:(r:Role)=>r==='REGIONAL_LEADER',
  churchFinanceEdit:(r:Role)=>r==='CHURCH',
  reportsView:(_r:Role)=>true,
  sabbathSchoolCreate:(r:Role)=>r==='GROUP'
};
export const normalizePhone=(v:string)=>v.replace(/[\s()-]/g,'').replace(/^0(?=7)/,'+250');
export {translate, type Lang} from './i18n';
