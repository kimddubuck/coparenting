/* 익명게시판 페이지 — 로그인 없이 익명. 저장 위치: coparenting_opinions 컬렉션(이름·기기 정보 저장 안 함)
   plays.js와 common.js가 먼저 필요해요. 모임 요청(topic 'meet')은 meet.html에서 따로 다뤄요 */
const BOARD_HABITS = PLAYS.filter(p => p.cat==='혼자서도 할 수 있어요');
const BOARD_DEVS = PLAYS.filter(p => p.cat!=='혼자서도 할 수 있어요' && p.cat!=='마무리');
const TOPIC_PLAYS = {habit: () => BOARD_HABITS, dev: () => BOARD_DEVS};
const board = {topic:'habit', items:[], col:null};
const OP_HINT = {
  habit:'예: 신발을 스스로 벗어서 정리했으면 좋겠어요. / 숟가락질을 세 번째 하니까 이제 국자를 꽉 잡아요.',
  dev:'예: 모래나 흙을 만져 보게 하고 싶어요. / 얼음 만질 때 처음엔 놀랐는데 나중엔 웃었어요.',
  free:'예: 요즘 밤에 자주 깨는데 다들 어떻게 하세요? / 오늘 다들 고생 많았어요.'};

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
  $('#opText').placeholder = OP_HINT[t];
}

function renderOps(){
  const list = board.items.filter(o => o.topic===board.topic);
  $('#opEmpty').textContent = list.length ? '' : '아직 글이 없어요. 첫 글을 남겨 주세요.';
  const ul = $('#opList'); ul.innerHTML = '';
  list.forEach(o => {
    const li = document.createElement('li');
    const meta = document.createElement('div'); meta.className = 'op-meta';
    if(o.play){ const tg = document.createElement('span'); tg.className = 'tag'; tg.textContent = o.play; meta.appendChild(tg); }
    const when = document.createElement('span'); when.textContent = fmtTime(o.createdAt); meta.appendChild(when);
    const p = document.createElement('p'); p.className = 'op-text'; p.textContent = o.text;   // 글은 textContent로만 넣어요
    li.append(meta, p); ul.appendChild(li);
  });
}

$('#opTabs').addEventListener('click', e => {
  const b = e.target.closest('[data-topic]'); if(!b) return;
  board.topic = b.dataset.topic; $('#opMsg').textContent = ''; renderOpTabs(); renderOps();
});
$('#opText').addEventListener('input', () => { $('#opCount').textContent = `${$('#opText').value.length} / 500`; });
$('#opForm').addEventListener('submit', async e => {
  e.preventDefault();
  const t = board.topic, text = $('#opText').value.trim();
  if(!text){ $('#opMsg').textContent = '내용을 적어 주세요.'; return; }
  if(!board.col) return;
  const doc = {topic:t, text, createdAt: firebase.firestore.FieldValue.serverTimestamp()};
  if(TOPIC_PLAYS[t] && $('#opPlay').value) doc.play = $('#opPlay').value;
  $('#opSend').disabled = true;
  try{
    await board.col.add(doc);
    $('#opText').value = ''; $('#opCount').textContent = '0 / 500';
    $('#opMsg').textContent = '남겼어요. 고마워요!';
  }catch(err){
    $('#opMsg').textContent = '저장하지 못했어요. 잠시 뒤 다시 눌러 주세요.';
  }finally{ $('#opSend').disabled = false; }
});
if(['habit','dev','free'].includes(location.hash.slice(1))) board.topic = location.hash.slice(1);
renderOpTabs();
boardInit();
