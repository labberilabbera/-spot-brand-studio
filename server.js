const app = express()
const PORT = process.env.PORT || 3000

const APP_USERNAME = process.env.APP_USERNAME || 'Spot'
const APP_PASSWORD = process.env.APP_PASSWORD || '1234'
const sessions = {}

function makeToken() { return crypto.randomBytes(32).toString('hex') }
// Auth config - satt via env-variabler eller defaults
const APP_PASSWORD = process.env.APP_PASSWORD || 'spot2024'
const SESSION_SECRET = process.env.SESSION_SECRET || 'spot-secret-xK9m'
const sessions = new Set()

function makeToken() {
  return crypto.randomBytes(32).toString('hex')
}
function authMiddleware(req, res, next) {
const cookie = req.headers.cookie || ''
const token = cookie.split(';').map(c=>c.trim()).find(c=>c.startsWith('spot_session='))?.split('=')[1]
  if (token && sessions[token]) return next()
  if (token && sessions.has(token)) return next()
res.redirect('/login')
}

app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true }))

const LOGIN_HTML = '<html lang="sv"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>spot. Brand Studio</title><style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:Segoe UI,sans-serif;background:#0f0f0f;min-height:100vh;display:flex;align-items:center;justify-content:center}.card{background:#fff;border-radius:20px;padding:40px 36px;width:min(380px,92vw);box-shadow:0 24px 60px rgba(0,0,0,.4)}.logo{font-size:28px;font-weight:800;color:#b31e59;letter-spacing:-1px;margin-bottom:4px}.tagline{font-size:13px;color:#9ca3af;margin-bottom:32px}.field{margin-bottom:16px}label{display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:6px}input{width:100%;padding:11px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:15px;outline:none;transition:border .2s;font-family:inherit}input:focus{border-color:#b31e59}.error{color:#b31e59;font-size:13px;margin-top:4px;display:none}.error.show{display:block}button{width:100%;margin-top:8px;padding:13px;background:#b31e59;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit}button:hover{background:#82093e}</style></head><body><div class="card"><div class="logo">spot.</div><div class="tagline">content studio</div><form method="POST" action="/login"><div class="field"><label>Anvandarnamn</label><input type="text" name="username" placeholder="Ange anvandarnamn" autofocus/></div><div class="field"><label>Losenord</label><input type="password" name="password" placeholder="Ange losenord"/></div><div class="error" id="err">Fel anvandarnamn eller losenord.</div><button type="submit">Logga in</button></form></div><script>if(new URLSearchParams(location.search).get("err"))document.getElementById("err").classList.add("show")</script></body></html>'
// Login-sida
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
label{display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:6px}
input{width:100%;padding:11px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:15px;outline:none;transition:border .2s}
input:focus{border-color:#b31e59}
.error{color:#b31e59;font-size:13px;margin-top:12px;display:none}
.error.show{display:block}
button{width:100%;margin-top:20px;padding:13px;background:#b31e59;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;transition:background .2s}
button:hover{background:#82093e}
</style>
</head>
<body>
<div class="card">
  <div class="logo">spot.</div>
  <div class="tagline">content studio</div>
  <form method="POST" action="/login">
    <label>Lösenord</label>
    <input type="password" name="password" placeholder="Ange lösenord" autofocus autocomplete="current-password"/>
    <div class="error" id="err">Fel lösenord, försök igen.</div>
    <button type="submit">Logga in</button>
  </form>
</div>
<script>
  const p = new URLSearchParams(location.search)
  if (p.get('err')) document.getElementById('err').classList.add('show')
</script>
</body>
</html>`

app.get('/login', (req, res) => res.send(LOGIN_HTML))

app.post('/login', (req, res) => {
  const { username, password } = req.body
  if (username === APP_USERNAME && password === APP_PASSWORD) {
  const { password } = req.body
  if (password === APP_PASSWORD) {
const token = makeToken()
    sessions[token] = { username }
    res.setHeader('Set-Cookie', 'spot_session=' + token + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + (60*60*24*7))
    sessions.add(token)
    res.setHeader('Set-Cookie', `spot_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60*60*24*7}`)
res.redirect('/')
} else {
res.redirect('/login?err=1')
@@ -40,88 +80,99 @@ app.post('/login', (req, res) => {
app.post('/logout', (req, res) => {
const cookie = req.headers.cookie || ''
const token = cookie.split(';').map(c=>c.trim()).find(c=>c.startsWith('spot_session='))?.split('=')[1]
  if (token) delete sessions[token]
  if (token) sessions.delete(token)
res.setHeader('Set-Cookie', 'spot_session=; Path=/; Max-Age=0')
  res.json({ ok: true })
  res.redirect('/login')
})

function buildInject() {
  var styles = [
    { key: 'natural',   icon: '\u{1F33F}', label: 'Natural',   desc: 'Naturliga farger' },
    { key: 'grayscale', icon: '\u26AB',    label: 'Grayscale', desc: 'Svartvitt' },
    { key: 'duotone',   icon: '\u{1F3A8}', label: 'Duotone',   desc: 'Spot.-rott' },
    { key: 'dark',      icon: '\u{1F319}', label: 'Dark',      desc: 'Morkt tema' }
  ]
  var cards = styles.map(function(s) {
    return '<div onclick="window._setImgStyle(' + JSON.stringify(s.key) + ',this)" data-style="' + s.key + '" style="border:2px solid #e5e7eb;border-radius:10px;padding:14px 12px;cursor:pointer;text-align:center">' +
      '<div style="font-size:20px;margin-bottom:4px">' + s.icon + '</div>' +
      '<div style="font-size:13px;font-weight:600;color:#111">' + s.label + '</div>' +
      '<div style="font-size:11px;color:#9ca3af">' + s.desc + '</div></div>'
  }).join('')

  var modalHTML = '<div style="background:#fff;border-radius:16px;padding:24px;max-width:420px;width:92%;box-shadow:0 20px 60px rgba(0,0,0,.2)">' +
    '<div style="font-size:16px;font-weight:700;color:#111;margin-bottom:4px">Valj bildstil</div>' +
    '<div style="font-size:13px;color:#6b7280;margin-bottom:18px">Valj stil innan AI genererar bilden</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px" id="img-style-grid">' + cards + '</div>' +
    '<div style="display:flex;gap:8px">' +
    '<button onclick="window._skipImgStyle()" style="flex:1;padding:10px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:14px;color:#6b7280;background:#fff;cursor:pointer">Hoppa over bild</button>' +
    '<button id="img-style-gen-btn" onclick="window._confirmImgStyle()" style="flex:1;padding:10px;background:#b31e59;color:#fff;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;border:none" disabled>Generera bild</button>' +
    '</div></div>'

  return ';(function(){' +
    // PERSISTENCE
    'var KEYS=["reviewQueue","publishedPosts","selectedChannels","manualChannels","manualTags","imageStyle"];' +
    'function save(){try{var d={};KEYS.forEach(function(k){d[k]=S[k];});localStorage.setItem("spot_state",JSON.stringify(d));}catch(e){}}' +
    'function loadState(){try{var d=JSON.parse(localStorage.getItem("spot_state")||"{}");KEYS.forEach(function(k){if(d[k]!==undefined)S[k]=d[k];});if(typeof renderDashboard==="function")renderDashboard();}catch(e){}}' +
    'loadState();setInterval(save,2000);window.addEventListener("beforeunload",save);' +

    // LOGOUT DROPDOWN
    'window.addEventListener("load",function(){' +
      'var avatarBtns=Array.from(document.querySelectorAll("div,button")).filter(function(el){var txt=el.textContent.trim();return txt.length===1&&/[A-Z]/.test(txt)&&el.offsetWidth<60&&el.offsetWidth>24;});' +
      'var avatar=avatarBtns[avatarBtns.length-1];' +
      'if(avatar){' +
        'var dd=document.createElement("div");dd.id="logout-dd";' +
        'dd.style.cssText="display:none;position:fixed;top:52px;right:12px;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.18);z-index:99999;min-width:160px;overflow:hidden;border:1px solid #f0f0f0";' +
        'dd.innerHTML='<div style="padding:12px 16px;border-bottom:1px solid #f0f0f0"><div style="font-size:13px;font-weight:700">Spot</div><div style="font-size:11px;color:#9ca3af">Administratör</div></div><button onclick="window._doLogout()" style="width:100%;padding:11px 16px;text-align:left;font-size:13px;color:#b31e59;font-weight:600;cursor:pointer;border:none;background:none;font-family:inherit">&#8594; Logga ut</button>';' +
        'document.body.appendChild(dd);' +
        'avatar.style.cursor="pointer";' +
        'avatar.addEventListener("click",function(e){e.stopPropagation();var d=document.getElementById("logout-dd");d.style.display=d.style.display==="none"?"block":"none";});' +
        'document.addEventListener("click",function(){var d=document.getElementById("logout-dd");if(d)d.style.display="none";});' +
        'window._doLogout=function(){fetch("/logout",{method:"POST"}).then(function(){location.href="/login";});};' +
      '}' +

      // BILDSTIL MODAL
      'var imgModal=document.createElement("div");imgModal.id="img-style-modal";' +
      'imgModal.style.cssText="display:none;position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:400;align-items:center;justify-content:center";' +
      'imgModal.innerHTML=' + JSON.stringify(modalHTML) + ';' +
      'document.body.appendChild(imgModal);' +
      'window._imgBrief="";window._imgStyleConfirmed=false;' +
      'window._setImgStyle=function(style,el){window._selectedImgStyle=style;S.imageStyle=style;document.querySelectorAll("#img-style-grid [data-style]").forEach(function(d){d.style.border="2px solid #e5e7eb";d.style.background="#fff";});el.style.border="2px solid #b31e59";el.style.background="#fff5f7";document.getElementById("img-style-gen-btn").disabled=false;};' +
      'window._skipImgStyle=function(){document.getElementById("img-style-modal").style.display="none";};' +
      'window._openImgStyleModal=function(brief){window._imgBrief=brief;document.getElementById("img-style-gen-btn").disabled=true;document.querySelectorAll("#img-style-grid [data-style]").forEach(function(d){d.style.border="2px solid #e5e7eb";d.style.background="#fff";if(d.getAttribute("data-style")===S.imageStyle){d.style.border="2px solid #b31e59";d.style.background="#fff5f7";document.getElementById("img-style-gen-btn").disabled=false;}});document.getElementById("img-style-modal").style.display="flex";};' +

      // STOPPA auto-bildgenerering
      'var _origGenImg=window.generateBrandImage;' +
      'window.generateBrandImage=function(brief,force){if(force===true&&window._imgStyleConfirmed){window._imgStyleConfirmed=false;if(_origGenImg)return _origGenImg(brief,force);return;}window._openImgStyleModal(brief||"");};' +
      'window._confirmImgStyle=function(){document.getElementById("img-style-modal").style.display="none";window._imgStyleConfirmed=true;if(typeof generateBrandImage==="function"){var orig=window._origGenImg||window.generateBrandImage;if(orig)orig(window._imgBrief,true);}};' +

      // UX: gom brief och kanalval i modal
      'var briefEl=document.getElementById("briefInput");if(briefEl)briefEl.style.display="none";' +
      'var chGrid=document.getElementById("modalChGrid");if(chGrid&&chGrid.parentElement)chGrid.parentElement.style.display="none";' +
    '});' +

    // openAIAssist tar rubrik+innehall
    'var _origOpen=window.openAIAssist;' +
    'window.openAIAssist=function(){var title=(document.getElementById("m-title")||{}).value||"";var content=(document.getElementById("m-content")||{}).value||"";var brief=[title,content].filter(Boolean).join(". ");var briefEl=document.getElementById("briefInput");if(briefEl)briefEl.value=brief;document.querySelectorAll("#modalChGrid .ch-pill").forEach(function(p){var ch=p.getAttribute("data-ch");if(S.selectedChannels&&S.selectedChannels.includes(ch))p.classList.add("active");else p.classList.remove("active");});if(_origOpen)_origOpen();else document.getElementById("aiAssistModal").style.display="flex";};' +

    // selectProposal fyller i m-content
    'var _origSelect=window.selectProposal;' +
    'window.selectProposal=function(ch,idx){if(_origSelect)_origSelect(ch,idx);var proposals=S.proposals&&S.proposals[ch];if(!proposals||!proposals[idx])return;var p=proposals[idx];var contentEl=document.getElementById("m-content");var titleEl=document.getElementById("m-title");if(contentEl){contentEl.value=p.content||"";contentEl.dispatchEvent(new Event("input"));}if(titleEl&&p.title){titleEl.value=p.title;titleEl.dispatchEvent(new Event("input"));}};' +

    '}());'
}

const INJECT = buildInject()
// Persistence + UX inject
const INJECT = `
;(function() {
  // Logout-knapp i header
  var header = document.querySelector('.topbar') || document.querySelector('header') || document.querySelector('nav');
  if (!header) {
    // Hitta topbar via inline style
    var all = document.querySelectorAll('div');
    all.forEach(function(d) {
      if (d.style && d.style.background && d.style.background.includes('fff') && d.offsetHeight < 70 && d.offsetHeight > 0) {
        if (!header) header = d;
      }
    });
  }
  // Lgg till logout-knapp overst till hoger
  var logoutBtn = document.createElement('button');
  logoutBtn.innerHTML = 'Logga ut';
  logoutBtn.style.cssText = 'position:fixed;top:12px;right:16px;z-index:9999;background:none;border:1.5px solid #e5e7eb;border-radius:8px;padding:6px 14px;font-size:12px;color:#6b7280;cursor:pointer;font-family:inherit';
  logoutBtn.onmouseover = function(){this.style.borderColor='#b31e59';this.style.color='#b31e59';};
  logoutBtn.onmouseout = function(){this.style.borderColor='#e5e7eb';this.style.color='#6b7280';};
  logoutBtn.onclick = function(){
    fetch('/logout',{method:'POST'}).then(function(){location.href='/login';});
  };
  document.body.appendChild(logoutBtn);

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

  // UX: Gom brief-faltet, anvand rubrik+innehall
  window.addEventListener('load', function() {
    var briefEl = document.getElementById('briefInput');
    if (briefEl) briefEl.style.display = 'none';
    var modal = document.getElementById('aiAssistModal');
    if (modal) {
      modal.querySelectorAll('div').forEach(function(d) {
        if (d.textContent.trim().startsWith('Beskriv vad') && getComputedStyle(d).fontSize === '13px') d.style.display='none';
      });
    }
    // Gom kanalval i modal
    var chGrid = document.getElementById('modalChGrid');
    if (chGrid && chGrid.parentElement) {
      chGrid.parentElement.style.display = 'none';
    }
  });

  // UX: openAIAssist anvander befintliga faltvarden
  var _origOpen = window.openAIAssist;
  window.openAIAssist = function() {
    var title = (document.getElementById('m-title')||{}).value||'';
    var content = (document.getElementById('m-content')||{}).value||'';
    var brief = [title,content].filter(Boolean).join('. ');
    var briefEl = document.getElementById('briefInput');
    if (briefEl) briefEl.value = brief;
    // Synka modal-kanaler med S.selectedChannels
    document.querySelectorAll('#modalChGrid .ch-pill').forEach(function(p){
      var ch = p.getAttribute('data-ch');
      if (S.selectedChannels && S.selectedChannels.includes(ch)) p.classList.add('active');
      else p.classList.remove('active');
    });
    if (_origOpen) _origOpen();
    else {
      document.getElementById('aiAssistModal').style.display='flex';
    }
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
