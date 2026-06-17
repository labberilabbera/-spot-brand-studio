export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const BRAND = {
  name: 'spot.',
  tagline: 'a creative studio - grafisk design, foto och innehall med ett distinkt uttryck.',
  tone: 'Professionell men varm, kreativ, inspirerande. Undvik klicheer. Kort och slagkraftigt.',
  services: ['grafisk design','foto','innehallsskapande','varumarkesidentitet'],
  dos: ['Var autentisk','Beratta historier','Visa process och resultat'],
  donts: ['Undvik buzzwords','Inga generiska fraser','Inte for formellt'],
}
function channelHints(channels:string[]):string{
  return channels.map(c=>{
    const l=c.toLowerCase();
    if(l==='instagram')return 'Instagram: max 2200 tecken, 5-10 hashtags';
    if(l==='linkedin')return 'LinkedIn: professionell, max 3000 tecken, 3-5 hashtags';
    if(l==='facebook')return 'Facebook: konversationell, max 500 tecken';
    if(l==='tiktok')return 'TikTok: ungdomlig, kort, trendig';
    return c;
  }).join('. ');
}
export async function POST(req:NextRequest){
  try{
    const{channels=['instagram'],brief='',style='standard'}=await req.json()
    const system=`Du ar copywriter for ${BRAND.name} - ${BRAND.tagline}
Ton: ${BRAND.tone}. Tjänster: ${BRAND.services.join(', ')}.
Gor: ${BRAND.dos.join(', ')}. Undvik: ${BRAND.donts.join(', ')}.
Generera 3 unika forslag. Svara ENDAST med giltig JSON-array:
[{"title":"...","content":"...","hashtags":["..."],"cta":"..."},{"title":"...","content":"...","hashtags":["..."],"cta":"..."},{"title":"...","content":"...","hashtags":["..."],"cta":"..."}]`
    const msg=await client.messages.create({
      model:'claude-sonnet-4-6',max_tokens:2000,system,
      messages:[{role:'user',content:`Brief: ${brief||'Generellt om spot.'}
Kanaler: ${channels.join(', ')}
Kanalinfo: ${channelHints(channels)}
Stil: ${style}`}]
    })
    const text=msg.content[0].type==='text'?msg.content[0].text:''
    const match=text.match(/[[sS]*]/)
    if(!match)throw new Error('Ingen JSON i svaret')
    return NextResponse.json({proposals:JSON.parse(match[0])})
  }catch(err:any){
    return NextResponse.json({error:err.message},{status:500})
  }
}
