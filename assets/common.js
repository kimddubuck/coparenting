/* 동래아 공동육아 공통 도구 — 모든 페이지에서 먼저 불러와요 */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const WEEK = ['일','월','화','수','목','금','토'];
const SLOTS = ['오전','점심','오후','저녁'];   // 예전 글의 시간대 (지금은 9시~18시 중에 골라요)
const HOURS = [9,10,11,12,13,14,15,16,17,18];
// 같은 날 모임 정렬용: '10시' → 10, 예전 시간대는 대략적인 시각으로
function slotOrder(s){ const m = /^(\d+)시$/.exec(s || ''); return m ? +m[1] : ({'오전':9.5,'점심':12.5,'오후':15.5,'저녁':18.5})[s] || 99; }

// 오늘 날짜를 YYYY-MM-DD로 (기기 시간 기준)
function todayStr(){ const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
// 글 올린 시각 (아직 서버 시각이 안 붙었으면 '방금')
function fmtTime(ts){
  if(!ts || !ts.toDate) return '방금';
  const d = ts.toDate();
  return `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
// 모임 카드 왼쪽 날짜 배지 (예: 10월 / 7 / 수)
function dateBadge(ymd){
  const [y,m,d] = ymd.split('-').map(Number);
  const el = document.createElement('div'); el.className = 'date-badge' + (ymd===todayStr() ? ' today' : '');
  el.innerHTML = `<small>${ymd===todayStr() ? '오늘' : m + '월'}</small><b>${d}</b><small>${WEEK[new Date(y, m-1, d).getDay()]}</small>`;
  return el;
}
function dayLabel(ymd){ const [y,m,d] = ymd.split('-').map(Number); return `${m}/${d} (${WEEK[new Date(y, m-1, d).getDay()]})`; }

/* 위쪽 메뉴: 페이지마다 <nav id="siteNav" data-page="..."> 만 두면 여기서 채워요 */
const NAV = [['index.html','home','🏠','홈'],['meet.html','meet','🙌','모임'],['play.html','play','🧸','놀이'],['board.html','board','💬','게시판']];
(function renderNav(){
  const nav = document.getElementById('siteNav'); if(!nav) return;
  const cur = nav.dataset.page;
  nav.innerHTML = `<a class="brand" href="index.html">동래아 공동육아 🐍</a><div class="nav-links">` +
    NAV.map(([href,key,icon,label]) => `<a href="${href}"${key===cur ? ' aria-current="page"' : ''}><span class="ti" aria-hidden="true">${icon}</span><span>${label}</span></a>`).join('') + '</div>';
})();

/* Firebase (성장노트와 같은 프로젝트) — 익명게시판·모임 요청 글이 저장되는 곳
   필요한 Firestore 보안 규칙은 의견게시판_설정.md 참고 */
const firebaseConfig = {
  apiKey: "AIzaSyC-dKd4u8cHn5lvC9EU5ZiXLY07HQ1oCiI",
  authDomain: "yunhaeducation.firebaseapp.com",
  projectId: "yunhaeducation",
  storageBucket: "yunhaeducation.firebasestorage.app",
  messagingSenderId: "1005649043387",
  appId: "1:1005649043387:web:5386ca629d4dc605992e9e"
};
// 게시판 컬렉션을 돌려줘요. 인터넷·SDK 문제로 못 쓰면 null
function copCollection(){
  try{
    if(!(window.firebase && firebase.initializeApp)) return null;
    if(!firebase.apps.length) firebase.initializeApp(firebaseConfig);
    return firebase.firestore().collection('coparenting_opinions');
  }catch(e){ return null; }
}

// 모임 요청(topic 'meet') 중 오늘 이후 것을 가까운 순으로 cb에 넘겨요. 못 불러오면 null
function watchMeets(cb){
  const col = copCollection(); if(!col){ cb(null); return; }
  col.orderBy('createdAt','desc').limit(300).onSnapshot(snap => {
    const today = todayStr();
    cb(snap.docs.map(d => ({id:d.id, ...d.data()}))
      .filter(o => o.topic==='meet' && o.date && o.date >= today)
      .sort((a,b) => a.date.localeCompare(b.date) || slotOrder(a.slot) - slotOrder(b.slot)));
  }, () => cb(null));
}

// 홈 화면 설치(웹앱)용 서비스 워커 등록 — 캐시는 하지 않아요
if('serviceWorker' in navigator){ window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); }); }

/* 🆘 오늘 놀고 싶어요: 하루 단위 익명 카운트 (coparenting_sos/YYYY-MM-DD 의 count)
   <div class="sos" data-sos></div> 자리에 그려요. 기기당 하루 한 번만 눌러요. */
function sosInit(){
  const boxes = document.querySelectorAll('[data-sos]'); if(!boxes.length) return;
  const day = todayStr();
  let count = 0, pressed = false;
  try{ pressed = localStorage.getItem('copSos') === day; }catch(e){}
  const col = copCollection() && firebase.firestore().collection('coparenting_sos');
  function draw(){
    boxes.forEach(box => {
      box.innerHTML = `<div class="sos-top"><p class="sos-h">🆘 오늘 놀고 싶은 사람?</p>
          <p class="sos-count">${count ? `오늘 <b>${count}</b>명이 눌렀어요` : '아직 아무도 안 눌렀어요'}</p></div>
        <button type="button" class="btn sos-btn${pressed ? ' done' : ''}" ${pressed || !col ? 'disabled' : ''}>${pressed ? '🆘 눌렀어요' : '🆘 나도 놀고 싶어요'}</button>
        <p class="sos-hint">누가 눌렀는지는 몰라요. 숫자가 모이면 누군가 <a href="meet.html#new">＋ 모임 만들기</a>로 추진해 보세요!</p>`;
    });
  }
  draw();
  if(!col) return;
  const ref = col.doc(day);
  ref.onSnapshot(d => { count = (d.exists && d.data().count) || 0; draw(); }, () => {});
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-sos] .sos-btn'); if(!b || pressed) return;
    b.disabled = true;
    try{
      await ref.set({count: firebase.firestore.FieldValue.increment(1)}, {merge:true});
      pressed = true; try{ localStorage.setItem('copSos', day); }catch(err){}
      draw();
    }catch(err){ b.disabled = false; }
  });
}
