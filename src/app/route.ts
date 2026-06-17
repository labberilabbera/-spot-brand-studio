export const dynamic = 'force-dynamic'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET() {
  try {
    const html = readFileSync(join(process.cwd(), 'poc.html'), 'utf-8')
    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  } catch(e) {
    return new Response('poc.html not found: ' + String(e), { status: 404 })
  }
}
