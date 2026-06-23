(function () {
  function init() {
    var dd = document.getElementById('pubDropdown');
    if (!dd) return;
    if (document.getElementById('spotLogoutBtn')) return;
    var btn = document.createElement('div');
    btn.id = 'spotLogoutBtn';
    btn.textContent = 'Logga ut';
    btn.style.cssText = 'padding:12px 16px;border-top:1px solid #eee;cursor:pointer;font-size:13px;color:#d2333a;font-weight:600;text-align:left;background:#fff';
    btn.onmouseenter = function () { btn.style.background = '#faf0f0'; };
    btn.onmouseleave = function () { btn.style.background = '#fff'; };
    btn.onclick = function () {
      fetch('/logout', { method: 'POST' }).then(function () {
        location.href = '/login';
      }).catch(function () {
        location.href = '/login';
      });
    };
    dd.appendChild(btn);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
