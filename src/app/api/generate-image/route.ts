export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
export async function POST(req:NextRequest){
  try{
    const{brief='',style='modern'}=await req.json()
    const url='https://placehold.co/1080x1080/c8003c/ffffff?text=spot.'
    return NextResponse.json({imageUrl:url,note:'Aktivera bildgenerering med OPENAI_API_KEY'})
  }catch(err:any){
    return NextResponse.json({error:err.message},{status:500})
  }
}
