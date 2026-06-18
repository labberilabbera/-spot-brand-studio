'use strict'
const express = require('express')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const app = express()
const PORT = process.env.PORT || 3000
const APP_USERNAME = process.env.APP_USERNAME || 'Spot'
const APP_PASSWORD = process.env.APP_PASSWORD || '1234'
const sessions = {}
app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true }))
function makeToken() { return crypto.randomBytes(32).toString('hex') }
function getToken(req) {
  const c = req.headers.cookie || ''
  const p = c.split(';').map(x => x.trim()).find(x => x.startsWith('spot_session='))
  return p ? p.split('=')[1] : null
}
function auth(req, res, next) {
  if (sessions[getToken(req)]) return next()
  if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' })
  res.redirect('/login')
}
const LOGIN_HTML = ['<!DOCTYPE html><html lang="sv"><head><meta charset="UTF-8"/>','<meta name="viewport" content="width=device-width,initial-scale=1"/>','<title>spot. Brand Studio</title>','<style>*{box-sizing:border-box;margin:0;padding:0}','body{font-family:Segoe UI,sans-serif;background:#0f0f0f;min-height:100vh;display:flex;align-items:center;justify-content:center}','.card{background:#fff;border-radius:20px;padding:40px 36px;width:min(380px,92vw);box-shadow:0 24px 60px rgba(0,0,0,.4)}','.logo{font-size:28px;font-weight:800;color:#b31e59;margin-bottom:4px}','.tag{font-size:13px;color:#9ca3af;margin-bottom:32px}','.field{margin-bottom:16px}','label{display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:6px}','input{width:100%;padding:11px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:15px;outline:none;font-family:inherit}','input:focus{border-color:#b31e59}','.err{color:#b31e59;font-size:13px;margin-top:8px;display:none}.err.show{display:block}','button{width:100%;margin-top:8px;padding:13px;background:#b31e59;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit}','</style></head><body>','<div class="card"><div class="logo">spot.</div><div class="tag">content studio</div>','<form method="POST" action="/login">','<div class="field"><label>Användarnamn</label><input type="text" name="username" placeholder="Ange användarnamn" autofocus autocomplete="username"/></div>','<div class="field"><label>Lösenord</label><input type="password" name="password" placeholder="Ange lösenord"/></div>','<div class="err" id="err">Fel användarnamn eller lösenord.</div>','<button type="submit">Logga in</button></form></div>','<script>if(new URLSearchParams(location.search).get("err"))document.getElementById("err").classList.add("show")</script>','</body></html>'].join('')
app.get('/login', (_req, res) => res.send(LOGIN_HTML))
app.post('/login', (req, res) => {
  const { username, password } = req.body
  if (username === APP_USERNAME && password === APP_PASSWORD) {
    const token = makeToken()
    sessions[token] = { username, at: Date.now() }
    res.setHeader('Set-Cookie', 'spot_session=' + token + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + (60*60*24*7))
    return res.redirect('/')
  }
  res.redirect('/login?err=1')
})
app.post('/logout', (req, res) => {
  delete sessions[getToken(req)]
  res.setHeader('Set-Cookie', 'spot_session=; Path=/; Max-Age=0')
  res.json({ ok: true })
})
const BRAND_FILE = '/tmp/spot_brand.json'
let brand = { primaryColor: '#b31e59', font: 'Segoe UI', tagline: 'a creative studio', logoUrl: null, socialLinks: { linkedin: '', instagram: '', facebook: '', tiktok: '' } }
try { if (fs.existsSync(BRAND_FILE)) brand = JSON.parse(fs.readFileSync(BRAND_FILE, 'utf-8')) } catch (_e) {}
function saveBrand() { try { fs.writeFileSync(BRAND_FILE, JSON.stringify(brand)) } catch (_e) {} }
app.get('/api/brand', auth, (_req, res) => res.json(brand))
app.post('/api/brand', auth, (req, res) => {
  const { primaryColor, font, tagline, socialLinks } = req.body
  if (primaryColor) brand.primaryColor = primaryColor
  if (font) brand.font = font
  if (tagline !== undefined) brand.tagline = tagline
  if (socialLinks) brand.socialLinks = Object.assign({}, brand.socialLinks, socialLinks)
  saveBrand(); res.json({ ok: true, brand })
})
app.post('/api/brand/logo', auth, (req, res) => {
  const { dataUrl } = req.body
  if (!dataUrl) return res.status(400).json({ error: 'no image' })
  brand.logoUrl = dataUrl; saveBrand(); res.json({ ok: true })
})
