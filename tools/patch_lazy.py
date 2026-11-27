# Vá tay đi kèm split_lazy.py: chờ mô-đun trước khi vào vịnh/mở phòng, tải sẵn lúc rảnh.
import re
W='js/world3d.js';s=open(W,encoding='utf-8').read()
def rep(a,b,n=1):
    global s
    assert s.count(a)==n,(a[:60],s.count(a));s=s.replace(a,b)
rep("  window.anyenLoadBay=loadBayModule;\n","  window.anyenLoadBay=loadBayModule;\n"
"  {const pre=()=>{if(!bayModuleP)loadBayModule().catch(()=>{});if(!roomsP)loadRoomsModule().catch(()=>{})};const idle=window.requestIdleCallback||(f=>setTimeout(f,1));\n"
"   const later=()=>setTimeout(()=>idle(pre,{timeout:8000}),6000);if(document.body.classList.contains('immersive'))later();else window.addEventListener('anyen-3d-enter',later,{once:true});\n"
"   const preB=()=>{if(!bayModuleP)loadBayModule().catch(()=>{})};for(const id of ['enterBay','zenBayGo'])document.getElementById(id)?.addEventListener('pointerenter',preB,{once:true});document.getElementById('enterBay')?.addEventListener('touchstart',preB,{once:true,passive:true})}\n")
rep("  function enterBay(){\n    if(bayMode)return;","  function enterBay(){\n    if(bayMode)return;\n"
"    if(!bayModuleReady){if(!enterBay.waiting){enterBay.waiting=true;document.getElementById('zenHint').textContent='⛵ Đang tải Vịnh Yên…';\n"
"        loadBayModule().then(()=>{enterBay.waiting=false;if(window.anyenPendingBay||enterBay.want)enterBay()}).catch(()=>{enterBay.waiting=false;window.anyenPendingBay=false;document.getElementById('zenHint').textContent='Chưa tải được Vịnh Yên, kiểm tra mạng rồi bấm lại nhé'})}\n"
"      enterBay.want=true;return}\n    enterBay.want=false;")
rep("bayDress(meActivity==='sit')","if(bayDress)bayDress(meActivity==='sit')")
rep("ship:bayShip,","get ship(){return bayShip},")
rep("  function openRoom(h){const b=ROOM_BUILDERS[h.id];if(!b||roomOpen||bayMode)return;",
"  function openRoom(h){const b=ROOM_BUILDERS[h.id];if(!b||roomOpen||bayMode)return Promise.resolve();\n"
"    if(!roomsReady){if(openRoom.waiting)return openRoom.waiting;const hint=document.getElementById('zenHint');if(hint)hint.textContent='Đang mở '+(h.name||'phòng')+'…';\n"
"      return openRoom.waiting=loadRoomsModule().then(()=>{openRoom.waiting=null;return openRoom(h)}).catch(()=>{openRoom.waiting=null;if(hint)hint.textContent='Chưa tải được phòng, kiểm tra mạng rồi thử lại nhé'})}\n   ")
rep("roomFromIsland=true;openRoom(TU_DAO_SPACE);const bk=roomBox.querySelector('[data-rm=\"back\"]');if(bk&&roomOpen)bk.textContent='← Xuống tàu · Vịnh Yên'}",
"roomFromIsland=true;Promise.resolve(openRoom(TU_DAO_SPACE)).then(()=>{const bk=roomBox.querySelector('[data-rm=\"back\"]');if(bk&&roomOpen)bk.textContent='← Xuống tàu · Vịnh Yên'})}")
open(W,'w',encoding='utf-8').write(s)
