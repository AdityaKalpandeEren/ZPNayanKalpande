/* © 2026 Nayan Kalpande. All rights reserved. See LICENSE. */
/* =========================================================
   Nayan Kalpande – shared login layer (used by both apps)
   Login: 10-digit mobile number + 6-digit PIN (free, no SMS)
   Data:  Google Firebase (Auth + Firestore), rules in firestore.rules
   ========================================================= */
(function () {
  'use strict';
  var APP = window.NK_APP || 'math';
  var CFG = window.NK_CONFIG || {};
  var DOMAIN = '@nkzp.app';            // internal login id: <mobile>@nkzp.app (no email is ever sent)
  var SDK = 'https://www.gstatic.com/firebasejs/10.12.2/';
  var CACHE_KEY = 'nk-profile';
  var auth = null, db = null, FV = null, phone = null, profile = null, offline = false;
  var readyCbs = [], unlocked = false;

  document.documentElement.classList.add('nk-locked');

  /* ---------- styles ---------- */
  var css = '' +
  '.nk-locked body>*:not(#nkGate):not(script){display:none!important}' +
  '#nkGate,.nk-modal{--nk-acc:var(--leaf,var(--margin,#2d8656));--nk-bg:var(--paper,#f6f7f3);--nk-card:var(--card,#fff);--nk-ink:var(--ink,#1b2d5a);--nk-mut:var(--muted,#5a6280);--nk-line:var(--line,#d8dfe9);' +
  'font-family:"Mukta","Noto Sans Devanagari",sans-serif;color:var(--nk-ink)}' +
  '#nkGate{min-height:100vh;min-height:100dvh;display:flex;align-items:flex-start;justify-content:center;padding:24px 14px;background:var(--nk-bg)}' +
  '.nk-box{width:100%;max-width:440px;background:var(--nk-card);border:1px solid var(--nk-line);border-radius:18px;padding:20px 18px}' +
  '.nk-brand{font-family:"Baloo 2","Andika",sans-serif;font-weight:800;font-size:25px;line-height:1.15;margin:0 0 2px}' +
  '.nk-sub{color:var(--nk-mut);font-size:15px;margin:0 0 16px}' +
  '.nk-f{margin:10px 0}.nk-f label{display:block;font-size:14.5px;color:var(--nk-mut);margin-bottom:3px}' +
  '.nk-f input,.nk-f select{width:100%;box-sizing:border-box;padding:12px;border:1.5px solid var(--nk-line);border-radius:10px;font-size:18px;background:var(--nk-bg);color:var(--nk-ink);font-family:inherit}' +
  '.nk-seg{display:flex;gap:8px}.nk-seg label{flex:1;border:1.5px solid var(--nk-line);border-radius:10px;padding:10px 6px;text-align:center;cursor:pointer;font-size:16px;color:var(--nk-ink)}' +
  '.nk-seg input{position:absolute;opacity:0;width:1px;height:1px}.nk-seg input:checked+span{font-weight:700}.nk-seg label:has(input:checked){border-color:var(--nk-acc);background:color-mix(in srgb,var(--nk-acc) 12%,transparent)}' +
  '.nk-chk{display:flex;gap:10px;align-items:flex-start;font-size:14.5px;margin:12px 0}.nk-chk input{width:22px;height:22px;flex:0 0 22px;margin-top:2px}' +
  '.nk-btn{width:100%;border:0;border-radius:12px;padding:13px;font-size:18px;font-weight:700;background:var(--nk-acc);color:#fff;cursor:pointer;font-family:inherit;margin-top:8px}' +
  '.nk-btn.nk-alt{background:transparent;color:var(--nk-ink);border:1.5px solid var(--nk-line)}' +
  '.nk-btn:disabled{opacity:.6}' +
  '.nk-link{background:none;border:0;color:var(--nk-acc);font-weight:700;font-size:16px;cursor:pointer;padding:8px 0;font-family:inherit}' +
  '.nk-msg{border-radius:10px;padding:9px 12px;margin:10px 0;font-size:15px}.nk-msg:empty{display:none}' +
  '.nk-err{background:color-mix(in srgb,#c3342a 12%,transparent);color:var(--bad,#b22b22)}' +
  '.nk-ok{background:color-mix(in srgb,#1d8a4b 12%,transparent)}' +
  '.nk-small{font-size:13.5px;color:var(--nk-mut)}' +
  '.nk-modal{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center}' +
  '.nk-sheet{background:var(--nk-card);width:100%;max-width:560px;max-height:88vh;overflow:auto;border-radius:18px 18px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom,0px))}' +
  '.nk-sheet h2{font-family:"Baloo 2",sans-serif;margin:0 0 8px;font-size:23px}' +
  '.nk-row{display:flex;align-items:center;gap:10px;padding:9px 4px;border-bottom:1px solid var(--nk-line)}' +
  '.nk-rank{flex:0 0 34px;font-weight:800;font-size:18px;text-align:center}.nk-who{flex:1;min-width:0}.nk-who b{display:block}.nk-who span{font-size:13.5px;color:var(--nk-mut);display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}' +
  '.nk-time{font-weight:700;white-space:nowrap}.nk-me{background:color-mix(in srgb,var(--nk-acc) 10%,transparent);border-radius:10px}' +
  '.nk-kv{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:8px 0 12px}.nk-kv dt{color:var(--nk-mut)}.nk-kv dd{margin:0;font-weight:600}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  /* ---------- helpers ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function digits(s) { return String(s || '').replace(/[०-९]/g, function (c) { return '०१२३४५६७८९'.indexOf(c); }).replace(/\D/g, ''); }
  function loadScript(src) { return new Promise(function (res, rej) { var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); }); }
  function cached() { try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (e) { return null; } }
  function setCached(p) { try { if (p) localStorage.setItem(CACHE_KEY, JSON.stringify(p)); else localStorage.removeItem(CACHE_KEY); } catch (e) {} }
  function pw(pin) { return 'NK-' + pin; }
  function firstName(n) { return String(n).trim().split(/\s+/)[0].slice(0, 30); }
  function mins(m) { m = m || 0; var h = Math.floor(m / 60), r = m % 60; return h ? (h + ' तास ' + r + ' मि.') : (r + ' मि.'); }
  function configured() { return CFG.firebase && CFG.firebase.apiKey && CFG.firebase.apiKey.indexOf('PASTE') !== 0; }
  function errText(e) {
    var c = (e && e.code) || '';
    if (c === 'auth/invalid-credential' || c === 'auth/wrong-password' || c === 'auth/user-not-found' || c === 'auth/invalid-login-credentials') return 'मोबाइल नंबर किंवा PIN चुकीचा आहे. / Wrong mobile number or PIN.';
    if (c === 'auth/too-many-requests') return 'खूप वेळा चुकीचा PIN टाकला. थोड्या वेळाने प्रयत्न करा. / Too many attempts, try later.';
    if (c === 'auth/network-request-failed' || c === 'unavailable') return 'इंटरनेट कनेक्शन तपासा. / Check internet connection.';
    if (c === 'auth/email-already-in-use') return 'हा मोबाइल नंबर आधीच नोंदलेला आहे. लॉगिन करा. / This number is already registered. Please log in.';
    if (c === 'permission-denied') return 'माहिती जतन करता आली नाही (परवानगी नाकारली). शिक्षकांना कळवा. / Could not save (permission denied).';
    return 'काहीतरी चुकले. पुन्हा प्रयत्न करा. / Something went wrong. (' + esc(c || (e && e.message) || '') + ')';
  }

  /* ---------- gate UI ---------- */
  var gate;
  function view(html) { $('nkView').innerHTML = html; }
  function buildGate() {
    gate = document.createElement('div'); gate.id = 'nkGate';
    var title = APP === 'english' ? 'Nayan Kalpande English' : 'Nayan Kalpande Math';
    gate.innerHTML = '<div class="nk-box"><p class="nk-brand">' + title + '</p><p class="nk-sub">जिल्हा परिषद शाळा · इयत्ता ६ वी व ७ वी</p><div id="nkView"><p>लोड होत आहे… / Loading…</p></div></div>';
    document.body.insertBefore(gate, document.body.firstChild);
  }

  function showLogin(msg, isErr) {
    var c = cached();
    view('<h2 style="margin:0 0 4px;font-size:21px">लॉगिन / Login</h2>' +
      '<div class="nk-msg ' + (isErr ? 'nk-err' : 'nk-ok') + '">' + (msg || '') + '</div>' +
      '<div class="nk-f"><label for="nkPh">मोबाइल नंबर / Mobile number</label><input id="nkPh" inputmode="numeric" maxlength="10" autocomplete="username" value="' + esc(c ? c.phone : '') + '" placeholder="10 अंकी नंबर"></div>' +
      '<div class="nk-f"><label for="nkPin">PIN (6 अंक)</label><input id="nkPin" type="password" inputmode="numeric" maxlength="6" autocomplete="current-password" placeholder="••••••"></div>' +
      '<button class="nk-btn" id="nkLogin">लॉगिन करा / Log in</button>' +
      '<p style="text-align:center;margin:14px 0 0">नवीन आहात? <button class="nk-link" id="nkToReg">नोंदणी करा / Register</button></p>' +
      '<p class="nk-small">PIN विसरलात? तुमच्या शिक्षकांना सांगा – ते खाते रीसेट करून देतील. / Forgot PIN? Ask your teacher.</p>');
    $('nkLogin').onclick = doLogin;
    $('nkPin').onkeydown = function (e) { if (e.key === 'Enter') doLogin(); };
    $('nkToReg').onclick = function () { showRegister(); };
  }

  function formFields(withLogin) {
    return (withLogin ? '' : '') +
      '<div class="nk-f"><label for="nkName">पूर्ण नाव / Full name</label><input id="nkName" maxlength="60" autocomplete="name"></div>' +
      (withLogin ? '<div class="nk-f"><label for="nkPh">मोबाइल नंबर (हेच तुमचे युजरनेम) / Mobile number (your username)</label><input id="nkPh" inputmode="numeric" maxlength="10" placeholder="10 अंकी नंबर"></div>' : '') +
      '<div class="nk-f"><label for="nkSchool">जि. प. शाळेचे नाव / ZP school name</label><input id="nkSchool" maxlength="120" placeholder="उदा. जि. प. उच्च प्राथमिक शाळा, …"></div>' +
      '<div class="nk-f"><label>इयत्ता / Class</label><div class="nk-seg"><label><input type="radio" name="nkCls" value="6"><span>६ वी / 6th</span></label><label><input type="radio" name="nkCls" value="7"><span>७ वी / 7th</span></label></div></div>' +
      '<div class="nk-f"><label>मी आहे / I am a</label><div class="nk-seg"><label><input type="radio" name="nkRole" value="student"><span>🎒 विद्यार्थी / Student</span></label><label><input type="radio" name="nkRole" value="teacher"><span>👩‍🏫 शिक्षक / Teacher</span></label></div></div>' +
      (withLogin ? '<div class="nk-f"><label for="nkPin">नवीन PIN (6 अंक) / New 6-digit PIN</label><input id="nkPin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div>' +
        '<div class="nk-f"><label for="nkPin2">PIN पुन्हा टाका / Confirm PIN</label><input id="nkPin2" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div>' : '') +
      '<label class="nk-chk"><input type="checkbox" id="nkConsent"><span>मी <a href="../privacy.html" target="_blank" rel="noopener">गोपनीयता धोरण</a> वाचले आहे. मी विद्यार्थी असल्यास, माझ्या पालकांनी शाळेमार्फत या नोंदणीला संमती दिली आहे.<br><span class="nk-small">I have read the privacy policy. If I am a student, my parent has given consent through the school.</span></span></label>';
  }

  function showRegister(msg) {
    view('<h2 style="margin:0 0 4px;font-size:21px">नवीन नोंदणी / Register</h2><div class="nk-msg nk-err">' + (msg || '') + '</div>' +
      formFields(true) + '<button class="nk-btn" id="nkReg">नोंदणी करा / Register</button>' +
      '<p style="text-align:center;margin:12px 0 0"><button class="nk-link" id="nkToLogin">← लॉगिनकडे परत / Back to login</button></p>');
    $('nkReg').onclick = doRegister;
    $('nkToLogin').onclick = function () { showLogin(); };
  }

  function showCompleteProfile(msg) {
    view('<h2 style="margin:0 0 4px;font-size:21px">माहिती पूर्ण करा / Complete your details</h2><div class="nk-msg nk-err">' + (msg || '') + '</div>' +
      formFields(false) + '<button class="nk-btn" id="nkSave">जतन करा / Save</button>');
    $('nkSave').onclick = function () { saveProfileFromForm(false); };
  }

  function readForm(withLogin) {
    var name = ($('nkName').value || '').trim().replace(/\s+/g, ' ');
    var school = ($('nkSchool').value || '').trim().replace(/\s+/g, ' ');
    var clsEl = document.querySelector('input[name=nkCls]:checked');
    var roleEl = document.querySelector('input[name=nkRole]:checked');
    var f = { name: name, school: school, cls: clsEl ? clsEl.value : '', role: roleEl ? roleEl.value : '' };
    var errs = [];
    if (name.length < 2) errs.push('पूर्ण नाव लिहा.');
    if (school.length < 2) errs.push('शाळेचे नाव लिहा.');
    if (!f.cls) errs.push('इयत्ता निवडा.');
    if (!f.role) errs.push('विद्यार्थी की शिक्षक ते निवडा.');
    if (withLogin) {
      f.phone = digits($('nkPh').value); f.pin = digits($('nkPin').value);
      var pin2 = digits($('nkPin2').value);
      if (!/^[6-9]\d{9}$/.test(f.phone)) errs.push('योग्य 10 अंकी मोबाइल नंबर लिहा.');
      if (!/^\d{6}$/.test(f.pin)) errs.push('PIN बरोबर 6 अंकांचा असावा.');
      else if (/^(\d)\1{5}$/.test(f.pin) || f.pin === '123456' || f.pin === '654321') errs.push('हा PIN सहज ओळखता येतो. वेगळा PIN निवडा.');
      else if (f.pin !== pin2) errs.push('दोन्ही PIN जुळत नाहीत.');
    }
    if (!$('nkConsent').checked) errs.push('गोपनीयता धोरण / संमती चौकटीवर खूण करा.');
    return { f: f, errs: errs };
  }

  /* ---------- actions ---------- */
  function busy(id, on) { var b = $(id); if (b) { b.disabled = on; } }

  function doLogin() {
    var ph = digits($('nkPh').value), pin = digits($('nkPin').value);
    if (!/^[6-9]\d{9}$/.test(ph)) return showLogin('योग्य 10 अंकी मोबाइल नंबर लिहा. / Enter a valid 10-digit number.', true);
    if (!/^\d{6}$/.test(pin)) { var p = $('nkPin'); showLogin('PIN 6 अंकांचा आहे. / PIN has 6 digits.', true); $('nkPh').value = ph; return; }
    busy('nkLogin', true);
    auth.signInWithEmailAndPassword(ph + DOMAIN, pw(pin)).then(function (cred) {
      phone = ph;
      return db.collection('users').doc(ph).get();
    }).then(function (snap) {
      if (!snap.exists) return showCompleteProfile('तुमची माहिती सापडली नाही. कृपया पुन्हा भरा.');
      var d = snap.data();
      profile = { phone: phone, name: d.name, school: d.school, cls: d.cls, role: d.role };
      setCached(profile); unlock();
    }).catch(function (e) {
      var c = cached();
      if (((e && e.code) === 'auth/network-request-failed') && c && c.phone === ph) return showOfflineChoice(c);
      showLogin(errText(e), true); $('nkPh').value = ph;
    });
  }

  function doRegister() {
    var r = readForm(true);
    if (r.errs.length) return $('nkView').querySelector('.nk-msg').innerHTML = r.errs.join('<br>');
    busy('nkReg', true);
    var f = r.f;
    auth.createUserWithEmailAndPassword(f.phone + DOMAIN, pw(f.pin)).then(function () {
      phone = f.phone; return writeProfile(f);
    }).then(function () {
      profile = { phone: phone, name: f.name, school: f.school, cls: f.cls, role: f.role };
      setCached(profile); unlock();
    }).catch(function (e) {
      busy('nkReg', false);
      if (auth.currentUser && phone) return showCompleteProfile(errText(e));
      $('nkView').querySelector('.nk-msg').innerHTML = errText(e);
    });
  }

  function saveProfileFromForm() {
    var r = readForm(false);
    if (r.errs.length) return $('nkView').querySelector('.nk-msg').innerHTML = r.errs.join('<br>');
    busy('nkSave', true);
    writeProfile(r.f).then(function () {
      profile = { phone: phone, name: r.f.name, school: r.f.school, cls: r.f.cls, role: r.f.role };
      setCached(profile); unlock();
    }).catch(function (e) { busy('nkSave', false); $('nkView').querySelector('.nk-msg').innerHTML = errText(e); });
  }

  function writeProfile(f) {
    var uref = db.collection('users').doc(phone), sref = db.collection('stats').doc(phone);
    var pub = { name: firstName(f.name), school: f.school, cls: f.cls, role: f.role };
    return uref.set({ name: f.name, school: f.school, cls: f.cls, role: f.role, consent: true, createdAt: FV.serverTimestamp() })
      .then(function () { return sref.get(); })
      .then(function (s) {
        if (s.exists) return sref.update(pub);   // keeps earlier usage minutes after a PIN reset
        pub.minutes = 0; pub.updatedAt = FV.serverTimestamp();
        return sref.set(pub);
      });
  }

  function showOfflineChoice(c) {
    view('<h2 style="margin:0 0 4px;font-size:21px">इंटरनेट नाही / No internet</h2>' +
      '<p>नमस्कार <b>' + esc(c.name) + '</b>. तुम्ही ऑफलाइन अभ्यास सुरू ठेवू शकता. टॉप १० व वेळ-नोंद इंटरनेट आल्यावरच चालेल.</p>' +
      '<p class="nk-small">You can continue studying offline. Top 10 and usage time need internet.</p>' +
      '<button class="nk-btn" id="nkOff">ऑफलाइन सुरू ठेवा / Continue offline</button>' +
      '<button class="nk-btn nk-alt" id="nkRetry">पुन्हा प्रयत्न करा / Try again</button>');
    $('nkOff').onclick = function () { offline = true; profile = c; unlock(); };
    $('nkRetry').onclick = function () { location.reload(); };
  }

  function showNoInternetFirstTime() {
    view('<h2 style="margin:0 0 4px;font-size:21px">इंटरनेट सुरू करा</h2><p>पहिल्या लॉगिनसाठी इंटरनेट आवश्यक आहे.</p><p class="nk-small">Internet is needed for the first login.</p>' +
      '<button class="nk-btn" id="nkRetry">पुन्हा प्रयत्न करा / Try again</button>');
    $('nkRetry').onclick = function () { location.reload(); };
  }

  /* ---------- after login ---------- */
  function unlock() {
    if (unlocked) return; unlocked = true;
    document.documentElement.classList.remove('nk-locked');
    if (gate) gate.remove();
    window.scrollTo(0, 0);
    readyCbs.forEach(function (cb) { try { cb(profile); } catch (e) {} });
    if (!offline) { startTracking(); checkForUpdate(); }
  }

  /* usage time: counts a minute only when the app is on screen and used in the last 2 minutes */
  var lastAct = Date.now(), pending = 0, lastFlush = Date.now(), flushing = false;
  function startTracking() {
    lastFlush = Date.now();
    ['touchstart', 'click', 'keydown', 'scroll'].forEach(function (ev) { window.addEventListener(ev, function () { lastAct = Date.now(); }, { passive: true }); });
    setInterval(function () {
      if (document.visibilityState === 'visible' && Date.now() - lastAct < 120000) { pending++; flush(false); }
    }, 60000);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(true); });
  }
  function flush(force) {
    if (offline || !db || !phone || flushing || pending < 1) return;
    if (Date.now() - lastFlush < 270000) return;          // server allows one update per 4 minutes
    if (!force && pending < 5) return;
    var n = Math.min(5, pending); flushing = true;
    db.collection('stats').doc(phone).update({ minutes: FV.increment(n), updatedAt: FV.serverTimestamp() })
      .then(function () { pending -= n; lastFlush = Date.now(); })
      .catch(function () { lastFlush = Date.now(); })
      .then(function () { flushing = false; });
  }

  /* ---------- modals ---------- */
  function modal(html, sticky) {
    var m = document.createElement('div'); m.className = 'nk-modal';
    m.innerHTML = '<div class="nk-sheet" role="dialog" aria-modal="true">' + html + '</div>';
    if (!sticky) m.addEventListener('click', function (e) { if (e.target === m) m.remove(); });
    document.body.appendChild(m); return m;
  }

  function showTop10() {
    var m = modal('<h2>🏆 टॉप १० वापरकर्ते</h2><p class="nk-small">सर्वाधिक वेळ अभ्यास करणारे (दोन्ही अ‍ॅप्स मिळून). Most study time across both apps.</p><div id="nkTop"><p>लोड होत आहे…</p></div><button class="nk-btn nk-alt" id="nkClose">बंद करा / Close</button>');
    m.querySelector('#nkClose').onclick = function () { m.remove(); };
    var box = m.querySelector('#nkTop');
    if (offline || !db) { box.innerHTML = '<p class="nk-msg nk-err">टॉप १० पाहण्यासाठी इंटरनेट हवे. / Needs internet.</p>'; return; }
    db.collection('stats').orderBy('minutes', 'desc').limit(10).get().then(function (qs) {
      var medals = ['🥇', '🥈', '🥉'], i = 0, html = '';
      qs.forEach(function (doc) {
        var d = doc.data(), me = doc.id === phone;
        html += '<div class="nk-row' + (me ? ' nk-me' : '') + '"><span class="nk-rank">' + (medals[i] || (i + 1)) + '</span>' +
          '<span class="nk-who"><b>' + esc(d.name) + (me ? ' (तुम्ही)' : '') + ' ' + (d.role === 'teacher' ? '👩‍🏫' : '🎒') + '</b><span>' + esc(d.school) + ' · इ. ' + esc(d.cls) + ' वी</span></span>' +
          '<span class="nk-time">' + mins(d.minutes) + '</span></div>';
        i++;
      });
      box.innerHTML = html || '<p>अजून कोणाचीही वेळ नोंदलेली नाही.</p>';
      return db.collection('stats').doc(phone).get().then(function (s) {
        if (s.exists) box.insertAdjacentHTML('beforeend', '<p style="margin-top:12px">तुमचा एकूण वेळ / Your time: <b>' + mins(s.data().minutes) + '</b></p>');
      });
    }).catch(function (e) { box.innerHTML = '<p class="nk-msg nk-err">' + errText(e) + '</p>'; });
  }

  function showProfile() {
    var p = profile || {};
    var m = modal('<h2>👤 माझे खाते / My account</h2>' +
      (offline ? '<p class="nk-msg nk-err">ऑफलाइन मोड / Offline mode</p>' : '') +
      '<dl class="nk-kv"><dt>नाव</dt><dd>' + esc(p.name) + '</dd><dt>मोबाइल</dt><dd>' + esc(p.phone) + '</dd><dt>शाळा</dt><dd>' + esc(p.school) + '</dd>' +
      '<dt>इयत्ता</dt><dd>' + esc(p.cls) + ' वी</dd><dt>प्रकार</dt><dd>' + (p.role === 'teacher' ? 'शिक्षक' : 'विद्यार्थी') + '</dd></dl>' +
      '<button class="nk-btn" id="nkT10">🏆 टॉप १० पाहा</button>' +
      '<button class="nk-btn nk-alt" id="nkOut">लॉग आउट / Log out</button>' +
      '<button class="nk-btn nk-alt" id="nkDel" style="color:var(--bad,#b22b22)">माझे खाते व माहिती हटवा / Delete my account</button>' +
      '<p class="nk-small"><a href="../privacy.html" target="_blank" rel="noopener">गोपनीयता धोरण / Privacy policy</a></p>' +
      '<button class="nk-btn nk-alt" id="nkClose">बंद करा / Close</button>');
    m.querySelector('#nkClose').onclick = function () { m.remove(); };
    m.querySelector('#nkT10').onclick = function () { m.remove(); showTop10(); };
    m.querySelector('#nkOut').onclick = function () { flush(true); (auth ? auth.signOut() : Promise.resolve()).then(function () { location.reload(); }); };
    m.querySelector('#nkDel').onclick = function () {
      if (offline || !auth || !auth.currentUser) { alert('खाते हटवण्यासाठी इंटरनेट हवे. / Needs internet.'); return; }
      if (!confirm('तुमचे खाते, नाव, शाळा व वेळेची सर्व माहिती कायमची हटवली जाईल. खात्री आहे?\nYour account and all data will be deleted permanently.')) return;
      var b = db.batch(); b.delete(db.collection('users').doc(phone)); b.delete(db.collection('stats').doc(phone));
      b.commit().then(function () { return auth.currentUser.delete(); }).then(function () {
        setCached(null); alert('खाते हटवले. / Account deleted.'); location.reload();
      }).catch(function (e) { alert(errText(e)); });
    };
  }

  /* ---------- app update check (only inside the Android app) ---------- */
  function checkForUpdate() {
    if (!window.NKAndroid || !NKAndroid.versionCode) return;
    fetch('../version.json?t=' + Date.now(), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      var v = j[APP]; if (!v) return;
      var cur = Number(NKAndroid.versionCode());
      if (!(v.versionCode > cur)) return;
      var must = v.minVersionCode && cur < v.minVersionCode;
      var m = modal('<h2>🔔 नवीन आवृत्ती उपलब्ध</h2><p>नवीन आवृत्ती <b>' + esc(v.versionName) + '</b> आली आहे.</p>' +
        (v.notes ? '<p class="nk-small">' + esc(v.notes) + '</p>' : '') +
        '<p class="nk-small">A new version is available. Tap Update, download the file, then open it to install.</p>' +
        '<button class="nk-btn" id="nkUpd">आता अपडेट करा / Update now</button>' +
        (must ? '' : '<button class="nk-btn nk-alt" id="nkLater">नंतर / Later</button>'), must);
      m.querySelector('#nkUpd').onclick = function () { NKAndroid.openExternal(v.url); };
      if (!must) m.querySelector('#nkLater').onclick = function () { m.remove(); };
    }).catch(function () {});
  }

  /* ---------- start ---------- */
  function start() {
    buildGate();
    if ('serviceWorker' in navigator && location.protocol === 'https:') { navigator.serviceWorker.register('../sw.js').catch(function () {}); }
    if (!configured()) { view('<p class="nk-msg nk-err">सेटअप अपूर्ण: config.js मध्ये Firebase माहिती भरा. / Setup incomplete: fill Firebase values in config.js.</p>'); return; }
    var c = cached();
    if (navigator.onLine === false) { return c ? showOfflineChoice(c) : showNoInternetFirstTime(); }
    loadScript(SDK + 'firebase-app-compat.js')
      .then(function () { return Promise.all([loadScript(SDK + 'firebase-auth-compat.js'), loadScript(SDK + 'firebase-firestore-compat.js')]); })
      .then(function () {
        firebase.initializeApp(CFG.firebase);
        auth = firebase.auth(); db = firebase.firestore(); FV = firebase.firestore.FieldValue;
        return auth.setPersistence(firebase.auth.Auth.Persistence.NONE);   // PIN is asked every time the app opens
      })
      .then(function () { showLogin(); })
      .catch(function () { c ? showOfflineChoice(c) : showNoInternetFirstTime(); });
  }

  window.NK = {
    onReady: function (cb) { if (unlocked) cb(profile); else readyCbs.push(cb); },
    showTop10: showTop10,
    showProfile: showProfile,
    get profile() { return profile; }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
