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

/* 🆘 나 지금 힘들어요: 누른 시각(8시~20시)을 날짜별로 익명으로 세요.
   저장: coparenting_sos/YYYY-MM-DD 문서의 h8 ~ h20 (그 시간에 누른 사람 수). 예전 'count'도 오늘 합계에 더해요.
   기기당 같은 시간에는 한 번만 눌러요. 최근 30일을 모아 "SOS가 많은 시간" 막대를 그려요. */
const SOS_HOURS = [8,9,10,11,12,13,14,15,16,17,18,19,20];
function sosHourNow(){ const h = new Date().getHours(); return Math.min(20, Math.max(8, h)); }
function sosInit(){
  const boxes = document.querySelectorAll('[data-sos]'); if(!boxes.length) return;
  const day = todayStr();
  let today = 0, byHour = {}, days = 0, pressedKey = '';
  try{ pressedKey = localStorage.getItem('copSos') || ''; }catch(e){}
  const pressed = () => pressedKey === day + '-' + sosHourNow();
  const col = copCollection() && firebase.firestore().collection('coparenting_sos');

  function chart(){
    const vals = SOS_HOURS.map(h => byHour[h] || 0), max = Math.max(...vals);
    if(!max) return '<p class="sos-empty">아직 모인 SOS가 없어요. 첫 SOS를 눌러 보세요!</p>';
    const peak = SOS_HOURS[vals.indexOf(max)], now = sosHourNow();
    return `<div class="sos-chart" role="img" aria-label="최근 30일 시간별 SOS 수: ${SOS_HOURS.map((h,i) => h + '시 ' + vals[i] + '번').join(', ')}">` +
      SOS_HOURS.map((h,i) => `<div class="sos-col${h===peak ? ' peak' : ''}${h===now ? ' now' : ''}" title="${h}시 · ${vals[i]}번">
          <span class="sos-val">${h===peak ? vals[i] : ''}</span>
          <span class="sos-bar" style="height:${vals[i] ? Math.max(6, Math.round(vals[i] / max * 64)) : 2}px"></span>
          <span class="sos-hr">${h % 3 === 0 ? h + '시' : ''}</span></div>`).join('') +
      `</div><p class="sos-peak">요즘은 <b>${peak}시</b>쯤 SOS가 가장 많아요</p>`;
  }
  function draw(){
    const done = pressed();
    boxes.forEach(box => {
      box.innerHTML = `<div class="sos-top"><p class="sos-h">🐍 오늘 육아 SOS</p>
          <p class="sos-count">${today ? `오늘 <b>${today}</b>번` : '오늘은 아직 조용해요'}</p></div>
        <button type="button" class="sos-btn${done ? ' done' : ''}" ${done || !col ? 'disabled' : ''}>
          ${done ? '🫂 토닥토닥, 보냈어요' : '🆘 나 지금 힘들어요…'}<small>${done ? '누군가 같은 마음일 거예요' : '누르기만 하면 돼요. 누군지 아무도 몰라요'}</small></button>
        <div class="sos-stat"><p class="sos-sub">최근 30일, 언제 SOS가 많을까?</p>${chart()}</div>
        <p class="sos-hint">같은 시간에 SOS가 많으면 <a href="meet.html#new">＋ 모임 만들기</a>로 직접 모여 봐요!</p>`;
    });
  }
  draw();
  if(!col) return;
  // 오늘 숫자
  col.doc(day).onSnapshot(d => {
    const v = d.exists ? d.data() : {};
    today = (v.count || 0) + SOS_HOURS.reduce((a,h) => a + (v['h'+h] || 0), 0); draw();
  }, () => {});
  // 최근 30일 시간별 합계
  const start = new Date(); start.setDate(start.getDate() - 29);
  const startStr = `${start.getFullYear()}-${String(start.getMonth()+1).padStart(2,'0')}-${String(start.getDate()).padStart(2,'0')}`;
  col.where(firebase.firestore.FieldPath.documentId(), '>=', startStr).onSnapshot(snap => {
    byHour = {}; snap.docs.forEach(d => { const v = d.data(); SOS_HOURS.forEach(h => { byHour[h] = (byHour[h] || 0) + (v['h'+h] || 0); }); });
    draw();
  }, () => {});
  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-sos] .sos-btn'); if(!b || pressed()) return;
    b.disabled = true;
    const h = sosHourNow();
    try{
      await col.doc(day).set({['h'+h]: firebase.firestore.FieldValue.increment(1)}, {merge:true});
      pressedKey = day + '-' + h; try{ localStorage.setItem('copSos', pressedKey); }catch(err){}
      draw();
    }catch(err){ b.disabled = false; }
  });
}
