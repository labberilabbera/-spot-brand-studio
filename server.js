const express = require('express')
const path = require('path')
const fs = require('fs')
const app = express()
const PORT = process.env.PORT || 3000
app.use(express.json({ limit: '20mb' }))

// UX-fixes + persistence injiceras precis innan sista </script>
const INJECT = `
;(function() {

  // === PERSISTENCE ===
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

  // === UX FIX 1: Göm briefInput-fältet i modalen, ta bort placeholder-texten ===
  // Vi döljer textarea och beskrivningstext i modalen
  window.addEventListener('load', function() {
    var briefEl = document.getElementById('briefInput');
    if (briefEl) {
      briefEl.parentElement && (briefEl.style.display = 'none');
      // Göm också beskrivningstexten ovanför
      var modal = document.getElementById('aiAssistModal');
      if (modal) {
        var divs = modal.querySelectorAll('div');
        divs.forEach(function(d) {
          if (d.textContent.includes('Beskriv vad') && d.style.fontSize === '13px') d.style.display = 'none';
        });
        // Ändra rubrik
        divs.forEach(function(d) {
          if (d.textContent.includes('Generera med AI') && d.style.fontSize === '16px') {
            d.innerHTML = '✨ Generera AI-förslag på text';
          }
        });
      }
    }
  });

  // === UX FIX 2: openAIAssist tar rubrik+innehall som brief ===
  var _origOpen = window.openAIAssist;
  window.openAIAssist = function() {
    // Fyll i briefInput med rubrik + innehall
    var title = (document.getElementById('m-title') || {}).value || '';
    var content = (document.getElementById('m-content') || {}).value || '';
    var brief = [title, content].filter(Boolean).join('. ');
    var briefEl = document.getElementById('briefInput');
    if (briefEl) briefEl.value = brief;
    // Anropa original
    if (_origOpen) _origOpen();
    else {
      document.querySelectorAll('#modalChGrid .ch-pill').forEach(function(p){p.classList.add('active');});
      document.getElementById('aiAssistModal').style.display = 'flex';
    }
  };

  // === UX FIX 3: selectProposal fyller i m-content och startar bildgenerering ===
  var _origSelect = window.selectProposal;
  window.selectProposal = function(ch, idx) {
    // Kör original forst
    if (_origSelect) _origSelect(ch, idx);
    // Hämta valt förslag
    var proposals = S.proposals && S.proposals[ch];
    if (!proposals || proposals[idx] === undefined) return;
    var p = proposals[idx];
    // Fyll i m-content och m-title
    var contentEl = document.getElementById('m-content');
    var titleEl = document.getElementById('m-title');
    if (contentEl) { contentEl.value = p.content || ''; contentEl.dispatchEvent(new Event('input')); }
    if (titleEl && p.title) { titleEl.value = p.title; titleEl.dispatchEvent(new Event('input')); }
  };

  // === UX FIX 4: "Lägg till granskning" i propsal-vyn stänger AI-modal och genererar bild ===
  var _origAddReview = window.addToReviewFromAI;
  // Patcha addReviewBtn-knappen när den visas
  var observer = new MutationObserver(function() {
    var btn = document.getElementById('addReviewBtn');
    if (btn && !btn._patched) {
      btn._patched = true;
      btn.addEventListener('click', function() {
        // Stäng AI-modal
        var modal = document.getElementById('aiAssistModal');
        if (modal) modal.style.display = 'none';
        // Trigga bildgenerering om generateImage finns
        setTimeout(function() {
          if (typeof generateImage === 'function') generateImage();
        }, 300);
      }, true);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

}());`

app.get('/', (req, res) => {
  const html = fs.readFileSync(path.join(__dirname, 'poc.html'), 'utf-8')
  const lastScript = html.lastIndexOf('</script>')
  const patched = html.slice(0, lastScript) + INJECT + html.slice(lastScript)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(patched)
})

app.post('/api/generate', async (req, res) => {
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

app.post('/api/generate-image', async (req, res) => {
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
