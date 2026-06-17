export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { initDb, getPool } from '@/lib/db'
export async function GET(){
  try{
    await initDb()
    const db=getPool()
    const result=await db.query(`
      SELECT * FROM posts WHERE status IN ('published','archived')
      ORDER BY COALESCE(published_at,created_at) DESC LIMIT 200
    `)
    return NextResponse.json({posts:result.rows})
  }catch(err:any){
    return NextResponse.json({error:err.message},{status:500})
  }
}
