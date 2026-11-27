// LÀNG YÊN · Không gian chung theo 3 tầng + Khung chat chung ẩn/hiện
// - Solo (mặt vịnh, Cabin): không vào kênh chung.
// - Nhóm 1+5 (Nhà trị liệu, Đảo, Tư Gia, Đảo Yên) tối đa 6 · Cộng đồng (Du thuyền 5 sao, Nhà Văn Hóa) tối đa 36.
// Vào không gian → xin chỗ trên Supabase (anyen_space_enter: kiểm tra vai trò, phiên trị liệu đang diễn ra, sức chứa),
// được chỗ mới vào kênh anyen:sp:<id>. Không được chỗ thì vẫn trải nghiệm riêng, có lời báo nhẹ.
// Kết quả xin chỗ phát ra sự kiện anyen-space-result (phòng Nhà Niệm dùng để biết có phiên 1+5 và ai là Healer);
// anyen-space-people báo ai đang có mặt (kèm danh sách id · tên · giờ vào · cờ host · cụm bàn / chỗ ngồi c · bục ngồi · màu áo · kiểu áo do anyenSpaceChat.meta() đặt; c:-1 là rời chỗ); anyenSpaceChat.say() gửi một dòng vào khung chat (lời dẫn của Healer); anyenSpaceChat.send() và anyen-space-room chuyển tín hiệu phòng (chuông, nhịp thở) trong kênh phiên.
// Khung chat: tự hiện khi có từ 2 người và có tin mới; bấm Ẩn để yên tĩnh (chỉ còn nút 💬 kèm số tin chưa đọc). Tin nhắn không lưu.
(function(){
  'use strict';
  const MAX_LEN=300,BEAT_MS=20000,QUIET_KEY='yen_chat_quiet';
  let client=null,uid=null,channel=null,venue=null,info=null,want=null,beat=null,gen=0,people={},unread=0,lastSend=0,name='Khách Làng Yên',meta={},joinT=0,lastResult=null;
  let quiet=false;try{quiet=localStorage.getItem(QUIET_KEY)==='1'}catch(e){}
  const NOTE={guest:'Bạn đang trải nghiệm riêng · đăng nhập thành viên để gặp mọi người và trò chuyện',session:'Đang có phiên trị liệu riêng ở đây · bạn trải nghiệm riêng, không làm phiền phiên',full:'Không gian đã đủ người · bạn đang trải nghiệm riêng'};

  // ---------- giao diện ----------
  const css=document.createElement('style');
  css.textContent='#yenChat{position:fixed;z-index:96;right:calc(env(safe-area-inset-right,0px) + 10px);top:calc(env(safe-area-inset-top,0px) + 64px);width:min(300px,78vw);max-height:44vh;display:none;flex-direction:column;background:#0b2d28ee;border:1px solid #c8a96a88;border-radius:14px;color:#f3e7cc;font:13px/1.4 system-ui,sans-serif;box-shadow:0 6px 20px #0006}'+
    '#yenChat.show{display:flex}#yenChat header{display:flex;align-items:center;gap:6px;padding:7px 8px 6px 10px;border-bottom:1px solid #c8a96a44}#yenChat header b{flex:1;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
    '#yenChat header button,#yenChatPill{border:1px solid #a18a5e;border-radius:999px;background:#19483b;color:#f5e6c9;font-size:12px;padding:4px 10px;cursor:pointer}'+
    '#yenChatLog{flex:1;overflow:auto;padding:6px 10px;display:flex;flex-direction:column;gap:4px;min-height:60px}#yenChatLog p{margin:0;word-wrap:break-word}#yenChatLog p i{color:#e8cf95;font-style:normal;font-weight:600;margin-right:4px}#yenChatLog p.me i{color:#9fd3c0}#yenChatLog p.sys{opacity:.7;font-size:12px;font-style:italic}'+
    '#yenChat form{display:flex;gap:6px;padding:6px 8px 8px}#yenChat input{flex:1;min-width:0;border:1px solid #c8a96a66;border-radius:10px;background:#123d35;color:#f3e7cc;padding:7px 9px;font-size:16px}#yenChat form button{border:0;border-radius:10px;background:#c8a96a;color:#0b2824;font-weight:600;padding:0 12px;cursor:pointer}'+
    '#yenChatPill{position:fixed;z-index:96;right:calc(env(safe-area-inset-right,0px) + 10px);top:calc(env(safe-area-inset-top,0px) + 64px);display:none;font-size:14px;padding:6px 12px}#yenChatPill.show{display:block}#yenChatPill.new{background:#c8a96a;color:#0b2824;font-weight:600}'+
    '#yenSpaceNote{position:fixed;z-index:96;left:50%;top:calc(env(safe-area-inset-top,0px) + 64px);transform:translateX(-50%);max-width:88vw;background:#0b2d28e6;border:1px solid #c8a96a66;border-radius:12px;padding:6px 12px;color:#f3e7cc;font:13px/1.35 system-ui,sans-serif;text-align:center;opacity:0;transition:opacity .4s;pointer-events:none}#yenSpaceNote.show{opacity:1}';
  document.head.appendChild(css);
  const box=document.createElement('section');box.id='yenChat';box.setAttribute('aria-label','Khung chat chung');
  box.innerHTML='<header><b></b><button type="button" data-c="hide" aria-label="Ẩn khung chat">Ẩn</button></header><div id="yenChatLog" aria-live="polite"></div><form><input maxlength="300" autocomplete="off" placeholder="Nhắn cho mọi người…" aria-label="Tin nhắn"><button type="submit">Gửi</button></form>';
  const pill=document.createElement('button');pill.id='yenChatPill';pill.type='button';pill.setAttribute('aria-label','Mở khung chat');
  const note=document.createElement('div');note.id='yenSpaceNote';
  const mount=()=>{document.body.append(box,pill,note)};if(document.body)mount();else document.addEventListener('DOMContentLoaded',mount);
  const log=box.querySelector('#yenChatLog'),input=box.querySelector('input'),title=box.querySelector('header b');
  let noteT=0;function say(t,ms=5000){note.textContent=t;note.classList.add('show');clearTimeout(noteT);noteT=setTimeout(()=>note.classList.remove('show'),ms)}
  const count=()=>Object.keys(people).length;
  function render(){
    const n=count(),on=!!channel;
    title.textContent='💬 '+(venue?.name||'Trò chuyện')+' · '+n+' người';
    const shouldShow=on&&!quiet&&(n>=2||log.childElementCount>0);
    box.classList.toggle('show',shouldShow);
    pill.classList.toggle('show',on&&!shouldShow&&(n>=2||unread>0));
    pill.classList.toggle('new',unread>0);pill.textContent='💬'+(unread?' '+unread:'');
  }
  function line(who,text,cls){const p=document.createElement('p');if(cls)p.className=cls;if(who){const i=document.createElement('i');i.textContent=who;p.append(i)}p.append(document.createTextNode(text));log.append(p);while(log.childElementCount>80)log.firstChild.remove();log.scrollTop=log.scrollHeight}
  box.querySelector('[data-c=hide]').onclick=()=>{quiet=true;try{localStorage.setItem(QUIET_KEY,'1')}catch(e){}unread=0;render()};
  pill.onclick=()=>{quiet=false;try{localStorage.setItem(QUIET_KEY,'0')}catch(e){}unread=0;render();setTimeout(()=>input.focus(),50)};
  box.querySelector('form').onsubmit=e=>{e.preventDefault();const text=input.value.trim().slice(0,MAX_LEN);if(!text||!channel)return;
    const now=Date.now();if(now-lastSend<1200){say('Gửi chậm lại một chút nhé',2000);return}lastSend=now;
    const msg={id:(crypto.randomUUID?crypto.randomUUID():String(now)+Math.random()),from:uid,name,text,t:now};
    channel.send({type:'broadcast',event:'chat',payload:msg});line(name,text,'me');input.value='';render()};

  // ---------- kết nối ----------
  function profileName(){try{const p=JSON.parse(localStorage.getItem('yenGuestProfile17')||'{}');return String(p.name||'Khách Làng Yên').replace(/[<>]/g,'').slice(0,24)||'Khách Làng Yên'}catch(e){return 'Khách Làng Yên'}}
  async function getClient(){if(client)return client;if(typeof window.anyenAuthClient!=='function')return null;client=await window.anyenAuthClient();if(!client)return null;const {data}=await client.auth.getSession();uid=data?.session?.user?.id||null;return client}
  const emit=(n,d)=>window.dispatchEvent(new CustomEvent(n,{detail:d}));
  async function leave(){gen++;info=null;lastResult=null;clearInterval(beat);beat=null;const c=channel;channel=null;people={};unread=0;log.replaceChildren();render();
    if(c){try{await c.untrack()}catch(e){}try{await client.removeChannel(c)}catch(e){}}
    if(venue&&client){venue=null;try{await client.rpc('anyen_space_leave')}catch(e){}}venue=null}
  async function enter(id){
    await leave();const g=gen;want=id;
    let c;try{c=await getClient()}catch(e){c=null}if(g!==gen)return;if(!c){emit('anyen-space-result',{id,ok:false,reason:'guest'});return}
    const tab=window.anyenActivityLock?.tab||null;
    const r=await c.rpc('anyen_space_enter',{p_venue:id,p_tab:tab});if(g!==gen)return;
    if(r.error){if(!/anyen_space_enter|schema cache|does not exist/i.test(r.error.message))console.warn('space',r.error.message);emit('anyen-space-result',{id,ok:false,reason:'error'});return}
    const d=r.data||{};if(!d.ok){if(NOTE[d.reason])say(NOTE[d.reason]);emit('anyen-space-result',{id,ok:false,reason:d.reason||'unknown'});return}
    info={id,session:d.session??null,instance:d.instance??null,therapist:d.therapist??null,home:d.home??null,host:d.host??null,me:uid,healer:!!(d.therapist&&d.therapist===uid)};/* home, host: buổi hẹn Tư Gia / Đảo Yên và Chủ nhà */
    venue={id,name:spaceName(id),cap:d.capacity};name=profileName();
    const ch=c.channel(d.topic,{config:{private:true,presence:{key:uid},broadcast:{self:false}}});channel=ch;
    ch.on('presence',{event:'sync'},()=>{if(ch!==channel)return;const st=ch.presenceState()||{},next={};for(const [k,arr] of Object.entries(st)){if(arr&&arr[0])next[k]=arr[0]}
      for(const k of Object.keys(next))if(!people[k]&&k!==uid&&Object.keys(people).length)line('',(next[k].name||'Một người bạn')+' vừa vào','sys');
      for(const k of Object.keys(people))if(!next[k]&&k!==uid)line('',(people[k].name||'Một người bạn')+' đã rời đi','sys');
      people=next;render();emitPeople()});
    ch.on('broadcast',{event:'room'},({payload:m})=>{if(ch!==channel||!m||m.from===uid||typeof m.k!=='string')return;emit('anyen-space-room',Object.assign({},m,{fromHealer:!!(info&&info.therapist&&m.from===info.therapist)}))});
    ch.on('broadcast',{event:'chat'},({payload:m})=>{if(ch!==channel||!m||m.from===uid)return;const text=String(m.text||'').slice(0,MAX_LEN);if(!text)return;
      line(String(m.name||'Khách').replace(/[<>]/g,'').slice(0,24),text);if(quiet)unread++;render()});
    joinT=Date.now();ch.subscribe(async s=>{if(ch!==channel)return;if(s==='SUBSCRIBED'){try{await ch.track(Object.assign({},meta,{name,t:joinT}))}catch(e){}
        say('Đã vào '+venue.name+' · '+d.count+'/'+d.capacity+' người'+(d.session?' · phiên trị liệu đang diễn ra':''),3500);lastResult=Object.assign({ok:true,count:d.count,capacity:d.capacity},info);emit('anyen-space-result',lastResult)}
      else if(s==='CHANNEL_ERROR'||s==='TIMED_OUT'){/* hết chỗ hoặc mất quyền: thử lại một lần */if(g===gen)setTimeout(()=>{if(g===gen&&want===id)enter(id)},4000)}});
    beat=setInterval(async()=>{if(g!==gen)return;const b=await c.rpc('anyen_space_beat',{p_venue:id});if(g===gen&&b.data===false)enter(id)},BEAT_MS);
    render();
  }
  // Danh sách người có mặt (id, tên, giờ vào, cờ tự báo như host/cụm bàn) cho các phòng cộng đồng như Nhà Văn Hóa xếp chỗ và chọn người dẫn.
  function emitPeople(){if(!channel||!venue)return;emit('anyen-space-people',{id:venue.id,n:count(),me:uid,healer:!!(info&&info.therapist&&people[info.therapist]),
    list:Object.entries(people).map(([id,p])=>({id,name:String(p.name||'').replace(/[<>]/g,'').slice(0,24),t:+p.t||0,host:p.host===true,c:Number.isInteger(p.c)&&p.c>=0&&p.c<16?p.c:null,s:Number.isInteger(p.s)&&p.s>=0&&p.s<36?p.s:null,col:typeof p.col==='string'&&/^#[0-9a-f]{6}$/i.test(p.col)?p.col:null,sty:['robe','linen','casual'].includes(p.sty)?p.sty:null}))})}
  window.addEventListener('anyen-space-ask',()=>{if(!channel)return;if(lastResult)emit('anyen-space-result',lastResult);emitPeople()});
  function spaceName(id){const m={xong_huong:'Nhà Hương · Haromy',nha_hoa_lan:'Nhà Sắc',xuong_gom:'Nhà Chạm',quan_tra:'Nhà Vị',chuong_gio:'Nhà Thanh',nha_niem:'Nhà Niệm',nha_van_hoa:'Nhà Văn Hóa',tu_gia:'Tư Gia',du_thuyen_yen:'Du thuyền Yên',tu_dao:'Đảo Yên',dao_ngoc_lan:'Đảo Ngọc Lan',dao_hang_vong:'Đảo Hang Vọng',dao_gio_thom:'Đảo Gió Thơm',dao_tinh_tra:'Đảo Tĩnh Trà',dao_da_lang:'Đảo Đá Lặng'};return m[id]||'Không gian chung'}

  // Không gian đang ở (phát từ index.html): 'forest' | 'bay' | 'room:<id>' | 'space:<id>' | 'out'
  window.addEventListener('anyen-space',e=>{const sp=String(e.detail?.space||'');const m=/^(?:room|space):([a-z0-9_]{1,40})$/.exec(sp);
    if(m){if(m[1]!==want){meta={};enter(m[1])}else if(!channel)enter(m[1])}else{want=null;meta={};leave()}});
  window.addEventListener('anyen-lock-paused',()=>{const w=want;leave();want=w});
  window.addEventListener('anyen-lock-resumed',()=>{if(want)enter(want)});
  window.addEventListener('pagehide',()=>{if(venue&&client){try{client.rpc('anyen_space_leave')}catch(e){}}});
  window.anyenSpaceChat={state:()=>({venue:venue?.id||null,want,people:count(),quiet,unread,joined:!!channel}),session:()=>info&&channel?Object.assign({},info):null,
    meta:o=>{const m={};if(o&&o.host===true)m.host=true;if(o&&Number.isInteger(o.c)&&o.c>=0&&o.c<16)m.c=o.c;if(o&&Number.isInteger(o.s)&&o.s>=0&&o.s<36)m.s=o.s;if(o&&typeof o.col==='string'&&/^#[0-9a-f]{6}$/i.test(o.col))m.col=o.col;if(o&&['robe','linen','casual'].includes(o.sty))m.sty=o.sty;meta=Object.assign({},meta,m);if(o&&o.s===-1)delete meta.s;if(o&&o.c===-1)delete meta.c;if(channel){try{channel.track(Object.assign({},meta,{name,t:joinT}))}catch(e){}}return true},
    say:text=>{text=String(text||'').trim().slice(0,MAX_LEN);if(!text||!channel)return false;const now=Date.now();if(now-lastSend<1200)return false;lastSend=now;
      channel.send({type:'broadcast',event:'chat',payload:{id:(crypto.randomUUID?crypto.randomUUID():String(now)+Math.random()),from:uid,name,text,t:now}});line(name,text,'me');render();return true},
    send:p=>{if(!channel||!p||typeof p.k!=='string')return false;channel.send({type:'broadcast',event:'room',payload:Object.assign({},p,{from:uid,t:Date.now()})});return true}};
})();
