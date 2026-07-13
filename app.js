// ══════════════════════════════════════════════════════════════
// Qualitypedia – OMAC  |  App Logic v2
// ══════════════════════════════════════════════════════════════
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbx8-f6piP8SkHX_IiSBhkgt-cLrXnHDaopGCr7rg_YLY9CZFiGIp1HJVHRnJgbqqDvQpg/exec';
const OMAC_SITE = 'https://syedbaqir291-debug.github.io/OMAC/';
const CPHQ_URL  = 'https://cphq-omac-notes.streamlit.app/';
const ISO_URL   = 'https://syedbaqir291-debug.github.io/Learn-ISO-9001---OMAC/';

let currentUser = null;
let userLog = JSON.parse(localStorage.getItem('qp_userlog')||'[]');
let currentTool = null;
let activeFilter = 'all';
let quizState = null;

// ── In-app browser (LinkedIn/FB/IG) download guard ──
function isInAppBrowser(){
  const ua = navigator.userAgent || '';
  return /LinkedInApp|FBAV|FBAN|Instagram|Twitter|Line\/|MicroMessenger|Snapchat/i.test(ua);
}
const IN_APP = isInAppBrowser();

function safeDownload(blob, filename){
  if(IN_APP){ document.getElementById('inappNotice').classList.add('show'); return; }
  try{
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 1500);
  } catch(e){
    const reader = new FileReader();
    reader.onload = function(){
      const a = document.createElement('a');
      a.href = reader.result; a.download = filename;
      document.body.appendChild(a); a.click(); a.remove();
    };
    reader.readAsDataURL(blob);
  }
}

function toast(msg){
  const host = document.getElementById('toastHost');
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  host.appendChild(t);
  setTimeout(()=>t.remove(), 3000);
}

// ══════════════════════════════════════════════════════════════
// AMBIENT BUBBLES
// ══════════════════════════════════════════════════════════════
function spawnBubbles(){
  const field = document.getElementById('bubbleField');
  if(!field) return;
  field.innerHTML='';
  const n = window.innerWidth < 700 ? 7 : 14;
  for(let i=0;i<n;i++){
    const b = document.createElement('div');
    b.className='bubble';
    const size = 30 + Math.random()*90;
    b.style.width = size+'px'; b.style.height=size+'px';
    b.style.left = Math.random()*100+'%';
    b.style.top = Math.random()*100+'%';
    b.style.animationDuration = (8+Math.random()*10)+'s';
    b.style.animationDelay = (-Math.random()*10)+'s';
    field.appendChild(b);
  }
}

// ══════════════════════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════════════════════
function init(){
  enrichTools();
  applySavedTheme();
  spawnBubbles();
  renderAllTools();
  document.getElementById('statTotal').textContent = TOOLS.length+'+';
  updateStatUsers();
  wireCardTilt();
  setupPromoTimer();
  setupPWA();
  restoreUserChip();
}

function updateStatUsers(){
  const el = document.getElementById('statUsers');
  if(el) el.textContent = userLog.length || 38;
}

function applySavedTheme(){
  const saved = localStorage.getItem('qp_theme');
  if(saved){ document.documentElement.setAttribute('data-theme', saved); document.getElementById('themeBtn').textContent = saved==='dark'?'☀️':'🌙'; }
}
function toggleTheme(){
  const html = document.documentElement;
  const isDark = html.getAttribute('data-theme')==='dark';
  const next = isDark?'light':'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('qp_theme', next);
  document.getElementById('themeBtn').textContent = isDark?'🌙':'☀️';
}

// ══════════════════════════════════════════════════════════════
// WELCOME / REGISTRATION
// ══════════════════════════════════════════════════════════════
function registerUser(){
  const name = document.getElementById('inputName').value.trim();
  const org  = document.getElementById('inputOrg').value.trim();
  const role = document.getElementById('inputRole').value.trim();
  if(!name){ shakeField('inputName'); return; }
  if(!org){  shakeField('inputOrg');  return; }
  const btn = document.querySelector('#welcomeOverlay .btn-primary');
  btn.textContent = 'Registering…'; btn.disabled = true;
  currentUser = { name, org, role, time: new Date().toISOString(), device: navigator.userAgent.substring(0,80) };
  userLog.unshift(currentUser);
  localStorage.setItem('qp_userlog', JSON.stringify(userLog));
  localStorage.setItem('qp_currentuser', JSON.stringify(currentUser));
  sendToGoogleSheets(currentUser);
  document.getElementById('welcomeOverlay').classList.remove('active');
  restoreUserChip();
  updateStatUsers();
  btn.textContent = 'Enter Qualitypedia →'; btn.disabled = false;
}
function restoreUserChip(){
  const saved = localStorage.getItem('qp_currentuser');
  if(!saved) return;
  currentUser = JSON.parse(saved);
  const chip = document.getElementById('userChip');
  chip.style.display='flex';
  document.getElementById('userAva').textContent = currentUser.name.charAt(0).toUpperCase();
  document.getElementById('userChipName').textContent = currentUser.name.split(' ')[0];
  document.getElementById('welcomeOverlay').classList.remove('active');
}
function shakeField(id){
  const el = document.getElementById(id);
  el.style.borderColor = 'var(--re-text)';
  el.focus();
  setTimeout(()=>{ el.style.borderColor=''; }, 2000);
}
async function sendToGoogleSheets(user){
  try{
    const payload = {
      timestamp: new Date(user.time).toLocaleString('en-PK',{timeZone:'Asia/Karachi'}),
      name: user.name, org: user.org, role: user.role||'—', device: user.device
    };
    await fetch(SHEET_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
  }catch(e){ console.warn('Sheets logging failed:', e); }
}

// ══════════════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════════════
function showPage(page){
  ['tools','about','edu','quiz'].forEach(p=>{
    const mainEl = p==='tools' ? document.getElementById('main') : document.getElementById(p+'-page');
    if(mainEl) mainEl.classList.toggle('visible', p===page);
    if(mainEl && p==='tools'){ mainEl.style.display = page==='tools' ? 'block':'none'; }
  });
  document.getElementById('hero').style.display = page==='tools' ? 'block':'none';
  document.getElementById('toolbar').style.display = page==='tools' ? 'block':'none';
  document.getElementById('about-page').style.display = page==='about' ? 'block':'none';
  document.getElementById('edu-page').style.display = page==='edu' ? 'block':'none';
  document.getElementById('quiz-page').style.display = page==='quiz' ? 'block':'none';

  document.querySelectorAll('.nav-tab').forEach(t=>t.classList.toggle('active', t.dataset.page===page));
  document.querySelectorAll('.bn-item').forEach(t=>t.classList.toggle('active', t.dataset.page===page));

  if(page==='quiz') resetQuizSetup();
  window.scrollTo({top:0,behavior:'smooth'});
}

function openOMACSite(){
  window.open(OMAC_SITE, '_blank', 'noopener');
}
function openCPHQ(){ window.open(CPHQ_URL, '_blank', 'noopener'); }
function openISO(){ window.open(ISO_URL, '_blank', 'noopener'); }

// ══════════════════════════════════════════════════════════════
// RENDER TOOLS
// ══════════════════════════════════════════════════════════════
function renderAllTools(){
  const main = document.getElementById('main');
  main.querySelectorAll('.tools-section').forEach(el=>el.remove());
  CATEGORIES.forEach(cat=>{
    const tools = TOOLS.filter(t=>t.cat===cat);
    if(!tools.length) return;
    const section = document.createElement('div');
    section.className = 'tools-section';
    section.dataset.cat = cat;
    section.innerHTML = `
      <div class="section-header">
        <div class="sh-title">${CAT_ICONS[cat]||'🔧'} ${cat} <span class="badge">${tools.length}</span></div>
        <div class="sh-line"></div>
      </div>
      <div class="tools-grid" id="grid-${cat.replace(/[^a-z]/gi,'_')}"></div>`;
    main.appendChild(section);
    const grid = section.querySelector('.tools-grid');
    tools.forEach(t=>{ grid.appendChild(makeCard(t)); });
  });
  updateCount();
}

function makeCard(t){
  const card = document.createElement('div');
  card.className = 'tool-card';
  card.dataset.id = t.id; card.dataset.type = t.type;
  card.dataset.tags = (t.tags||[]).join(',');
  card.dataset.name = t.name.toLowerCase();
  card.innerHTML = `
    <div class="tc-top">
      <div class="tc-icon">${t.icon}</div>
      <div class="tc-badges">
        <span class="${t.type==='proactive'?'badge-pro':'badge-re'}">${t.type==='proactive'?'Proactive':'Reactive'}</span>
        <span class="badge-cat">${t.cat.split(' ')[0]}</span>
      </div>
    </div>
    <div class="tc-name">${t.name}</div>
    <div class="tc-desc">${t.desc}</div>
    <div class="tc-footer">
      <span class="tc-stage">${t.stage}</span>
      <div class="tc-arrow">→</div>
    </div>`;
  card.addEventListener('click',()=>openPanel(t));
  return card;
}

function wireCardTilt(){
  document.addEventListener('mousemove', (e)=>{
    const card = e.target.closest && e.target.closest('.tool-card');
    if(!card) return;
    const r = card.getBoundingClientRect();
    card.style.setProperty('--mx', ((e.clientX-r.left)/r.width*100)+'%');
    card.style.setProperty('--my', ((e.clientY-r.top)/r.height*100)+'%');
  });
}

function setFilter(btn, filter){
  document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  activeFilter = filter;
  filterTools();
}

function filterTools(){
  const q = document.getElementById('searchInput').value.toLowerCase().trim();
  const cards = document.querySelectorAll('.tool-card');
  let visible = 0;
  cards.forEach(card=>{
    const fullText = (card.dataset.name+' '+card.dataset.tags+' '+(card.textContent||'').toLowerCase());
    const matchesFilter = activeFilter==='all' ||
      (activeFilter==='proactive'&&card.dataset.type==='proactive') ||
      (activeFilter==='reactive'&&card.dataset.type==='reactive') ||
      card.dataset.tags.includes(activeFilter);
    const matchesSearch = !q || fullText.includes(q);
    const show = matchesFilter && matchesSearch;
    card.classList.toggle('hidden', !show);
    if(show) visible++;
  });
  document.querySelectorAll('.tools-section').forEach(sec=>{
    const anyVisible = [...sec.querySelectorAll('.tool-card')].some(c=>!c.classList.contains('hidden'));
    sec.style.display = anyVisible?'':'none';
  });
  document.getElementById('no-results').classList.toggle('visible', visible===0);
  updateCount(visible);
}
function updateCount(n){
  const total = n !== undefined ? n : TOOLS.length;
  document.getElementById('resultCount').textContent = `${total} tool${total!==1?'s':''} shown`;
}

// ══════════════════════════════════════════════════════════════
// DETAIL PANEL
// ══════════════════════════════════════════════════════════════
function openPanel(t){
  currentTool = t;
  document.getElementById('inappNotice').classList.remove('show');
  if(IN_APP) document.getElementById('inappNotice').classList.add('show');

  document.getElementById('dpIcon').textContent = t.icon;
  document.getElementById('dpTitle').textContent = t.name;
  document.getElementById('dpBadges').innerHTML = `
    <span class="${t.type==='proactive'?'badge-pro':'badge-re'}">${t.type==='proactive'?'Proactive':'Reactive'}</span>
    <span class="badge-cat">${t.cat}</span>
    <span class="badge-cat">${t.stage}</span>`;

  let html = '';
  html += `<div class="dp-section"><h3>Overview</h3><p>${t.desc}</p></div>`;
  html += `<div class="info-grid">
    <div class="info-card"><div class="ic-label">Approach</div><div class="ic-value">${t.type==='proactive'?'🟢 Proactive':'🔴 Reactive'}</div></div>
    <div class="info-card"><div class="ic-label">Use Stage</div><div class="ic-value">${t.stage}</div></div>
    <div class="info-card"><div class="ic-label">Category</div><div class="ic-value">${t.cat}</div></div>
    <div class="info-card"><div class="ic-label">CPHQ Alignment</div><div class="ic-value">${t.cphqDomain||'—'}</div></div>
  </div>`;
  if(t.purpose) html += `<div class="dp-section"><h3>Purpose</h3><p>${t.purpose}</p></div>`;
  if(t.when)    html += `<div class="dp-section"><h3>When to Use</h3><p>${t.when}</p></div>`;
  if(t.steps&&t.steps.length){
    html += `<div class="dp-section"><h3>How to Apply</h3><div class="steps-list">`;
    t.steps.forEach((s,i)=>{ html += `<div class="step-item"><div class="step-num">${i+1}</div><div class="step-text">${s}</div></div>`; });
    html += `</div></div>`;
  }
  if(t.benefits&&t.benefits.length) html += `<div class="dp-section"><h3>Key Benefits</h3><ul>${t.benefits.map(b=>`<li>${b}</li>`).join('')}</ul></div>`;
  if(t.pitfalls&&t.pitfalls.length){
    html += `<div class="dp-section"><h3>Common Pitfalls</h3>`;
    t.pitfalls.forEach(p=>{ html += `<div class="pitfall-item"><span class="pf-ico">⚠️</span><p>${p}</p></div>`; });
    html += `</div>`;
  }
  if(t.example) html += `<div class="dp-section"><h3>Real-World Example</h3><p>${t.example}</p></div>`;
  if(t.related&&t.related.length){
    html += `<div class="dp-section"><h3>Related Tools</h3><div style="display:flex;gap:8px;flex-wrap:wrap">`;
    t.related.forEach(r=>{ html += `<span class="badge-cat" style="padding:5px 12px;border-radius:6px">${r}</span>`; });
    html += `</div></div>`;
  }
  html += `<div class="dp-section"><button class="quiz-launch-btn" onclick="launchToolQuiz('${t.id}')">🧠 Test Yourself on ${t.name} →</button></div>`;

  document.getElementById('dpBody').innerHTML = html;
  document.getElementById('detail-panel').classList.add('open');
  document.getElementById('panelOverlay').style.display = 'block';
  document.getElementById('dpBody').scrollTop = 0;
  document.body.style.overflow = 'hidden';
}
function closePanel(){
  document.getElementById('detail-panel').classList.remove('open');
  document.getElementById('panelOverlay').style.display = 'none';
  document.body.style.overflow = '';
  currentTool = null;
}

// ══════════════════════════════════════════════════════════════
// QUIZ MODE
// ══════════════════════════════════════════════════════════════
function resetQuizSetup(){
  document.getElementById('quizArea').innerHTML = `
    <div class="quiz-setup">
      <div style="font-size:2.4rem;margin-bottom:10px">🧠</div>
      <h3 style="font-family:'Playfair Display',serif;font-size:1.3rem;margin-bottom:8px">Ready to test your quality knowledge?</h3>
      <p style="color:var(--text2);font-size:.9rem">Pick how many questions — drawn from all ${TOOLS.length} tools in the encyclopedia.</p>
      <div class="qs-row">
        <button class="quiz-len-btn active" data-n="5" onclick="setQuizLen(this,5)">5 Questions</button>
        <button class="quiz-len-btn" data-n="10" onclick="setQuizLen(this,10)">10 Questions</button>
        <button class="quiz-len-btn" data-n="20" onclick="setQuizLen(this,20)">20 Questions</button>
      </div>
      <button class="btn-primary" style="max-width:260px;margin:0 auto" onclick="startQuiz(window._quizLen||5)">Start Quiz →</button>
    </div>`;
}
function setQuizLen(btn,n){
  document.querySelectorAll('.quiz-len-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  window._quizLen = n;
}
function launchToolQuiz(toolId){
  closePanel();
  showPage('quiz');
  const t = TOOLS.find(x=>x.id===toolId);
  startQuiz(t.quiz.length, t.quiz.map(q=>({...q, toolName:t.name})));
}
function startQuiz(n, presetQuestions){
  let pool = presetQuestions;
  if(!pool){
    const shuffled = [...TOOLS].sort(()=>Math.random()-0.5);
    pool = [];
    shuffled.forEach(t=>{
      if(pool.length>=n) return;
      const q = t.quiz[Math.floor(Math.random()*t.quiz.length)];
      pool.push({...q, toolName:t.name});
    });
    pool = pool.slice(0,n);
  }
  quizState = { questions: pool, idx:0, score:0, answered:false };
  renderQuizQuestion();
}
function renderQuizQuestion(){
  const area = document.getElementById('quizArea');
  const qs = quizState;
  if(qs.idx >= qs.questions.length){ renderQuizResult(); return; }
  const q = qs.questions[qs.idx];
  const pct = Math.round((qs.idx/qs.questions.length)*100);
  area.innerHTML = `
    <div class="quiz-card">
      <div class="quiz-progress"><div class="quiz-progress-bar" style="width:${pct}%"></div></div>
      <div class="quiz-meta"><span>Question ${qs.idx+1} of ${qs.questions.length}</span><span>Score: ${qs.score}</span></div>
      <div class="quiz-q">${q.q}</div>
      <div id="quizOpts">${q.options.map((o,i)=>`<button class="quiz-opt" onclick="answerQuiz(${i})">${o}</button>`).join('')}</div>
      <div id="quizExplainHost"></div>
    </div>`;
}
function answerQuiz(i){
  if(quizState.answered) return;
  quizState.answered = true;
  const q = quizState.questions[quizState.idx];
  const opts = document.querySelectorAll('.quiz-opt');
  opts.forEach((btn,idx)=>{
    btn.disabled = true;
    if(idx===q.answerIndex) btn.classList.add('correct');
    else if(idx===i) btn.classList.add('wrong');
  });
  if(i===q.answerIndex) quizState.score++;
  document.getElementById('quizExplainHost').innerHTML = `
    <div class="quiz-explain">${i===q.answerIndex?'✅ Correct! ':'❌ Not quite. '}${q.explain}</div>
    <button class="quiz-next-btn" onclick="nextQuiz()">${quizState.idx+1<quizState.questions.length?'Next Question →':'See Results →'}</button>`;
}
function nextQuiz(){
  quizState.idx++;
  quizState.answered = false;
  renderQuizQuestion();
}
function renderQuizResult(){
  const qs = quizState;
  const pct = Math.round((qs.score/qs.questions.length)*100);
  let msg = 'Keep exploring the encyclopedia to sharpen your knowledge!';
  if(pct>=90) msg = 'Outstanding! You know your quality tools inside out.';
  else if(pct>=70) msg = 'Great work — solid grasp of the fundamentals.';
  else if(pct>=50) msg = 'Good start — revisit a few tools and try again.';
  document.getElementById('quizArea').innerHTML = `
    <div class="quiz-card quiz-result">
      <div class="score-ring" style="--pct:${pct}"><span>${pct}%</span></div>
      <h3>You scored ${qs.score} / ${qs.questions.length}</h3>
      <p>${msg}</p>
      <button class="btn-primary" style="max-width:260px;margin:0 auto" onclick="resetQuizSetup()">Try Another Quiz</button>
    </div>`;
}

// ══════════════════════════════════════════════════════════════
// PROMO POPUP — alternates CPHQ / ISO every 10 minutes
// ══════════════════════════════════════════════════════════════
let promoToggle = 0;
function setupPromoTimer(){
  setInterval(showPromoPopup, 10*60*1000);
}
function showPromoPopup(){
  if(document.getElementById('welcomeOverlay').classList.contains('active')) return;
  const isCphq = promoToggle % 2 === 0;
  promoToggle++;
  const box = document.getElementById('promoBox');
  if(isCphq){
    box.innerHTML = `
      <div class="ec-badge">OMAC Presents</div>
      <span class="ec-icon">📚</span>
      <h2>CPHQ Preparation Hub</h2>
      <p>Structured notes, practice questions and statistical concepts to help you pass the CPHQ exam — built by a fellow quality professional.</p>
      <button class="btn-primary" onclick="openCPHQ()">Visit CPHQ Prep Hub →</button>
      <button class="btn-ghost" onclick="closePromo()">Maybe later</button>`;
  } else {
    box.innerHTML = `
      <div class="ec-badge">OMAC Presents</div>
      <span class="ec-icon">📘</span>
      <h2>Learn ISO 9001 Module</h2>
      <p>A free, structured walkthrough of ISO 9001:2015 clauses for quality officers, students and auditors-in-training.</p>
      <button class="btn-primary" onclick="openISO()">Visit ISO 9001 Module →</button>
      <button class="btn-ghost" onclick="closePromo()">Maybe later</button>`;
  }
  document.getElementById('promoOverlay').classList.add('active');
}
function closePromo(){
  document.getElementById('promoOverlay').classList.remove('active');
}

// ══════════════════════════════════════════════════════════════
// PWA — install prompt + service worker
// ══════════════════════════════════════════════════════════════
let deferredInstallPrompt = null;
function setupPWA(){
  if('serviceWorker' in navigator){
    window.addEventListener('load', ()=>{
      navigator.serviceWorker.register('sw.js').catch(()=>{});
    });
  }
  window.addEventListener('beforeinstallprompt', (e)=>{
    e.preventDefault();
    deferredInstallPrompt = e;
    showInstallCTAs();
  });
  window.addEventListener('appinstalled', ()=>{
    hideInstallCTAs();
    toast('Qualitypedia installed! 🎉');
  });
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  if(isIOS && !isStandalone){
    showInstallCTAs();
  }
}
function showInstallCTAs(){
  document.getElementById('installBtn').classList.add('show');
  const fi = document.getElementById('floatInstall');
  if(fi && !localStorage.getItem('qp_install_dismissed')) fi.classList.add('show');
}
function hideInstallCTAs(){
  document.getElementById('installBtn').classList.remove('show');
  document.getElementById('floatInstall').classList.remove('show');
}
async function triggerInstall(){
  if(deferredInstallPrompt){
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    hideInstallCTAs();
  } else if(/iphone|ipad|ipod/i.test(navigator.userAgent)){
    document.getElementById('iosInstallOverlay').classList.add('active');
  } else {
    toast('Use your browser menu → "Install app" to add Qualitypedia.');
  }
}

// ══════════════════════════════════════════════════════════════
// DOWNLOADS — PDF / Excel / Word (enriched with v2 fields)
// ══════════════════════════════════════════════════════════════
function downloadPDF(){
  if(!currentTool) return;
  if(IN_APP){ document.getElementById('inappNotice').classList.add('show'); return; }
  const t = currentTool;
  const {jsPDF} = window.jspdf;
  const doc = new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const pageW=210, margin=20, contentW=pageW-margin*2;
  let y=20;
  doc.setFillColor(181,73,15); doc.rect(0,0,210,14,'F');
  doc.setTextColor(255,255,255); doc.setFontSize(8); doc.setFont('helvetica','bold');
  doc.text('QUALITYPEDIA – OMAC', margin, 9);
  doc.text('OMAC Developers by S M Baqir', pageW-margin, 9, {align:'right'});
  y=28;
  doc.setTextColor(181,73,15); doc.setFontSize(22); doc.setFont('helvetica','bold');
  doc.text(t.icon+' '+t.name, margin, y); y+=8;
  doc.setFontSize(9); doc.setTextColor(100,100,100);
  doc.text(`${t.cat}  |  ${t.type==='proactive'?'Proactive':'Reactive'}  |  ${t.stage}`, margin, y); y+=3;
  doc.setDrawColor(181,73,15); doc.setLineWidth(0.5); doc.line(margin,y+1,pageW-margin,y+1); y+=8;
  const addSection = (title,content)=>{
    if(!content) return;
    if(y>260){doc.addPage();y=20;}
    doc.setFillColor(240,235,225); doc.rect(margin,y-4,contentW,7,'F');
    doc.setTextColor(181,73,15); doc.setFontSize(10); doc.setFont('helvetica','bold');
    doc.text(title.toUpperCase(), margin+2, y+0.5); y+=8;
    doc.setTextColor(50,50,50); doc.setFontSize(9); doc.setFont('helvetica','normal');
    const lines = doc.splitTextToSize(content, contentW);
    lines.forEach(line=>{ if(y>270){doc.addPage();y=20;} doc.text(line,margin,y); y+=5; }); y+=4;
  };
  addSection('Overview',t.desc); addSection('Purpose',t.purpose); addSection('When to Use',t.when);
  if(t.steps&&t.steps.length){
    if(y>240){doc.addPage();y=20;}
    doc.setFillColor(240,235,225); doc.rect(margin,y-4,contentW,7,'F');
    doc.setTextColor(181,73,15); doc.setFontSize(10); doc.setFont('helvetica','bold');
    doc.text('HOW TO APPLY', margin+2, y+0.5); y+=8;
    doc.setTextColor(50,50,50); doc.setFontSize(9); doc.setFont('helvetica','normal');
    t.steps.forEach((s,i)=>{
      if(y>270){doc.addPage();y=20;}
      const lines = doc.splitTextToSize(`${i+1}. ${s}`, contentW-6);
      lines.forEach(line=>{ doc.text(line,margin+4,y); y+=5; }); y+=1;
    }); y+=4;
  }
  if(t.benefits&&t.benefits.length) addSection('Key Benefits',t.benefits.map(b=>`• ${b}`).join('\n'));
  if(t.pitfalls&&t.pitfalls.length) addSection('Common Pitfalls',t.pitfalls.map(b=>`• ${b}`).join('\n'));
  addSection('Real-World Example',t.example);
  addSection('CPHQ Domain Alignment', t.cphqDomain);
  if(t.related) addSection('Related Tools',t.related.join(', '));
  const totalPages=doc.internal.getNumberOfPages();
  for(let i=1;i<=totalPages;i++){
    doc.setPage(i);
    doc.setFillColor(240,235,225); doc.rect(0,285,210,12,'F');
    doc.setTextColor(120,100,80); doc.setFontSize(7); doc.setFont('helvetica','normal');
    doc.text('Qualitypedia – OMAC  |  OMAC Developers by S M Baqir  |  syedbaqir291@gmail.com', 105, 291, {align:'center'});
    doc.text(`Page ${i} of ${totalPages}`, pageW-margin, 291, {align:'right'});
  }
  const pdfBlob = doc.output('blob');
  safeDownload(pdfBlob, `Qualitypedia_${t.name.replace(/[^a-z0-9]/gi,'_')}.pdf`);
}

function downloadExcel(){
  if(!currentTool) return;
  if(IN_APP){ document.getElementById('inappNotice').classList.add('show'); return; }
  const t = currentTool;
  const wb = XLSX.utils.book_new();
  const C={brand:'FFB5490F',brandDk:'FF8B3208',gold:'FFC8973A',goldLt:'FFFFF3E8',cream:'FFF5F3EE',cream2:'FFEDEAE3',
    proGreen:'FF1A6B3A',proGreenBg:'FFE8F4EE',reRed:'FF8B1A1A',reRedBg:'FFFDE8E8',white:'FFFFFFFF',
    text:'FF1A1714',text2:'FF5A5650',text3:'FF8A8480',border:'FFD9D4C7',rowAlt:'FFFAF8F5',stepBg:'FFEDEAE3',subHdr:'FFF0EDE6'};
  const font=(sz=10,bold=false,color='FF1A1714',name='Calibri')=>({name,sz,bold,color:{rgb:color}});
  const fill=(fgColor)=>({type:'pattern',pattern:'solid',fgColor:{rgb:fgColor}});
  const al=(h='left',v='center',wrap=false)=>({horizontal:h,vertical:v,wrapText:wrap});
  const bdr=(style='thin',color='FFD9D4C7')=>({top:{style,color:{rgb:color}},bottom:{style,color:{rgb:color}},left:{style,color:{rgb:color}},right:{style,color:{rgb:color}}});
  const S={
    mainHdr:{font:font(14,true,C.white),fill:fill(C.brand),alignment:al('left','center'),border:bdr('thin',C.brand)},
    toolName:{font:font(16,true,C.white),fill:fill(C.brandDk),alignment:al('left','center'),border:bdr('medium',C.brand)},
    secHdr:{font:font(10,true,C.white),fill:fill(C.brand),alignment:al('left','center'),border:bdr('thin',C.brand)},
    colHdr:{font:font(9,true,C.brand),fill:fill(C.subHdr),alignment:al('center','center'),border:bdr('medium',C.gold)},
    bodyWrap:{font:font(9,false,C.text2),fill:fill(C.white),alignment:al('left','top',true),border:bdr()},
    bodyAlt:{font:font(9,false,C.text2),fill:fill(C.rowAlt),alignment:al('left','top',true),border:bdr()},
    bodyC:{font:font(9,false,C.text2),fill:fill(C.white),alignment:al('center','center'),border:bdr()},
    bodyCAlt:{font:font(9,false,C.text2),fill:fill(C.rowAlt),alignment:al('center','center'),border:bdr()},
    stepNum:{font:font(10,true,C.white),fill:fill(C.brand),alignment:al('center','center'),border:bdr('thin',C.brand)},
    input:{font:font(9,false,C.text),fill:fill(C.white),alignment:al('left','center',true),border:bdr('medium',C.gold)},
    inputLabel:{font:font(9,true,C.brand),fill:fill(C.cream2),alignment:al('right','center'),border:bdr()},
    statPend:{font:font(8,true,'FF7A5200'),fill:fill('FFFFF3CD'),alignment:al('center','center'),border:bdr()},
    footer:{font:font(8,false,C.text3),fill:fill(C.cream2),alignment:al('center','center'),border:bdr()},
    empty:{font:font(9),fill:fill(C.white),border:bdr('hair',C.cream2)},
  };
  const cols='ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const addr=(c,r)=>cols[c]+(r+1);
  function sc(ws,a,v,s){const tp=(typeof v==='number')?'n':'s';ws[a]={v:v??'',t:tp,s};}
  function fillRange(ws,r,c1,c2,v,s){sc(ws,addr(c1,r),v,s);for(let c=c1+1;c<=c2;c++)sc(ws,addr(c,r),'',{...s});}
  function mg(r1,c1,r2,c2){return{s:{r:r1,c:c1},e:{r:r2,c:c2}};}

  // Sheet 1 — Tool Overview (now includes CPHQ, Standards, Pitfalls)
  const ws1={},m1=[];let r=0;
  fillRange(ws1,r,0,4,'QUALITYPEDIA – OMAC  |  Quality Tools Encyclopedia',S.mainHdr); m1.push(mg(r,0,r,4));
  sc(ws1,addr(5,r),'OMAC Developers by S M Baqir',{...S.mainHdr,alignment:al('right','center')}); r++;
  fillRange(ws1,r,0,5,`${t.icon}  ${t.name}`,S.toolName); m1.push(mg(r,0,r,5)); r++;
  sc(ws1,addr(0,r),'Category',S.inputLabel);fillRange(ws1,r,1,2,t.cat,S.bodyWrap);m1.push(mg(r,1,r,2));
  sc(ws1,addr(3,r),'Stage',S.inputLabel);fillRange(ws1,r,4,5,t.stage,S.bodyWrap);m1.push(mg(r,4,r,5)); r++;
  sc(ws1,addr(0,r),'CPHQ Domain',S.inputLabel);fillRange(ws1,r,1,5,t.cphqDomain||'',S.bodyWrap);m1.push(mg(r,1,r,5)); r++;
  for(let c=0;c<6;c++)sc(ws1,addr(c,r),'',S.empty);r++;
  ws1['!rows']=ws1['!rows']||[];
  fillRange(ws1,r,0,5,'📋  OVERVIEW',S.secHdr);m1.push(mg(r,0,r,5));r++;
  fillRange(ws1,r,0,5,t.desc,S.bodyWrap);m1.push(mg(r,0,r,5));ws1['!rows'][r]={hpt:50};r++;
  for(let c=0;c<6;c++)sc(ws1,addr(c,r),'',S.empty);r++;
  fillRange(ws1,r,0,5,'🎯  PURPOSE',S.secHdr);m1.push(mg(r,0,r,5));r++;
  fillRange(ws1,r,0,5,t.purpose||'',S.bodyWrap);m1.push(mg(r,0,r,5));ws1['!rows'][r]={hpt:44};r++;
  for(let c=0;c<6;c++)sc(ws1,addr(c,r),'',S.empty);r++;
  fillRange(ws1,r,0,5,'⏰  WHEN TO USE',S.secHdr);m1.push(mg(r,0,r,5));r++;
  fillRange(ws1,r,0,5,t.when||'',S.bodyWrap);m1.push(mg(r,0,r,5));ws1['!rows'][r]={hpt:44};r++;
  for(let c=0;c<6;c++)sc(ws1,addr(c,r),'',S.empty);r++;
  fillRange(ws1,r,0,5,'🔢  HOW TO APPLY',S.secHdr);m1.push(mg(r,0,r,5));r++;
  sc(ws1,addr(0,r),'Step',S.colHdr);fillRange(ws1,r,1,5,'Action',S.colHdr);m1.push(mg(r,1,r,5));r++;
  (t.steps||[]).forEach((s,i)=>{
    sc(ws1,addr(0,r),i+1,S.stepNum);fillRange(ws1,r,1,5,s,i%2?S.bodyAlt:S.bodyWrap);m1.push(mg(r,1,r,5));
    ws1['!rows'][r]={hpt:36};r++;
  });
  for(let c=0;c<6;c++)sc(ws1,addr(c,r),'',S.empty);r++;
  fillRange(ws1,r,0,5,'✅  KEY BENEFITS',S.secHdr);m1.push(mg(r,0,r,5));r++;
  sc(ws1,addr(0,r),'#',S.colHdr);fillRange(ws1,r,1,5,'Benefit',S.colHdr);m1.push(mg(r,1,r,5));r++;
  (t.benefits||[]).forEach((b,i)=>{
    sc(ws1,addr(0,r),i+1,i%2?S.bodyCAlt:S.bodyC);fillRange(ws1,r,1,5,b,i%2?S.bodyAlt:S.bodyWrap);m1.push(mg(r,1,r,5));
    ws1['!rows'][r]={hpt:30};r++;
  });
  for(let c=0;c<6;c++)sc(ws1,addr(c,r),'',S.empty);r++;
  fillRange(ws1,r,0,5,'⚠️  COMMON PITFALLS',S.secHdr);m1.push(mg(r,0,r,5));r++;
  (t.pitfalls||[]).forEach((p,i)=>{
    sc(ws1,addr(0,r),i+1,i%2?S.bodyCAlt:S.bodyC);fillRange(ws1,r,1,5,p,i%2?S.bodyAlt:S.bodyWrap);m1.push(mg(r,1,r,5));
    ws1['!rows'][r]={hpt:28};r++;
  });
  for(let c=0;c<6;c++)sc(ws1,addr(c,r),'',S.empty);r++;
  fillRange(ws1,r,0,5,'🏥  REAL-WORLD EXAMPLE',S.secHdr);m1.push(mg(r,0,r,5));r++;
  fillRange(ws1,r,0,5,t.example||'',{...S.bodyWrap});m1.push(mg(r,0,r,5));ws1['!rows'][r]={hpt:56};r++;
  for(let c=0;c<6;c++)sc(ws1,addr(c,r),'',S.empty);r++;
  fillRange(ws1,r,0,5,'🔗  RELATED TOOLS',S.secHdr);m1.push(mg(r,0,r,5));r++;
  (t.related||[]).forEach((rel,i)=>{if(i>0&&i%6===0)r++;sc(ws1,addr(i%6,r),`  ${rel}  `,S.bodyWrap);});r++;
  for(let c=0;c<6;c++)sc(ws1,addr(c,r),'',S.empty);r++;
  fillRange(ws1,r,0,5,'Qualitypedia – OMAC  |  OMAC Developers by S M Baqir  |  syedbaqir291@gmail.com  |  © 2025 All Rights Reserved',S.footer);m1.push(mg(r,0,r,5));
  ws1['!ref']=`A1:F${r+1}`;ws1['!merges']=m1;ws1['!cols']=[{wch:6},{wch:22},{wch:22},{wch:18},{wch:18},{wch:20}];
  XLSX.utils.book_append_sheet(wb,ws1,'📋 Tool Overview');

  // Sheet 2 — Implementation Plan
  const ws2={},m2=[];r=0;
  fillRange(ws2,r,0,5,'QUALITYPEDIA – OMAC  |  Implementation & Action Plan',S.mainHdr);m2.push(mg(r,0,r,4));
  sc(ws2,addr(5,r),'OMAC Developers by S M Baqir',{...S.mainHdr,alignment:al('right','center')});r++;
  fillRange(ws2,r,0,5,`TOOL: ${t.icon} ${t.name}`,S.toolName);m2.push(mg(r,0,r,5));r++;
  const infoRows2=[
    ['Organization:','','Department / Unit:','','Project Lead:',''],
    ['Project Start Date:','','Target Completion:','','Status:',''],
  ];
  infoRows2.forEach(row=>{ row.forEach((v,c)=>sc(ws2,addr(c,r),v,(c%2===0)?S.inputLabel:S.input)); r++; });
  for(let c=0;c<6;c++)sc(ws2,addr(c,r),'',S.empty);r++;
  fillRange(ws2,r,0,5,'📌  IMPLEMENTATION STEPS',S.secHdr);m2.push(mg(r,0,r,5));r++;
  ['#','Implementation Step','Responsible Person','Target Date','Status','Verification / Notes'].forEach((h,c)=>sc(ws2,addr(c,r),h,S.colHdr));r++;
  ws2['!rows']=ws2['!rows']||[];
  (t.steps||[]).forEach((s,i)=>{
    const isAlt=i%2===1;
    sc(ws2,addr(0,r),i+1,S.stepNum);
    sc(ws2,addr(1,r),s,isAlt?S.bodyAlt:S.bodyWrap);
    sc(ws2,addr(2,r),'',S.input); sc(ws2,addr(3,r),'',S.input);
    sc(ws2,addr(4,r),'Pending',S.statPend); sc(ws2,addr(5,r),'',S.input);
    ws2['!rows'][r]={hpt:36};r++;
  });
  for(let c=0;c<6;c++)sc(ws2,addr(c,r),'',S.empty);r++;
  fillRange(ws2,r,0,5,'✅  EXPECTED BENEFITS TRACKER',S.secHdr);m2.push(mg(r,0,r,5));r++;
  ['#','Expected Benefit','Baseline Measure','Target Value','Achieved','Date Verified'].forEach((h,c)=>sc(ws2,addr(c,r),h,S.colHdr));r++;
  (t.benefits||[]).forEach((b,i)=>{
    const isAlt=i%2===1;
    sc(ws2,addr(0,r),i+1,isAlt?S.bodyCAlt:S.bodyC);
    sc(ws2,addr(1,r),b,isAlt?S.bodyAlt:S.bodyWrap);
    sc(ws2,addr(2,r),'',S.input);sc(ws2,addr(3,r),'',S.input);
    sc(ws2,addr(4,r),'',S.input);sc(ws2,addr(5,r),'',S.input);
    ws2['!rows'][r]={hpt:30};r++;
  });
  for(let c=0;c<6;c++)sc(ws2,addr(c,r),'',S.empty);r++;
  fillRange(ws2,r,0,5,'⚠️  RISKS & BARRIERS',S.secHdr);m2.push(mg(r,0,r,5));r++;
  ['Risk / Barrier','Likelihood (H/M/L)','Impact (H/M/L)','Mitigation Strategy','Owner','Status'].forEach((h,c)=>sc(ws2,addr(c,r),h,S.colHdr));r++;
  (t.pitfalls&&t.pitfalls.length?t.pitfalls:['','','','','']).forEach((p,i)=>{
    const isAlt=i%2===1;
    sc(ws2,addr(0,r),p,isAlt?S.bodyAlt:S.input);
    for(let c=1;c<6;c++)sc(ws2,addr(c,r),'',isAlt?S.bodyAlt:S.input);
    ws2['!rows'][r]={hpt:28};r++;
  });
  for(let c=0;c<6;c++)sc(ws2,addr(c,r),'',S.empty);r++;
  fillRange(ws2,r,0,5,'Qualitypedia – OMAC  |  OMAC Developers by S M Baqir  |  syedbaqir291@gmail.com  |  © 2025 All Rights Reserved',S.footer);m2.push(mg(r,0,r,5));
  ws2['!ref']=`A1:F${r+1}`;ws2['!merges']=m2;
  ws2['!cols']=[{wch:5},{wch:32},{wch:20},{wch:16},{wch:16},{wch:24}];
  XLSX.utils.book_append_sheet(wb,ws2,'📌 Implementation Plan');

  // Sheet 3 — Monitoring Log
  const ws3={},m3=[];r=0;
  fillRange(ws3,r,0,6,'QUALITYPEDIA – OMAC  |  Performance Monitoring Log',S.mainHdr);m3.push(mg(r,0,r,5));
  sc(ws3,addr(6,r),'OMAC Developers by S M Baqir',{...S.mainHdr,alignment:al('right','center')});r++;
  fillRange(ws3,r,0,6,`MONITORING LOG: ${t.icon} ${t.name}`,S.toolName);m3.push(mg(r,0,r,6));r++;
  const setupRows3=[
    ['Process / Department:','','','Monitoring Period:','','',''],
    ['Quality Indicator:','','','Frequency:','','',''],
    ['Baseline Value:','','','Target Value:','','',''],
  ];
  setupRows3.forEach(row=>{
    row.forEach((v,c)=>{ const isLbl=(c===0||c===3); sc(ws3,addr(c,r),v,isLbl?S.inputLabel:S.input); });
    m3.push(mg(r,1,r,2));m3.push(mg(r,4,r,6));r++;
  });
  for(let c=0;c<7;c++)sc(ws3,addr(c,r),'',S.empty);r++;
  fillRange(ws3,r,0,6,'📊  MONTHLY PERFORMANCE TRACKER',S.secHdr);m3.push(mg(r,0,r,6));r++;
  ['Month / Date','Indicator','Target','Actual Value','Variance','Status','Actions Taken / Notes'].forEach((h,c)=>sc(ws3,addr(c,r),h,S.colHdr));r++;
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  ws3['!rows']=ws3['!rows']||[];
  months.forEach((mo,i)=>{
    const isAlt=i%2===1;
    sc(ws3,addr(0,r),mo,isAlt?S.bodyCAlt:S.bodyC);
    sc(ws3,addr(1,r),'',isAlt?S.bodyAlt:S.bodyWrap);
    sc(ws3,addr(2,r),'',S.input);sc(ws3,addr(3,r),'',S.input);
    sc(ws3,addr(4,r),'',S.input);
    sc(ws3,addr(5,r),'',{...S.bodyC,fill:{type:'pattern',pattern:'solid',fgColor:{rgb:'FFEDEAE3'}}});
    sc(ws3,addr(6,r),'',S.input);
    ws3['!rows'][r]={hpt:26};r++;
  });
  for(let c=0;c<7;c++)sc(ws3,addr(c,r),'',S.empty);r++;
  fillRange(ws3,r,0,6,'📝  TREND ANALYSIS & NOTES',S.secHdr);m3.push(mg(r,0,r,6));r++;
  ['Quarter','Key Observation','Root Cause (if gap)','Action Taken','Outcome','Reviewed By','Date'].forEach((h,c)=>sc(ws3,addr(c,r),h,S.colHdr));r++;
  ['Q1 (Jan–Mar)','Q2 (Apr–Jun)','Q3 (Jul–Sep)','Q4 (Oct–Dec)'].forEach((q,i)=>{
    const isAlt=i%2===1;
    sc(ws3,addr(0,r),q,isAlt?S.bodyCAlt:S.bodyC);
    for(let c=1;c<7;c++)sc(ws3,addr(c,r),'',S.input);
    ws3['!rows'][r]={hpt:36};r++;
  });
  for(let c=0;c<7;c++)sc(ws3,addr(c,r),'',S.empty);r++;
  fillRange(ws3,r,0,6,'Qualitypedia – OMAC  |  OMAC Developers by S M Baqir  |  syedbaqir291@gmail.com  |  © 2025 All Rights Reserved',S.footer);m3.push(mg(r,0,r,6));
  ws3['!ref']=`A1:G${r+1}`;ws3['!merges']=m3;
  ws3['!cols']=[{wch:16},{wch:22},{wch:13},{wch:14},{wch:12},{wch:14},{wch:26}];
  XLSX.utils.book_append_sheet(wb,ws3,'📊 Monitoring Log');

  // Sheet 4 — Risk Register / FMEA
  const ws4={},m4=[];r=0;
  fillRange(ws4,r,0,7,'QUALITYPEDIA – OMAC  |  Risk Register / FMEA Template',S.mainHdr);m4.push(mg(r,0,r,6));
  sc(ws4,addr(7,r),'OMAC Developers by S M Baqir',{...S.mainHdr,alignment:al('right','center')});r++;
  fillRange(ws4,r,0,7,`RISK REGISTER: ${t.icon} ${t.name}`,S.toolName);m4.push(mg(r,0,r,7));r++;
  for(let c=0;c<8;c++)sc(ws4,addr(c,r),'',S.empty);r++;
  fillRange(ws4,r,0,7,'⚠️  FAILURE MODE & EFFECTS ANALYSIS (FMEA)',S.secHdr);m4.push(mg(r,0,r,7));r++;
  const fmeaHdrs=['Process Step','Failure Mode','Effect of Failure','Severity\n(1–10)','Occurrence\n(1–10)','Detectability\n(1–10)','RPN\n(S×O×D)','Recommended Action'];
  fmeaHdrs.forEach((h,c)=>{ const s={...S.colHdr,alignment:{...S.colHdr.alignment,wrapText:true}}; sc(ws4,addr(c,r),h,s); });
  ws4['!rows']=ws4['!rows']||[];ws4['!rows'][r]={hpt:36};r++;
  for(let i=0;i<8;i++){
    const isAlt=i%2===1;
    for(let c=0;c<5;c++)sc(ws4,addr(c,r),'',isAlt?S.bodyAlt:S.input);
    sc(ws4,addr(5,r),'',S.input);
    sc(ws4,addr(6,r),'',isAlt?S.bodyCAlt:S.bodyC);
    sc(ws4,addr(7,r),'',S.input);
    ws4['!rows'][r]={hpt:30};r++;
  }
  for(let c=0;c<8;c++)sc(ws4,addr(c,r),'',S.empty);r++;
  fillRange(ws4,r,0,7,'🎨  RPN RISK LEGEND',S.secHdr);m4.push(mg(r,0,r,7));r++;
  const legend=[
    ['RPN 1–50','Low Risk','Monitor only','FF1A6B3A','FFE8F4EE'],
    ['RPN 51–100','Medium Risk','Plan corrective action','FF7A5200','FFFFF3CD'],
    ['RPN 101–200','High Risk','Immediate action required','FF8B3208','FFFDE8E8'],
    ['RPN > 200','Critical Risk','Stop and fix NOW','FF8B1A1A','FFFFE0E0'],
  ];
  legend.forEach(([range,level,action,ftColor,bgColor])=>{
    const s1={font:{name:'Calibri',sz:9,bold:true,color:{rgb:ftColor}},fill:{type:'pattern',pattern:'solid',fgColor:{rgb:bgColor}},alignment:al('center','center'),border:bdr()};
    const s2={font:{name:'Calibri',sz:9,bold:false,color:{rgb:ftColor}},fill:{type:'pattern',pattern:'solid',fgColor:{rgb:bgColor}},alignment:al('left','center'),border:bdr()};
    sc(ws4,addr(0,r),range,s1);
    fillRange(ws4,r,1,2,level,s1);m4.push(mg(r,1,r,2));
    fillRange(ws4,r,3,7,action,s2);m4.push(mg(r,3,r,7));r++;
  });
  for(let c=0;c<8;c++)sc(ws4,addr(c,r),'',S.empty);r++;
  fillRange(ws4,r,0,7,'🛡️  RISK CONTROL ACTION PLAN',S.secHdr);m4.push(mg(r,0,r,7));r++;
  ['Risk / Hazard','Current Controls','Control Type','Effectiveness','Action Required','Owner','Due Date','Status'].forEach((h,c)=>sc(ws4,addr(c,r),h,S.colHdr));r++;
  for(let i=0;i<6;i++){
    const isAlt=i%2===1;
    for(let c=0;c<8;c++)sc(ws4,addr(c,r),'',isAlt?S.bodyAlt:S.input);
    ws4['!rows'][r]={hpt:28};r++;
  }
  for(let c=0;c<8;c++)sc(ws4,addr(c,r),'',S.empty);r++;
  fillRange(ws4,r,0,7,'Qualitypedia – OMAC  |  OMAC Developers by S M Baqir  |  syedbaqir291@gmail.com  |  © 2025 All Rights Reserved',S.footer);m4.push(mg(r,0,r,7));
  ws4['!ref']=`A1:H${r+1}`;ws4['!merges']=m4;
  ws4['!cols']=[{wch:20},{wch:20},{wch:20},{wch:10},{wch:10},{wch:12},{wch:10},{wch:26}];
  XLSX.utils.book_append_sheet(wb,ws4,'⚠️ Risk Register');

  const wbout = XLSX.write(wb,{bookType:'xlsx',type:'array'});
  const blob = new Blob([wbout],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  safeDownload(blob, `Qualitypedia_${t.name.replace(/[^a-z0-9]/gi,'_')}_Template.xlsx`);
}

function downloadWord(){
  if(!currentTool) return;
  if(IN_APP){ document.getElementById('inappNotice').classList.add('show'); return; }
  const t = currentTool;
  const stepsHtml = (t.steps||[]).map((s,i)=>`<li><b>Step ${i+1}:</b> ${s}</li>`).join('');
  const benefitsHtml = (t.benefits||[]).map(b=>`<li>${b}</li>`).join('');
  const pitfallsHtml = (t.pitfalls||[]).map(p=>`<li>${p}</li>`).join('');
  const content = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body{font-family:Calibri,sans-serif;font-size:11pt;margin:2.5cm;color:#1A1714;line-height:1.6}
  .header{background:#B5490F;color:white;padding:12px 20px;margin:-20px -20px 24px;display:flex;justify-content:space-between}
  .header h1{font-size:14pt;margin:0}.header span{font-size:9pt}
  h2{font-family:'Palatino Linotype',serif;font-size:20pt;color:#B5490F;margin-bottom:4px}
  .meta{color:#888;font-size:9pt;margin-bottom:20px;border-bottom:1px solid #ddd;padding-bottom:12px}
  h3{font-size:11pt;font-weight:bold;color:#B5490F;background:#FFF3E8;padding:5px 10px;border-left:3px solid #B5490F;margin:18px 0 8px}
  p{margin-bottom:10px}ul{margin:6px 0;padding-left:20px}li{margin-bottom:4px}
  .footer{background:#F5F0E8;border-top:1px solid #ddd;padding:10px 20px;margin:32px -20px -20px;text-align:center;font-size:8pt;color:#888}
  table{width:100%;border-collapse:collapse;margin:12px 0}
  td,th{border:1px solid #ddd;padding:8px 12px;font-size:10pt}
  th{background:#B5490F;color:white}tr:nth-child(even) td{background:#fafafa}
</style></head><body>
<div class="header"><h1>Qualitypedia – OMAC</h1><span>OMAC Developers by S M Baqir</span></div>
<h2>${t.icon} ${t.name}</h2>
<div class="meta">Category: ${t.cat} &nbsp;|&nbsp; Approach: ${t.type==='proactive'?'Proactive':'Reactive'} &nbsp;|&nbsp; Stage: ${t.stage} &nbsp;|&nbsp; CPHQ: ${t.cphqDomain||''}</div>
<h3>Overview</h3><p>${t.desc}</p>
<h3>Purpose</h3><p>${t.purpose||''}</p>
<h3>When to Use</h3><p>${t.when||''}</p>
<h3>How to Apply</h3><ol>${stepsHtml}</ol>
<h3>Key Benefits</h3><ul>${benefitsHtml}</ul>
<h3>Common Pitfalls</h3><ul>${pitfallsHtml}</ul>
<h3>Real-World Example</h3><p>${t.example||''}</p>
<h3>Related Tools</h3><p>${(t.related||[]).join(' • ')}</p>
<h3>Implementation Template</h3>
<table><tr><th>Step</th><th>Action</th><th>Responsible</th><th>Target Date</th><th>Status</th></tr>
${(t.steps||[]).map((s,i)=>`<tr><td>${i+1}</td><td>${s}</td><td>&nbsp;</td><td>&nbsp;</td><td>Pending</td></tr>`).join('')}
</table>
<div class="footer">Qualitypedia – OMAC | OMAC Developers by S M Baqir | syedbaqir291@gmail.com</div>
</body></html>`;
  const blob = new Blob([content],{type:'application/msword'});
  safeDownload(blob, `Qualitypedia_${t.name.replace(/[^a-z0-9]/gi,'_')}_Template.doc`);
}

window.addEventListener('DOMContentLoaded',()=>{
  init();
  document.getElementById('main').style.display='block';
  document.getElementById('hero').style.display='block';
  document.getElementById('toolbar').style.display='block';
  document.getElementById('about-page').style.display='none';
  document.getElementById('edu-page').style.display='none';
  document.getElementById('quiz-page').style.display='none';
});
window.addEventListener('resize', spawnBubbles);
