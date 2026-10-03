/* 놀이 고르기 페이지 — plays.js(놀이 목록)와 common.js가 먼저 필요해요 */
const HABIT = '혼자서도 할 수 있어요', TIDY = '마무리';
const DEV_CATS = ['전체', ...CATS.filter(c => c!=='전체' && c!==HABIT && c!==TIDY)];
const byId = id => PLAYS.find(p => p.id===id);
const state = {cat:'전체', fresh:true, habit:null, dev:null};
const folds = {habit:false, dev:false};   // 처음엔 카드 목록을 접어 둬요
try{ const s = JSON.parse(localStorage.getItem('playPicker2')||'null');
  if(s){ if(byId(s.habit)) state.habit = s.habit; if(byId(s.dev)) state.dev = s.dev; } }catch(e){}
const save = () => { try{ localStorage.setItem('playPicker2', JSON.stringify({habit:state.habit, dev:state.dev})); }catch(e){} };

const tidy = PLAYS.find(p => p.cat===TIDY);
const habits = PLAYS.filter(p => p.cat===HABIT);
const devs = PLAYS.filter(p => p.cat!==HABIT && p.cat!==TIDY);
// 재료가 겹치는지: 이름이 같거나 한쪽이 다른 쪽을 포함하면 같은 재료로 봐요 (예: '양말' ↔ '어른 양말')
const sameItem = (a,b) => a===b || a.includes(b) || b.includes(a);
const shared = (p,q) => p && q ? p.items.filter(i => q.items.some(j => sameItem(i,j))) : [];

function cardHtml(p, slot){
  const on = state[slot]===p.id;
  const same = slot==='dev' ? shared(p, byId(state.habit)) : shared(p, byId(state.dev));
  const tags = [
    same.length ? `<span class="tag same">재료 같음 · ${same.map(esc).join(', ')}</span>` : '',
    `<span class="tag">${SRC_TAG[p.src]}</span>`,
    p.used ? `<span class="tag done">${p.used} 해 봄</span>` : '',
    p.water ? `<span class="tag">💧 물 · 수건 깔기</span>` : '',
    p.song ? `<span class="tag">ex) ${esc(p.song)}</span>` : ''].join('');
  return `<button class="card${on?' on':''}" data-id="${p.id}" data-slot="${slot}" aria-pressed="${on}">
    <div class="card-top"><h3>${esc(p.name)}</h3><span class="check" aria-hidden="true">✓</span></div>
    ${p.say ? `<p class="say">“${esc(p.say)}”</p>` : ''}
    <p class="how">${esc(p.how)}</p>
    ${p.orig ? `<p class="orig">${({daycare:'🏫 ', book:'📘 '})[p.src] || '원래 이름 · '}${esc(p.orig)}</p>` : ''}
    <p class="orig">준비물 · ${p.items.map(esc).join(', ')}</p>
    <div class="tags">${tags}</div></button>`;
}

function devVisible(){
  return devs.filter(p => (state.cat==='전체' || p.cat===state.cat) && (!state.fresh || !p.used));
}

function matchCount(){ const h = byId(state.habit); return h ? devVisible().filter(p => shared(p,h).length).length : 0; }

function renderFolds(){
  [['habit', habits.length], ['dev', devVisible().length]].forEach(([k, n]) => {
    const open = folds[k], btn = document.querySelector(`[data-fold="${k}"]`);
    btn.setAttribute('aria-expanded', open);
    btn.innerHTML = open ? `<span>놀이 카드 접기</span><span class="chev">접기 ▲</span>`
                         : `<span>놀이 카드 보기 · ${n}개${k==='dev' && matchCount() ? ` · 재료 겹치는 것 ${matchCount()}개` : ''}</span><span class="chev">펼치기 ▼</span>`;
    $('#'+k+'Body').hidden = !open;
    const p = byId(state[k]), line = $('#'+k+'Picked');
    line.hidden = !p;
    if(p) line.innerHTML = `고른 놀이 · <b>${esc(p.name)}</b>${p.say ? ` — “${esc(p.say)}”` : ''}`;
  });
}

function render(){
  renderFolds();
  $('#habitCards').innerHTML = habits.map(p => cardHtml(p,'habit')).join('');

  const h = byId(state.habit);
  const matches = h ? devVisible().filter(p => shared(p,h).length) : [];
  $('#match').hidden = !matches.length;
  if(matches.length){
    $('#matchLabel').textContent = `'${h.name}'와 재료가 겹치는 새로운 경험`;
    $('#matchCards').innerHTML = matches.map(p => cardHtml(p,'dev')).join('');
  }

  $('#cats').innerHTML = DEV_CATS.map(c => `<button class="chip" data-cat="${c}" aria-pressed="${state.cat===c}">${c}</button>`).join('');
  const list = devVisible();
  $('#count').textContent = `${list.length}개`;
  const groups = DEV_CATS.slice(1).map(c => ({c, items:list.filter(p => p.cat===c)})).filter(g => g.items.length);
  $('#grid').innerHTML = groups.length ? groups.map(g => `<section class="group">
      <h2 class="group-h">${g.c} <span>${g.items.length}</span></h2>
      <p class="group-d">${CAT_DESC[g.c]}</p>
      <div class="cards">${g.items.map(p => cardHtml(p,'dev')).join('')}</div></section>`).join('')
    : `<p class="empty">조건에 맞는 놀이가 없어요. '안 해 본 것만'을 꺼 보세요.</p>`;
  renderTray();
}

function picked(){ return [['① 혼자서도 할 수 있어요', byId(state.habit)], ['② 새로운 경험', byId(state.dev)], ['마무리', tidy]]; }
function stuffList(){
  const out = [];
  picked().forEach(([,p]) => p && p.items.forEach(i => { if(!out.includes(i)) out.push(i); }));
  return out;
}
function renderTray(){
  $('#today').innerHTML = picked().map(([label,p]) => `<li><span><span class="slotname">${label}</span>${p ? esc(p.name)+(p.song?` — ex) ${esc(p.song)}`:'') : '<span class="hint">아직 안 골랐어요</span>'}</span>${p && label!=='마무리' ? `<button class="x" data-remove="${label[0]==='①'?'habit':'dev'}" aria-label="${esc(p.name)} 빼기">×</button>` : ''}</li>`).join('');
  const any = state.habit || state.dev;
  $('#stuffBox').hidden = !any;
  $('#stuff').textContent = stuffList().join(', ');
  const same = shared(byId(state.habit), byId(state.dev));
  $('#shared').textContent = same.length ? `①②에 같이 쓰는 재료: ${same.join(', ')}` : (state.habit && state.dev ? '①②에 겹치는 재료가 없어요.' : '');
  $('#barText').textContent = `오늘 놀이 ${[state.habit,state.dev].filter(Boolean).length}/2`;
}

function noticeText(){
  const lines = ['📌 오늘의 놀이'];
  picked().forEach(([label,p]) => { if(!p) return;
    lines.push(`${label} · ${p.say ? `"${p.say}" ` : ''}${p.name}${p.song?` — ex) ${p.song}`:''}`);
    if(p.src==='daycare' && p.orig) lines.push(`  🏫 ${p.orig}`);
  });
  lines.push('', `준비물 (없어도 괜찮아요): ${stuffList().join(', ')}`);
  return lines.join('\n');
}
function flash(msg){ $('#toast').textContent = msg; setTimeout(() => { $('#toast').textContent=''; }, 2400); }
function openTray(open){ $('#tray').classList.toggle('closed', !open); $('#bar').setAttribute('aria-expanded', open); $('#bar .hint').textContent = open ? '접기 ▼' : '펼치기 ▲'; }

document.addEventListener('click', e => {
  const cat = e.target.closest('[data-cat]');
  if(cat){ state.cat = cat.dataset.cat; render(); return; }
  const card = e.target.closest('.card');
  if(card){
    const k = card.dataset.slot, picking = state[k]!==card.dataset.id;
    state[k] = picking ? card.dataset.id : null; save();
    if(picking){ folds[k] = false; }   // 고르면 접어서 스크롤을 줄여요
    render();
    if(picking) document.getElementById(k==='habit' ? 'habitSlot' : 'devSlot').scrollIntoView({behavior:'smooth', block:'start'});
    return; }
  const fold = e.target.closest('[data-fold]');
  if(fold){ folds[fold.dataset.fold] = !folds[fold.dataset.fold]; render(); return; }
  const rm = e.target.closest('[data-remove]');
  if(rm){ state[rm.dataset.remove] = null; save(); render(); }
});
$('#fresh').onclick = e => { state.fresh = !state.fresh; e.currentTarget.setAttribute('aria-pressed', state.fresh); render(); };
$('#clear').onclick = () => { state.habit = null; state.dev = null; save(); render(); };
$('#copy').onclick = async () => {
  if(!state.habit && !state.dev){ flash('먼저 놀이를 골라 주세요.'); return; }
  const text = noticeText();
  try{ await navigator.clipboard.writeText(text); flash('복사했어요. 단톡방에 붙여 넣으면 돼요.'); }
  catch(err){ const ta = $('#copyArea'); ta.value = text; ta.select(); try{ document.execCommand('copy'); flash('복사했어요.'); }catch(e2){ flash('복사가 막혀 있어요. 길게 눌러 직접 복사해 주세요.'); } }
};
$('#bar').onclick = () => openTray($('#tray').classList.contains('closed'));
openTray(false);
render();

