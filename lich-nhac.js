// LÀNG YÊN · Nhắc phiên trị liệu và vào đúng ca (Quy hoạch v3.3, Phần V)
// - Đã đăng nhập: hỏi Supabase phiên của mình (Healer hoặc khách đã được nhận) đang diễn ra hoặc bắt đầu trong 15 phút tới,
//   hiện một nút nhỏ "Vào phiên" ở góc trên. Hỏi lại mỗi 60 giây. Chưa chạy supabase_phase1c.sql thì im lặng, không báo lỗi.
// - index.html?vao=<id Nhà>: mở Rừng Yên rồi vào thẳng Nhà đó (từ trang Lịch trị liệu hoặc từ nút nhắc).
(function(){
  'use strict';
  const hasSession=()=>{try{return Object.keys(localStorage).some(k=>/^sb-.*-auth-token$/.test(k))}catch(e){return false}};
  const hhmm=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
  let off=false,timer=0,shown=null;

  const st=document.createElement('style');
  st.textContent='#yenSession{position:fixed;z-index:97;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 10px);display:flex;align-items:center;gap:10px;max-width:94vw;padding:8px 8px 8px 14px;border-radius:999px;background:#0b2d28f0;border:1px solid #c8a96a;color:#f3e7cc;font:14px/1.3 system-ui,sans-serif;box-shadow:0 6px 20px #0006}'+
    '#yenSession[hidden]{display:none}#yenSession span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#yenSession button{border:0;border-radius:999px;background:#c8a96a;color:#0b2824;font-weight:700;padding:8px 14px;cursor:pointer;min-height:36px}#yenSession .x{background:transparent;color:#f3e7cc;font-weight:400;padding:8px 10px}';
  document.head.appendChild(st);
  const bar=document.createElement('div');bar.id='yenSession';bar.hidden=true;bar.setAttribute('role','status');
  bar.innerHTML='<span></span><button type="button" class="go">Vào phiên</button><button type="button" class="x" aria-label="Ẩn nhắc phiên">✕</button>';
  const mount=()=>document.body.appendChild(bar);if(document.body)mount();else addEventListener('DOMContentLoaded',mount);
  let hiddenFor=null;
  bar.querySelector('.x').onclick=()=>{hiddenFor=shown&&shown.slot+'-'+shown.start;bar.hidden=true};
  bar.querySelector('.go').onclick=()=>{if(shown&&shown.notice){location.href='lich.html#mine';return}if(shown)goHouse(shown.venue)};

  async function check(){
    if(off||!hasSession()||typeof window.anyenAuthClient!=='function')return;
    let c;try{c=await window.anyenAuthClient()}catch(e){return}if(!c)return;
    const r=await c.rpc('anyen_my_next_session');
    if(r.error){if(/anyen_my_next_session|schema cache|does not exist|PGRST202/i.test((r.error.code||'')+' '+r.error.message))off=true;return}
    const s=r.data;shown=s||null;
    if(!s){await notices(c);return}
    if(hiddenFor===s.slot+'-'+s.start){bar.hidden=true;return}
    bar.querySelector('.go').textContent='Vào phiên';
    // v3.9: đến giờ ca, Healer vừa đăng nhập được đưa thẳng vào đúng Nhà (mỗi ca một lần, bấm ✕ hay rời đi thì không kéo lại)
    if(s.host&&s.kind!=='home'&&s.now>=s.start){const k='yen_auto_ca_'+s.slot+'_'+new Date().toDateString();let done=false;try{done=!!sessionStorage.getItem(k);sessionStorage.setItem(k,'1')}catch(e){done=true}
      if(!done&&!document.body.classList.contains('room-open'))setTimeout(()=>goHouse(s.venue),800)}
    const started=s.now>=s.start,home=s.kind==='home',who=s.host?(s.guests?s.guests+(home?' bạn đã nhận lời':' khách đã nhận lời'):(home?'chưa có bạn nhận lời':'chưa có khách')):(home?'Chủ nhà đang chờ bạn':'Healer đang chờ bạn');
    bar.querySelector('span').textContent='🌿 '+(started?(home?'Buổi hẹn đang diễn ra':'Phiên đang diễn ra'):(home?'Hẹn lúc ':'Phiên lúc ')+hhmm(s.start))+' · '+s.venue_name+' · '+hhmm(s.start)+'–'+hhmm(s.end)+' · '+who;
    bar.hidden=false;
  }

  // Vào thẳng Nhà: bật 3D (nếu chưa), chờ thế giới sẵn sàng rồi dịch chuyển tới cửa Nhà
  async function goHouse(id){
    try{await Promise.resolve(window.anyenWorldReady)}catch(e){}
    if(!document.body.classList.contains('immersive')){const b=document.getElementById('enter3D');if(b)b.click()}
    for(let i=0;i<40;i++){
      if(window.__forest&&typeof window.__forest.house==='function'&&document.body.classList.contains('immersive')){
        if(window.__forest.house(id)){bar.hidden=true;return true}
      }
      await new Promise(r=>setTimeout(r,250));
    }
    const t=document.getElementById('toast');if(t){t.textContent='Chưa vào được Nhà, hãy đi bộ tới cửa Nhà trong Rừng Yên nhé';t.style.display='block';setTimeout(()=>t.style.display='none',3500)}
    return false;
  }
  window.anyenGoHouse=goHouse;

  // Thông báo hủy lịch (anyen_my_notices): khi không có phiên sắp tới, hiện một dòng nhắc nhỏ dẫn tới Lịch hẹn
  let noticeOff=false;
  async function notices(c){
    if(noticeOff||hiddenFor==='notice-'){bar.hidden=true;return}
    const r=await c.rpc('anyen_my_notices');
    if(r.error){if(/anyen_my_notices|schema cache|does not exist|PGRST202/i.test((r.error.code||'')+' '+r.error.message))noticeOff=true;bar.hidden=true;return}
    const n=(r.data&&r.data.unread)||0;if(!n){bar.hidden=true;return}
    shown={notice:true,slot:'notice',start:''};
    bar.querySelector('span').textContent='🔔 '+n+' thông báo lịch hẹn mới';bar.querySelector('.go').textContent='Xem';bar.hidden=false;
  }

  const start=()=>{
    const want=(new URLSearchParams(location.search)).get('vao');
    if(want&&/^[a-z0-9_]{1,40}$/.test(want)){history.replaceState(null,'',location.pathname+location.hash);setTimeout(()=>goHouse(want),400)}
    setTimeout(check,2500);timer=setInterval(check,60000);
  };
  if(document.readyState==='loading')addEventListener('DOMContentLoaded',start);else start();
  window.addEventListener('anyen-auth-ready',()=>setTimeout(check,500));
})();
