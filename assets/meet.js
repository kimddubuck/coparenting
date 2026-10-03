/* 모임 요청 페이지 — 누구나 익명으로 같이 놀 날을 올리고, '나도 갈래요'와 댓글을 남겨요.
   저장: coparenting_opinions 컬렉션의 topic 'meet' 글, 댓글은 그 글 아래 comments 컬렉션.
   common.js가 먼저 필요해요. 필요한 Firestore 규칙은 의견게시판_설정.md 참고 */
const MEET_TEMPLATE = '장소: \n놀이: ';
const meet = {slot:null, date:todayStr(), month:null, col:null, items:[], comments:{}, subs:{}, open:new Set(), drafts:{}};   // drafts: 쓰는 중인 댓글

// '참석' / '미확정' / '불참'은 이 기기에서 둘 중 하나만, 한 번만 (완벽한 막기는 아니에요)
function choices(){ try{ return JSON.parse(localStorage.getItem('copChoice')||'{}'); }catch(e){ return {}; } }
function markChoice(id, v){ try{ localStorage.setItem('copChoice', JSON.stringify({...choices(), [id]:v})); }catch(e){} }

function meetInit(){
  meet.col = copCollection();
  if(!meet.col){
    $('#meetEmpty').textContent = '인터넷 연결을 확인해 주세요. 모임 요청을 불러오지 못했어요.';
    $('#meetSend').disabled = true; return;
  }
  meet.col.orderBy('createdAt','desc').limit(300).onSnapshot(snap => {
    meet.items = snap.docs.map(d => ({id:d.id, ...d.data()})).filter(o => o.topic==='meet' && o.date);
    watchComments(); renderMeets();
  }, () => { $('#meetEmpty').textContent = '모임 요청을 불러오지 못했어요. 잠시 뒤 새로고침해 주세요.'; });
}

// 다가오는 요청마다 댓글을 실시간으로 받아요 (한 번만 구독)
function watchComments(){
  const today = todayStr();
  meet.items.filter(o => o.date >= today && !meet.subs[o.id]).forEach(o => {
    meet.subs[o.id] = meet.col.doc(o.id).collection('comments').orderBy('createdAt').limit(100).onSnapshot(snap => {
      meet.comments[o.id] = snap.docs.map(d => ({id:d.id, ...d.data()}));
      renderMeets();
    }, () => {});
  });
}

function meetCard(o, past){
  const li = document.createElement('li'); li.className = 'meet-card' + (past ? ' op-past' : '');
  const body = document.createElement('div'); body.className = 'meet-body';
  li.append(dateBadge(o.date), body);
  const today = todayStr(), cs = meet.comments[o.id] || [];
  const meta = document.createElement('div'); meta.className = 'op-meta';
  const w = document.createElement('span'); w.className = 'op-when';
  w.textContent = `${dayLabel(o.date)} ${o.slot || ''}${o.date===today ? ' · 오늘' : ''}`;
  const t = document.createElement('span'); t.textContent = fmtTime(o.createdAt);
  meta.append(w, t);
  const p = document.createElement('p'); p.className = 'op-text'; p.textContent = o.text;   // 글은 textContent로만
  const tally = document.createElement('p'); tally.className = 'tally';
  tally.innerHTML = `<span>참석 <b>${o.joins || 0}</b></span><span>미확정 <b>${o.maybes || 0}</b></span><span>불참 <b>${o.nos || 0}</b></span>`;
  body.append(meta, p, tally);
  if(past) return li;

  const row = document.createElement('div'); row.className = 'vote-row';
  const mine = choices()[o.id];
  const jb = document.createElement('button'); jb.type = 'button'; jb.className = 'join'; jb.dataset.vote = 'joins'; jb.dataset.id = o.id;
  jb.setAttribute('aria-pressed', mine==='joins'); jb.disabled = !!mine;
  jb.textContent = mine==='joins' ? '🙋 참석했어요' : '🙋 참석';
  const nb = document.createElement('button'); nb.type = 'button'; nb.className = 'join'; nb.dataset.vote = 'nos'; nb.dataset.id = o.id;
  nb.setAttribute('aria-pressed', mine==='nos'); nb.disabled = !!mine;
  nb.textContent = mine==='nos' ? '🙅 불참했어요' : '🙅 불참';
  const mb = document.createElement('button'); mb.type = 'button'; mb.className = 'join'; mb.dataset.vote = 'maybes'; mb.dataset.id = o.id;
  mb.setAttribute('aria-pressed', mine==='maybes'); mb.disabled = !!mine;
  mb.textContent = mine==='maybes' ? '🤔 미확정했어요' : '🤔 미확정';
  const cb = document.createElement('button'); cb.type = 'button'; cb.className = 'join'; cb.dataset.toggle = o.id;
  cb.setAttribute('aria-expanded', meet.open.has(o.id));
  cb.textContent = `💬 댓글${cs.length ? ' ' + cs.length : ''}`;
  cb.className = 'join comment-toggle';
  row.append(jb, mb, nb); body.append(row, cb);

  if(meet.open.has(o.id)){
    const box = document.createElement('div'); box.className = 'comments';
    const ul = document.createElement('ul'); ul.className = 'comment-list';
    cs.forEach(c => {
      const ci = document.createElement('li');
      const ct = document.createElement('span'); ct.textContent = c.text;
      const cw = document.createElement('small'); cw.textContent = fmtTime(c.createdAt);
      ci.append(ct, cw); ul.appendChild(ci);
    });
    if(!cs.length){ const e = document.createElement('li'); e.className = 'hint'; e.textContent = '아직 댓글이 없어요.'; ul.appendChild(e); }
    const f = document.createElement('form'); f.className = 'comment-form'; f.dataset.comment = o.id;
    f.innerHTML = `<input type="text" maxlength="300" placeholder="예: 11시쯤 갈 수 있어요" aria-label="댓글">
      <button class="btn" type="submit">달기</button>`;
    box.append(ul, f); body.appendChild(box);
  }
  return li;
}

function renderMeets(){
  // 쓰는 중인 댓글과 커서 위치는 다시 그려도 지켜요
  const focused = document.activeElement && document.activeElement.closest && document.activeElement.closest('.comment-form');
  const focusId = focused ? focused.dataset.comment : null;

  const today = todayStr();
  const up = meet.items.filter(o => o.date >= today)
    .sort((a,b) => a.date.localeCompare(b.date) || slotOrder(a.slot) - slotOrder(b.slot));
  const past = meet.items.filter(o => o.date < today).sort((a,b) => b.date.localeCompare(a.date)).slice(0,5);
  const ul = $('#meetList'); ul.innerHTML = ''; up.forEach(o => ul.appendChild(meetCard(o, false)));
  $('#meetEmpty').textContent = up.length ? '' : '다가오는 모임이 없어요. 같이 놀고 싶은 날을 올려 주세요.';
  const pl = $('#pastList'); pl.innerHTML = ''; past.forEach(o => pl.appendChild(meetCard(o, true)));
  $('#pastSec').hidden = !past.length;

  document.querySelectorAll('.comment-form').forEach(f => { f.querySelector('input').value = meet.drafts[f.dataset.comment] || ''; });
  if(focusId){ const f = document.querySelector(`.comment-form[data-comment="${focusId}"]`); if(f) f.querySelector('input').focus(); }
}

/* ---------- 달력 + 시간 고르기 ---------- */
const MAX_MONTHS = 3;   // 이번 달부터 3달까지 고를 수 있어요
const ymd = (y,m,d) => `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
function renderPicker(){
  const today = todayStr(), [ty,tm] = today.split('-').map(Number);
  if(!meet.month) meet.month = {y:ty, m:tm};
  const {y, m} = meet.month;
  $('#calTitle').textContent = `${y}.${String(m).padStart(2,'0')}`;
  const idx = (y - ty) * 12 + (m - tm);
  $('#calPrev').disabled = idx <= 0; $('#calNext').disabled = idx >= MAX_MONTHS - 1;
  const first = new Date(y, m-1, 1).getDay(), days = new Date(y, m, 0).getDate();
  let html = '';
  for(let i = 0; i < first; i++) html += '<span></span>';
  for(let d = 1; d <= days; d++){
    const v = ymd(y,m,d), dow = (first + d - 1) % 7, past = v < today;
    const cls = ['cal-day', dow===0 ? 'sun' : dow===6 ? 'sat' : '', v===today ? 'today' : '', v===meet.date ? 'on' : ''].join(' ');
    html += `<button type="button" class="${cls}" data-date="${v}" ${past ? 'disabled' : ''} aria-pressed="${v===meet.date}">${d}${v===today ? '<small>오늘</small>' : ''}</button>`;
  }
  $('#calGrid').innerHTML = html;
  $('#timeGrid').innerHTML = HOURS.map(h => `<button type="button" class="time-btn" data-slot="${h}시" aria-pressed="${meet.slot===h+'시'}">${h}:00</button>`).join('');
  $('#pickedWhen').textContent = meet.date ? `${dayLabel(meet.date)}${meet.slot ? ' ' + meet.slot : ''}에 모여요` : '';
}
$('#calPrev').addEventListener('click', () => { let {y,m} = meet.month; m--; if(m < 1){ m = 12; y--; } meet.month = {y,m}; renderPicker(); });
$('#calNext').addEventListener('click', () => { let {y,m} = meet.month; m++; if(m > 12){ m = 1; y++; } meet.month = {y,m}; renderPicker(); });
$('#calGrid').addEventListener('click', e => { const b = e.target.closest('[data-date]'); if(!b || b.disabled) return; meet.date = b.dataset.date; renderPicker(); });
$('#timeGrid').addEventListener('click', e => { const b = e.target.closest('[data-slot]'); if(!b) return; meet.slot = b.dataset.slot; renderPicker(); });

$('#meetText').addEventListener('input', () => { $('#meetCount').textContent = `${$('#meetText').value.length} / 500`; });
$('#meetForm').addEventListener('submit', async e => {
  e.preventDefault();
  const text = $('#meetText').value.trim(), date = meet.date;
  // 양식 칸(장소:/시간:/놀이:)만 남아 있으면 빈 글로 봐요
  if(!date || date < todayStr()){ $('#meetMsg').textContent = '오늘 이후 날짜를 골라 주세요.'; return; }
  if(!meet.slot){ $('#meetMsg').textContent = '시간을 골라 주세요.'; return; }
  if(!text.replace(/^(장소|시간|놀이):/gm, '').trim()){ $('#meetMsg').textContent = '장소나 놀이를 적어 주세요.'; return; }
  if(!meet.col) return;
  $('#meetSend').disabled = true;
  try{
    await meet.col.add({topic:'meet', text, date, slot:meet.slot, joins:0, maybes:0, nos:0, createdAt: firebase.firestore.FieldValue.serverTimestamp()});
    $('#meetText').value = MEET_TEMPLATE; $('#meetCount').textContent = `${MEET_TEMPLATE.length} / 500`;
    $('#meetMsg').textContent = '모임 요청을 올렸어요! 🙌';
  }catch(err){ $('#meetMsg').textContent = '저장하지 못했어요. 잠시 뒤 다시 눌러 주세요.'; }
  finally{ $('#meetSend').disabled = false; }
});

$('#meetList').addEventListener('click', async e => {
  const tg = e.target.closest('[data-toggle]');
  if(tg){ const id = tg.dataset.toggle; meet.open.has(id) ? meet.open.delete(id) : meet.open.add(id); renderMeets(); return; }
  const b = e.target.closest('[data-vote]'); if(!b || !meet.col || choices()[b.dataset.id]) return;
  b.disabled = true;
  try{ await meet.col.doc(b.dataset.id).update({[b.dataset.vote]: firebase.firestore.FieldValue.increment(1)}); markChoice(b.dataset.id, b.dataset.vote); renderMeets(); }
  catch(err){ b.disabled = false; $('#meetEmpty').textContent = '참석·불참을 저장하지 못했어요. 잠시 뒤 다시 눌러 주세요.'; }
});
$('#meetList').addEventListener('input', e => {
  const f = e.target.closest('[data-comment]'); if(f) meet.drafts[f.dataset.comment] = e.target.value;
});
$('#meetList').addEventListener('submit', async e => {
  const f = e.target.closest('[data-comment]'); if(!f) return;
  e.preventDefault();
  const id = f.dataset.comment, text = f.querySelector('input').value.trim();
  if(!text || !meet.col) return;
  meet.drafts[id] = ''; f.querySelector('input').value = '';   // 먼저 비우고, 실패하면 되돌려요
  try{
    await meet.col.doc(id).collection('comments').add({text, createdAt: firebase.firestore.FieldValue.serverTimestamp()});
  }catch(err){
    meet.drafts[id] = text; renderMeets();
    $('#meetEmpty').textContent = '댓글을 저장하지 못했어요. 잠시 뒤 다시 눌러 주세요.';
  }
});

renderPicker();
$('#meetText').value = MEET_TEMPLATE; $('#meetCount').textContent = `${MEET_TEMPLATE.length} / 500`;
$('#newToggle').addEventListener('click', () => { $('#meetForm').hidden = !$('#meetForm').hidden; if(!$('#meetForm').hidden) $('#meetText').focus(); });
if(location.hash==='#new') $('#meetForm').hidden = false;
meetInit();
sosInit();
