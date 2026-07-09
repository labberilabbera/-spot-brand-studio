'use strict'
const express = require('express')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const app = express()
const PORT = process.env.PORT || 3000
const UNAME = process.env.APP_USERNAME || 'Spot'
const UPASS = process.env.APP_PASSWORD || '1234'
const sessions = {}
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true }))
const _TPL = { 'tpl-studio.png': '4.png', 'tpl-case-hallanning.png': '5.png', 'tpl-case-gardsstyling.png': '7.png', 'tpl-louisiana.png': '6.png' }
app.get('/assets/:f', (req, res) => { const f = _TPL[req.params.f] || req.params.f; if (f.indexOf('..') !== -1 || f.indexOf('/') !== -1) return res.status(400).end(); const p = path.join(__dirname, 'assets', f); if (fs.existsSync(p)) return res.sendFile(p); res.status(404).end() })
function makeToken() { return crypto.randomBytes(32).toString('hex') }
function getToken(req) { const c = req.headers.cookie || ''; const p = c.split(';').map(x => x.trim()).find(x => x.startsWith('spot_session=')); return p ? p.split('=')[1] : null }
function auth(req, res, next) { if (sessions[getToken(req)]) return next(); if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' }); res.redirect('/login') }
app.get('/login', (_req, res) => res.send(LOGIN_HTML))
app.post('/login', (req, res) => { const { username, password } = req.body; if (username === UNAME && password === UPASS) { const t = makeToken(); sessions[t] = { u: username }; res.setHeader('Set-Cookie', 'spot_session=' + t + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + (60*60*24*7)); return res.redirect('/') } res.redirect('/login?err=1') })
app.post('/logout', (req, res) => { delete sessions[getToken(req)]; res.setHeader('Set-Cookie', 'spot_session=; Path=/; Max-Age=0'); res.json({ ok: true }) })
app.get('/inject.js', (_req, res) => { try { res.setHeader('Content-Type', 'application/javascript'); res.send(fs.readFileSync(path.join(__dirname, 'inject.js'), 'utf-8')) } catch (e) { res.send('// inject.js not found') } })
app.get('/', auth, (req, res) => { try { const html = fs.readFileSync(path.join(__dirname, 'poc.html'), 'utf-8'); const tag = '<script src="/inject.js"></script>'; const idx = html.lastIndexOf('</script>'); const patched = html.slice(0, idx + 9) + tag + html.slice(idx + 9); res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.send(patched) } catch (e) { res.status(500).send('Error: ' + e.message) } })
app.post('/api/generate', auth, async (req, res) => { try { const { channels = ['instagram'], brief = '' } = req.body; const apiKey = process.env.GEMINI_API_KEY; if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY saknas' }); const chList = Array.isArray(channels) ? channels : [channels]; const prompt = 'Du ar copywriter for spot. creative studio Halmstad. Brief: ' + (brief || 'Generellt om spot.') + '. Kanaler: ' + chList.join(', ') + '. Generera EXAKT 3 korta forslag max 100 ord. Svara ENDAST med JSON-array: [{"title":"...","content":"...","hashtags":["..."],"cta":"..."},{"title":"...","content":"...","hashtags":["..."],"cta":"..."},{"title":"...","content":"...","hashtags":["..."],"cta":"..."}]'; const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=' + apiKey, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.9, maxOutputTokens: 8192 } }) }); const data = await r.json(); if (data.error) throw new Error('Gemini: ' + data.error.message); let s = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').replace(/
http://googleusercontent.com/immersive_entry_chip/0
