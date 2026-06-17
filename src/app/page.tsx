import { readFileSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'

export default function Home() {
  const html = readFileSync(join(process.cwd(), 'poc.html'), 'utf-8')
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
