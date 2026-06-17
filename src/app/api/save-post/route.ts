export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { initDb, getPool } from '@/lib/db'
export async function POST(req:NextRequest){
  try{
    await initDb()
    const db=getPool()
    const p=await req.json()
    await db.query(`
      INSERT INTO posts (id,brief,title,content,hashtags,cta,channel,channels,tags,layout,image_url,image_base64,image_style,status,compliance_ok,compliance_issues,author,scheduled_at,published_at,archived_at,created_at,updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,NOW())
      ON CONFLICT (id) DO UPDATE SET
        title=EXCLUDED.title,content=EXCLUDED.content,hashtags=EXCLUDED.hashtags,cta=EXCLUDED.cta,
        channels=EXCLUDED.channels,tags=EXCLUDED.tags,layout=EXCLUDED.layout,
        image_url=EXCLUDED.image_url,image_base64=EXCLUDED.image_base64,image_style=EXCLUDED.image_style,
        status=EXCLUDED.status,compliance_ok=EXCLUDED.compliance_ok,compliance_issues=EXCLUDED.compliance_issues,
        published_at=EXCLUDED.published_at,archived_at=EXCLUDED.archived_at,updated_at=NOW()
    `,[
      p.id||Date.now().toString(),p.brief,p.title,p.content,
      p.hashtags||[],p.cta,p.channel,p.channels||[],p.tags||[],
      p.layout||'A',p.image_url,p.image_base64,p.image_style||'fill',
      p.status||'review',p.compliance_ok||false,p.compliance_issues||[],
      p.author,p.scheduled_at,p.published_at,p.archived_at,
      p.createdAt?new Date(p.createdAt):new Date()
    ])
    return NextResponse.json({saved:true})
  }catch(err:any){
    return NextResponse.json({error:err.message},{status:500})
  }
}
