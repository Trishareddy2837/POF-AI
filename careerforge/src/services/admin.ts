import { supabase } from '../lib/supabase';
export interface AdminUser { id:string; email:string; fullName:string; createdAt:string; lastSignInAt:string|null; bannedUntil:string|null }
export interface AdminOverview { metrics:Record<string,number|null>; users:AdminUser[] }
const db=()=>{if(!supabase)throw new Error('Supabase is not configured.');return supabase;};
export async function getAdminOverview(){const {data,error}=await db().functions.invoke('pof-admin',{body:{action:'overview'}});if(error)throw new Error(error.message);if(data?.error)throw new Error(String(data.error));return data as AdminOverview;}
export async function updateAdminUser(userId:string,fullName:string,suspended:boolean){const {data,error}=await db().functions.invoke('pof-admin',{body:{action:'update_user',userId,fullName,suspended}});if(error)throw new Error(error.message);if(data?.error)throw new Error(String(data.error));}
export async function deleteAdminUser(userId:string){const {data,error}=await db().functions.invoke('pof-admin',{body:{action:'delete_user',userId}});if(error)throw new Error(error.message);if(data?.error)throw new Error(String(data.error));}
