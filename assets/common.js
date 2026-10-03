/* 동래아 공동육아 공통 도구 — 모든 페이지에서 먼저 불러와요 */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const WEEK = ['일','월','화','수','목','금','토'];
const SLOTS = ['오전','점심','오후','저녁'];

// 오늘 날짜를 YYYY-MM-DD로 (기기 시간 기준)
function todayStr(){ const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
function dayLabel(ymd){ const [y,m,d] = ymd.split('-').map(Number); return `${m}/${d} (${WEEK[new Date(y, m-1, d).getDay()]})`; }

/* 위쪽 메뉴: 페이지마다 <nav id="siteNav" data-page="..."> 만 두면 여기서 채워요 */
const NAV = [['index.html','home','홈'],['schedule.html','schedule','일정·공지'],['play.html','play','놀이 고르기'],['board.html','board','익명게시판']];
(function renderNav(){
  const nav = document.getElementById('siteNav'); if(!nav) return;
  const cur = nav.dataset.page;
  nav.innerHTML = `<a class="brand" href="index.html">동래아 공동육아 🐍</a><div class="nav-links">` +
    NAV.map(([href,key,label]) => `<a href="${href}"${key===cur ? ' aria-current="page"' : ''}>${label}</a>`).join('') + '</div>';
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
