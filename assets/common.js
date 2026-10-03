/* 동래아 공동육아 공통 도구 — 모든 페이지에서 먼저 불러와요 */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const WEEK = ['일','월','화','수','목','금','토'];
const SLOTS = ['오전','점심','오후','저녁'];

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

/* Firebase (성장노트와 같은 프로젝트) — 익명게시판·번개 글이 저장되는 곳
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
      .sort((a,b) => a.date.localeCompare(b.date) || SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot)));
  }, () => cb(null));
}
