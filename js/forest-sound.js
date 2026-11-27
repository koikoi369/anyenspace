// LÀNG YÊN · Âm thanh Rừng Yên: Nhạc thiền nhẹ nhàng (mặc định, không chuông), Thỉnh thoảng tiếng chuông, Im lặng.
// Mọi âm thanh tạo trực tiếp bằng Web Audio trên thiết bị (không dùng file nhạc), nên không có vấn đề bản quyền và không tốn mạng.
// Lựa chọn lưu ở localStorage 'anyen-forest-sound'. Chỉ phát khi đang ở Rừng Yên 3D; tạm dừng khi vào nhà/phòng, Vịnh Yên,
// Nhà Sắc, bản đồ, lễ tụng Kathina hoặc khi ẩn ứng dụng; tự phát lại khi trở về rừng.
(()=>{
  const KEY='anyen-forest-sound';
  const MODES={
    music:{icon:'🎶',label:'Nhạc thiền nhẹ nhàng',note:'Mặc định · nền ấm thư thái, nốt đàn thưa, không có chuông'},
    bell:{icon:'🔔',label:'Thỉnh thoảng tiếng chuông',note:'Chuông xoay ngân, cách nhau chừng một phút'},
    silent:{icon:'🔇',label:'Im lặng',note:'Chỉ có tiếng gió trong lòng'}
  };
  let mode='music';try{const s=localStorage.getItem(KEY);if(MODES[s])mode=s}catch(e){}

  const css=document.createElement('style');
  css.textContent='#forestSoundBtn{display:none;position:fixed;z-index:72;right:12px;top:250px;width:44px;height:44px;border:1px solid #a18a5e;border-radius:12px;background:#19483b;color:#f5e6c9;font-size:20px;line-height:1;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}'
    +'#forestSoundBtn.on{border-color:#f2c75c;box-shadow:0 0 0 2px #f2c75c55}'
    +'body.immersive #forestSoundBtn{display:block}'
    +'body.immersive.yen-bay #forestSoundBtn,body.room-open #forestSoundBtn,body.orchid-open #forestSoundBtn,body.forest-map-open #forestSoundBtn,body.kat-chant #forestSoundBtn{display:none!important}'
    +'#forestSoundMenu{position:fixed;z-index:83;right:64px;top:250px;width:min(270px,calc(100vw - 80px));background:#0b2d28f2;border:1px solid #c8a96a88;border-radius:16px;padding:10px;color:#f3e7cc;box-shadow:0 14px 40px #0009}'
    +'#forestSoundMenu[hidden],body:not(.immersive) #forestSoundMenu,body.room-open #forestSoundMenu,body.yen-bay #forestSoundMenu{display:none!important}'
    +'#forestSoundMenu .fs-title{font-size:13px;letter-spacing:.04em;opacity:.85;margin:0 4px 8px}'
    +'#forestSoundMenu button{display:flex;align-items:center;gap:10px;width:100%;min-height:52px;margin:0 0 6px;padding:8px 12px;border:1px solid #a18a5e;border-radius:12px;background:#19483b;color:#f5e6c9;font-size:15px;text-align:left;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent}'
    +'#forestSoundMenu button:last-child{margin-bottom:0}'
    +'#forestSoundMenu button span{font-size:22px;width:28px;text-align:center;flex:none}'
    +'#forestSoundMenu button small{display:block;font-size:11px;opacity:.75;margin-top:2px}'
    +'#forestSoundMenu button[aria-pressed="true"]{background:#c8a96a;color:#0b2824;border-color:#c8a96a;font-weight:600}'
    +'@media(max-width:800px){#forestSoundBtn{top:254px}#forestSoundMenu{top:254px}}';
  document.head.appendChild(css);

  const btn=document.createElement('button');btn.type='button';btn.id='forestSoundBtn';btn.setAttribute('aria-haspopup','true');btn.setAttribute('aria-expanded','false');
  const menu=document.createElement('div');menu.id='forestSoundMenu';menu.hidden=true;menu.setAttribute('role','group');menu.setAttribute('aria-label','Âm thanh Rừng Yên');
  menu.innerHTML='<div class="fs-title">♫ Âm thanh Rừng Yên</div>'+Object.keys(MODES).map(k=>'<button type="button" data-fs="'+k+'" aria-pressed="false"><span>'+MODES[k].icon+'</span><div>'+MODES[k].label+'<small>'+MODES[k].note+'</small></div></button>').join('');
  document.body.appendChild(btn);document.body.appendChild(menu);

  function paint(){btn.textContent=MODES[mode].icon;btn.classList.toggle('on',mode!=='silent');
    btn.setAttribute('aria-label','Âm thanh Rừng Yên: '+MODES[mode].label+'. Chạm để đổi');btn.title='Âm thanh: '+MODES[mode].label;
    menu.querySelectorAll('[data-fs]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.fs===mode)))}
  function openMenu(v){menu.hidden=!v;btn.setAttribute('aria-expanded',String(!!v))}
  btn.addEventListener('click',e=>{e.stopPropagation();unlock();openMenu(menu.hidden)});
  menu.addEventListener('click',e=>{e.stopPropagation();const b=e.target.closest('[data-fs]');if(!b)return;setMode(b.dataset.fs);openMenu(false)});
  document.addEventListener('pointerdown',e=>{if(!menu.hidden&&!menu.contains(e.target)&&e.target!==btn)openMenu(false)},true);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){openMenu(false);btn.focus()}});

  // ---------- Web Audio ----------
  let ac=null,master=null,verbIn=null,live=null;
  function unlock(){try{if(!ac){ac=new(window.AudioContext||window.webkitAudioContext)();master=ac.createGain();master.gain.value=.85;master.connect(ac.destination);
        // Vang nhẹ: hai đường delay có phản hồi, lọc bớt âm cao cho mềm.
        verbIn=ac.createGain();verbIn.gain.value=.5;[[.37,.42],[.53,.36]].forEach(([t,fb])=>{const d=ac.createDelay(2),g=ac.createGain(),lp=ac.createBiquadFilter();d.delayTime.value=t;g.gain.value=fb;lp.type='lowpass';lp.frequency.value=1600;verbIn.connect(d);d.connect(lp);lp.connect(g);g.connect(d);lp.connect(master)})}
      if(ac.state==='suspended')ac.resume()}catch(e){ac=null}return ac}

  function tone(bus,freq,t0,{attack=.6,decay=4.5,gain=.05,type='sine'}={}){const o=ac.createOscillator(),g=ac.createGain();o.type=type;o.frequency.value=freq;o.detune.value=(Math.random()-.5)*5;
    g.gain.setValueAtTime(.0001,t0);g.gain.exponentialRampToValueAtTime(gain,t0+attack);g.gain.exponentialRampToValueAtTime(.0001,t0+attack+decay);
    o.connect(g);g.connect(bus);o.start(t0);o.stop(t0+attack+decay+.05);return o}

  function bowl(bus,t0,base){// chuông xoay: các bồi âm không điều hòa, ngân dài, có tiếng dùi gõ mềm
    [[1,.11,9],[2.01,.05,7.5],[2.96,.03,6],[4.1,.016,4.5],[5.77,.008,3.2]].forEach(([m,a,d],i)=>{const o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.setValueAtTime(base*m,t0);
      o.frequency.exponentialRampToValueAtTime(base*m*(1+(i%2?.0012:-.0012)),t0+3);g.gain.setValueAtTime(.0001,t0);g.gain.exponentialRampToValueAtTime(a,t0+.012+i*.003);g.gain.exponentialRampToValueAtTime(.0001,t0+d);
      o.connect(g);g.connect(bus);o.start(t0);o.stop(t0+d+.05)});
    const len=Math.floor(ac.sampleRate*.06),buf=ac.createBuffer(1,len,ac.sampleRate),dt=buf.getChannelData(0);for(let i=0;i<len;i++)dt[i]=(Math.random()*2-1)*Math.exp(-i/(ac.sampleRate*.01));
    const s=ac.createBufferSource(),lp=ac.createBiquadFilter(),h=ac.createGain();s.buffer=buf;lp.type='lowpass';lp.frequency.value=900;h.gain.value=.03;s.connect(lp);lp.connect(h);h.connect(bus);s.start(t0)}

  function newBus(peak){const st={timers:[],nodes:[],bus:ac.createGain()};const t=ac.currentTime;st.bus.gain.setValueAtTime(0,t);st.bus.gain.linearRampToValueAtTime(peak,t+2.5);st.bus.connect(master);st.bus.connect(verbIn);return st}
  function startMusic(){const st=newBus(1),bus=st.bus;
    // Nhạc thiền thư thái, KHÔNG có tiếng chuông (chuông là lựa chọn riêng): nền pad ấm chuyển hợp âm rất chậm
    // (Rê maj7 → Si thứ 7 → Sol maj7 → La sus), giai điệu ngũ cung thưa, nốt mềm như đàn hạc, lọc thấp cho dịu tai.
    const pad=ac.createGain(),lp=ac.createBiquadFilter(),lfo=ac.createOscillator(),lfoG=ac.createGain();pad.gain.value=.045;lp.type='lowpass';lp.frequency.value=700;lp.Q.value=.3;
    lfo.frequency.value=.05;lfoG.gain.value=.015;lfo.connect(lfoG);lfoG.connect(pad.gain);pad.connect(lp);lp.connect(bus);lfo.start();st.nodes.push(lfo);
    const CH=[[73.42,146.83,220,277.18,369.99],[61.74,123.47,185,220,293.66],[49,98,146.83,246.94,293.66],[55,110,164.81,220,293.66]];
    const voices=CH[0].map((f,k)=>{const o=ac.createOscillator(),o2=ac.createOscillator(),g=ac.createGain();o.type=k<2?'sine':'triangle';o2.type='sine';o.frequency.value=f;o2.frequency.value=f*1.003;g.gain.value=[.9,.55,.32,.2,.14][k];o.connect(g);o2.connect(g);g.connect(pad);o.start();o2.start();st.nodes.push(o,o2);return [o,o2]});
    let ci=0;const chord=()=>{if(live!==st)return;ci=(ci+1)%CH.length;const t=ac.currentTime;voices.forEach(([o,o2],k)=>{const f=CH[ci][k];o.frequency.cancelScheduledValues(t);o2.frequency.cancelScheduledValues(t);o.frequency.setValueAtTime(o.frequency.value,t);o2.frequency.setValueAtTime(o2.frequency.value,t);o.frequency.linearRampToValueAtTime(f,t+4);o2.frequency.linearRampToValueAtTime(f*1.003,t+4)});st.timers.push(setTimeout(chord,16000))};
    st.timers.push(setTimeout(chord,16000));
    const harp=(f,t,g)=>{tone(bus,f,t,{attack:.03,decay:3.6,gain:g,type:'triangle'});tone(bus,f*2,t,{attack:.02,decay:1.6,gain:g*.25})};
    const scale=[293.66,329.63,369.99,440,493.88,587.33,659.25,739.99];let last=3;
    const step=()=>{if(live!==st)return;const t=ac.currentTime+.05;let i=Math.max(0,Math.min(scale.length-1,last+Math.round((Math.random()-.5)*3)));last=i;
      harp(scale[i],t,.03);if(Math.random()<.35)harp(scale[Math.max(0,i-2)],t+.7,.02);if(Math.random()<.2)harp(scale[Math.min(scale.length-1,i+1)],t+1.4,.018);
      st.timers.push(setTimeout(step,3000+Math.random()*3500))};
    st.timers.push(setTimeout(step,2000));return st}

  function startBell(){const st=newBus(1.05);const bases=[196,174.61,220];let n=0;
    const ring=()=>{if(live!==st)return;bowl(st.bus,ac.currentTime+.05,bases[n++%bases.length]);st.timers.push(setTimeout(ring,45000+Math.random()*45000))};
    st.timers.push(setTimeout(ring,400));return st}

  function stopLive(){if(!live)return;const st=live;live=null;st.timers.forEach(clearTimeout);
    if(ac){const t=ac.currentTime,g=st.bus.gain;g.cancelScheduledValues(t);g.setValueAtTime(g.value,t);g.linearRampToValueAtTime(0,t+.8)}
    setTimeout(()=>{st.nodes.forEach(o=>{try{o.stop();o.disconnect()}catch(e){}});try{st.bus.disconnect()}catch(e){}},2500)}

  function inForest(){const c=document.body.classList;return c.contains('immersive')&&!c.contains('yen-bay')&&!c.contains('room-open')&&!c.contains('orchid-open')&&!c.contains('kat-chant')&&!document.hidden}
  let liveMode=null,restT=0;
  function restLater(){clearTimeout(restT);restT=setTimeout(()=>{if(ac&&!liveMode&&ac.state==='running')ac.suspend().catch(()=>{})},3000)}// nghỉ hẳn khi im lặng, đỡ tốn pin
  function sync(){const want=inForest()&&mode!=='silent'?mode:null;if(want===liveMode&&(!want||live))return;
    stopLive();liveMode=null;if(!want){restLater();return}if(!unlock())return;
    if(window.LangYenAudio)window.LangYenAudio.claim('forest');// tắt mưa nhẹ / nhạc nhịp thở / YouTube của trang chủ nếu đang phát
    live=want==='music'?startMusic():startBell();liveMode=want}

  function setMode(m){if(!MODES[m])return;mode=m;try{localStorage.setItem(KEY,m)}catch(e){}paint();unlock();sync();
    const zh=document.getElementById('zenHint');if(zh)zh.textContent=MODES[m].icon+' Âm thanh Rừng Yên: '+MODES[m].label}

  // Trình duyệt điện thoại chỉ cho phát âm thanh sau một lần chạm: thử lại ở mỗi lần chạm nếu đang chờ phát.
  document.addEventListener('pointerdown',()=>{if(mode!=='silent'&&inForest()&&(!ac||ac.state!=='running')){unlock();sync()}},true);
  window.addEventListener('anyen-3d-enter',()=>{if(mode!=='silent')unlock();sync()});
  window.addEventListener('anyen-3d-exit',()=>{openMenu(false);sync()});
  new MutationObserver(()=>{if(!inForest())openMenu(false);sync()}).observe(document.body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('visibilitychange',()=>{if(ac){if(document.hidden)ac.suspend().catch(()=>{});else if(liveMode)ac.resume().catch(()=>{})}sync()});
  window.addEventListener('pagehide',()=>{stopLive();liveMode=null});
  window.anyenForestSound={get mode(){return mode},get playing(){return liveMode},get state(){return ac?ac.state:'none'},set:setMode};
  paint();
})();
