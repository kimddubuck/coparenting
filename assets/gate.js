/* 입장 비밀번호 (간단한 문지기)
   - 각 페이지 <head>에서 가장 먼저 불러와요. 통과 전에는 화면 내용을 가려요.
   - 한 번 맞히면 그 기기·브라우저에 기억돼서 다음부터는 바로 들어가요.
   - 비밀번호 자체는 저장소에 적지 않고, SHA-256 지문(GATE_HASH)만 둬요.
     비밀번호를 바꾸려면 새 비밀번호의 지문을 계산해 GATE_HASH만 바꾸면 돼요 (CLAUDE.md 참고).
   - 링크를 우연히 연 사람을 막는 정도예요. 코드를 아는 사람은 우회할 수 있어요. */
const GATE_HASH = 'b2b2f104d32c638903e151a9b20d6e27b41d8c0c84cf8458738f83ca2f1dd744';
const GATE_KEY = 'copEntry';

(function gate(){
  let ok = false;
  try{ ok = localStorage.getItem(GATE_KEY) === GATE_HASH; }catch(e){}
  if(ok) return;
  document.documentElement.classList.add('gate-locked');
  const css = document.createElement('style');
  css.textContent = `
    html.gate-locked body > *:not(#gate){display:none!important}
    #gate{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;padding:24px;background:var(--page,#f3f5f2);z-index:100}
    #gate form{width:100%;max-width:340px;display:flex;flex-direction:column;gap:12px;background:var(--bg,#fff);border:1px solid var(--line,#e2e6e1);border-radius:20px;padding:28px 22px;box-shadow:0 2px 14px rgba(20,40,30,.08);text-align:center}
    #gate .g-emoji{font-size:44px;line-height:1}
    #gate h1{margin:0;font-size:22px}
    #gate p{margin:0;color:var(--muted,#6b7570);font-size:14px}
    #gate input{font:inherit;font-size:16px;padding:12px;border-radius:12px;border:1px solid var(--line,#e2e6e1);background:var(--bg,#fff);color:var(--fg,#1f2a24);text-align:center}
    #gate button{font:inherit;font-weight:700;font-size:15px;padding:12px;border-radius:12px;border:0;background:var(--pick,#2a9095);color:var(--pick-fg,#fff);cursor:pointer}
    #gate .g-msg{color:#c0392b;min-height:1.2em}`;
  document.head.appendChild(css);

  async function sha256(text){
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join('');
  }
  function show(){
    const box = document.createElement('div'); box.id = 'gate';
    box.innerHTML = `<form autocomplete="off">
        <span class="g-emoji" aria-hidden="true">🐍</span>
        <h1>공동육아 SOS 🆘</h1>
        <p>단톡방에 공유된 입장 비밀번호를 입력해 주세요.<br>한 번 들어오면 다음부터는 바로 열려요.</p>
        <input type="password" id="gateInput" aria-label="입장 비밀번호" placeholder="비밀번호">
        <button type="submit">들어가기</button>
        <p class="g-msg" id="gateMsg" aria-live="polite"></p>
      </form>`;
    document.body.appendChild(box);
    const input = box.querySelector('#gateInput'); input.focus();
    box.querySelector('form').addEventListener('submit', async e => {
      e.preventDefault();
      const h = await sha256(input.value.trim().normalize('NFC'));
      if(h === GATE_HASH){
        try{ localStorage.setItem(GATE_KEY, h); }catch(err){}
        document.documentElement.classList.remove('gate-locked'); box.remove();
      }else{
        box.querySelector('#gateMsg').textContent = '비밀번호가 맞지 않아요. 단톡방 공지를 확인해 주세요.';
        input.select();
      }
    });
  }
  if(document.body) show(); else document.addEventListener('DOMContentLoaded', show);
})();
