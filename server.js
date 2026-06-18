const express = require('express')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')
const app = express()
const PORT = process.env.PORT || 3000

const APP_USERNAME = process.env.APP_USERNAME || 'Spot'
const APP_PASSWORD = process.env.APP_PASSWORD || '1234'
const sessions = {}

function makeToken() { return crypto.randomBytes(32).toString('hex') }

function authMiddleware(req, res, next) {
  const cookie = req.headers.cookie || ''
  const token = cookie.split(';').map(c=>c.trim()).find(c=>c.startsWith('spot_session='))?.split('=')[1]
  if (token && sessions[token]) return next()
  res.redirect('/login')
}

app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true }))

const LOGIN_HTML = `<!DOCTYPE html>
<html lang="sv">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>spot. Brand Studio — Logga in</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',system-ui,sans-serif;background:#0f0f0f;min-height:100vh;display:flex;align-items:center;justify-content:center}
.card{background:#fff;border-radius:20px;padding:40px 36px;width:min(380px,92vw);box-shadow:0 24px 60px rgba(0,0,0,.4)}
.logo{font-size:28px;font-weight:800;color:#b31e59;letter-spacing:-1px;margin-bottom:4px}
.tagline{font-size:13px;color:#9ca3af;margin-bottom:32px}
.field{margin-bottom:16px}
label{display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:6px}
input{width:100%;padding:11px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:15px;outline:none;transition:border .2s;font-family:inherit}
input:focus{border-color:#b31e59}
.error{color:#b31e59;font-size:13px;margin-top:4px;display:none}
.error.show{display:block}
button{width:100%;margin-top:8px;padding:13px;background:#b31e59;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;transition:background .2s;font-family:inherit}
button:hover{background:#82093e}
</style>
</head>
<body>
<div class="card">
  <div class="logo">spot.</div>
  <div class="tagline">content studio</div>
  <form method="POST" action="/login">
    <div class="field">
      <label>Anvandarnamn</label>
      <input type="text" name="username" placeholder="Ange anvandarnamn" autofocus autocomplete="username"/>
    </div>
    <div class="field">
      <label>Losenord</label>
      <input type="password" name="password" placeholder="Ange losenord" autocomplete="current-password"/>
    </div>
    <div class="error" id="err">Fel användarnamn eller lösenord.</div>
    <button type="submit">Logga in</button>
  </form>
</div>
<script>if(new URLSearchParams(location.search).get('err')) document.getElementById('err').classList.add('show')</script>
</body>
</html>`

app.get('/login', (req, res) => res.send(LOGIN_HTML))

app.post('/login', (req, res) => {
  const { username, password } = req.body
  if (username === APP_USERNAME && password === APP_PASSWORD) {
    const token = makeToken()
    sessions[token] = { username, loginTime: Date.now() }
    res.setHeader('Set-Cookie', `spot_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60*60*24*7}`)
    res.redirect('/')
  } else {
    res.redirect('/login?err=1')
  }
})

app.post('/logout', (req, res) => {
  const cookie = req.headers.cookie || ''
  const token = cookie.split(';').map(c=>c.trim()).find(c=>c.startsWith('spot_session='))?.split('=')[1]
  if (token) delete sessions[token]
  res.setHeader('Set-Cookie', 'spot_session=; Path=/; Max-Age=0')
  res.json({ ok: true })
})

const INJECT = `
;(function() {
  // PERSISTENCE
  var KEYS = ['reviewQueue','publishedPosts','selectedChannels','manualChannels','manualTags','imageStyle'];
  function save() {
    try { var d={}; KEYS.forEach(function(k){d[k]=S[k];}); localStorage.setItem('spot_state',JSON.stringify(d)); } catch(e){}
  }
  function loadState() {
    try { var d=JSON.parse(localStorage.getItem('spot_state')||'{}'); KEYS.forEach(function(k){if(d[k]!==undefined)S[k]=d[k];}); if(typeof renderDashboard==='function') renderDashboard(); } catch(e){}
  }
  loadState();
  setInterval(save, 2000);
  window.addEventListener('beforeunload', save);

  // LOGGA UT — dropdown vid profilbubblan
  window.addEventListener('load', function() {
    // Hitta profilbubblan (den runda "A"-knappen overst till hoger)
    var avatarBtns = Array.from(document.querySelectorAll('div,button')).filter(function(el) {
      var s = el.style;
      var txt = el.textContent.trim();
      return txt.length === 1 && /[A-Z]/.test(txt) && el.offsetWidth < 60 && el.offsetWidth > 24;
    });
    var avatar = avatarBtns[avatarBtns.length - 1];
    if (!avatar) return;

    // Skapa dropdown
    var dropdown = document.createElement('div');
    dropdown.id = 'logout-dropdown';
    dropdown.style.cssText = 'display:none;position:fixed;top:52px;right:12px;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.18);z-index:99999;min-width:160px;overflow:hidden;border:1px solid #f0f0f0';
    dropdown.innerHTML = '<div style="padding:12px 16px;border-bottom:1px solid #f0f0f0"><div style="font-size:13px;font-weight:700;color:#111">Spot</div><div style="font-size:11px;color:#9ca3af">Administratör</div></div><button onclick="window._doLogout()" style="width:100%;padding:11px 16px;text-align:left;font-size:13px;color:#b31e59;font-weight:600;cursor:pointer;border:none;background:none;font-family:inherit;display:flex;align-items:center;gap:8px"><span>&#8594;</span> Logga ut</button>';
    document.body.appendChild(dropdown);

    // Toggla dropdown vid klick pa avatar
    avatar.style.cursor = 'pointer';
    avatar.addEventListener('click', function(e) {
      e.stopPropagation();
      var d = document.getElementById('logout-dropdown');
      d.style.display = d.style.display === 'none' ? 'block' : 'none';
    });

    // Stang vid klick utanfor
    document.addEventListener('click', function() {
      var d = document.getElementById('logout-dropdown');
      if (d) d.style.display = 'none';
    });

    // Logout-funktion
    window._doLogout = function() {
      fetch('/logout', {method:'POST'}).then(function() { location.href = '/login'; });
    };
  });

  // UX: Gom brief-faltet och kanalval i AI-modal
  window.addEventListener('load', function() {
    var briefEl = document.getElementById('briefInput');
    if (briefEl) briefEl.style.display = 'none';
    var chGrid = document.getElementById('modalChGrid');
    if (chGrid && chGrid.parentElement) chGrid.parentElement.style.display = 'none';
    var modal = document.getElementById('aiAssistModal');
    if (modal) {
      modal.querySelectorAll('div').forEach(function(d) {
        if (d.textContent.trim().startsWith('Beskriv vad')) d.style.display = 'none';
      });
    }
  });

  // UX: openAIAssist anvander rubrik+innehall som brief
  var _origOpen = window.openAIAssist;
  window.openAIAssist = function() {
    var title = (document.getElementById('m-title')||{}).value||'';
    var content = (document.getElementById('m-content')||{}).value||'';
    var brief = [title,content].filter(Boolean).join('. ');
    var briefEl = document.getElementById('briefInput');
    if (briefEl) briefEl.value = brief;
    document.querySelectorAll('#modalChGrid .ch-pill').forEach(function(p) {
      var ch = p.getAttribute('data-ch');
      if (S.selectedChannels && S.selectedChannels.includes(ch)) p.classList.add('active');
      else p.classList.remove('active');
    });
    if (_origOpen) _origOpen();
    else document.getElementById('aiAssistModal').style.display = 'flex';
  };

  // UX: selectProposal fyller i m-content
  var _origSelect = window.selectProposal;
  window.selectProposal = function(ch, idx) {
    if (_origSelect) _origSelect(ch, idx);
    var proposals = S.proposals && S.proposals[ch];
    if (!proposals || !proposals[idx]) return;
    var p = proposals[idx];
    var contentEl = document.getElementById('m-content');
    var titleEl = document.getElementById('m-title');
    if (contentEl) { contentEl.value = p.content||''; contentEl.dispatchEvent(new Event('input')); }
    if (titleEl && p.title) { titleEl.value = p.title; titleEl.dispatchEvent(new Event('input')); }
  };
}());`

app.get('/', authMiddleware, (req, res) => {
  const html = fs.readFileSync(path.join(__dirname, 'poc.html'), 'utf-8')
  const lastScript = html.lastIndexOf('</script>')
  const patched = html.slice(0, lastScript) + INJECT + html.slice(lastScript)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(patched)
})

app.post('/api/generate', authMiddleware, async (req, res) => {
  try {
    const { channels=['instagram'], brief='', style='standard', brand } = req.body
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY saknas' })
    const channelList = Array.isArray(channels) ? channels : [channels]
    const prompt = 'Du ar copywriter for spot. creative studio Halmstad. Ton: professionell, varm, kreativ. Brief: '+(brief||'Generellt om spot.')+'. Kanaler: '+channelList.join(', ')+'. Generera EXAKT 3 korta forslag max 100 ord vardera. Svara ENDAST med JSON-array: [{"title":"...","content":"...","hashtags":["..."],"cta":"..."},{"title":"...","content":"...","hashtags":["..."],"cta":"..."},{"title":"...","content":"...","hashtags":["..."],"cta":"..."}]'
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key='+apiKey, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ contents: [{parts: [{text: prompt}]}], generationConfig: {temperature: 0.9, maxOutputTokens: 8192} })
    })
    const data = await r.json()
    if (data.error) throw new Error('Gemini API: ' + data.error.message)
    const textOnly = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    let s = textOnly.replace(/```json/g,'').replace(/```/g,'').trim()
    s = s.replace(/,(s*[}]])/g, '$1')
    const start = s.indexOf('['); const end = s.lastIndexOf(']')
    if (start === -1 || end === -1) throw new Error('Ingen array: '+s.slice(0,100))
    const flatProposals = JSON.parse(s.slice(start, end+1))
    const proposals = {}
    channelList.forEach(ch => { proposals[ch] = flatProposals })
    res.json({ proposals })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/generate-image', authMiddleware, async (req, res) => {
  try {
    const { brief='', style='modern' } = req.body
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY saknas' })
    const prompt = 'Create a professional social media image for spot. creative studio in Halmstad, Sweden. Style: '+style+'. Brief: '+(brief||'Creative studio branding')+'. Minimalist, on-brand, high quality. Brand colors: deep red #c8003c, black, off-white.'
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key='+apiKey, {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ contents: [{parts: [{text: prompt}]}], generationConfig: {responseModalities: ['IMAGE','TEXT']} })
    })
    const data = await r.json()
    if (data.error) throw new Error('Gemini: ' + data.error.message)
    const parts = data.candidates?.[0]?.content?.parts || []
    const imgPart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'))
    if (imgPart) return res.json({ imageUrl: 'data:'+imgPart.inlineData.mimeType+';base64,'+imgPart.inlineData.data })
    res.json({ imageUrl: 'https://placehold.co/1080x1080/c8003c/ffffff?text=spot.' })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/save-post', authMiddleware, async (req, res) => {
  try {
    const { Pool } = require('pg')
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
    await pool.query('CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, data JSONB, created_at TIMESTAMPTZ DEFAULT NOW())')
    const post = req.body
    await pool.query('INSERT INTO posts (id,data) VALUES ($1,$2) ON CONFLICT (id) DO UPDATE SET data=$2,created_at=NOW()', [post.id||Date.now().toString(), JSON.stringify(post)])
    res.json({ saved: true })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.get('/api/published-posts', authMiddleware, async (req, res) => {
  try {
    const { Pool } = require('pg')
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
    await pool.query('CREATE TABLE IF NOT EXISTS posts (id TEXT PRIMARY KEY, data JSONB, created_at TIMESTAMPTZ DEFAULT NOW())')
    const result = await pool.query("SELECT data FROM posts WHERE data->>'status' IN ('published','archived') ORDER BY created_at DESC LIMIT 200")
    res.json({ posts: result.rows.map(r => r.data) })
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.listen(PORT, () => console.log('spot. running on '+PORT))
