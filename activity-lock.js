// LÀNG YÊN · Khóa 1 trang – 1 hoạt động (Single-Activity Lock)
// - Cùng một máy: các tab báo cho nhau qua BroadcastChannel (dự phòng: sự kiện storage). Tab nào được mở/chạm gần nhất thì hoạt động,
//   các tab còn lại dừng hẳn (thoát 3D, tắt âm thanh, rời phòng cộng đồng) sau khi lưu vị trí và trạng thái.
// - Nhiều thiết bị cùng tài khoản: ghi "phiên đang hoạt động" lên Supabase (bảng anyen_active_session) và đồng bộ trạng thái
//   (bảng anyen_user_state). Nếu cơ sở dữ liệu chưa có hai bảng này thì chỉ khóa giữa các tab trên cùng máy, không báo lỗi.
// - Mở lại tab/thiết bị cũ: tự lấy trạng thái mới nhất rồi vào lại đúng không gian đang dở (Rừng Yên hoặc Vịnh Yên).
(function(){
  const TAB=(crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2))+'';
  const KEYS=k=>/^yen_/.test(k)||k==='yenGuestProfile17';          // trạng thái lưu trên máy được đồng bộ
  const bc='BroadcastChannel' in window?new BroadcastChannel('langyen-activity'):null;
  let owner=false,paused=false,claimedOnServer=false,resumeSpace=null,server=null,serverOff=false,lastPull=0,pollTimer=0,pushTimer=0,claimT=0;
  const $=s=>document.querySelector(s);
  const in3D=()=>document.body.classList.contains('immersive');
  const inBay=()=>document.body.classList.contains('yen-bay');

  // ---- màn che khi tab này đang tạm dừng
  const box=document.createElement('div');box.id='activityLock';box.hidden=true;box.setAttribute('role','dialog');box.setAttribute('aria-modal','true');
  box.innerHTML='<div class="al-card"><b>✧ Làng Yên đang mở ở nơi khác</b><p class="al-msg"></p><p class="al-note">Vị trí và trạng thái của bạn đã được lưu. Tiếp tục ở đây sẽ lấy trạng thái mới nhất.</p><button type="button" class="al-go">Tiếp tục ở đây</button></div>';
  const st=document.createElement('style');st.textContent='#activityLock{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:#061a16e6;padding:20px}#activityLock[hidden]{display:none}#activityLock .al-card{max-width:420px;background:#0b2d28;border:1px solid #c8a96a88;border-radius:18px;padding:22px;color:#f3e7cc;text-align:center;font:15px/1.5 Inter,system-ui,sans-serif;box-shadow:0 18px 50px #0009}#activityLock b{font:600 19px Georgia,serif;color:#f4e2b9}#activityLock .al-note{font-size:13px;opacity:.8}#activityLock .al-go{margin-top:6px;background:#c9a35b;color:#1b140c;border:0;border-radius:22px;padding:11px 20px;font:600 15px inherit;cursor:pointer}';
  document.head.appendChild(st);
  const mount=()=>document.body.appendChild(box);if(document.body)mount();else addEventListener('DOMContentLoaded',mount);
  box.querySelector('.al-go').onclick=()=>claim(true);

  // ---- máy chủ (chỉ khi đã có phiên đăng nhập sẵn; không tự tạo tài khoản ẩn danh mới)
  const hasSession=()=>{try{return Object.keys(localStorage).some(k=>/^sb-.*-auth-token$/.test(k))}catch(e){return false}};
  async function srv(){
    if(serverOff||!hasSession()||typeof window.anyenAuthClient!=='function')return null;
    if(server)return server;
    try{const c=await window.anyenAuthClient();if(!c)return null;const {data}=await c.auth.getSession();const uid=data?.session?.user?.id;if(!uid)return null;server={c,uid};return server}catch(e){return null}
  }
  const missing=err=>err&&(/does not exist|schema cache|PGRST205|42P01/i.test((err.code||'')+' '+(err.message||'')));
  const device=()=>{const u=navigator.userAgent;return (/iPhone|iPad/.test(u)?'iPhone/iPad':/Android/.test(u)?'Android':/Mac/.test(u)?'Mac':/Win/.test(u)?'Windows':'Máy khác')+' · '+new Date().toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})};
  function snapshot(){const s={};try{for(const k of Object.keys(localStorage))if(KEYS(k))s[k]=localStorage.getItem(k)}catch(e){}s.__space=in3D()?(inBay()?'bay':'forest'):'out';s.__t=Date.now();return s}
  async function push(){const S=await srv();if(!S)return;window.dispatchEvent(new Event('anyen-save-now'));const state=snapshot();try{localStorage.setItem('langyen_state_t',String(state.__t))}catch(e){}
    const {error}=await S.c.from('anyen_user_state').upsert({user_id:S.uid,state,updated_at:new Date().toISOString()});if(missing(error))serverOff=true}
  async function pull(){const S=await srv();if(!S)return null;const {data,error}=await S.c.from('anyen_user_state').select('state,updated_at').eq('user_id',S.uid).maybeSingle();
    if(missing(error)){serverOff=true;return null}if(!data?.state)return null;const local=Number(localStorage.getItem('langyen_state_t')||0);
    if(Number(data.state.__t||0)>local){try{for(const [k,v] of Object.entries(data.state))if(KEYS(k)&&typeof v==='string')localStorage.setItem(k,v);localStorage.setItem('langyen_state_t',String(data.state.__t))}catch(e){}}
    return data.state}
  async function serverClaim(){const S=await srv();if(!S)return;const {error}=await S.c.from('anyen_active_session').upsert({user_id:S.uid,tab_id:TAB,device:device(),claimed_at:new Date().toISOString()});if(missing(error))serverOff=true;else if(!error)claimedOnServer=true}
  async function serverCheck(){if(!owner||paused)return;const S=await srv();if(!S)return;if(!claimedOnServer){await pull();await serverClaim();return}const {data,error}=await S.c.from('anyen_active_session').select('tab_id,device').eq('user_id',S.uid).maybeSingle();
    if(missing(error)){serverOff=true;return}if(data&&data.tab_id&&data.tab_id!==TAB)pause('device',data.device)}

  // ---- dừng tab này
  function pause(kind,where){if(paused)return;paused=true;owner=false;
    resumeSpace=in3D()?(inBay()?'bay':'forest'):null;
    window.dispatchEvent(new Event('anyen-save-now'));
    if(kind!=='device')push();                                      // nhường cho tab khác trên cùng máy: ghi lại trạng thái cuối
    window.dispatchEvent(new CustomEvent('langyen-audio-stop',{detail:{except:null}}));
    if(in3D()){const b=$('#exit3D');if(b)b.click()}
    window.dispatchEvent(new Event('anyen-lock-paused'));
    box.querySelector('.al-msg').textContent=kind==='device'?'Tài khoản của bạn vừa được mở trên thiết bị khác'+(where?' ('+where+')':'')+'. Ở đây mọi hoạt động đã dừng.':'Bạn vừa mở Làng Yên ở một tab khác. Ở tab này mọi hoạt động đã dừng.';
    box.hidden=false}
  // ---- giành quyền hoạt động cho tab này
  async function claim(byUser){claimedOnServer=false;const now=Date.now();if(owner&&!paused&&now-claimT<1500)return;claimT=now;
    const wasPaused=paused;owner=true;paused=false;box.hidden=true;
    const msg={type:'claim',tab:TAB,t:now};if(bc)bc.postMessage(msg);try{localStorage.setItem('langyen_lock',JSON.stringify(msg))}catch(e){}
    await serverClaim();
    if(wasPaused||byUser){await pull();window.dispatchEvent(new Event('anyen-lock-resumed'));
      const sp=resumeSpace;resumeSpace=null;
      if(sp==='bay'){const b=$('#enterBay');if(b)b.click()}else if(sp==='forest'){const b=$('#enter3D');if(b)b.click()}}}
  if(bc)bc.onmessage=e=>{const m=e.data||{};if(m.type==='claim'&&m.tab!==TAB)pause('tab')};
  addEventListener('storage',e=>{if(e.key!=='langyen_lock'||!e.newValue)return;try{const m=JSON.parse(e.newValue);if(m.tab!==TAB&&!bc)pause('tab')}catch(_){}});

  // Mở trang / quay lại tab / bấm vào tab đang dừng → tab này hoạt động
  const wake=()=>{if(document.visibilityState==='visible'&&(paused||!owner))claim(false)};
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&owner){window.dispatchEvent(new Event('anyen-save-now'));push()}else wake()});
  addEventListener('focus',wake);
  addEventListener('pagehide',()=>{if(owner){window.dispatchEvent(new Event('anyen-save-now'));push()}});
  const start=async()=>{if(document.visibilityState==='visible'){await pull();claim(false)}
    pollTimer=setInterval(serverCheck,6000);pushTimer=setInterval(()=>{if(owner&&!paused&&in3D())push()},20000)};
  if(document.readyState==='loading')addEventListener('DOMContentLoaded',start);else start();
  window.anyenActivityLock={tab:TAB,state:()=>({owner,paused,serverOff,server:!!server})};
})();
