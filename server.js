const express = require('express')
const path = require('path')
const app = express()
const PORT = process.env.PORT || 3000
app.use(express.json({ limit: '10mb' }))
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'poc.html')) })

function parseJsonSafe(text) {
  let s = text.replace(/```json/g,'').replace(/```/g,'').trim()
  // Ta bort trailing commas
  s = s.replace(/,(s*[}]])/g, '$1')
  // Hitta forsta [ till sista ]
  const start = s.indexOf('[')
  const end = s.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) return null
  const candidate = s.slice(start, end+1)
  try { return JSON.parse(candidate) } catch(e) {
    console.log('PARSE ERROR:', e.message)
    console.log('TEXT LENGTH:', text.length)
    console.log('CANDIDATE END:', candidate.slice(-200))
    return null
  }
}

app.post('/api/generate', async (req, res) => {
  try {
    const { channels=['instagram'], brief='', style='standard' } = req.body
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY saknas' })
    const prompt = 'Du ar copywriter for spot. creative studio Halmstad. Ton: professionell, varm, kreativ. Brief: '+(brief||'Generellt om spot.')+'. Kanaler: '+channels.join(', ')+'. Generera EXAKT 3 korta forslag. Varje forslag max 100 ord i content. Svara ENDAST med JSON-array: [{"title":"...","content":"...","hashtags":["..."],"cta":"..."},{"title":"...","content":"...","hashtags":["..."],"cta":"..."},{"title":"...","content":"...","hashtags":["..."],"cta":"..."}]'
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key='+apiKey, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ contents: [{parts: [{text: prompt}]}], generationConfig: {temperature: 0.9, maxOutputTokens: 8192} })
    })
    const data = await r.json()
    if (data.error) throw new Error('Gemini API: ' + data.error.message)
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    console.log('GEMINI RESPONSE LENGTH:', text.length)
    console.log('FINISH REASON:', data.candidates?.[0]?.finishReason)
    const proposals = parseJsonSafe(text)
    if (!proposals) throw new Error('Kunde inte parsa JSON, langd='+text.length+', slut='+text.slice(-100))
    res.json({ proposals })
  } catch (e) { res.status(500).json({ error: e.message }) }
})
app.post('/api/generate-image', async (req, res) => {
  res.json({ imageUrl: 'https://placehold.co/1080x1080/c8003c/ffffff?text=spot.' })
})
app.post('/api/save-post', async (req, res) => {
  try {
    const { Pool } = require('pg')
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
    await pool.query('CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, data JSONB, created_at TIMESTAMPTZ DEFAULT NOW())')
    const post = req.body
    await pool.query('INSERT INTO posts (id,data) VALUES ($1,$2) ON CONFLICT (id) DO UPDATE SET data=$2,created_at=NOW()', [post.id||Date.now().toString(), JSON.stringify(post)])
    res.json({ saved: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})
app.get('/api/published-posts', async (req, res) => {
  try {
    const { Pool } = require('pg')
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
    await pool.query('CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, data JSONB, created_at TIMESTAMPTZ DEFAULT NOW())')
    const result = await pool.query("SELECT data FROM posts WHERE data->>'status' IN ('published','archived') ORDER BY created_at DESC LIMIT 200")
    res.json({ posts: result.rows.map(r => r.data) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})
app.listen(PORT, () => console.log('spot. running on '+PORT))
