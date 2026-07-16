'use strict'
const express = require('express')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
let nodemailer = null
try { nodemailer = require('nodemailer') } catch (e) {}
const app = express()
const PORT = process.env.PORT || 3000
const UNAME = process.env.APP_USERNAME || 'Spot'
const UPASS = process.env.APP_PASSWORD || '1234'
const sessions = {}
const { Pool } = require('pg')
let _authPool = null
function getAuthPool() { if (!_authPool) _authPool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); return _authPool }
async function ensureAuthTable() { await getAuthPool().query("CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT)") }
async function ensureUsersTable() {
  await getAuthPool().query("CREATE TABLE IF NOT EXISTS app_users (username TEXT PRIMARY KEY, password TEXT, role TEXT, first_name TEXT, last_name TEXT)")
  await getAuthPool().query("ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email TEXT")
  const r = await getAuthPool().query("SELECT COUNT(*) FROM app_users")
  if (parseInt(r.rows[0].count, 10) === 0) {
    await getAuthPool().query("INSERT INTO app_users (username,password,role,first_name,last_name) VALUES ($1,$2,$3,$4,$5),($6,$7,$8,$9,$10),($11,$12,$13,$14,$15)", [
      'admin', '1234', 'admin', 'Anna', 'Andersson',
      'redaktor', '1234', 'redaktor', 'Erik', 'Eriksson',
      'granskare', '1234', 'granskare', 'Gustav', 'Granberg'
    ])
  }
}
async function getUserByUsername(username) {
  try { await ensureUsersTable(); const r = await getAuthPool().query("SELECT * FROM app_users WHERE username=$1", [username]); return r.rows[0] || null } catch (e) { console.error('[auth] getUserByUsername error:', e.message); return null }
}
async function getPassword() { try { await ensureAuthTable(); const r = await getAuthPool().query("SELECT value FROM app_settings WHERE key='password'"); return (r.rows[0] && r.rows[0].value) || UPASS } catch (e) { console.error('[auth] getPassword error:', e.message); return UPASS } }
async function setPassword(pw) { try { await ensureAuthTable(); const r = await getAuthPool().query("INSERT INTO app_settings (key,value) VALUES ('password',$1) ON CONFLICT (key) DO UPDATE SET value=$1", [pw]); console.log('[auth] setPassword ok, rowCount:', r.rowCount) } catch (e) { console.error('[auth] setPassword error:', e.message) } }
const resetTokens = {}
function makeResetToken() { const t = crypto.randomBytes(24).toString('hex'); resetTokens[t] = Date.now() + 30 * 60 * 1000; return t }
function validResetToken(t) { const exp = resetTokens[t]; return !!exp && exp > Date.now() }
function getMailer() { if (!nodemailer) return null; if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null; return nodemailer.createTransport({ host: process.env.SMTP_HOST, port: +(process.env.SMTP_PORT || 587), secure: process.env.SMTP_PORT === '465', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 10000 }) }
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true }))
const _TPL = { 'tpl-studio.png': '4.png', 'tpl-case-hallanning.png': '5.png', 'tpl-case-gardsstyling.png': '7.png', 'tpl-louisiana.png': '6.png' }
app.get('/assets/:f', (req, res) => { const f = _TPL[req.params.f] || req.params.f; if (f.indexOf('..') !== -1 || f.indexOf('/') !== -1) return res.status(400).end(); const p = path.join(__dirname, 'assets', f); if (fs.existsSync(p)) return res.sendFile(p); res.status(404).end() })
function makeToken() { return crypto.randomBytes(32).toString('hex') }
function getToken(req) { const c = req.headers.cookie || ''; const p = c.split(';').map(x => x.trim()).find(x => x.startsWith('spot_session=')); return p ? p.split('=')[1] : null }
function auth(req, res, next) { if (sessions[getToken(req)]) return next(); if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' }); res.redirect('/login') }
app.get('/login', (_req, res) => res.send(LOGIN_HTML))
app.post('/login', async (req, res) => {
  const { username, password } = req.body
  const u = await getUserByUsername(username)
  if (u && password === u.password) {
    const t = makeToken()
    sessions[t] = { u: u.username, role: u.role, firstName: u.first_name, lastName: u.last_name }
    res.setHeader('Set-Cookie', 'spot_session=' + t + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + (60*60*24*7))
    return res.redirect('/')
  }
  if (username === UNAME && password === await getPassword()) {
    const t = makeToken()
    sessions[t] = { u: username, role: 'admin', firstName: process.env.APP_USER_FIRSTNAME || 'Spot', lastName: process.env.APP_USER_LASTNAME || 'Admin' }
    res.setHeader('Set-Cookie', 'spot_session=' + t + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + (60*60*24*7))
    return res.redirect('/')
  }
  res.redirect('/login?err=1')
})
app.post('/logout', (req, res) => { delete sessions[getToken(req)]; res.setHeader('Set-Cookie', 'spot_session=; Path=/; Max-Age=0'); res.json({ ok: true }) })
app.get('/api/me', auth, (req, res) => { const s = sessions[getToken(req)] || {}; const firstName = s.firstName || 'Spot'; const lastName = s.lastName || 'Admin'; const role = s.role || 'admin'; const initials = (firstName[0]||'') + (lastName[0]||''); res.json({ firstName, lastName, role, initials: initials.toUpperCase() }) })
app.post('/api/team/invite', auth, async (req, res) => {
  const s = sessions[getToken(req)] || {}
  if ((s.role || 'admin') !== 'admin') return res.status(403).json({ error: 'Endast admin kan bjuda in medlemmar' })
  try {
    const { name, email, password, role } = req.body || {}
    if (!name || !email || !password) return res.status(400).json({ error: 'Namn, e-post och lösenord krävs' })
    if (String(password).length < 4) return res.status(400).json({ error: 'Lösenordet måste vara minst 4 tecken' })
    const roleMap = { admin: 'admin', editor: 'redaktor', viewer: 'granskare' }
    const dbRole = roleMap[role] || 'granskare'
    const parts = String(name).trim().split(/\s+/)
    const firstName = parts[0] || name
    const lastName = parts.slice(1).join(' ') || ''
    let username = String(email).split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '')
    await ensureUsersTable()
    let candidate = username, n = 1
    while ((await getAuthPool().query('SELECT 1 FROM app_users WHERE username=$1', [candidate])).rows.length) {
      candidate = username + n; n++
    }
    username = candidate
    await getAuthPool().query('INSERT INTO app_users (username,password,role,first_name,last_name,email) VALUES ($1,$2,$3,$4,$5,$6)', [username, password, dbRole, firstName, lastName, email])
    res.json({ ok: true, username })
  } catch (e) { res.status(500).json({ error: e.message }) }
})
app.get('/api/team/members', auth, async (req, res) => {
  try {
    await ensureUsersTable()
    const r = await getAuthPool().query('SELECT username, role, first_name, last_name, email FROM app_users ORDER BY username')
    res.json({ members: r.rows })
  } catch (e) { res.status(500).json({ error: e.message }) }
})
app.post('/api/team/remove', auth, async (req, res) => {
  const s = sessions[getToken(req)] || {}
  if ((s.role || 'admin') !== 'admin') return res.status(403).json({ error: 'Endast admin kan ta bort medlemmar' })
  try {
    const { username } = req.body || {}
    if (!username) return res.status(400).json({ error: 'username saknas' })
    await ensureUsersTable()
    await getAuthPool().query('DELETE FROM app_users WHERE username=$1', [username])
    res.json({ ok: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})
app.post('/api/change-password', auth, async (req, res) => { const { currentPassword, newPassword } = req.body || {}; if (!newPassword || String(newPassword).length < 4) return res.status(400).json({ error: 'Nytt lösenord måste vara minst 4 tecken' }); if (currentPassword !== await getPassword()) return res.status(401).json({ error: 'Fel nuvarande lösenord' }); await setPassword(String(newPassword)); res.json({ ok: true }) })
app.get('/forgot', (_req, res) => res.send(FORGOT_HTML))
app.post('/forgot', async (req, res) => { try { const { recoveryCode, newPassword } = req.body || {}; const expected = process.env.APP_RECOVERY_CODE; if (!expected) return res.redirect('/forgot?err=nocfg'); if (!recoveryCode || recoveryCode !== expected) return res.redirect('/forgot?err=1'); if (!newPassword || String(newPassword).length < 4) return res.redirect('/forgot?err=1'); await setPassword(String(newPassword)); res.redirect('/login?reset=1') } catch (e) { console.error('[forgot] error:', e.message); res.redirect('/forgot?err=1') } })
app.get('/reset', (req, res) => { const t = req.query.token || ''; if (!validResetToken(t)) return res.send(RESET_INVALID_HTML); res.send(RESET_HTML.split('__TOKEN__').join(t)) })
app.post('/reset', async (req, res) => { const { token, newPassword } = req.body || {}; if (!validResetToken(token)) return res.redirect('/forgot?err=1'); if (!newPassword || String(newPassword).length < 4) return res.redirect('/reset?token=' + token + '&err=1'); await setPassword(String(newPassword)); delete resetTokens[token]; res.redirect('/login?reset=1') })
app.get('/inject.js', (_req, res) => { try { res.setHeader('Content-Type', 'application/javascript'); res.send(fs.readFileSync(path.join(__dirname, 'inject.js'), 'utf-8')) } catch (e) { res.send('// inject.js not found') } })
app.get('/', auth, (req, res) => { try { const html = fs.readFileSync(path.join(__dirname, 'poc.html'), 'utf-8'); const tag = '<script src="/inject.js"></script>'; const idx = html.lastIndexOf('</script>'); const patched = html.slice(0, idx + 9) + tag + html.slice(idx + 9); res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.send(patched) } catch (e) { res.status(500).send('Error: ' + e.message) } })
app.post('/api/generate', auth, async (req, res) => { try { const { channels = ['instagram'], brief = '' } = req.body; const apiKey = process.env.GEMINI_API_KEY; if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY saknas' }); const chList = Array.isArray(channels) ? channels : [channels]; const prompt = 'Du ar copywriter for spot. creative studio Halmstad. Brief: ' + (brief || 'Generellt om spot.') + '. Kanaler: ' + chList.join(', ') + '. Generera EXAKT 3 korta forslag max 100 ord. Svara ENDAST med JSON-array: [{"title":"...","content":"...","hashtags":["..."],"cta":"..."},{"title":"...","content":"...","hashtags":["..."],"cta":"..."},{"title":"...","content":"...","hashtags":["..."],"cta":"..."}]'; const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=' + apiKey, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.9, maxOutputTokens: 8192 } }) }); const data = await r.json(); if (data.error) throw new Error('Gemini: ' + data.error.message); let s = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').replace(/```json/g, '').replace(/```/g, '').trim(); s = s.replace(/,(\s*[}\]])/g, '$1'); const start = s.indexOf('['), end = s.lastIndexOf(']'); if (start < 0 || end < 0) throw new Error('Ingen array i svar'); const flat = JSON.parse(s.slice(start, end + 1)); const proposals = {}; chList.forEach(ch => { proposals[ch] = flat }); res.json({ proposals }) } catch (e) { res.status(500).json({ error: e.message }) } })
app.post('/api/generate-image', auth, async (req, res) => { try { const { brief = '', style = 'modern' } = req.body; const apiKey = process.env.GEMINI_API_KEY; if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY saknas' }); const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=' + apiKey, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: 'CRITICAL RULE: absolutely NO text, no letters, no words, no numbers, no captions, no logos and no typography anywhere in the image - it must be a purely visual photo with zero written characters. Professional social media image spot. creative studio Halmstad. Style: ' + style + '. Brief: ' + (brief || 'creative studio') + '.' }] }], generationConfig: { responseModalities: ['IMAGE', 'TEXT'] } }) }); const data = await r.json(); if (data.error) throw new Error('Gemini: ' + data.error.message); const imgPart = (data.candidates?.[0]?.content?.parts || []).find(p => p.inlineData?.mimeType?.startsWith('image/')); if (imgPart) return res.json({ imageUrl: 'data:' + imgPart.inlineData.mimeType + ';base64,' + imgPart.inlineData.data }); res.json({ imageUrl: 'https://placehold.co/1080x1080/c8003c/ffffff?text=spot.' }) } catch (e) { res.status(500).json({ error: e.message }) } })
app.post('/api/save-post', auth, async (req, res) => { try { const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); await pool.query('CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, data JSONB, created_at TIMESTAMPTZ DEFAULT NOW())'); const post = req.body; await pool.query('INSERT INTO posts (id,data) VALUES ($1,$2) ON CONFLICT (id) DO UPDATE SET data=$2,created_at=NOW()', [post.id || Date.now().toString(), JSON.stringify(post)]); res.json({ saved: true }) } catch (e) { res.status(500).json({ error: e.message }) } })
app.get('/api/published-posts', auth, async (req, res) => { try { const { Pool } = require('pg'); const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }); await pool.query('CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, data JSONB, created_at TIMESTAMPTZ DEFAULT NOW())'); const result = await pool.query("SELECT data FROM posts WHERE data->>'status' IN ('published','archived') ORDER BY created_at DESC LIMIT 200"); res.json({ posts: result.rows.map(r => r.data) }) } catch (e) { res.status(500).json({ error: e.message }) } })
app.listen(PORT, () => console.log('spot. running on ' + PORT))
const LOGIN_HTML = '<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"/><title>spot.</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Segoe UI,sans-serif;background:#0f0f0f;min-height:100vh;display:flex;align-items:center;justify-content:center}.c{background:#fff;border-radius:20px;padding:40px 36px;width:min(380px,92vw);box-shadow:0 24px 60px rgba(0,0,0,.4)}.logo{font-size:28px;font-weight:800;color:#b31e59;margin-bottom:4px}.tag{font-size:13px;color:#9ca3af;margin-bottom:32px}.f{margin-bottom:16px}label{display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:6px}input{width:100%;padding:11px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:15px;outline:none;font-family:inherit}input:focus{border-color:#b31e59}.err{color:#b31e59;font-size:13px;margin-top:8px;display:none}.err.show{display:block}button{width:100%;margin-top:8px;padding:13px;background:#b31e59;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit}</style></head><body><div class="c"><div class="logo">spot.</div><div class="tag">content studio</div><form method="POST" action="/login"><div class="f"><label>Användarnamn</label><input type="text" name="username" autofocus/></div><div class="f"><label>Lösenord</label><input type="password" name="password"/></div><div class="err" id="err">Fel.</div><button type="submit">Logga in</button><div style="text-align:center;margin-top:14px"><a href="/forgot" style="font-size:12px;color:#9ca3af;text-decoration:none">Glömt lösenord?</a></div><div class="ok" id="ok" style="display:none;color:#16a34a;font-size:13px;margin-top:8px;text-align:center">Lösenordet är återställt. Logga in med det nya lösenordet.</div></form></div><script>var q=new URLSearchParams(location.search);if(q.get("err"))document.getElementById("err").classList.add("show");if(q.get("reset"))document.getElementById("ok").style.display="block"<\/script></body></html>'

const FORGOT_HTML = '<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"/><title>spot. - Glömt lösenord</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Segoe UI,sans-serif;background:#0f0f0f;min-height:100vh;display:flex;align-items:center;justify-content:center}.c{background:#fff;border-radius:20px;padding:40px 36px;width:min(380px,92vw);box-shadow:0 24px 60px rgba(0,0,0,.4)}.logo{font-size:28px;font-weight:800;color:#b31e59;margin-bottom:4px}.tag{font-size:13px;color:#9ca3af;margin-bottom:24px;line-height:1.5}.f{margin-bottom:16px}label{display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:6px}input{width:100%;padding:11px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:15px;outline:none;font-family:inherit}input:focus{border-color:#b31e59}.msg{font-size:13px;margin-top:8px;display:none}.msg.err{color:#b31e59}.msg.show{display:block}button{width:100%;margin-top:8px;padding:13px;background:#b31e59;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit}a.back{display:block;text-align:center;margin-top:14px;font-size:12px;color:#9ca3af;text-decoration:none}</style></head><body><div class="c"><div class="logo">spot.</div><div class="tag">Ange återställningskoden och välj ett nytt lösenord.</div><form method="POST" action="/forgot"><div class="f"><label>Återställningskod</label><input type="text" name="recoveryCode" autofocus/></div><div class="f"><label>Nytt lösenord</label><input type="password" name="newPassword"/></div><div class="msg err" id="err">Fel kod eller för kort lösenord (minst 4 tecken).</div><div class="msg err" id="nocfg">Ingen återställningskod är konfigurerad. Kontakta admin.</div><button type="submit">Återställ lösenord</button></form><a class="back" href="/login">Tillbaka till inloggning</a></div><script>var q=new URLSearchParams(location.search);var e=q.get("err");if(e==="1")document.getElementById("err").classList.add("show");if(e==="nocfg")document.getElementById("nocfg").classList.add("show")<\/script></body></html>'
const RESET_HTML = '<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"/><title>spot. - Nytt lösenord</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Segoe UI,sans-serif;background:#0f0f0f;min-height:100vh;display:flex;align-items:center;justify-content:center}.c{background:#fff;border-radius:20px;padding:40px 36px;width:min(380px,92vw);box-shadow:0 24px 60px rgba(0,0,0,.4)}.logo{font-size:28px;font-weight:800;color:#b31e59;margin-bottom:4px}.tag{font-size:13px;color:#9ca3af;margin-bottom:24px}.f{margin-bottom:16px}label{display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:6px}input{width:100%;padding:11px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:15px;outline:none;font-family:inherit}input:focus{border-color:#b31e59}.err{color:#b31e59;font-size:13px;margin-top:8px;display:none}.err.show{display:block}button{width:100%;margin-top:8px;padding:13px;background:#b31e59;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit}</style></head><body><div class="c"><div class="logo">spot.</div><div class="tag">Välj ett nytt lösenord.</div><form method="POST" action="/reset"><input type="hidden" name="token" value="__TOKEN__"/><div class="f"><label>Nytt lösenord</label><input type="password" name="newPassword" autofocus/></div><div class="err" id="err">Lösenordet måste vara minst 4 tecken.</div><button type="submit">Spara nytt lösenord</button></form></div><script>if(new URLSearchParams(location.search).get("err"))document.getElementById("err").classList.add("show")<\/script></body></html>'
const RESET_INVALID_HTML = '<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"/><title>spot.</title><style>body{font-family:Segoe UI,sans-serif;background:#0f0f0f;color:#fff;min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center}a{color:#b31e59}</style></head><body><div><p>Länken är ogiltig eller har gått ut.</p><p><a href="/forgot">Försök igen</a></p></div></body></html>'
