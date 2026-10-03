/* 익명게시판 페이지 — 로그인 없이 익명. 저장 위치: coparenting_opinions 컬렉션(이름·기기 정보 저장 안 함)
   plays.js와 common.js가 먼저 필요해요 */
const BOARD_HABITS = PLAYS.filter(p => p.cat==='혼자서도 할 수 있어요');
const BOARD_DEVS = PLAYS.filter(p => p.cat!=='혼자서도 할 수 있어요' && p.cat!=='마무리');
const TOPIC_PLAYS = {habit: () => BOARD_HABITS, dev: () => BOARD_DEVS};
const board = {topic:'habit', slot:'오전', items:[], col:null};
const OP_HINT = {
  habit:'예: 신발을 스스로 벗어서 정리했으면 좋겠어요. / 숟가락질을 세 번째 하니까 이제 국자를 꽉 잡아요.',
  dev:'예: 모래나 흙을 만져 보게 하고 싶어요. / 얼음 만질 때 처음엔 놀랐는데 나중엔 웃었어요.',
  meet:'장소, 시간, 하고 싶은 놀이를 적어 주세요.',
  free:'예: 요즘 밤에 자주 깨는데 다들 어떻게 하세요? / 오늘 다들 고생 많았어요.'};
// 번개 글 양식: 번개 탭을 열면 내용 칸에 미리 채워져요
const MEET_TEMPLATE = '장소: \n시간: \n놀이: ';
const EMPTY = {habit:'아직 글이 없어요. 첫 글을 남겨 주세요.', dev:'아직 글이 없어요. 첫 글을 남겨 주세요.',
  meet:'다가오는 번개가 없어요. 같이 놀고 싶은 날을 남겨 주세요.', free:'아직 글이 없어요. 첫 글을 남겨 주세요.'};


// '나도 갈래요'는 이 기기에서 한 번만 (완벽한 막기는 아니에요)
function joined(){ try{ return JSON.parse(localStorage.getItem('copJoined')||'[]'); }catch(e){ return []; } }
function markJoined(id){ try{ localStorage.setItem('copJoined', JSON.stringify([...joined(), id])); }catch(e){} }

function boardInit(){
  board.col = copCollection();
  if(!board.col){
    $('#opEmpty').textContent = '인터넷 연결을 확인해 주세요. 게시판을 불러오지 못했어요.';
    $('#opSend').disabled = true; return;
  }
  board.col.orderBy('createdAt','desc').limit(300).onSnapshot(snap => {
    board.items = snap.docs.map(d => ({id:d.id, ...d.data()}));
    renderOps();
  }, () => { $('#opEmpty').textContent = '글을 불러오지 못했어요. 잠시 뒤 새로고침해 주세요.'; });
}

function renderOpTabs(){
  const t = board.topic;
  document.querySelectorAll('#opTabs [data-topic]').forEach(b => b.setAttribute('aria-pressed', b.dataset.topic===t));
  $('#playField').hidden = !TOPIC_PLAYS[t];
  if(TOPIC_PLAYS[t]) $('#opPlay').innerHTML = '<option value="">놀이 전체 / 기타</option>' +
    TOPIC_PLAYS[t]().map(p => `<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('');
  $('#meetFields').hidden = t!=='meet';
  $('#meetExample').hidden = t!=='meet';
  const ta = $('#opText');
  if(t==='meet' && !ta.value.trim()) ta.value = MEET_TEMPLATE;
  if(t!=='meet' && ta.value===MEET_TEMPLATE) ta.value = '';
  $('#opCount').textContent = `${ta.value.length} / 500`;
  if(t==='meet' && !$('#opDate').value){ $('#opDate').value = todayStr(); }
  $('#opDate').min = todayStr();
  document.querySelectorAll('#opSlot [data-slot]').forEach(b => b.setAttribute('aria-pressed', b.dataset.slot===board.slot));
  $('#opTextLabel').textContent = t==='meet' ? '장소·시간·놀이' : '내용';
  $('#opText').placeholder = OP_HINT[t];
}

function fmtDate(ts){
  if(!ts || !ts.toDate) return '방금';
  const d = ts.toDate();
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function renderOps(){
  const t = board.topic, today = todayStr(), mine = joined();
  let list = board.items.filter(o => o.topic===t);
  // 번개는 지난 날짜는 숨기고, 가까운 날짜부터
  if(t==='meet') list = list.filter(o => o.date && o.date >= today)
    .sort((a,b) => a.date.localeCompare(b.date) || SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot));
  $('#opEmpty').textContent = list.length ? '' : EMPTY[t];
  const ul = $('#opList'); ul.innerHTML = '';
  list.forEach(o => {
    const li = document.createElement('li');
    const meta = document.createElement('div'); meta.className = 'op-meta';
    if(t==='meet'){
      const w = document.createElement('span'); w.className = 'op-when';
      w.textContent = `⚡ ${dayLabel(o.date)} ${o.slot || ''}${o.date===today ? ' · 오늘' : ''}`;
      meta.appendChild(w);
    }
    if(o.play){ const tg = document.createElement('span'); tg.className = 'tag'; tg.textContent = o.play; meta.appendChild(tg); }
    const when = document.createElement('span'); when.textContent = fmtDate(o.createdAt); meta.appendChild(when);
    const p = document.createElement('p'); p.className = 'op-text'; p.textContent = o.text;   // 글은 textContent로만 넣어요
    li.append(meta, p);
    if(t==='meet'){
      const done = mine.includes(o.id), n = o.joins || 0;
      const b = document.createElement('button'); b.type = 'button'; b.className = 'join'; b.dataset.join = o.id;
      b.setAttribute('aria-pressed', done);
      b.textContent = done ? `🙋 갈게요 · ${n}명` : (n ? `🙋 나도 갈래요 · ${n}명` : '🙋 나도 갈래요');
      if(done) b.disabled = true;
      const row = document.createElement('div'); row.className = 'op-meta'; row.appendChild(b); li.appendChild(row);
    }
    ul.appendChild(li);
  });
}

$('#opTabs').addEventListener('click', e => {
  const b = e.target.closest('[data-topic]'); if(!b) return;
  board.topic = b.dataset.topic; $('#opMsg').textContent = ''; renderOpTabs(); renderOps();
});
$('#opSlot').addEventListener('click', e => {
  const b = e.target.closest('[data-slot]'); if(!b) return;
  board.slot = b.dataset.slot; renderOpTabs();
});
$('#opList').addEventListener('click', async e => {
  const b = e.target.closest('[data-join]'); if(!b || !board.col || joined().includes(b.dataset.join)) return;
  b.disabled = true;
  try{
    await board.col.doc(b.dataset.join).update({joins: firebase.firestore.FieldValue.increment(1)});
    markJoined(b.dataset.join); renderOps();
  }catch(err){ b.disabled = false; $('#opEmpty').textContent = '참여 표시를 저장하지 못했어요. 잠시 뒤 다시 눌러 주세요.'; }
});
$('#opText').addEventListener('input', () => { $('#opCount').textContent = `${$('#opText').value.length} / 500`; });
$('#opForm').addEventListener('submit', async e => {
  e.preventDefault();
  const t = board.topic, text = $('#opText').value.trim();
  // 번개는 양식 칸(장소:/시간:/놀이:)만 남아 있으면 빈 글로 봐요
  const filled = t==='meet' ? text.replace(/^(장소|시간|놀이):/gm, '').trim() : text;
  if(!filled){ $('#opMsg').textContent = t==='meet' ? '장소, 시간, 놀이 중 하나는 적어 주세요.' : '내용을 적어 주세요.'; return; }
  if(!board.col) return;
  const doc = {topic:t, text, createdAt: firebase.firestore.FieldValue.serverTimestamp()};
  if(TOPIC_PLAYS[t] && $('#opPlay').value) doc.play = $('#opPlay').value;
  if(t==='meet'){
    const date = $('#opDate').value;
    if(!date || date < todayStr()){ $('#opMsg').textContent = '오늘 이후 날짜를 골라 주세요.'; return; }
    doc.date = date; doc.slot = board.slot; doc.joins = 0;
  }
  $('#opSend').disabled = true;
  try{
    await board.col.add(doc);
    $('#opText').value = t==='meet' ? MEET_TEMPLATE : ''; $('#opCount').textContent = `${$('#opText').value.length} / 500`;
    $('#opMsg').textContent = t==='meet' ? '번개를 올렸어요! ⚡' : '남겼어요. 고마워요!';
  }catch(err){
    $('#opMsg').textContent = '저장하지 못했어요. 잠시 뒤 다시 눌러 주세요.';
  }finally{ $('#opSend').disabled = false; }
});
if(['habit','dev','meet','free'].includes(location.hash.slice(1))) board.topic = location.hash.slice(1);
renderOpTabs();
boardInit();