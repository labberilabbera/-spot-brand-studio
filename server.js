const app = express()
const PORT = process.env.PORT || 3000

// Auth config - satt via env-variabler eller defaults
const APP_PASSWORD = process.env.APP_PASSWORD || 'spot2024'
const SESSION_SECRET = process.env.SESSION_SECRET || 'spot-secret-xK9m'
const sessions = new Set()
const APP_USERNAME = process.env.APP_USERNAME || 'Spot'
const APP_PASSWORD = process.env.APP_PASSWORD || '1234'
const sessions = {}

function makeToken() { return crypto.randomBytes(32).toString('hex') }

function makeToken() {
  return crypto.randomBytes(32).toString('hex')
}
function authMiddleware(req, res, next) {
const cookie = req.headers.cookie || ''
const token = cookie.split(';').map(c=>c.trim()).find(c=>c.startsWith('spot_session='))?.split('=')[1]
  if (token && sessions.has(token)) return next()
  if (token && sessions[token]) return next()
res.redirect('/login')
}

app.use(express.json({ limit: '20mb' }))
app.use(express.urlencoded({ extended: true }))

// Login-sida
const LOGIN_HTML = `<!DOCTYPE html>
<html lang="sv">
<head>
@@ -36,12 +33,13 @@ body{font-family:'Segoe UI',system-ui,sans-serif;background:#0f0f0f;min-height:1
.card{background:#fff;border-radius:20px;padding:40px 36px;width:min(380px,92vw);box-shadow:0 24px 60px rgba(0,0,0,.4)}
.logo{font-size:28px;font-weight:800;color:#b31e59;letter-spacing:-1px;margin-bottom:4px}
.tagline{font-size:13px;color:#9ca3af;margin-bottom:32px}
.field{margin-bottom:16px}
label{display:block;font-size:12px;font-weight:600;color:#374151;margin-bottom:6px}
input{width:100%;padding:11px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:15px;outline:none;transition:border .2s}
input{width:100%;padding:11px 14px;border:1.5px solid #e5e7eb;border-radius:10px;font-size:15px;outline:none;transition:border .2s;font-family:inherit}
input:focus{border-color:#b31e59}
.error{color:#b31e59;font-size:13px;margin-top:12px;display:none}
.error{color:#b31e59;font-size:13px;margin-top:4px;display:none}
.error.show{display:block}
button{width:100%;margin-top:20px;padding:13px;background:#b31e59;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;transition:background .2s}
button{width:100%;margin-top:8px;padding:13px;background:#b31e59;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;transition:background .2s;font-family:inherit}
button:hover{background:#82093e}
</style>
</head>
@@ -50,26 +48,29 @@ button:hover{background:#82093e}
 <div class="logo">spot.</div>
 <div class="tagline">content studio</div>
 <form method="POST" action="/login">
    <label>Lösenord</label>
    <input type="password" name="password" placeholder="Ange lösenord" autofocus autocomplete="current-password"/>
    <div class="error" id="err">Fel lösenord, försök igen.</div>
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
<script>
  const p = new URLSearchParams(location.search)
  if (p.get('err')) document.getElementById('err').classList.add('show')
</script>
<script>if(new URLSearchParams(location.search).get('err')) document.getElementById('err').classList.add('show')</script>
</body>
</html>`

app.get('/login', (req, res) => res.send(LOGIN_HTML))

app.post('/login', (req, res) => {
  const { password } = req.body
  if (password === APP_PASSWORD) {
  const { username, password } = req.body
  if (username === APP_USERNAME && password === APP_PASSWORD) {
const token = makeToken()
    sessions.add(token)
    sessions[token] = { username, loginTime: Date.now() }
res.setHeader('Set-Cookie', `spot_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60*60*24*7}`)
res.redirect('/')
} else {
@@ -80,36 +81,13 @@ app.post('/login', (req, res) => {
app.post('/logout', (req, res) => {
const cookie = req.headers.cookie || ''
const token = cookie.split(';').map(c=>c.trim()).find(c=>c.startsWith('spot_session='))?.split('=')[1]
  if (token) sessions.delete(token)
  if (token) delete sessions[token]
res.setHeader('Set-Cookie', 'spot_session=; Path=/; Max-Age=0')
  res.redirect('/login')
  res.json({ ok: true })
})

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
@@ -122,41 +100,73 @@ const INJECT = `
 setInterval(save, 2000);
 window.addEventListener('beforeunload', save);

  // UX: Gom brief-faltet, anvand rubrik+innehall
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
        if (d.textContent.trim().startsWith('Beskriv vad') && getComputedStyle(d).fontSize === '13px') d.style.display='none';
        if (d.textContent.trim().startsWith('Beskriv vad')) d.style.display = 'none';
     });
   }
    // Gom kanalval i modal
    var chGrid = document.getElementById('modalChGrid');
    if (chGrid && chGrid.parentElement) {
      chGrid.parentElement.style.display = 'none';
    }
 });

  // UX: openAIAssist anvander befintliga faltvarden
  // UX: openAIAssist anvander rubrik+innehall som brief
 var _origOpen = window.openAIAssist;
 window.openAIAssist = function() {
   var title = (document.getElementById('m-title')||{}).value||'';
   var content = (document.getElementById('m-content')||{}).value||'';
   var brief = [title,content].filter(Boolean).join('. ');
   var briefEl = document.getElementById('briefInput');
   if (briefEl) briefEl.value = brief;
    // Synka modal-kanaler med S.selectedChannels
    document.querySelectorAll('#modalChGrid .ch-pill').forEach(function(p){
    document.querySelectorAll('#modalChGrid .ch-pill').forEach(function(p) {
     var ch = p.getAttribute('data-ch');
     if (S.selectedChannels && S.selectedChannels.includes(ch)) p.classList.add('active');
     else p.classList.remove('active');
   });
   if (_origOpen) _origOpen();
    else {
      document.getElementById('aiAssistModal').style.display='flex';
    }
    else document.getElementById('aiAssistModal').style.display = 'flex';
 };

 // UX: selectProposal fyller i m-content
@@ -171,7 +181,6 @@ const INJECT = `
   if (contentEl) { contentEl.value = p.content||''; contentEl.dispatchEvent(new Event('input')); }
   if (titleEl && p.title) { titleEl.value = p.title; titleEl.dispatchEvent(new Event('input')); }
 };

}());`

app.get('/', authMiddleware, (req, res) => {
