// LÀNG YÊN 3.1: Presence + Broadcast, authenticated private channels.
import {createClient} from 'https://esm.sh/@supabase/supabase-js@2';
const $=s=>document.querySelector(s), status=$('#realtimeStatus'), count=$('#onlineCount'), people=$('#onlinePeople');
const cfg=window.ANYEN_CONFIG||{};
const valid=/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.supabaseUrl||'')&&/^(sb_publishable_|eyJ)/.test(cfg.publishableKey||'');
const topics={'Sảnh chung':'lobby','Phòng Sen · 10 người':'sen','Phòng Trúc · 20 người':'truc'};
const colors=new Set(['#d9b67d','#90b7a5','#f0e5d4','#b5a1c7','#687b48','#e8a1b4']);
let client,channel,uid,peers={},joined=false,position={x:0,z:8},seatIntent=null,activity='idle',generation=0,lastMove=0,retryTimer=null,manualLeave=false,roomName='',lastRoomTopic='',sessionData=null,sessionTimer=null,sessionSeen=new Set(),bellEnabled=false,sessionFinished=false,sessionPoll=null;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const cleanName=s=>String(s||'Khách Làng Yên').replace(/[<>]/g,'').slice(0,24);
function profile(){let p={};try{p=JSON.parse(localStorage.getItem('yenGuestProfile17')||'{}')}catch{}return{name:cleanName(p.name),style:['robe','linen','casual'].includes(p.style)?p.style:'robe',color:colors.has(p.color)?p.color:'#687b48'}}
function state(s){if(status)status.textContent=s}
function publish(){window.dispatchEvent(new CustomEvent('anyen-peers',{detail:{...peers}}))}
function live(on){window.dispatchEvent(new CustomEvent('anyen-live',{detail:{connected:on}}))}
function update(){if(!channel)return;const incoming={};for(const [key,entries] of Object.entries(channel.presenceState()||{})){if(key===uid)continue;const p=entries[0];if(!p)continue;incoming[key]={name:cleanName(p.name),color:colors.has(p.color)?p.color:'#687b48',style:['robe','linen','casual'].includes(p.style)?p.style:'robe',x:clamp(Number(p.x)||0,-35,35),z:clamp(Number(p.z)||8,-30,30),activity:['idle','sit','walk','bell'].includes(p.activity)?p.activity:'idle',seatX:p.seatX!=null&&Number.isFinite(Number(p.seatX))?Number(p.seatX):null,seatZ:p.seatZ!=null&&Number.isFinite(Number(p.seatZ))?Number(p.seatZ):null}}peers=incoming;count.textContent=`${Object.keys(peers).length+1} người trong phòng (gồm bạn)`;people.replaceChildren();Object.values(peers).slice(0,35).forEach(p=>{const d=document.createElement('div');d.textContent='● '+p.name;d.style.color=p.color;people.appendChild(d)});publish()}

const sessionPanel=$('#resonancePanel'),clock=$('#resonanceClock'),sessionLabel=$('#resonanceState'),offerings=$('#resonanceOfferings');
function sessionAllowed(){return roomName==='Phòng Riêng'||roomName==='Phòng Sen · 10 người'}
function showSessionPanel(){if(sessionPanel)sessionPanel.hidden=!sessionAllowed()}
function ringSessionBell(){if(!bellEnabled)return;try{$('#gong')?.click()}catch{}}
function renderSession(){
 showSessionPanel();if(!clock||!sessionLabel)return;
 if(!sessionData){clock.textContent='--:--';sessionLabel.textContent='Chưa có phiên thiền. Trưởng phiên có thể bắt đầu.';return}
 const left=Math.max(0,Math.ceil((sessionData.endsAt-Date.now())/1000));
 clock.textContent=String(Math.floor(left/60)).padStart(2,'0')+':'+String(left%60).padStart(2,'0');
 sessionLabel.textContent=(left?'🧘 Đang thiền · ':'🌿 Đã kết thúc · ')+cleanName(sessionData.hostName)+' · '+sessionData.minutes+' phút';
 if(!left&&!sessionFinished){sessionFinished=true;ringSessionBell();}
}
function clearSession(){sessionData=null;sessionFinished=false;sessionSeen.clear();if(sessionTimer){clearInterval(sessionTimer);sessionTimer=null}if(offerings)offerings.textContent='';renderSession()}
function applySession(p){
 if(!sessionAllowed()||!p||typeof p!=='object')return;
 if(p.kind==='start'){
   const duration=Number(p.minutes),start=Number(p.startsAt),ends=Number(p.endsAt);
   if(!Number.isFinite(start)||!Number.isFinite(ends)||![5,10,15].includes(duration)||Math.abs((ends-start)-duration*60000)>2000||Math.abs(start-Date.now())>duration*60000+120000)return;
   if(sessionData&&sessionData.endsAt>Date.now()&&sessionData.id!==p.sessionId)return;
   const fresh=!sessionData||sessionData.id!==p.sessionId;
   sessionData={id:String(p.sessionId||'').slice(0,80),hostId:String(p.hostId||'').slice(0,100),hostName:cleanName(p.hostName),startsAt:start,endsAt:ends,minutes:duration};
   sessionFinished=false;if(fresh){sessionSeen.clear();if(offerings)offerings.textContent='';if(Math.abs(start-Date.now())<9000)ringSessionBell()}
   if(!sessionTimer)sessionTimer=setInterval(renderSession,1000);renderSession();
 }else if(p.kind==='end'&&sessionData&&p.sessionId===sessionData.id&&p.hostId===sessionData.hostId){
   sessionData.endsAt=Date.now();renderSession();clearSession();state('🌿 Trưởng phiên đã kết thúc thiền chung.');ringSessionBell();
 }else if(p.kind==='lotus'&&sessionData&&p.sessionId===sessionData.id){
   const id=String(p.offeringId||'').slice(0,100);if(!id||sessionSeen.has(id))return;sessionSeen.add(id);
   if(offerings){const line=document.createElement('div');line.textContent='🪷 '+cleanName(p.name)+' gửi một đóa sen bình an';offerings.prepend(line);while(offerings.children.length>5)offerings.lastElementChild.remove()}
 }
}
// Database is the source of truth for the shared meditation session.
// Polling also supports guests joining late and recovers from dropped broadcasts.
async function syncSession(){
 if(!joined||!client||!sessionAllowed()||!lastRoomTopic)return;
 const topic=lastRoomTopic;
 const r=await client.rpc('anyen_get_meditation_session',{p_topic:topic});
 if(r.error){state('Không tải được phiên thiền: '+r.error.message);return}
 if(topic!==lastRoomTopic||!joined)return;
 const d=r.data;
 if(!d){if(sessionData)clearSession();return}
 const payload={kind:'start',sessionId:d.id,hostId:d.host_id,hostName:d.host_name,
   startsAt:Date.parse(d.starts_at),endsAt:Date.parse(d.ends_at),minutes:d.minutes};
 if(sessionData?.id!==payload.sessionId){applySession(payload)}
 else if(sessionData.endsAt!==payload.endsAt){sessionData.endsAt=payload.endsAt;renderSession()}
}
function startSessionPolling(){clearInterval(sessionPoll);sessionPoll=setInterval(()=>syncSession().catch(e=>state('Lỗi đồng bộ phiên: '+e.message)),8000);syncSession().catch(()=>{})}
function sendSession(payload){if(!joined||!channel){state('Hãy kết nối phòng trước.');return false}channel.send({type:'broadcast',event:'resonance',payload});return true}
$('#resonanceBellEnable')?.addEventListener('click',()=>{bellEnabled=!bellEnabled;const b=$('#resonanceBellEnable');b.textContent=bellEnabled?'🔔 Tắt chuông chung':'🔕 Bật chuông chung';b.setAttribute('aria-pressed',String(bellEnabled))});
$('#resonanceLotus')?.addEventListener('click',()=>{if(!sessionData||sessionData.endsAt<Date.now())return state('Chưa có phiên thiền đang diễn ra.');const p={kind:'lotus',sessionId:sessionData.id,name:profile().name,offeringId:crypto.randomUUID()};applySession(p);sendSession(p)});
function reset(){clearSession();joined=false;live(false);peers={};publish();count.textContent='0 người trực tuyến';people.replaceChildren()}
async function leave(manual=true){clearInterval(sessionPoll);sessionPoll=null;manualLeave=manual;generation++;clearTimeout(retryTimer);const old=channel;channel=null;reset();if(old){try{await old.untrack()}catch{}try{await client.removeChannel(old)}catch{}}if(manual)state('Đã rời phòng')}
function selectedRoom(){return $('[data-room].selected')?.dataset.room||'Sảnh chung'}
async function auth(){if(!client){client=createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true}});client.auth.onAuthStateChange((_event,session)=>{if(session?.access_token)client.realtime.setAuth(session.access_token)})}const r=await client.auth.getSession();if(r.error)throw r.error;let session=r.data.session;if(!session){const sign=await client.auth.signInAnonymously();if(sign.error)throw sign.error;session=sign.data.session}if(!session?.access_token||!session.user)throw Error('Chưa tạo được phiên đăng nhập ẩn danh.');uid=session.user.id;client.realtime.setAuth(session.access_token);return session}
async function resolveTopic(name){if(name!=='Phòng Riêng')return 'anyen:room:'+topics[name];const code=$('#privateRoomCode')?.value.trim();if(!code)throw Error('Nhập mã mời Phòng Riêng hoặc bấm Tạo phòng riêng.');const r=await client.rpc('anyen_join_private_room',{invite_code:code});if(r.error)throw r.error;if(!r.data)throw Error('Mã mời không hợp lệ.');return 'anyen:private:'+r.data}
async function join(){if(!valid){state('Chưa cấu hình Supabase trong config.js');return}await leave(false);manualLeave=false;const g=++generation;roomName=selectedRoom();showSessionPanel();window.dispatchEvent(new CustomEvent('anyen-room-scene',{detail:{room:roomName}}));try{await auth();if(g!==generation)return;lastRoomTopic=await resolveTopic(roomName);if(g!==generation)return;const c=client.channel(lastRoomTopic,{config:{private:true,presence:{key:uid}}});channel=c;c.on('presence',{event:'sync'},()=>{if(c===channel)update()}).on('broadcast',{event:'move'},({payload:p})=>{if(c!==channel||!p||p.id===uid||!peers[p.id])return;const x=Number(p.x),z=Number(p.z);if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>35||Math.abs(z)>30)return;peers[p.id].x=x;peers[p.id].z=z;publish()}).on('broadcast',{event:'activity'},({payload:p})=>{if(c!==channel||!p||p.id===uid||!peers[p.id]||!['idle','sit','walk','bell'].includes(p.activity))return;peers[p.id].activity=p.activity;publish();if(p.activity==='bell')state('🥣 '+cleanName(peers[p.id].name)+' vừa gõ chuông')}).on('broadcast',{event:'greet'},({payload:p})=>{if(c===channel&&p&&p.id!==uid)state('🙏 '+cleanName(p.name)+' gửi lời chào bình an')}).on('broadcast',{event:'gesture'},({payload:p})=>{if(c!==channel||!p||p.id===uid||!['hello','handshake','namaste','jump','spin'].includes(p.kind))return;window.dispatchEvent(new CustomEvent('anyen-remote-gesture',{detail:{id:String(p.id),kind:p.kind,name:cleanName(peers[p.id]?.name||p.name)}}));}).on('broadcast',{event:'offering'},({payload:p})=>{if(c!==channel||!p||p.id===uid||!['incense','flower','candle'].includes(p.kind))return;const id=String(p.offeringId||'');if(!id||offeringSeen.has(id))return;offeringSeen.add(id);window.dispatchEvent(new CustomEvent('anyen-offering',{detail:{kind:p.kind,offeringId:id,remote:true}}));}).on('broadcast',{event:'resonance'},({payload:p})=>{if(c!==channel||!p)return;if(p.kind==='request'){if(sessionData&&sessionData.endsAt>Date.now()&&sessionData.hostId===uid)sendSession({kind:'start',sessionId:sessionData.id,hostId:uid,hostName:profile().name,startsAt:sessionData.startsAt,endsAt:sessionData.endsAt,minutes:sessionData.minutes});return}if(p.kind==='session-updated')syncSession().catch(()=>{});else if(p.kind==='lotus')applySession(p)});
 state('Đang kết nối '+roomName+'…');c.subscribe(async (s,err)=>{if(c!==channel||g!==generation)return;if(s==='SUBSCRIBED'){joined=true;live(true);clearTimeout(retryTimer);try{await c.track({...profile(),...position,activity,...(seatIntent||{})})}catch(e){state('Lỗi Presence: '+e.message);return}state('Đang ở '+roomName+' · Đã kết nối');update();if(lastRoomTopic==='anyen:room:lobby')syncLobbyOfferings().catch(()=>{});if(sessionAllowed())startSessionPolling()}else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(s)){joined=false;live(false);state('Kết nối gián đoạn: '+(err?.message||s)+' · Đang thử lại…');if(!manualLeave){clearTimeout(retryTimer);retryTimer=setTimeout(()=>{if(g===generation&&!manualLeave)join()},3500)}}})
 }catch(e){state('Không kết nối được: '+(e?.message||e));reset()}}
$('#connectRealtime')?.addEventListener('click',join);$('#disconnectRealtime')?.addEventListener('click',()=>leave());
window.addEventListener('anyen-position',e=>{const x=Number(e.detail?.x),z=Number(e.detail?.z);if(!Number.isFinite(x)||!Number.isFinite(z))return;position={x:clamp(x,-35,35),z:clamp(z,-30,30)};if(!joined||!channel||Date.now()-lastMove<250)return;lastMove=Date.now();channel.send({type:'broadcast',event:'move',payload:{id:uid,...position}})});
window.addEventListener('yen-profile',()=>{if(joined&&channel)channel.track({...profile(),...position,activity,...(seatIntent||{})}).catch(()=>{})});
document.querySelectorAll('[data-room]').forEach(b=>b.addEventListener('click',()=>{if(joined||channel)leave().then(()=>state('Đã chọn phòng mới. Bấm Kết nối để tham gia.'))}));
window.addEventListener('anyen-greet',e=>{if(joined&&channel){const kind=['hello','handshake','namaste','jump','spin'].includes(e.detail?.gesture)?e.detail.gesture:'hello';channel.send({type:'broadcast',event:'gesture',payload:{id:uid,name:profile().name,kind}}).catch(err=>state('Không gửi được cử chỉ: '+err.message));state('🙏 Đã gửi '+({hello:'lời chào',handshake:'cử chỉ bắt tay',namaste:'lời chắp tay chào',jump:'động tác nhảy',spin:'động tác xoay'}[kind]))}else state('Hãy kết nối vào phòng trước')});
window.addEventListener('anyen-activity',e=>{const a=e.detail?.activity;if(!['idle','sit','walk','bell'].includes(a))return;activity=a;if(joined&&channel){channel.track({...profile(),...position,activity}).catch(()=>{});channel.send({type:'broadcast',event:'activity',payload:{id:uid,activity}})}});
// Shared offerings are persisted for late arrivals; realtime broadcasts are a fast notification.
const offeringSeen=new Set();
async function syncLobbyOfferings(){
 if(!joined||!client||lastRoomTopic!=='anyen:room:lobby')return;
 const topic=lastRoomTopic;
 const r=await client.rpc('anyen_list_lobby_offerings');
 if(r.error){state('Chưa tải được lễ vật Sảnh chung: '+r.error.message);return}
 if(!joined||lastRoomTopic!==topic)return;
 for(const item of r.data||[]){
   if(item.owner_id===uid||offeringSeen.has(item.id))continue;
   offeringSeen.add(item.id);
   window.dispatchEvent(new CustomEvent('anyen-offering',{detail:{kind:item.kind,offeringId:item.id,remote:true}}));
 }
}
window.addEventListener('anyen-offering',async e=>{
 const kind=e.detail?.kind;
 if(e.detail?.remote||!['incense','flower','candle'].includes(kind))return;
 if(!joined||!channel){state('Hãy kết nối Sảnh chung để lưu lễ vật.');return}
 if(lastRoomTopic!=='anyen:room:lobby')return;
 const r=await client.rpc('anyen_add_lobby_offering',{p_kind:kind});
 if(r.error){state('Không lưu được lễ vật: '+r.error.message);return}
 const id=String(r.data||'');
 offeringSeen.add(id);
 channel.send({type:'broadcast',event:'offering',payload:{id:uid,kind,offeringId:id}}).catch(()=>{});
});
window.addEventListener('anyen-lobby-refresh',()=>syncLobbyOfferings().catch(()=>{}));
window.addEventListener('anyen-seat-intent',e=>{const d=e.detail||{};seatIntent=d.clear?null:(Number.isFinite(d.x)&&Number.isFinite(d.z)?{seatX:d.x,seatZ:d.z}:null);if(joined&&channel)channel.track({...profile(),...position,activity,...(seatIntent||{})}).catch(()=>{});});
window.addEventListener('anyen-connection-request',join);
window.addEventListener('anyen-room-request',e=>{const target=[...document.querySelectorAll('[data-room]')].find(b=>b.dataset.room===e.detail?.room);if(target){target.click();join()}});
window.addEventListener('anyen-private-create',async()=>{if(!valid)return state('Thiếu cấu hình Supabase');try{await auth();const r=await client.rpc('anyen_create_private_room',{p_room_name:($('#privateRoomName')?.value||'').trim()});if(r.error)throw r.error;const code=String(r.data||'');$('#privateRoomCode').value=code;state('🔒 Đã tạo phòng '+($('#privateRoomName')?.value||'Yên Riêng')+'. Sao chép mã mời và bấm Kết nối.');if(navigator.clipboard?.writeText)navigator.clipboard.writeText(code).catch(()=>{})}catch(e){state('Không tạo được phòng: '+e.message)}});
window.addEventListener('anyen-session',async e=>{
 const p=e.detail||{};
 if(!joined||!channel)return state('Hãy kết nối vào phòng trước.');
 if(!sessionAllowed())return state('Thiền chung chỉ mở trong Phòng Sen hoặc Phòng Riêng.');
 if(p.kind==='start'){
   const minutes=[5,10,15].includes(Number(p.minutes))?Number(p.minutes):5;
   const r=await client.rpc('anyen_start_meditation_session',{p_topic:lastRoomTopic,p_minutes:minutes,p_host_name:profile().name});
   if(r.error)return state('Không mở được phiên thiền: '+r.error.message);
   await syncSession();
   if(r.data?.id)sendSession({kind:'session-updated'});
   state(r.data?.host_id===uid?'🧘 Đã mở phiên thiền '+minutes+' phút.':'🧘 Đã có phiên đang diễn ra.');
 }else if(p.kind==='end'){
   if(!sessionData)return state('Chưa có phiên thiền.');
   const r=await client.rpc('anyen_end_meditation_session',{p_session_id:sessionData.id});
   if(r.error)return state('Không kết thúc được phiên: '+r.error.message);
   if(!r.data)return state('Chỉ trưởng phiên được kết thúc phiên thiền.');
   sendSession({kind:'session-updated'});await syncSession();
   state('🌿 Đã kết thúc phiên thiền chung.');ringSessionBell();
 }
});

window.addEventListener('pagehide',()=>{clearInterval(sessionPoll);clearTimeout(retryTimer);if(channel)channel.untrack().catch(()=>{})});
window.addEventListener('online',()=>{if(!joined&&!manualLeave&&roomName)join()});
state(valid?'Sẵn sàng · Chọn phòng và bấm Kết nối':'Chưa kết nối Supabase · Cần cấu hình config.js');
