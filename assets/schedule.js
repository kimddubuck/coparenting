/* 일정·공지 페이지와 홈의 '다가오는 일정' — schedule.js(일정 데이터)와 common.js가 먼저 필요해요 */
function sortedSchedule(){ return [...SCHEDULE].sort((a,b) => a.date.localeCompare(b.date)); }

function scheduleItem(e, withNotice){
  const today = todayStr();
  return `<li>
    <span class="when">📅 ${dayLabel(e.date)} ${esc(e.time||'')}${e.date===today ? ' · 오늘' : ''}</span>
    <span class="what"><b>${esc(e.title)}</b>${e.plays && e.plays.length ? ' — ' + e.plays.map(esc).join(', ') : ''}</span>
    ${e.place ? `<span class="sub-info">📍 ${esc(e.place)}</span>` : ''}
    ${withNotice && e.notice ? `<a href="${esc(e.notice)}" target="_blank" rel="noopener"><img class="notice-img" src="${esc(e.notice)}" alt="${esc(e.title)} 공지 이미지" loading="lazy"></a>` : ''}
  </li>`;
}

function meetItem(o){
  const today = todayStr();
  const li = document.createElement('li');
  const w = document.createElement('span'); w.className = 'when';
  w.textContent = `⚡ ${dayLabel(o.date)} ${o.slot || ''}${o.date===today ? ' · 오늘' : ''} 번개`;
  const t = document.createElement('span'); t.className = 'what'; t.textContent = o.text;   // 글은 textContent로만
  const n = document.createElement('a'); n.className = 'sub-info'; n.href = 'board.html#meet';
  n.textContent = `🙋 ${o.joins || 0}명 갈래요 · 게시판에서 보기`;
  li.append(w, t, n); return li;
}

// 번개(익명게시판 meet 글) 중 오늘 이후 것을 가까운 순으로 받아서 cb에 넘겨요
function watchMeets(cb){
  const col = copCollection(); if(!col){ cb(null); return; }
  col.orderBy('createdAt','desc').limit(300).onSnapshot(snap => {
    const today = todayStr();
    cb(snap.docs.map(d => ({id:d.id, ...d.data()}))
      .filter(o => o.topic==='meet' && o.date && o.date >= today)
      .sort((a,b) => a.date.localeCompare(b.date) || SLOTS.indexOf(a.slot) - SLOTS.indexOf(b.slot)));
  }, () => cb(null));
}
