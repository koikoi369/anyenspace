// LÀNG YÊN: Supabase Realtime (beta). No journal or donation data is transmitted.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const $ = s => document.querySelector(s);
const status = $('#realtimeStatus'), count = $('#onlineCount'), people = $('#onlinePeople');
const cfg = window.ANYEN_CONFIG || {};
const valid = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(cfg.supabaseUrl||'') && /^(sb_publishable_|eyJ)/.test(cfg.publishableKey||'');
const topics = {'Sảnh chung':'lobby','Phòng Sen · 10 người':'sen','Phòng Trúc · 20 người':'truc'};
const colors = new Set(['#d9b67d','#90b7a5','#f0e5d4','#b5a1c7','#687b48','#e8a1b4']);
let client, channel, uid, peers={}, joined=false, lastMove=0, position={x:0,z:8}, generation=0;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const cleanName=s=>String(s||'Khách Làng Yên').replace(/[<>]/g,'').slice(0,24);
function profile(){let p={};try{p=JSON.parse(localStorage.getItem('yenGuestProfile17')||'{}')||{}}catch{}return {name:cleanName(p.name),style:['robe','linen','casual'].includes(p.style)?p.style:'robe',color:colors.has(p.color)?p.color:'#687b48'};}
function state(s){if(status)status.textContent=s;}
function publishPeers(){window.dispatchEvent(new CustomEvent('anyen-peers',{detail:{...peers}}));}
function live(on){window.dispatchEvent(new CustomEvent('anyen-live',{detail:{connected:on}}));}
function update(){
 const incoming={};let online=0;
 for(const [key,entries] of Object.entries(channel?.presenceState()||{})){
  if(key===uid)continue;
  const p=entries[0];if(!p)continue;
  const x=Number(p.x),z=Number(p.z);
  incoming[key]={name:cleanName(p.name),color:colors.has(p.color)?p.color:'#687b48',x:Number.isFinite(x)?clamp(x,-35,35):0,z:Number.isFinite(z)?clamp(z,-30,30):8};online++;
 }
 peers=incoming;count.textContent=`${online+1} người trong phòng (gồm bạn)`;
 people.replaceChildren();Object.values(peers).slice(0,35).forEach(p=>{const d=document.createElement('div');d.textContent='● '+p.name;d.style.color=p.color;people.appendChild(d)});
 publishPeers();
}
async function leave(){
 generation++;joined=false;live(false);
 const old=channel;channel=null;
 if(old){try{await old.untrack()}catch{}try{await client.removeChannel(old)}catch{}}
 peers={};publishPeers();count.textContent='0 người trực tuyến';people.replaceChildren();state('Đã rời phòng');
}
async function join(){
 if(!valid){state('Chưa cấu hình Supabase trong config.js');return;}
 const selected=$('[data-room].selected')?.dataset.room||'Sảnh chung';
 const room=topics[selected];
 if(!room){state('Phòng Riêng chưa mở: cần cơ chế mời và quyền riêng tư.');return;}
 await leave();const myGeneration=++generation;
 try{
  if(!client)client=createClient(cfg.supabaseUrl,cfg.publishableKey,{auth:{persistSession:true,autoRefreshToken:true}});
  // getUser() returns 'Auth session missing!' for first-time visitors.
  // Check the local session first, then create an anonymous session if needed.
  const sessionResult=await client.auth.getSession();
  if(sessionResult.error)throw sessionResult.error;
  let user=sessionResult.data.session?.user;
  if(!user){
   const signInResult=await client.auth.signInAnonymously();
   if(signInResult.error)throw signInResult.error;
   user=signInResult.data.user;
  }
  if(!user)throw new Error('Không tạo được phiên khách ẩn danh. Kiểm tra Anonymous Sign-Ins trong Supabase.');
  if(myGeneration!==generation)return;
  uid=user.id;
  const c=client.channel('anyen:room:'+room,{config:{private:true,presence:{key:uid}}});channel=c;
  c.on('presence',{event:'sync'},()=>{if(c===channel)update()})
   .on('broadcast',{event:'move'},({payload})=>{
    if(c!==channel||!payload||payload.id===uid||!peers[payload.id])return;
    const x=Number(payload.x),z=Number(payload.z);
    if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>35||Math.abs(z)>30)return;
    peers[payload.id].x=x;peers[payload.id].z=z;publishPeers();
   })
   .on('broadcast',{event:'greet'},({payload})=>{
    if(c!==channel||!payload||payload.id===uid)return;
    state('🙏 '+cleanName(payload.name)+' gửi lời chào bình an');
   });
  state('Đang kết nối '+selected+'…');
  c.subscribe(async (s,err)=>{
   if(c!==channel)return;
   if(s==='SUBSCRIBED'){
    joined=true;live(true);
    try{await c.track({...profile(),...position})}catch(e){state('Lỗi hiển thị: '+e.message);return}
    state('Đang ở '+selected+' · Đã kết nối');update();
   }else if(['CHANNEL_ERROR','TIMED_OUT','CLOSED'].includes(s)){
    joined=false;live(false);state('Kết nối gặp lỗi: '+(err?.message||s));
   }
  });
 }catch(e){state('Không kết nối được: '+(e?.message||e));live(false)}
}
$('#connectRealtime')?.addEventListener('click',join);
$('#disconnectRealtime')?.addEventListener('click',leave);
window.addEventListener('anyen-position',e=>{
 const x=Number(e.detail?.x),z=Number(e.detail?.z);
 if(!Number.isFinite(x)||!Number.isFinite(z))return;
 position={x:clamp(x,-35,35),z:clamp(z,-30,30)};
 if(!joined||!channel||Date.now()-lastMove<250)return;
 lastMove=Date.now();
 channel.send({type:'broadcast',event:'move',payload:{id:uid,...position}});
});
window.addEventListener('yen-profile',()=>{if(joined&&channel)channel.track({...profile(),...position})});
$$Rooms();
function $$Rooms(){document.querySelectorAll('[data-room]').forEach(b=>b.addEventListener('click',()=>{if(joined||channel){leave().then(()=>state('Đã chọn phòng mới. Bấm Kết nối để tham gia.'))}}));}
function greet(){if(joined&&channel){channel.send({type:'broadcast',event:'greet',payload:{id:uid,name:profile().name}});state('🙏 Đã gửi lời chào tới phòng')}else state('Hãy kết nối vào phòng để gửi lời chào')}
window.addEventListener('anyen-greet',greet);
// Avoid a second click handler overriding the 3D scene handler.
window.addEventListener('pagehide',()=>{if(channel)channel.untrack()});
state(valid?'Sẵn sàng · Chọn phòng và bấm Kết nối':'Chưa kết nối Supabase · Cần cấu hình config.js');
