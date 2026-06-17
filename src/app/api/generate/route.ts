export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent'

const BRAND = {
  name: 'spot.',
  tagline: 'a creative studio - grafisk design, foto och innehall med ett distinkt uttryck.',
  tone: 'Professionell men varm, kreativ, inspirerande. Undvik klicheer. Kort och slagkraftigt.',
  services: ['grafisk design','foto','innehallsskapande','varumarkesidentitet'],
  dos: ['Var autentisk','Beratta historier','Visa process och resultat'],
  donts: ['Undvik buzzwords','Inga generiska fraser','Inte for formellt'],
}

function channelHints(channels: string[]): string {
  return channels.map(c => {
    const l = c.toLowerCase()
    if(l==='instagram') return 'Instagram: max 2200 tecken, 5-10 hashtags'
    if(l==='linkedin') return 'LinkedIn: professionell, max 3000 tecken, 3-5 hashtags'
    if(l==='facebook') return 'Facebook: konversationell, max 500 tecken'
    if(l==='tiktok') return 'TikTok: ungdomlig, kort, trendig'
    return c
  }).join('. ')
}

export async function POST(req: NextRequest) {
  try {
    const { channels = ['instagram'], brief = '', style = 'standard' } = await req.json()
    const apiKey = process.env.GEMINI_API_KEY
    if(!apiKey) return NextResponse.json({ error: 'GEMINI_API_KEY saknas' }, { status: 500 })

    const prompt = `Du ar copywriter for ${BRAND.name} - ${BRAND.tagline}
Ton: ${BRAND.tone}
Tjänster: ${BRAND.services.join(', ')}
Gor: ${BRAND.dos.join(', ')}
Undvik: ${BRAND.donts.join(', ')}

Brief: ${brief || 'Generellt om spot.'}
Kanaler: ${channels.join(', ')}
Kanalinfo: ${channelHints(channels)}
Stil: ${style}

Generera 3 unika forslag. Svara ENDAST med giltig JSON-array, inget annat:
[{"title":"...","content":"...","hashtags":["..."],"cta":"..."},{"title":"...","content":"...","hashtags":["..."],"cta":"..."},{"title":"...","content":"...","hashtags":["..."],"cta":"..."}]`

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.9, maxOutputTokens: 2000 }
      })
    })

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const match = text.match(/[[sS]*]/)
    if(!match) throw new Error('Ingen JSON: ' + text.slice(0,200))
    return NextResponse.json({ proposals: JSON.parse(match[0]) })
  } catch(err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
