// LÀNG YÊN · không gian bên trong các nhà (nạp lười). Tách tự động từ js/world3d.js bằng tools/split_lazy.py; chạy bằng eval bên trong initialize3D.
  // ---- Phiên chung trong nhà (dùng chung cho các nhà). space-chat.js xin chỗ khi vào nhà: được chỗ là vào kênh chung của nhà (tối đa 6 người);
  // trong giờ phiên Healer (hoặc buổi hẹn Tư Gia / Đảo Yên: S.home, Chủ nhà là người dẫn) người đã khớp lịch vào kênh riêng (S.session, S.healer: mình dẫn). Ngoài kênh: trải nghiệm riêng như cũ.
  function roomShare(venue,o){o=o||{};const offs=[],on=(n,f)=>{window.addEventListener(n,f);offs.push(()=>window.removeEventListener(n,f))};
    const S={joined:false,session:false,healer:false,therapist:null,me:null,list:[],names:{},n:0};
    on('anyen-space-result',e=>{const d=e.detail||{};if(d.id!==venue)return;const was=S.session;S.joined=!!d.ok;S.home=!!(d.ok&&d.home);S.session=!!(d.ok&&(d.session||d.home));S.therapist=S.session?d.therapist||d.host||null:null;S.healer=!!(S.session&&S.therapist&&S.therapist===d.me);/* buổi hẹn Tư Gia / Đảo Yên: Chủ nhà là người dẫn */if(d.me)S.me=d.me;if(!d.ok){S.list=[];S.n=0}if(o.change)o.change(S,was)});
    on('anyen-space-people',e=>{const d=e.detail||{};if(d.id!==venue)return;const grew=(d.n||0)>S.n;S.joined=true;S.n=d.n||0;if(d.me)S.me=d.me;S.list=Array.isArray(d.list)?d.list.slice(0,8):[];S.names={};for(const p of S.list)S.names[p.id]=p.name||'Một người bạn';if(o.people)o.people(S,grew)});
    on('anyen-space-room',e=>{const m=e.detail||{};if(!S.joined||!m.from||m.from===S.me||typeof m.k!=='string')return;if(o.msg)o.msg(m,S.names[m.from]||'Một người bạn',S)});
    S.send=p=>!!(S.joined&&window.anyenSpaceChat&&window.anyenSpaceChat.send(p));
    S.meta=p=>{if(window.anyenSpaceChat&&window.anyenSpaceChat.meta)window.anyenSpaceChat.meta(p)};
    S.say=t=>!!(window.anyenSpaceChat&&window.anyenSpaceChat.say&&window.anyenSpaceChat.say(t));
    S.healerName=()=>S.names[S.therapist]||(S.home?'Chủ nhà':'Healer');S.lead=()=>S.healer;
    S.off=()=>{for(const f of offs)f()};
    setTimeout(()=>window.dispatchEvent(new CustomEvent('anyen-space-ask')),0);/* đã ở sẵn trong kênh (vào lại cùng nhà): xin phát lại kết quả và danh sách người */
    return S}
  // ---- Người cùng phòng: seats = [{x,z,a,y,ax,az}] (giống goSeat). Mỗi người một chỗ (presence c), ai giữ trước được chỗ; người khác hiện thành nhân vật
  // ngồi (đúng màu áo, kiểu áo, có tên); mình là nhân vật đi lại sẵn có. opt.auto: trong phiên vào là tự tới ngồi chỗ trống (opt.healerSeat dành cho người dẫn).
  // opt.walkers: thấy cả người đang đứng, đi lại (gửi {k:'pos',x,z,a} khi mình di chuyển, tối đa 5 lần/giây; người mới vào thì gửi lại một lần).
  function roomSeats(st,sh,seats,opt){opt=opt||{};const figs=new Map(),pos={};let mine=-1,auto=false,O={},sentAt=0,sent=null;
    const tagOf=name=>{const cv=document.createElement('canvas');cv.width=256;cv.height=56;const c=cv.getContext('2d');c.font='600 26px system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';const w=Math.min(250,c.measureText(name).width+28);c.fillStyle='rgba(20,16,12,.6)';c.beginPath();if(c.roundRect)c.roundRect(128-w/2,6,w,44,22);else c.rect(128-w/2,6,w,44);c.fill();c.fillStyle='#f4e2b9';c.fillText(name,128,29,236);
      const tx=new THREE.CanvasTexture(cv);tx.colorSpace=THREE.SRGBColorSpace;const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tx,transparent:true,depthTest:false}));sp.scale.set(1.1,.24,1);return sp};
    function fig(p,sitting){const g=new THREE.Group(),torso=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.8,4,8),mat('#687b48'));g.add(torso);const head=new THREE.Mesh(new THREE.SphereGeometry(.25,12,10),mat('#e7c9a8'));g.add(head);
      const parts=outfitParts(g,torso);torso.scale.set(1,sitting?.6:1,1);torso.position.y=sitting?.42:1.05;head.position.y=sitting?1.06:1.85;dressAvatar(parts,torso,p.col||'#687b48',p.sty||'linen',sitting);
      const tag=tagOf(String(p.name||'Một người bạn'));tag.position.y=sitting?1.8:2.6;g.add(tag);g.scale.setScalar(.8);st.sc.add(g);return {g,key:(p.name||'')+'|'+(p.col||'')+'|'+(p.sty||'')+'|'+(sitting?1:0)}}
    const reserved=k=>sh.session&&opt.healerSeat!=null&&k===opt.healerSeat;
    function occ(){const o={};if(!sh.joined)return o;const L=sh.list.slice().sort((a,b)=>(a.t||0)-(b.t||0)||String(a.id).localeCompare(String(b.id)));
      for(const p of L){const k=p.c;if(!Number.isInteger(k)||k<0||k>=seats.length||o[k])continue;if(reserved(k)&&p.id!==sh.therapist)continue;o[k]=p}return o}
    const free=o=>{for(let k=0;k<seats.length;k++)if(!o[k]&&!(reserved(k)&&!sh.healer))return k;return null};
    function sit(k){const W=st.walk;if(!W||!W.goSeat||!seats[k])return;W.goSeat(Object.assign({},seats[k]))}
    function place(p,sitting){const key=(p.name||'')+'|'+(p.col||'')+'|'+(p.sty||'')+'|'+(sitting?1:0);let f=figs.get(p.id);if(f&&f.key!==key){st.sc.remove(f.g);f=null}if(!f){f=fig(p,sitting);figs.set(p.id,f);f.fresh=true}return f}
    function refresh(){const o=occ(),keep=new Set();O=o;
      for(const [k,p] of Object.entries(o)){if(p.id===sh.me)continue;keep.add(p.id);const f=place(p,true),s=seats[k];f.walk=false;f.g.position.set(s.x,s.y||0,s.z);f.g.rotation.y=s.a}
      if(opt.walkers&&sh.joined)for(const p of sh.list){if(p.id===sh.me||keep.has(p.id)||!pos[p.id])continue;keep.add(p.id);const f=place(p,false),q=pos[p.id];f.walk=true;if(f.fresh){f.g.position.set(q.x,0,q.z);f.g.rotation.y=q.a}}
      for(const [id,f] of figs){f.fresh=false;if(!keep.has(id)){st.sc.remove(f.g);figs.delete(id)}}
      for(const id of Object.keys(pos))if(!sh.list.some(p=>p.id===id))delete pos[id];
      if(mine>=0&&o[mine]&&o[mine].id!==sh.me){const k=free(o);if(k!=null){sit(k);if(opt.hint)opt.hint('Chỗ đó '+(o[mine].name||'một người bạn')+' đã ngồi trước · bạn sang chỗ bên cạnh')}}/* hai người cùng chọn một chỗ: người vào sau sang chỗ trống */
      if(opt.auto&&sh.session&&!auto&&sh.list.length&&st.walk){auto=true;if(mine<0){const k=sh.healer&&opt.healerSeat!=null?opt.healerSeat:free(o);if(k!=null)sit(k)}}
      if(opt.change)opt.change(o)}
    function sendPos(force){const W=st.walk;if(!opt.walkers||!sh.joined||!W||W.sit)return;const now=performance.now(),p={x:+W.x.toFixed(2),z:+W.z.toFixed(2),a:+W.a.toFixed(2)};
      if(!force&&(now-sentAt<200||(sent&&Math.abs(sent.x-p.x)<.04&&Math.abs(sent.z-p.z)<.04&&Math.abs(sent.a-p.a)<.15)))return;sentAt=now;sent=p;sh.send(Object.assign({k:'pos'},p))}
    st.tick.push(()=>{const W=st.walk;let k=-1;if(W&&W.sit&&W.seat)k=seats.findIndex(s=>Math.abs(s.x-W.seat.x)<.01&&Math.abs(s.z-W.seat.z)<.01);if(k!==mine){mine=k;sh.meta({c:k>=0?k:-1});if(k<0)sendPos(true);refresh()}
      sendPos(false);for(const [id,f] of figs){if(!f.walk||!pos[id])continue;const q=pos[id],g=f.g,dx=q.x-g.position.x,dz=q.z-g.position.z,d=Math.hypot(dx,dz);if(d>3){g.position.set(q.x,0,q.z)}else if(d>.005){const s=Math.min(1,.12+d*.08);g.position.x+=dx*s;g.position.z+=dz*s}let da=q.a-g.rotation.y;da=Math.atan2(Math.sin(da),Math.cos(da));g.rotation.y+=da*.2}});
    sh.meta({col:/^#[0-9a-f]{6}$/i.test(myColor||'')?myColor:'#687b48',sty:myStyle});
    return {refresh,occ:()=>O,mine:()=>mine,seatOf:id=>{for(const [k,p] of Object.entries(O))if(p.id===id)return +k;return id===sh.me?mine:-1},
      onMsg(m){if(m.k!=='pos'||!opt.walkers)return false;const x=+m.x,z=+m.z,a=+m.a;if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>20||Math.abs(z)>20)return true;const had=!!pos[m.from];pos[m.from]={x,z,a:Number.isFinite(a)?a:0};if(!had||!figs.has(m.from))refresh();return true},
      onPeople(grew){if(grew){sent=null;sendPos(true)}refresh()},
      tap(k){const p=O[k];if(p&&p.id!==sh.me){if(opt.hint)opt.hint('Chỗ này đã có '+(p.name||'một người bạn')+' ngồi · chạm một chỗ còn trống');return false}
        if(reserved(k)&&!sh.healer){if(opt.hint)opt.hint(opt.healerNote||'Chỗ này dành cho Healer dẫn phiên');return false}sit(k);return true},
      free:()=>free(O),reset(){auto=false},dispose(){for(const f of figs.values())st.sc.remove(f.g);figs.clear()}}}
  function roomChuongGio(st){rmHint('Chạm vào chuông xoay, chiêng hay chuông gió để nghe · Kéo để nhìn quanh');
    const bowlM=new THREE.MeshStandardMaterial({color:'#b88d45',metalness:.6,roughness:.35});rAdd(st,new THREE.Mesh(new THREE.BoxGeometry(2.4,.32,1),mat('#4e3a2a')),0,.16,0);
    const bowls=[];[[-.8,.26,196],[0,.32,147],[.8,.22,262]].forEach(([x,r,f],k)=>{const b=rAdd(st,new THREE.Mesh(new THREE.LatheGeometry([[0,0],[r*.6,.02],[r,.14],[r*1.05,.2]].map(([a,c])=>new THREE.Vector2(a,c)),24),bowlM),x,.33,0);bowls.push([b,f]);
      const cushion=rAdd(st,new THREE.Mesh(new THREE.CylinderGeometry(r*.9,r,.05,16),mat('#7a2f2f')),x,.33,0);rTap(st,b,()=>act(['bowl1','bowl0','bowl2'][k]));st.tick.push(()=>{const u=(performance.now()-(b.userData.ring||0))/1000;b.scale.setScalar(u<1.2?1+Math.sin(u*40)*.012*(1.2-u):1)})});
    const frame=new THREE.Group();frame.position.set(-2.4,0,-1.8);st.sc.add(frame);for(const x of [-.7,.7]){const p=new THREE.Mesh(new THREE.BoxGeometry(.1,2.2,.1),mat('#4e3a2a'));p.position.set(x,1.1,0);frame.add(p)}const tb=new THREE.Mesh(new THREE.BoxGeometry(1.6,.12,.12),mat('#4e3a2a'));tb.position.y=2.2;frame.add(tb);
    const gong=new THREE.Mesh(new THREE.CylinderGeometry(.55,.55,.05,32),new THREE.MeshStandardMaterial({color:'#a8823e',metalness:.65,roughness:.3}));gong.rotation.x=Math.PI/2;gong.position.y=1.35;frame.add(gong);const boss=new THREE.Mesh(new THREE.SphereGeometry(.12,12,8),bowlM);boss.position.set(0,1.35,.04);boss.scale.z=.5;frame.add(boss);
    rTap(st,frame,()=>act('gong'));st.tick.push(()=>{const u=(performance.now()-(gong.userData.ring||0))/1000;frame.rotation.z=u<2?Math.sin(u*9)*.015*(2-u):0});
    const metal=new THREE.MeshStandardMaterial({color:'#d2c49a',metalness:.6,roughness:.3}),chimes=[];
    for(const [x,z] of [[-1.6,1.2],[1.6,1.2],[2.4,-1.4]]){const g=new THREE.Group();g.position.set(x,2.9,z);st.sc.add(g);const top=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.05,12),mat('#6b4a32'));g.add(top);for(let k=0;k<6;k++){const a=k*1.047,len=.5+k*.12,t=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,len,8),metal);t.position.set(Math.cos(a)*.14,-.1-len/2,Math.sin(a)*.14);g.add(t)}chimes.push(g);const i=chimes.length-1;rTap(st,g,()=>act('chime'+i))}
    st.tick.push(t=>{for(const [i,g] of chimes.entries()){const u=(performance.now()-(g.userData.ring||0))/1000,k=u<3?(3-u)*.08:0;g.rotation.z=Math.sin(t*1.3+i)*(.04+k);g.rotation.x=Math.sin(t*.9+i*2)*(.03+k*.6)}});
    /* 27/11: Nhà Thanh không ngồi nên bỏ hàng bồ đoàn */
    /* 27/11: bàn chuông và giá chiêng chặn lối, người đi vòng chứ không xuyên qua */st.blocks=[[-1.2,-.5,1.2,.5],[-3.15,-1.9,-1.65,-1.7]];
    // 27/11: mỗi người tự chạm chuông; ai cùng ở kênh chung của nhà (tối đa 6 người) cũng nghe tiếng chuông đó, nhiều người chạm cùng lúc thì nhiều tiếng ngân chồng lên nhau.
    // Buổi thiền âm thanh 3 phút vẫn là của riêng mỗi người (chuông tự gõ trong buổi đó không gửi đi).
    const NAMES={bowl0:'chuông trầm',bowl1:'chuông vừa',bowl2:'chuông thanh',gong:'chiêng',wind:'chuông gió',chime0:'chuông gió',chime1:'chuông gió',chime2:'chuông gió'},sentT={};let heardT=0;
    function act(a,from){if(!NAMES[a])return;const now=performance.now();
      if(a.startsWith('bowl')){const [b,f]=bowls[{bowl1:0,bowl0:1,bowl2:2}[a]];strike(f,7,.14);b.userData.ring=now}
      else if(a==='gong'){strike(98,9,.18,[[1,1],[1.48,.5],[2.3,.3],[3.9,.12]]);gong.userData.ring=now}
      else if(a==='wind'){for(const g of chimes)g.userData.ring=now;playChime();setTimeout(()=>{if(st.run)playChime()},900)}
      else{const g=chimes[+a.slice(5)];if(g)g.userData.ring=now;playChime()}
      if(from){if(now-heardT>2500){heardT=now;rmHint('🔔 '+from+' vừa thỉnh '+NAMES[a])}return}
      if(now-(sentT[a]||0)>150){sentT[a]=now;sh.send({k:'cg',a})}}
    const sh=roomShare('chuong_gio',{msg:(m,name)=>{if(m.k==='cg')act(String(m.a),name)},people:(S,grew)=>{render()}});
    let sess=null;
    function render(){const n=sh.joined?sh.n:0;rmPanel.innerHTML='<p>Âm thanh là một cửa vào tĩnh lặng. Lắng nghe một tiếng chuông từ lúc ngân đến khi tắt hẳn.'+(n>=2?' · 🔔 '+n+' người cùng nghe chuông trong nhà':'')+'</p><div class="rm-row"><button data-cg="bowl0">🥣 Chuông trầm</button><button data-cg="bowl1">🥣 Chuông vừa</button><button data-cg="bowl2">🥣 Chuông thanh</button><button data-cg="gong">🔔 Chiêng</button><button data-cg="wind">🎐 Gió thổi</button></div><div class="rm-row"><button class="rm-gold" data-cg="sess">'+(sess?'⏹ Dừng thiền âm thanh · '+sess.left+'s':'🧘 Thiền âm thanh 3 phút')+'</button></div>'}
    render();rmPanel.onclick=e=>{const a=e.target.closest('[data-cg]')?.dataset.cg;if(!a)return;
      if(a!=='sess'){act(a);return}
      if(sess){clearInterval(sess.id);sess=null;rmHint('Đã dừng buổi thiền âm thanh');render();return}sess={left:180,id:0};strike(98,9,.18,[[1,1],[1.48,.5],[2.3,.3]]);rmHint('Ngồi thẳng, thả lỏng vai · Mỗi tiếng chuông là một lần trở về hơi thở');
        sess.id=setInterval(()=>{if(!roomOpen){clearInterval(sess.id);sess=null;return}sess.left--;if(sess.left%20===0&&sess.left>0)strike([147,196,262][(sess.left/20)%3],7,.12);if(sess.left%45===0)playChime();if(sess.left<=0){clearInterval(sess.id);sess=null;strike(98,10,.18,[[1,1],[1.48,.5]]);setTimeout(()=>strike(98,10,.16,[[1,1],[1.48,.5]]),3500);rmHint('🙏 Buổi thiền âm thanh đã xong · Mang sự tĩnh lặng này theo bạn')}render()},1000)};
    st.cleanup=()=>{if(sess)clearInterval(sess.id);sh.off()}}
  function roomXongHuong(st){
    const W=st.sc,amb=new THREE.PointLight('#ffcf8a',4,7,1.6);amb.position.set(0,2.2,-1.4);W.add(amb);
    // window onto Hồ Hương: a painted view of the pond and pines, with open shutters
    {const cv=document.createElement('canvas');cv.width=512;cv.height=384;const c=cv.getContext('2d');let gr=c.createLinearGradient(0,0,0,384);gr.addColorStop(0,'#cfe6dc');gr.addColorStop(.55,'#9cc6b4');gr.addColorStop(1,'#5f8f7c');c.fillStyle=gr;c.fillRect(0,0,512,384);
      for(let k=0;k<26;k++){const x=k*21+(k%3)*5,h=120+((k*53)%70);c.fillStyle=k%2?'#2f5a46':'#3e6e52';c.beginPath();c.moveTo(x,250);c.lineTo(x+14,250-h);c.lineTo(x+28,250);c.fill()}
      gr=c.createLinearGradient(0,250,0,384);gr.addColorStop(0,'#8fc0c0');gr.addColorStop(1,'#4f8a8a');c.fillStyle=gr;c.fillRect(0,250,512,134);c.fillStyle='rgba(255,250,220,.35)';for(let k=0;k<6;k++){c.beginPath();c.moveTo(220+k*12,0);c.lineTo(160+k*40,384);c.lineTo(175+k*40,384);c.lineTo(232+k*12,0);c.fill()}
      const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;const view=new THREE.Mesh(new THREE.PlaneGeometry(2.2,1.65),new THREE.MeshBasicMaterial({map:tex}));view.position.set(0,2.05,-3.43);W.add(view);
      const fr=mat('#5b3d2a');for(const [x,y,w,h] of [[0,2.92,2.4,.12],[0,1.18,2.4,.12],[-1.16,2.05,.12,1.86],[1.16,2.05,.12,1.86],[0,2.05,.05,1.65]]){const b=new THREE.Mesh(new THREE.BoxGeometry(w,h,.1),fr);b.position.set(x,y,-3.4);W.add(b)}
      for(const sx of [-1,1]){const sh=new THREE.Group();sh.position.set(sx*1.2,2.05,-3.38);sh.rotation.y=-sx*1.0;W.add(sh);const p=new THREE.Mesh(new THREE.BoxGeometry(.62,1.6,.04),mat('#7a5438'));p.position.x=sx*.31;sh.add(p);for(let k=0;k<9;k++){const sl=new THREE.Mesh(new THREE.BoxGeometry(.54,.03,.05),mat('#6a4630'));sl.position.set(sx*.31,-.68+k*.17,.02);sh.add(sl)}}}
    // tatami floor in front of the table
    {const t=new THREE.Mesh(new THREE.BoxGeometry(3.6,.02,2.6),mat('#b9a77a'));t.position.set(0,.01,-.9);W.add(t)}
    // cabinets: herbs on the left wall, amber bottles on the right wall; row 0 = hương đầu (top) … row 2 = hương nền (bottom)
    const slotPos=(side,a)=>{const col=a.i%6,row=a.tier,y=[2.55,1.8,1.05][row],z=-2.75+col*.52;return [side*3.62,y,z]};
    const herbMeshes={},bottleMeshes={},rings={};
    for(const side of [-1,1]){const cab=new THREE.Group();W.add(cab);const wood=mat('#6b4a32'),dark=mat('#4e3a2a');
      const back=new THREE.Mesh(new THREE.BoxGeometry(.06,2.75,3.3),dark);back.position.set(side*3.93,1.65,-1.45);cab.add(back);
      for(const y of [.62,1.38,2.13,2.95]){const sh=new THREE.Mesh(new THREE.BoxGeometry(.5,.05,3.3),wood);sh.position.set(side*3.7,y,-1.45);cab.add(sh)}
      for(const z of [-3.1,.2]){const p=new THREE.Mesh(new THREE.BoxGeometry(.5,2.75,.06),wood);p.position.set(side*3.7,1.65,z);cab.add(p)}
      const strip=new THREE.Mesh(new THREE.BoxGeometry(.04,.02,3.2),new THREE.MeshBasicMaterial({color:'#ffd690'}));strip.position.set(side*3.47,2.93,-1.45);cab.add(strip)}
    for(const a of AROMAS){
      // left: hanging bunch (top row) or a rattan basket of dried herbs (rows below)
      const [hx,hy,hz]=slotPos(-1,a),hm=new THREE.MeshStandardMaterial({color:new THREE.Color(a.c).lerp(new THREE.Color('#8a7a52'),.35),roughness:.95,emissive:'#000000'}),hg=new THREE.Group();hg.position.set(hx,hy,hz);W.add(hg);
      if(a.tier===0){const b=new THREE.Mesh(new THREE.ConeGeometry(.12,.42,7),hm);b.rotation.x=Math.PI;b.position.y=.12;hg.add(b);const tie=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.05,8),mat('#c8a96a'));tie.position.y=.34;hg.add(tie);const str=new THREE.Mesh(new THREE.CylinderGeometry(.004,.004,.24,3),mat('#c8a96a'));str.position.y=.48;hg.add(str)}
      else{const bk=new THREE.Mesh(new THREE.CylinderGeometry(.19,.15,.14,12,1,true),mat('#a8865a'));bk.position.y=-.36;hg.add(bk);const bot=new THREE.Mesh(new THREE.CircleGeometry(.15,12),mat('#8f6f48'));bot.rotation.x=-Math.PI/2;bot.position.y=-.43;hg.add(bot);
        for(let k=0;k<9;k++){const p=new THREE.Mesh(a.tier===2&&k%2?new THREE.BoxGeometry(.09,.025,.025):new THREE.SphereGeometry(.045,6,4),hm);p.position.set(Math.cos(k*2.4)*.09*(k%3?1:.3),-.31+(k%3)*.015,Math.sin(k*2.4)*.09*(k%3?1:.3));p.rotation.y=k;hg.add(p)}}
      herbMeshes[a.id]=hm;rTap(st,hg,()=>arTap(a.id));
      // right: amber dropper bottle with a label
      const [bx,by,bz]=slotPos(1,a),bg=new THREE.Group();bg.position.set(bx,by-.36,bz);W.add(bg);const bm=new THREE.MeshStandardMaterial({color:'#8a4a18',roughness:.25,metalness:.1,transparent:true,opacity:.92,emissive:'#000000'});
      const body=new THREE.Mesh(new THREE.LatheGeometry([[0,0],[.07,0],[.075,.02],[.075,.16],[.05,.2],[.025,.22],[.025,.25]].map(([x,y])=>new THREE.Vector2(x,y)),14),bm);bg.add(body);
      const cap=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.05,10),mat('#2b2420'));cap.position.y=.275;bg.add(cap);const bulb=new THREE.Mesh(new THREE.SphereGeometry(.028,8,6),mat('#1e1a18'));bulb.scale.y=1.4;bulb.position.y=.32;bg.add(bulb);
      const lc=document.createElement('canvas');lc.width=128;lc.height=96;const lx=lc.getContext('2d');lx.fillStyle='#f3ead2';lx.fillRect(0,0,128,96);lx.fillStyle=a.c;lx.beginPath();lx.arc(64,36,22,0,7);lx.fill();lx.fillStyle='#3a2b1f';lx.font='bold 17px sans-serif';lx.textAlign='center';lx.fillText(a.name,64,84,120);
      const lt=new THREE.CanvasTexture(lc);lt.colorSpace=THREE.SRGBColorSpace;const label=new THREE.Mesh(new THREE.PlaneGeometry(.12,.09),new THREE.MeshBasicMaterial({map:lt}));label.position.set(-.077,.09,0);label.rotation.y=-Math.PI/2;bg.add(label);
      bottleMeshes[a.id]=bm;rTap(st,bg,()=>arTap(a.id));
      for(const [side,x,y,z] of [[-1,hx,hy,hz],[1,bx,by,bz]]){const ring=new THREE.Mesh(new THREE.TorusGeometry(.19,.01,6,24),new THREE.MeshBasicMaterial({color:'#ffd27a',transparent:true,opacity:0}));ring.position.set(x+side*-.12,y-.15,z);ring.rotation.y=Math.PI/2;W.add(ring);(rings[a.id]=rings[a.id]||[]).push(ring)}}
    // low table, diffuser (left) and clay censer (right), four cushions
    const table=new THREE.Group();table.position.set(0,0,-1.6);W.add(table);{const top=new THREE.Mesh(new THREE.BoxGeometry(1.9,.08,.8),mat('#5a3d2a'));top.position.y=.42;table.add(top);for(const x of [-.85,.85])for(const z of [-.32,.32]){const l=new THREE.Mesh(new THREE.BoxGeometry(.07,.4,.07),mat('#4a3222'));l.position.set(x,.2,z);table.add(l)}}
    const diff=new THREE.Group();diff.position.set(-.5,.46,0);table.add(diff);diff.add(new THREE.Mesh(new THREE.CylinderGeometry(.13,.16,.2,18),mat('#e8e0d2')));diff.children[0].position.y=.1;
    const bowl=new THREE.Mesh(new THREE.SphereGeometry(.15,20,10,0,Math.PI*2,0,Math.PI/2),new THREE.MeshStandardMaterial({color:'#f4f1ea',transparent:true,opacity:.55,roughness:.3,side:THREE.DoubleSide}));bowl.rotation.x=Math.PI;bowl.position.y=.36;diff.add(bowl);
    const water=new THREE.Mesh(new THREE.CircleGeometry(.14,22),new THREE.MeshStandardMaterial({color:'#bfe0e0',roughness:.1,transparent:true,opacity:.85}));water.rotation.x=-Math.PI/2;water.position.y=.33;diff.add(water);
    const candle=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.04,10),new THREE.MeshBasicMaterial({color:'#ffcf6a'}));candle.position.y=.16;diff.add(candle);
    const pip=new THREE.Group();pip.position.set(-.1,.75,.0);diff.add(pip);{const tube=new THREE.Mesh(new THREE.CylinderGeometry(.008,.012,.16,8),new THREE.MeshStandardMaterial({color:'#f6f6f2',transparent:true,opacity:.6}));pip.add(tube);const bulbP=new THREE.Mesh(new THREE.SphereGeometry(.022,8,6),mat('#2b2420'));bulbP.scale.y=1.4;bulbP.position.y=.1;pip.add(bulbP)}pip.visible=false;
    const drop=new THREE.Mesh(new THREE.SphereGeometry(.014,8,6),new THREE.MeshStandardMaterial({color:'#f2c34a',emissive:'#a8781a',emissiveIntensity:.5}));drop.visible=false;diff.add(drop);
    const ripple=new THREE.Mesh(new THREE.RingGeometry(.02,.03,24),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:0,side:THREE.DoubleSide}));ripple.rotation.x=-Math.PI/2;ripple.position.y=.335;diff.add(ripple);
    const cen=new THREE.Group();cen.position.set(.5,.46,0);table.add(cen);cen.add(new THREE.Mesh(new THREE.LatheGeometry([[0,0],[.12,.01],[.17,.08],[.16,.16],[.18,.18]].map(([x,y])=>new THREE.Vector2(x,y)),18),mat('#9a5a38')));
    const rim=new THREE.Mesh(new THREE.TorusGeometry(.175,.012,6,24),new THREE.MeshStandardMaterial({color:'#c28a4a',metalness:.6,roughness:.35}));rim.rotation.x=Math.PI/2;rim.position.y=.18;cen.add(rim);
    const coals=new THREE.Mesh(new THREE.CircleGeometry(.15,18),new THREE.MeshBasicMaterial({color:'#7a2a12'}));coals.rotation.x=-Math.PI/2;coals.position.y=.165;cen.add(coals);
    const dish=new THREE.Mesh(new THREE.CylinderGeometry(.12,.1,.02,16),mat('#d8cba8'));dish.position.set(.35,.01,.12);cen.add(dish);const tongs=new THREE.Mesh(new THREE.BoxGeometry(.24,.01,.02),new THREE.MeshStandardMaterial({color:'#b07a3a',metalness:.6,roughness:.3}));tongs.position.set(.3,.02,-.12);tongs.rotation.y=.4;cen.add(tongs);
    const pinch=[];for(let k=0;k<3;k++){const p=new THREE.Group();p.visible=false;cen.add(p);pinch.push(p)}
    /* 27/11: 6 tọa cụ xếp quanh bàn (2 trước, 2 sau, 2 đầu bàn), chạm tọa cụ để ngồi quay vào bàn */
    const HSEATS=[];{const TZ=-1.6;for(const [x,z] of [[-.5,TZ+.85],[.5,TZ+.85],[-.5,TZ-.85],[.5,TZ-.85],[-1.4,TZ],[1.4,TZ]]){const cu=new THREE.Mesh(new THREE.CylinderGeometry(.28,.3,.12,16),mat('#6a7a5a'));cu.position.set(x,.06,z);W.add(cu);
      const end=Math.abs(z-TZ)<.3,face=end?(x>0?-Math.PI/2:Math.PI/2):z>TZ?Math.PI:0,ax=end?x+Math.sign(x)*.55:x,az=end?z:z+Math.sign(z-TZ)*.55;/* ngồi thẳng mặt vào bàn */const k=HSEATS.length;HSEATS.push({x,z,a:face,y:.1,ax,az});rTap(st,cu,()=>{st.camOv=false;if(seatsH.tap(k))rmHint('🧘 Ngồi trên tọa cụ bên bàn hương · bấm Đứng lên để rời chỗ')})}
      st.blocks=(st.blocks||[]).concat([[-1.0,TZ-.45,1.0,TZ+.45]])}
    // mist / smoke above the two stations
    const fogMat=()=>new THREE.MeshBasicMaterial({color:'#f2efe6',transparent:true,opacity:0,depthWrite:false});const mist=[],smoke=[];
    for(let k=0;k<12;k++){const m=new THREE.Mesh(new THREE.SphereGeometry(.06,8,6),fogMat());m.userData.k=k;diff.add(m);mist.push(m);const s=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),fogMat());s.userData.k=k;cen.add(s);smoke.push(s)}
    // Kệ Lưu Hương 3×3 at the corner of the window, with a candle and the An Yên journal below
    const shelf=new THREE.Group();shelf.position.set(2.35,0,-3.25);W.add(shelf);{const wd=mat('#5a3b24');for(const y of [.55,1.15,1.75,2.35]){const b=new THREE.Mesh(new THREE.BoxGeometry(1.2,.05,.4),wd);b.position.y=y;shelf.add(b)}for(const x of [-.6,-.2,.2,.6]){const p=new THREE.Mesh(new THREE.BoxGeometry(.04,1.85,.4),wd);p.position.set(x,1.45,0);shelf.add(p)}
      const lamp=new THREE.Mesh(new THREE.BoxGeometry(1.1,.015,.03),new THREE.MeshBasicMaterial({color:'#ffd690'}));lamp.position.set(0,2.33,.17);shelf.add(lamp);
      const plinth=new THREE.Mesh(new THREE.BoxGeometry(1.2,.3,.4),wd);plinth.position.y=.15;shelf.add(plinth);const book=new THREE.Mesh(new THREE.BoxGeometry(.3,.05,.22),mat('#7a3f2a'));book.position.set(-.25,.325,.02);shelf.add(book);const cd=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,.1,10),mat('#f2e6c8'));cd.position.set(.25,.35,.02);shelf.add(cd);const fl=new THREE.Mesh(new THREE.ConeGeometry(.012,.04,6),new THREE.MeshBasicMaterial({color:'#ffcf6a'}));fl.position.set(.25,.42,.02);shelf.add(fl)}
    const shelfItems=new THREE.Group();shelf.add(shelfItems);
    const drawShelf2=()=>{while(shelfItems.children.length)shelfItems.remove(shelfItems.children[0]);aromaRows.slice(0,9).forEach((r,i)=>{const m=makeAromaGift(r,.8);m.position.set(-.4+(i%3)*.4,[1.775,1.175,.575][Math.floor(i/3)],0);shelfItems.add(m)})};
    drawShelf2();st.onAromas=drawShelf2;rTap(st,shelf,()=>openArchive('aromas'));loadAromas();
    haromyDecor(st);
    // ---- camera views (own drag handling so a view can face any wall)
    const VIEWS={home:{t:[0,1.35,-1.2],yaw:0,pitch:.14,dist:4.4},left:{t:[-3.4,1.75,-1.45],yaw:Math.PI/2,pitch:.05,dist:2.6},right:{t:[3.4,1.75,-1.45],yaw:-Math.PI/2,pitch:.05,dist:2.6},
      drip:{t:[-.5,.85,-1.6],yaw:.15,pitch:.42,dist:1.35},burn:{t:[.5,.75,-1.6],yaw:-.15,pitch:.42,dist:1.35},seat:{t:[0,1.6,-3.2],yaw:0,pitch:-.08,dist:3.9},shelf:{t:[2.35,1.6,-3.2],yaw:-.25,pitch:.05,dist:2.4}};
    let view=VIEWS.home,base=view.yaw,tw=null;const goView=k=>{const v=VIEWS[k];tw={t0:performance.now(),from:{t:st.target.clone(),yaw:st.yaw,pitch:st.pitch,dist:st.dist},to:v};view=v;base=v.yaw};
    st.target.set(...VIEWS.home.t);st.yaw=0;st.pitch=VIEWS.home.pitch;st.dist=VIEWS.home.dist;
    let drag=null;rmCanvas.onpointerdown=e=>{drag={x:e.clientX,y:e.clientY,moved:false};rmCanvas.setPointerCapture(e.pointerId)};
    rmCanvas.onpointermove=e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>6)drag.moved=true;drag.x=e.clientX;drag.y=e.clientY;st.yaw=Math.max(base-.8,Math.min(base+.8,st.yaw-dx*.006));st.pitch=Math.max(-.2,Math.min(.7,st.pitch+dy*.004))};
    rmCanvas.onpointerup=e=>{const d=drag;drag=null;if(!d||d.moved)return;const rc=rmCanvas.getBoundingClientRect(),p=new THREE.Vector2((e.clientX-rc.left)/rc.width*2-1,-(e.clientY-rc.top)/rc.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(p,st.cam);
      const hit=ray.intersectObjects(st.picks.map(x=>x.obj),true)[0];if(!hit)return;let o=hit.object;while(o&&!st.picks.some(x=>x.obj===o))o=o.parent;const pk=st.picks.find(x=>x.obj===o);if(pk)pk.fn()};
    rmCanvas.onwheel=e=>{e.preventDefault();st.dist=Math.max(.9,Math.min(6,st.dist*Math.exp(e.deltaY*.001)))};
    // ---- state and flow
    let S={step:'mood',sel:[],mood:null,info:null,method:null,drops:[],done:0,form:'lo',title:'',wish:'',breath:[4,4,6]};const OWN=S;/* S: bài hương đang hiện (của mình, hoặc của người đang làm khi xem lượt của họ) */
    const tier=id=>AR(id).tier,ordered=()=>S.sel.slice().sort((a,b)=>tier(a)-tier(b));
    function arTap(id){if(turns.watching()){rmHint('👀 Đang xem '+turns.who(turns.turn())+' làm · chờ tới lượt mình nhé');return}if(S.step!=='pick'&&S.step!=='mood')return;if(S.step==='mood')S.step='pick';const i=S.sel.indexOf(id);if(i>=0)S.sel.splice(i,1);else{if(S.sel.length>=3){rmHint('Tối đa 3 mùi để bài hương thanh tao · bỏ bớt một mùi trước');S.info=id;render();return}S.sel.push(id)}S.mood=null;S.info=id;strike(660+AR(id).tier*-110,1.4,.03,[[1,1],[2,.25]]);render()}
    let glowT=0;st.tick.push(t=>{
      if(tw){const u=Math.min(1,(performance.now()-tw.t0)/900),q=u*u*(3-2*u);st.target.lerpVectors(tw.from.t,new THREE.Vector3(...tw.to.t),q);st.yaw=tw.from.yaw+(tw.to.yaw-tw.from.yaw)*q;st.pitch=tw.from.pitch+(tw.to.pitch-tw.from.pitch)*q;st.dist=tw.from.dist+(tw.to.dist-tw.from.dist)*q;if(u>=1)tw=null}
      const pulse=.55+Math.sin(t*3)*.25;for(const a of AROMAS){const on=S.sel.includes(a.id),inf=S.info===a.id;const e=on?pulse:inf?.25:0;herbMeshes[a.id].emissive.set(on||inf?'#c8962e':'#000000');herbMeshes[a.id].emissiveIntensity=e;bottleMeshes[a.id].emissive.set(on||inf?'#c8962e':'#000000');bottleMeshes[a.id].emissiveIntensity=e;for(const r of rings[a.id])r.material.opacity=on?.85:inf?.35:0}
      // mist above the diffuser and smoke over the censer, coloured by the recipe, breathing with the session
      const mixC=new THREE.Color('#f2efe6');if(S.drops.length){const c=new THREE.Color(0,0,0);for(const id of S.drops)c.add(new THREE.Color(AR(id).c));c.multiplyScalar(1/S.drops.length);mixC.lerp(c,.7)}
      const br=S.breathPhase||0,amp=S.method==='drip'?Math.min(1,S.done/3):0,amp2=S.method==='burn'?Math.min(1,S.done/2):0;
      for(const m of mist){const u=((t*.16+m.userData.k/12)%1);m.position.set(Math.sin(t*.6+m.userData.k)*.08*u,.4+u*.9*(1+br*.3),Math.cos(t*.5+m.userData.k)*.08*u);m.scale.setScalar(1+u*2.2);m.material.opacity=.16*amp*(1-u)*(1-u);m.material.color.lerp(mixC,.05)}
      for(const s of smoke){const u=((t*.2+s.userData.k/12)%1),w=Math.sin(t*1.3+u*6+s.userData.k);s.position.set(w*.05*u+u*.12,.22+u*1.2*(1+br*.3),Math.cos(t+s.userData.k)*.04*u);s.scale.set(.6+u*1.2,1.4+u*2,.6+u*1.2);s.material.opacity=.2*amp2*(1-u)*(1-u);s.material.color.lerp(mixC,.05)}
      coals.material.color.setHSL(.03,.85,(S.method==='burn'&&S.done?.42:.25)+Math.sin(t*2.5)*.04+br*.08);candle.material.color.setHSL(.11,1,.62+Math.sin(t*9)*.05+br*.1);
      if(drip){const u=(performance.now()-drip.t0)/700;if(u<1){drop.visible=true;drop.position.set(-.1,.67-u*.33,0)}else{drop.visible=false;const v=Math.min(1,(u-1)/1.2);ripple.material.opacity=.6*(1-v);ripple.scale.setScalar(1+v*5);if(v>=1)drip=null}}
    });
    let drip=null;
    const card=id=>{const a=AR(id);return '<div class="ar-card"><span class="ar-dot" style="background:'+a.c+'"></span><b>'+a.name+'</b> · '+AR_TIERS[a.tier]+'<br><i>'+a.feel+'</i><br>✦ '+a.mean+'<br>🌿 '+a.heal+'</div>'};
    const chips=ids=>ids.map(id=>'<span class="ar-chip" style="--c:'+AR(id).c+'">'+AR(id).name+'</span>').join(' ');
    function render(){if(turns.watching()){const ids=ordered();rmPanel.innerHTML=turns.bar()+'<p>👀 <b>'+esc(turns.who(turns.turn()))+'</b> đang pha hương · '+AR_SEE(S)+'</p>'+(ids.length?'<p>'+chips(ids)+'</p>':'')+(S.step==='pick'&&S.info&&AR(S.info)?card(S.info):'')+'<p class="rm-note">'+arTalk(S.step)+'</p>';return}
      let h='';const s=S.step;
      if(s==='mood'){h='<p><b>Hôm nay lòng và cơ thể bạn đang thế nào?</b></p><div class="rm-row">'+AR_MOODS.map(m=>'<button data-mood="'+m.id+'">'+m.label+'</button>').join('')+'</div><div class="rm-row"><button data-ar="self">🌿 Tự dạo hai tủ 18 mùi</button></div>'}
      else if(s==='pick'){const ids=ordered(),hint=arBalanceHint(ids);h='<p>'+(S.mood?'Gợi ý cho <b>'+AR_MOODS.find(m=>m.id===S.mood).label+'</b>: ':'Chọn 1–3 mùi (chạm trên hai tủ hoặc bên dưới): ')+(ids.length?chips(ids):'<i>chưa chọn</i>')+'</p>'
          +[0,1,2].map(ti=>'<div class="rm-row"><span class="rm-note" style="min-width:76px">'+AR_TIERS[ti]+'</span>'+AROMAS.filter(a=>a.tier===ti).map(a=>'<button data-sc="'+a.id+'"'+(S.sel.includes(a.id)?' class="sel"':'')+'><span class="rm-dot" style="background:'+a.c+'"></span>'+a.name+'</button>').join('')+'</div>').join('')
          +(S.info?card(S.info):'')+(hint?'<p class="rm-note">💡 '+hint+'</p>':'')
          +(ids.length?'<p class="rm-note">Tỷ lệ: '+arRatio(ids).map(([id,d])=>AR(id).name+' '+d+' giọt').join(' + ')+' (hoặc '+(ids.length===1?2:3)+' nhúm thảo mộc)</p><div class="rm-row"><button class="rm-gold" data-ar="drip">💧 Nhỏ tinh dầu vào đèn xông</button><button class="rm-gold" data-ar="burn">🔥 Đốt thảo mộc khô trên lư</button></div>':'')
          +'<div class="rm-row"><button data-ar="look-left">👈 Nhìn tủ thảo mộc</button><button data-ar="look-right">Nhìn tủ tinh dầu 👉</button><button data-ar="look-home">⌂ Toàn cảnh</button><button data-ar="back">↺ Chọn lại tâm trạng</button></div>'}
      else if(s==='drip'){const plan=S.plan,n=S.done;h='<p>💧 Nhỏ tinh dầu vào bát nước ấm · '+n+'/'+plan.length+' giọt</p><p class="rm-note">'+plan.map((id,i)=>'<span style="opacity:'+(i<n?1:.45)+'">'+AR(id).name+'</span>').join(' · ')+'</p><div class="rm-row">'+(n<plan.length?'<button class="rm-gold" data-ar="drop">💧 Nhỏ giọt</button>':'<button class="rm-gold" data-ar="sit">🧘 Ngồi thở cùng hương</button>')+'</div>'}
      else if(s==='burn'){const plan=S.plan,n=S.done;h='<p>🔥 Đặt thảo mộc khô lên than hồng · '+n+'/'+plan.length+' nhúm</p><p class="rm-note">'+plan.map((id,i)=>'<span style="opacity:'+(i<n?1:.45)+'">'+AR(id).name+'</span>').join(' · ')+'</p><div class="rm-row">'+(n<plan.length?'<button class="rm-gold" data-ar="pinch">🔥 Đặt thảo mộc lên than</button>':'<button class="rm-gold" data-ar="sit">🧘 Ngồi thở cùng hương</button>')+'</div>'}
      else if(s==='sit'){const b=S.breath;h='<p>🧘 Ngồi trên tọa cụ, nhìn ra Hồ Hương. Nhịp thở theo bài hương: hít '+b[0]+' · giữ '+b[1]+' · thở '+b[2]+'.</p><div class="rm-row">'+(S.br?'<button data-ar="stop">⏹ Dừng</button>':'<button class="rm-gold" data-ar="b6">🌬 6 nhịp (~'+Math.round(6*(b[0]+b[1]+b[2])/60*10)/10+' phút)</button><button data-ar="b3">🕯 3 phút tĩnh tâm</button><button data-ar="gift">Bỏ qua · làm quà mang về</button>')+'</div>'}
      else if(s==='gift'){h='<p>🎁 Quà mang về Túi An Yên</p><div class="rm-row"><button data-form="lo"'+(S.form==='lo'?' class="sel"':'')+'>🫙 Lọ Ước tinh dầu</button><button data-form="tui"'+(S.form==='tui'?' class="sel"':'')+'>👝 Túi thảo mộc khô</button></div>'
          +'<label class="kt-wish">Tên bài hương<input data-ti maxlength="40" value="'+escA(S.title)+'"></label><label class="kt-wish">Một dòng cảm nhận / điều ước (không bắt buộc)<input data-wi maxlength="80" value="'+escA(S.wish)+'" placeholder="Ví dụ: Nguyện đêm nay ngủ ngon"></label>'
          +'<div class="rm-row"><button class="rm-gold" data-ar="keep">🎒 Cất vào Túi An Yên</button></div>'}
      else if(s==='done'){const mix=S.mix;h='<p>🙏 <b>'+escA(S.title)+'</b> đã vào Túi An Yên, lên Kệ Lưu Hương và được ghi vào Nhật ký An Yên.</p>'
          +'<p class="rm-note">Dùng tại nhà: '+(S.form==='lo'?'máy khuếch tán 100 ml nước, nhỏ '+mix.map(([id,d])=>d+' giọt '+AR(id).name.toLowerCase()).join(' + ')+'; xông 20–30 phút rồi nghỉ.':'cho '+mix.map(([id])=>AR(id).name.toLowerCase()).join(', ')+' khô vào túi vải, bóp nhẹ cho dậy mùi; hoặc đun một nồi nước lá với các vị này, xông hơi 5–10 phút.')+' Tinh dầu dùng ngoài, không uống; phụ nữ mang thai, trẻ nhỏ, người có bệnh hô hấp nên hỏi ý kiến bác sĩ.</p>'
          +'<div class="rm-row"><button data-ar="again">🌿 Pha bài hương khác</button><button data-ar="shelf">🗄 Xem Kệ Lưu Hương</button><button data-ar="kho">📜 Kho Lọ Ước & Túi thơm</button></div>'}
      rmPanel.innerHTML=turns.bar()+h;turns.share(snapA())}
    const escA=t=>String(t||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const brEl=roomBox.querySelector('#roomBreath');
    function startBreath(cycles,totalSec){const b=S.breath,ph=[['Hít vào',b[0],1.35],['Giữ hơi',b[1],1.35],['Thở ra',b[2],.75]].filter(p=>p[1]>0);let n=0;const t0=performance.now();brEl.hidden=false;S.br={t:0};render();goView('seat');
      const step=i=>{if(!S.br||!roomOpen){brEl.hidden=true;S.breathPhase=0;return}if(i>=ph.length){n++;if((cycles&&n>=cycles)||(totalSec&&(performance.now()-t0)/1000>=totalSec)){S.br=null;brEl.hidden=true;S.breathPhase=0;strike(196,5,.08);rmHint('🙏 Phiên thở đã xong · Cảm nhận hơi thở nhẹ nhàng hơn');S.step='gift';render();return}i=0}
        const [lab,sec,sc]=ph[i];brEl.querySelector('span').textContent=lab+(cycles?' · '+(n+1)+'/'+cycles:'');const orb=brEl.querySelector('.rm-orb');orb.style.transition='transform '+sec+'s ease-in-out';orb.style.transform='scale('+sc+')';S.breathPhase=i===2?0:1;if(i===0)strike(523,3,.03);S.br.t=setTimeout(()=>step(i+1),sec*1000)};step(0)}
    function defaultTitle(){const m=S.mood&&AR_MOODS.find(x=>x.id===S.mood);if(m&&m.mix.every(([id])=>S.sel.includes(id))&&S.sel.length===m.mix.length)return m.title;return 'Hương '+ordered().map(id=>AR(id).name).join(' · ')}
    async function keepGift(){S.title=String(S.title||defaultTitle()).trim().slice(0,40)||defaultTitle();S.wish=String(S.wish||'').trim().slice(0,80);const mix=S.method==='drip'?arRatio(ordered()):ordered().map(id=>[id,1]);S.mix=mix;
      const now=new Date(),row={id:'local-'+Date.now(),form:S.form,aromas:mix.map(x=>x[0]),drops:mix.map(x=>x[1]),title:S.title,wish:S.wish,name:guestName(),picks:0,created_at:now.toISOString()};
      aromaRows.unshift(row);aromaRows=aromaRows.slice(0,9);drawShelf2();goView('shelf');strike(784,3,.05,[[1,1],[2,.3]]);
      window.__bagTake&&window.__bagTake('aromas',row,true);
      const moodL=S.mood?AR_MOODS.find(m=>m.id===S.mood).label:'Tự chọn';
      window.dispatchEvent(new CustomEvent('anyen-journal-add',{detail:{lake:'Hương · Haromy',quote:S.title+' — '+(S.form==='lo'?'Lọ Ước tinh dầu':'Túi thảo mộc khô')+' · Tâm trạng: '+moodL+' · Cách xông: '+(S.method==='drip'?'nhỏ tinh dầu':'đốt thảo mộc')+' · '+mix.map(([id,d])=>AR(id).name+(S.method==='drip'?' '+d+' giọt':'')).join(' + ')+(S.wish?' · “'+S.wish+'”':''),at:Date.now()}}));
      S.step='done';render();
      if(typeof flowerDb!=='undefined'&&flowerDb){try{const {error}=await flowerDb.from('anyen_aroma_gifts').insert({form:row.form,aromas:row.aromas,drops:row.drops,title:row.title,wish:row.wish,name:row.name,method:S.method});if(!error)loadAromas()}catch(e){}}}
    rmPanel.oninput=e=>{if(e.target.matches('[data-ti]'))S.title=e.target.value;if(e.target.matches('[data-wi]'))S.wish=e.target.value};
    rmPanel.onclick=e=>{if(turns.click(e)||turns.watching())return;const md=e.target.closest('[data-mood]');if(md){const m=AR_MOODS.find(x=>x.id===md.dataset.mood);S.mood=m.id;S.sel=m.mix.map(x=>x[0]);S.breath=m.breath;S.info=S.sel[0];S.step='pick';goView('home');strike(523,2,.04);render();return}
      const sc=e.target.closest('[data-sc]');if(sc){arTap(sc.dataset.sc);return}
      const fm=e.target.closest('[data-form]');if(fm){S.form=fm.dataset.form;render();return}
      const a=e.target.closest('[data-ar]')?.dataset.ar;if(!a)return;
      if(a==='self'){S.step='pick';S.mood=null;S.sel=[];S.breath=[4,4,6];goView('left');render()}
      else if(a==='look-left')goView('left');else if(a==='look-right')goView('right');else if(a==='look-home')goView('home');
      else if(a==='back'){S.step='mood';S.sel=[];S.mood=null;S.info=null;goView('home');render()}
      else if(a==='drip'||a==='burn'){S.method=a;S.done=0;S.drops=[];S.form=a==='drip'?'lo':'tui';S.title=defaultTitle();const r=arRatio(ordered());S.plan=a==='drip'?r.flatMap(([id,d])=>Array(d).fill(id)):ordered().slice(0,3).concat(ordered().length===1?[ordered()[0]]:[]);S.step=a;goView(a);if(a==='drip')pip.visible=true;render()}
      else if(a==='drop'){if(drip)return;const id=S.plan[S.done++];S.drops.push(id);drip={t0:performance.now()};drop.material.color.set(AR(id).c);setTimeout(()=>{strike(1568,.35,.05,[[1,1],[2.4,.4]]);strike(1046,.6,.025)},700);rmHint('💧 '+AR(id).name+' · giọt '+S.done+'/'+S.plan.length);render()}
      else if(a==='pinch'){const id=S.plan[S.done],p=pinch[S.done];S.done++;S.drops.push(id);p.clear();for(let k=0;k<6;k++){const l=new THREE.Mesh(new THREE.SphereGeometry(.02,5,3),mat(new THREE.Color(AR(id).c).lerp(new THREE.Color('#6a5a3a'),.4)));l.scale.set(1.6,.4,1);l.position.set(Math.cos(k)*.04+(S.done-2)*.05,.175,Math.sin(k)*.04);p.add(l)}p.visible=true;if(typeof katSwish==='function')katSwish();setTimeout(()=>strike(1318,3,.04,[[1,1],[2.76,.3]]),300);rmHint('🔥 '+AR(id).name+' trên than hồng');render()}
      else if(a==='sit'){pip.visible=false;S.step='sit';goView('seat');render()}
      else if(a==='b6')startBreath(6,0);else if(a==='b3')startBreath(0,180);
      else if(a==='stop'){if(S.br)clearTimeout(S.br.t);S.br=null;brEl.hidden=true;S.breathPhase=0;S.step='gift';render()}
      else if(a==='gift'){S.step='gift';render()}
      else if(a==='keep')keepGift();
      else if(a==='again'){S.step='mood';S.sel=[];S.mood=null;S.info=null;S.method=null;S.done=0;S.drops=[];for(const p of pinch)p.visible=false;goView('home');render()}
      else if(a==='shelf')goView('shelf');else if(a==='kho')openArchive('aromas')};
    st.cleanup=()=>{if(OWN.br)clearTimeout(OWN.br.t);brEl.hidden=true;st.onAromas=null;share.off();seatsH.dispose()};
    // 27/11: phiên Healer ở Nhà Hương: Healer pha mẫu trước, rồi mời lần lượt từng người (roomTurns); cả phòng thấy mùi đang chọn sáng trên hai tủ, giọt tinh dầu,
    // thảo mộc trên than, sương khói đổi màu theo bài hương của người đang làm. Lời dẫn từng bước Healer gửi vào khung chat bằng một chạm.
    const AR_TALKS={mood:'Hít một hơi thật chậm và hỏi lòng mình: hôm nay mình đang cần điều gì?',pick:'Mỗi mùi có một tầng: hương đầu nhẹ bay, hương giữa là trái tim, hương nền giữ lâu. Chọn ít thôi để bài hương thanh tao.',drip:'Nhỏ từng giọt thật chậm, nghe mùi lan ra trong hơi ấm.',burn:'Đặt từng nhúm thảo mộc lên than hồng, nhìn khói lên rồi tan.',sit:'Ngồi thẳng, thả lỏng vai, thở theo nhịp của bài hương.',gift:'Đặt cho bài hương một cái tên, gửi vào đó một điều ước nhỏ.',done:'Mang một chút hương này về nhà, để nhớ cảm giác bình yên hôm nay.'};
    const arTalk=step=>AR_TALKS[step]||'';
    function AR_SEE(v){return v.step==='mood'?'đang lắng nghe lòng mình':v.step==='pick'?'đang chọn mùi trên hai tủ':v.step==='drip'?'nhỏ tinh dầu · '+v.done+'/'+(v.plan||[]).length+' giọt':v.step==='burn'?'đặt thảo mộc lên than · '+v.done+'/'+(v.plan||[]).length+' nhúm':v.step==='sit'?'đang ngồi thở cùng hương · bạn thở theo nhé':'đang làm quà mang về'}
    const snapA=()=>({step:S.step,sel:S.sel.slice(),mood:S.mood,info:S.info,method:S.method,done:S.done,drops:S.drops.slice(),plan:(S.plan||[]).slice(),breath:S.breath,form:S.form});
    function drawPinch(drops){pinch.forEach((p,i)=>{p.clear();const id=drops[i];if(!id||!AR(id)){p.visible=false;return}for(let k=0;k<6;k++){const l=new THREE.Mesh(new THREE.SphereGeometry(.02,5,3),mat(new THREE.Color(AR(id).c).lerp(new THREE.Color('#6a5a3a'),.4)));l.scale.set(1.6,.4,1);l.position.set(Math.cos(k)*.04+(i-1)*.05,.175,Math.sin(k)*.04);p.add(l)}p.visible=true})}
    function watchView(v){const prev=S;const ok=id=>typeof id==='string'&&!!AR(id),arr=a=>Array.isArray(a)?a.filter(ok).slice(0,12):[];
      const n=v&&typeof v.step==='string'&&AR_TALKS[v.step]?{step:v.step,sel:arr(v.sel).slice(0,3),mood:typeof v.mood==='string'?v.mood:null,info:ok(v.info)?v.info:null,method:v.method==='drip'||v.method==='burn'?v.method:null,done:Math.max(0,Math.min(12,+v.done||0)),drops:arr(v.drops),plan:arr(v.plan),breath:Array.isArray(v.breath)?v.breath.slice(0,3).map(x=>Math.max(0,Math.min(10,+x||0))):[4,4,6],form:v.form==='tui'?'tui':'lo',title:'',wish:''}:{step:'mood',sel:[],mood:null,info:null,method:null,drops:[],done:0,plan:[],breath:[4,4,6],form:'lo',title:'',wish:''};
      if(n.mood&&!AR_MOODS.some(m=>m.id===n.mood))n.mood=null;S=n;pip.visible=n.step==='drip';drawPinch(n.method==='burn'?n.drops:[]);
      if(prev!==OWN&&n.method==='drip'&&n.done===prev.done+1&&n.drops.length){drip={t0:performance.now()};drop.material.color.set(AR(n.drops[n.drops.length-1]).c);setTimeout(()=>{strike(1568,.35,.05,[[1,1],[2.4,.4]]);strike(1046,.6,.025)},700)}
      else if(prev!==OWN&&n.method==='burn'&&n.done===prev.done+1)setTimeout(()=>strike(1318,3,.04,[[1,1],[2.76,.3]]),300);
      if(!prev||prev.step!==n.step){if(n.step==='drip'||n.step==='burn')goView(n.step);else if(n.step==='sit')goView('seat');else if(n.step==='mood'||n.step==='pick')goView('home')}}
    const share=roomShare('xong_huong',{change:()=>{seatsH.refresh();turns.onChange()},people:(X,grew)=>{seatsH.onPeople(grew);turns.onPeople(grew);render()},msg:m=>{if(!seatsH.onMsg(m))turns.onMsg(m)}});
    const seatsH=roomSeats(st,share,HSEATS,{walkers:true,hint:rmHint});
    const turns=roomTurns(share,{watch:watchView,own:()=>{S=OWN;pip.visible=S.step==='drip';drawPinch(S.method==='burn'?S.drops:[]);goView('home')},render:()=>render(),resend:()=>turns.share(snapA()),talk:()=>arTalk(S.step)});
    rmHint('Nhà Hương · Haromy, ngôi nhà của mùi thơm Hạnh phúc · chạm tủ để chọn mùi · kéo để nhìn quanh');render()}
  // ---- Pha trà 6 bước dùng chung (Nhà Vị; sau này Tư Gia, nhà chính Đảo Yên). Ngoài phiên: mỗi người tự pha như cũ.
  // Trong phiên: người dẫn (Healer) bấm từng bước, cả phòng cùng thấy ấm, khói, chén; người dẫn gửi lời dẫn vào khung chat bằng một chạm;
  // bước cuối "Mời trà cả phòng": chén trước chỗ mỗi người đầy trà, khách bấm Nâng chén thì nhận một lời nhắn, cả phòng thấy chén nâng lên.
  // Tín hiệu trong kênh: {k:'tea',s:số bước đã xong,inv:1 khi đã mời} (chỉ nhận từ người dẫn; người dẫn gửi lại khi có người vào trễ) · {k:'cup'} khi một người nâng chén.
  const TEA_STEPS=[['🔥 Đun nước','Nước đang sôi lăn tăn…'],['🫖 Tráng ấm','Tráng ấm bằng nước nóng cho ấm đều.'],['🍃 Cho trà','Một nhúm trà vào ấm, nghe mùi lá dậy lên.'],['⏳ Hãm trà','Chờ một hơi thở dài để trà ngấm.'],['🍵 Rót trà','Rót đều tay, mỗi chén một ít, xoay vòng.'],['🙏 Mời trà nhận lời nhắn','Hai tay nâng chén, mời người đối diện và nhận một lời nhắn.']];
  const TEA_TALK=['Nghe tiếng nước reo, mình cũng lắng lại cùng nước.','Tráng ấm như gột rửa tâm mình, để chén trà hôm nay thật mới.','Một nhúm trà vừa đủ. Biết đủ cũng là một niềm vui.','Chờ trà ngấm là tập kiên nhẫn và dịu dàng với chính mình.','Rót xoay vòng để chén nào cũng đều vị, như sự quan tâm chia đều cho nhau.','Hai tay nâng chén, mời nhau bằng cả sự có mặt của mình.'];
  function roomTea(sh,seatsH,H){let step=0,inv=false,lifted=false,seen=false,quote='';
    const lead=()=>sh.session&&sh.lead(),watch=()=>sh.session&&!sh.lead()&&(seen||H.guestWait),who=()=>sh.healerName();/* H.guestWait: khách không tự pha, chờ Chủ nhà · H.soloHidden: ngoài buổi hẹn không hiện bảng trà */
    const pick=()=>TEA_WORDS[Math.floor(Math.random()*TEA_WORDS.length)];
    const seatList=()=>{const o=seatsH.occ(),l=Object.keys(o).map(Number),m=seatsH.mine();if(m>=0&&!l.includes(m))l.push(m);return l};
    const msg=()=>({k:'tea',s:step,inv:inv?1:0});
    function reset(){step=0;inv=false;lifted=false;quote='';H.reset()}
    function advance(){const i=step;if(i>=TEA_STEPS.length)return;H.anim(i);if(i===4)H.fill(sh.session?seatList():null);step++;
      if(step>=TEA_STEPS.length){quote=pick();if(lead()){inv=true;rmHint('🙏 Bạn đã mời trà cả phòng · mọi người đang nâng chén')}else rmHint('Mời bạn một chén trà · '+quote)}}
    function apply(s,iv){s=Math.max(0,Math.min(TEA_STEPS.length,+s||0));const first=!seen;seen=true;
      if(s===0){if(step)reset()}else if(s===step+1&&!first)advance();else if(s!==step){reset();step=s;H.jump(s,seatList())}
      if(iv&&!inv){inv=true;lifted=false;quote=pick();rmHint('🍵 '+who()+' mời bạn một chén trà · bấm Nâng chén');if(typeof setRoomUi==='function')setRoomUi(true)/* mở bảng để thấy nút Nâng chén */}if(!iv&&step<TEA_STEPS.length)inv=false;render()}
    function render(){const L=TEA_STEPS.length,strip='<div class="rm-steps">'+TEA_STEPS.map((x,i)=>'<span class="'+(i<step?'done':i===step?'on':'')+'">'+x[0]+'</span>').join('')+'</div>';let h;
      if(H.soloHidden&&!sh.session){H.el.innerHTML='';return}
      if(watch()&&!seen){H.el.innerHTML='<p>🍵 '+esc(who())+' sẽ pha trà mời mọi người · cứ tự nhiên trò chuyện, đứng ngồi tùy ý</p>';return}
      if(watch()){h='<p>🍵 '+esc(who())+' đang pha trà cho cả phòng · '+(H.watchText||'ngồi yên, nhìn và thở theo từng bước')+'</p>'+strip+(step?'<p>'+TEA_STEPS[step-1][0]+' · '+TEA_STEPS[step-1][1]+'</p>':'');
        if(inv&&!lifted)h+='<div class="rm-row"><button class="rm-gold" data-qt="lift">🙏 Nâng chén nhận trà</button></div>';if(lifted)h+='<p class="rm-quote">🍵 '+esc(quote)+'</p>'}
      else{const s=TEA_STEPS[step];h=(lead()?'<p>🍵 Bạn đang pha trà cho cả phòng · mỗi bước bạn làm, mọi người cùng thấy</p>':'')+'<p>'+(step<L?'Bước '+(step+1)+'/'+L+' · '+s[1]:'')+'</p>'+strip+'<div class="rm-row">'+(step<L?'<button class="rm-gold" data-qt="next">'+(lead()&&step===L-1?'🙏 Mời trà cả phòng':s[0])+'</button>':'<button data-qt="again">🔁 Pha ấm mới</button>')+'</div>';
        if(lead()&&step>0)h+='<p class="rm-quote">“'+esc(TEA_TALK[step-1])+'”</p><div class="rm-row"><button data-qt="talk">💬 Gửi lời dẫn vào khung chat</button></div>';
        else if(step>=L)h+='<p class="rm-quote">🍵 '+esc(quote)+'</p>'}
      H.el.innerHTML=h}
    function click(a){if(a==='next'){if(watch())return;advance();if(lead())sh.send(msg())}
      else if(a==='again'){if(watch())return;reset();if(lead())sh.send(msg())}
      else if(a==='talk'){if(!lead()||!step)return;if(!sh.say(TEA_TALK[step-1]))rmHint('Chờ một chút rồi gửi lời dẫn nhé')}
      else if(a==='lift'){if(!inv||lifted)return;lifted=true;H.lift(seatsH.mine());sh.send({k:'cup'});rmHint('🍵 '+quote)}
      render()}
    function onMsg(m,name){if(m.k==='tea'){if(sh.session&&!sh.healer&&m.from===sh.therapist)apply(m.s,m.inv)}
      else if(m.k==='cup'){H.lift(seatsH.seatOf(m.from));if(lead())rmHint('🙏 '+name+' đã nâng chén trà')}}
    function onPeople(grew){if(lead()&&grew&&step>0)sh.send(msg());render()/* tên người dẫn có thể tới sau kết quả vào kênh */}
    function onChange(was){if(was&&!sh.session){seen=false;if(step||inv)rmHint(H.soloHidden?'Buổi hẹn đã kết thúc':'Phiên trà đã kết thúc · bạn tiếp tục pha trà riêng');if(H.soloHidden)reset()}
      if(!was&&sh.session){seen=false;reset();rmHint(sh.healer?(H.leadHint||'🍵 Bạn dẫn phiên trà · mỗi bước bạn pha, cả phòng cùng thấy'):(H.guestHint?H.guestHint(who()):'🍵 Đã vào phiên trà cùng '+who()+' · ngồi xuống, nhìn và thở theo từng bước pha'))}render()}
    return {render,click,onMsg,onPeople,onChange}}
  // ---- Lượt làm (Nhà Hương, Nhà Chạm): trong phiên, Healer làm mẫu trước rồi mời lần lượt từng người; cả phòng xem người đang làm.
  // Healer chọn lượt ở hàng "Lượt làm" ({k:'turn',id}; id rỗng = mọi người tự làm). Người đang làm gửi trạng thái sau mỗi bước ({k:'snap',s});
  // người khác thấy cảnh và bảng theo trạng thái đó, không bấm được. Ngoài phiên hoặc khi "mọi người tự làm" thì ai cũng làm của mình như cũ.
  function roomTurns(sh,o){let turn=null,view=null;
    const watching=()=>!!(sh.session&&turn&&turn!==sh.me),mine=()=>!watching(),who=id=>id===sh.me?'bạn':(sh.names[id]||'Một người bạn');
    function set(id,remote){const was=watching();turn=id||null;if(!remote&&sh.healer)sh.send({k:'turn',id:turn||''});
      if(watching()){view=null;o.watch(null)}else if(was)o.own();
      if(turn===sh.me){setTimeout(()=>{if(turn===sh.me)o.resend()},300);if(remote)rmHint('🙋 Đến lượt bạn · '+sh.healerName()+' sẽ hướng dẫn từng bước')}
      else if(remote&&!turn)rmHint('🌿 Mọi người tự làm theo nhịp của mình');else if(watching())rmHint('👀 '+who(turn)+' đang làm · cả phòng cùng xem');o.render()}
    function bar(){if(!sh.session)return '';let h='';
      if(sh.healer){const L=sh.list.filter(p=>p.id!==sh.me).sort((a,b)=>(a.t||0)-(b.t||0));
        h='<div class="rm-row"><span class="rm-note">Lượt làm:</span><button data-turn="'+esc(sh.me)+'"'+(turn===sh.me?' class="sel"':'')+'>🙋 Healer làm mẫu</button>'+L.map(p=>'<button data-turn="'+esc(p.id)+'"'+(turn===p.id?' class="sel"':'')+'>'+esc(p.name||'Khách')+'</button>').join('')+'<button data-turn=""'+(!turn?' class="sel"':'')+'>🌿 Mọi người tự làm</button></div>';
        if(o.talk())h+='<div class="rm-row"><button data-turn-talk>💬 Gửi lời dẫn bước này vào khung chat</button></div>'}
      else if(turn)h='<p class="rm-note">'+(turn===sh.me?'🙋 Đang là lượt của bạn · làm theo lời '+esc(sh.healerName()):'👀 Đang xem '+esc(who(turn))+' làm · chờ tới lượt mình nhé')+'</p>';
      return h}
    function click(e){const b=e.target.closest('[data-turn]');if(b){if(sh.healer)set(b.dataset.turn||null);return true}
      if(e.target.closest('[data-turn-talk]')){const t=o.talk();if(t&&!sh.say(t))rmHint('Chờ một chút rồi gửi lời dẫn nhé');return true}return false}
    function share(s){if(sh.session&&turn&&turn===sh.me)sh.send({k:'snap',s})}
    function onMsg(m){if(m.k==='turn'){if(!sh.healer&&sh.session&&m.from===sh.therapist)set(typeof m.id==='string'&&m.id?m.id:null,true);return true}
      if(m.k==='snap'){if(watching()&&m.from===turn&&m.s&&typeof m.s==='object'){view=m.s;o.watch(view);o.render()}return true}return false}
    function onPeople(grew){if(!grew)return;if(sh.healer&&sh.session)sh.send({k:'turn',id:turn||''});if(turn===sh.me)o.resend()}
    function onChange(){if(!sh.session&&turn)set(null,true)}
    return {watching,mine,bar,click,share,onMsg,onPeople,onChange,turn:()=>turn,view:()=>view,who}}
  const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
  function roomQuanTra(st){rmHint('Ngũ Thiên Trà · pha trà 6 bước: Đun nước, Tráng ấm, Cho trà, Hãm trà, Rót trà, Mời trà · Kéo để nhìn quanh');st.target.set(0,.6,0);st.dist=3.6;
    rAdd(st,new THREE.Mesh(new THREE.BoxGeometry(1.8,.36,1.1),mat('#3e2c20')),0,.18,0);
    /* 27/11: 6 bồ đoàn quanh bàn trà (2 trước, 2 sau, 2 đầu bàn), chạm bồ đoàn để ngồi quay vào bàn; bồ đoàn đầu bàn bên trái (cạnh ấm, bếp) dành cho Healer trong phiên */
    const SEATS=[[-.45,1.0],[.45,1.0],[-.45,-1.0],[.45,-1.0],[-1.35,0],[1.35,0]].map(([x,z])=>{const end=Math.abs(z)<.5;return {x,z,a:end?(x>0?-Math.PI/2:Math.PI/2):z>0?Math.PI:0,y:.12,ax:end?x+Math.sign(x)*.5:x,az:end?z:z+Math.sign(z)*.5,cx:end?Math.sign(x)*.7:x,cz:end?0:Math.sign(z)*.38}});
    SEATS.forEach((s,k)=>{const c=rAdd(st,new THREE.Mesh(new THREE.CylinderGeometry(.3,.32,.14,14),mat('#6e4a33')),s.x,.07,s.z);rTap(st,c,()=>{if(seatsH.tap(k))rmHint('🍵 Ngồi bên bàn trà · bấm Đứng lên để rời chỗ')})});
    const stove=rAdd(st,new THREE.Mesh(new THREE.CylinderGeometry(.16,.2,.22,10),mat('#5a3a28')),-1.95,.11,-.95);const kettle=rAdd(st,new THREE.Mesh(new THREE.SphereGeometry(.16,12,8),mat('#2f2a26')),-1.95,.36,-.95);/* bếp dời ra góc để chừa chỗ bồ đoàn đầu bàn */kettle.scale.y=.8;
    const pot=new THREE.Group();pot.position.set(-.35,.36,0);st.sc.add(pot);const body=new THREE.Mesh(new THREE.SphereGeometry(.13,14,10),mat('#6a3e2a'));body.scale.y=.8;body.position.y=.1;pot.add(body);const sp=new THREE.Mesh(new THREE.CylinderGeometry(.015,.028,.14,6),mat('#6a3e2a'));sp.position.set(.14,.13,0);sp.rotation.z=-1;pot.add(sp);const lid=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),mat('#6a3e2a'));lid.position.y=.2;pot.add(lid);
    const cupG=new THREE.LatheGeometry([[0,0],[.05,0],[.065,.07]].map(([a,b])=>new THREE.Vector2(a,b)),14),teaG=new THREE.CylinderGeometry(.055,.045,.01,14),cupM=mat('#ece4d0'),teaM=new THREE.MeshStandardMaterial({color:'#a87a2a',roughness:.2});
    const mkCup=(x,z)=>{const g=new THREE.Group();g.position.set(x,.36,z);st.sc.add(g);g.add(new THREE.Mesh(cupG,cupM));const t=new THREE.Mesh(teaG,teaM);t.position.y=.01;t.visible=false;g.add(t);return {g,t,lift:0}};
    const cups=[[.3,-.2],[.3,.2],[.6,0]].map(([x,z])=>mkCup(x,z));/* ba chén khi pha riêng */
    const seatCups=SEATS.map(s=>{const c=mkCup(s.cx,s.cz);c.g.visible=false;return c});/* trong phiên: mỗi chỗ ngồi một chén trước mặt */
    const jar=rAdd(st,new THREE.Mesh(new THREE.CylinderGeometry(.09,.1,.2,12),mat('#3f5f52')),-.6,.46,-.35);
    /* 27/11: bàn trà và bếp chặn lối, không đi xuyên qua */st.blocks=[[-.9,-.55,.9,.55],[-2.15,-1.15,-1.75,-.75]];
    const steam=[];const sm=new THREE.MeshBasicMaterial({color:'#efe9dc',transparent:true,opacity:.2,depthWrite:false});for(let k=0;k<8;k++){const p=rAdd(st,new THREE.Mesh(new THREE.SphereGeometry(.04,6,4),sm.clone()),0,0,0);p.userData.k=k;steam.push(p)}
    let boiling=false,pour=0,shown=0;const active=()=>sh.session?seatCups.filter(c=>c.g.visible):cups;
    st.tick.push(t=>{const ac=active(),src=shown>=4?(ac[0]||cups[0]).g:boiling?kettle:pot;for(const p of steam){const u=((t*.4+p.userData.k/8)%1);p.visible=boiling||shown>=3;p.position.set(src.position.x+Math.sin(t+p.userData.k)*.03*u,src.position.y+.15+u*.5,src.position.z);p.scale.setScalar(1+u*2);p.material.opacity=.2*(1-u)}
      if(pour>0){pour=Math.max(0,pour-.01);pot.rotation.z=-Math.sin(Math.min(1,pour*2)*Math.PI/2)*.7}
      const now=performance.now();for(const c of seatCups){const u=c.lift?(now-c.lift)/2200:1;c.g.position.y=.36+(u<1?Math.sin(u*Math.PI)*.22:0)}});
    const seatCupsOn=list=>{seatCups.forEach((c,k)=>{c.g.visible=list.includes(k)})};
    const H={el:null,
      anim(i){shown=i+1;if(i===0){boiling=true;strike(523,2,.03,[[1,1]]);setTimeout(()=>{boiling=false},2600)}else if(i===1||i===3){pour=1}else if(i===2){jar.rotation.z=.6;setTimeout(()=>jar.rotation.z=0,700)}else if(i===4){pour=1}},
      fill(list){const cs=list?(seatCupsOn(list),list.map(k=>seatCups[k])):cups;for(const c of cups)c.g.visible=!list;cs.forEach((c,i)=>setTimeout(()=>{if(!st.run)return;c.t.visible=true;strike(880,1.2,.02,[[1,1]])},300+i*350))},
      jump(s,list){shown=s;if(s>=5){if(sh.session){seatCupsOn(list);for(const c of cups)c.g.visible=false;for(const k of list)seatCups[k].t.visible=true}else for(const c of cups)c.t.visible=true}},
      reset(){shown=0;boiling=false;for(const c of cups){c.t.visible=false;c.g.visible=!sh.session}for(const c of seatCups){c.t.visible=false;c.lift=0;c.g.visible=false}},
      lift(k){const c=seatCups[k];if(c&&c.g.visible){c.lift=performance.now();strike(660,1.4,.015,[[1,1],[2,.2]])}}};
    const sh=roomShare('quan_tra',{change:(S,was)=>{seatsH.refresh();tea.onChange(was)},people:(S,grew)=>{seatsH.refresh();tea.onPeople(grew)},msg:(m,name)=>tea.onMsg(m,name)});
    const seatsH=roomSeats(st,sh,SEATS,{auto:true,healerSeat:4,healerNote:'Bồ đoàn cạnh ấm trà dành cho Healer pha trà',hint:rmHint});
    rmPanel.innerHTML='<div id="teaBox"></div>';H.el=rmPanel.querySelector('#teaBox');const tea=roomTea(sh,seatsH,H);tea.render();
    rmPanel.onclick=e=>{const a=e.target.closest('[data-qt]')?.dataset.qt;if(a)tea.click(a)};
    st.cleanup=()=>{sh.off();seatsH.dispose()}}
  // 3.41: Tư Gia bên trong theo ảnh phối cảnh: sàn gỗ, thảm, bàn trà tròn thấp có ấm 6 chén, 6 bồ đoàn ngồi được (khớp 6 người: chủ nhà + 5 bạn), kệ ô gỗ có đèn,
  // tranh hoa sen, bonsai chậu trắng, đèn lồng giấy treo và đèn đứng, vách shoji, bàn góc có bình hoa trắng và chén trà bốc hơi.
  function roomTuGia(st,venue){let sty='gian_di';try{const v=localStorage.getItem('yen_home_style');if(HOME_STYLES[v])sty=v}catch(e){}
    const sc=st.sc,texs=[],HW=4,HD=3.6,H=3.2;
    const M=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.85},o||{}));
    const add=(geo,m,x,y,z,ry)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);if(ry)o.rotation.y=ry;sc.add(o);return o};
    const B=(w,h,d,m,x,y,z,ry)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z,ry),C=(rt,rb,h,m,x,y,z,n=16)=>add(new THREE.CylinderGeometry(rt,rb,h,n),m,x,y,z);
    const tex=(w,h,draw,rep)=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d');draw(c,w,h);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1])}texs.push(t);return t};
    sc.background=new THREE.Color('#2a2018');sc.fog=null;st.hemi.color.set('#ffe8c8');st.hemi.groundColor.set('#5a3a22');st.hemi.intensity=1.15;st.key.color.set('#ffd49a');st.key.intensity=.85;st.key.position.set(3,7,5);
    const floorT=tex(256,256,(c,w,h)=>{c.fillStyle='#b48a5e';c.fillRect(0,0,w,h);for(let i=0;i<8;i++){c.fillStyle='rgba(60,35,15,.4)';c.fillRect(0,i*32,w,2);c.fillRect((i*97)%w,i*32,2,32);for(let k=0;k<3;k++){c.fillStyle='rgba(255,235,200,'+(.04+Math.random()*.05)+')';c.fillRect(Math.random()*w,i*32+4+Math.random()*24,40+Math.random()*80,2)}}},[3,3]);
    const floorM=M('#fff',{map:floorT,roughness:.6}),wallM=M('#efe2c6',{roughness:.95}),wood=M('#7a5236'),woodD=M('#4e3422'),paper=M('#f5ecd8',{roughness:.95,emissive:'#ffdca6',emissiveIntensity:.25}),cushM=M('#c9b38a',{roughness:.95}),accM=M('#6e4a33');
    B(HW*2,.1,HD*2,floorM,0,-.05,0);B(HW*2,.1,HD*2,wood,0,H+.05,0);for(let x=-HW+.6;x<HW;x+=1.2)B(.12,.16,HD*2,woodD,x,H-.08,0);
    // vách sau trát kem + khung gỗ, vách hai bên là cửa lùa shoji, mặt trước có cửa gỗ hai cánh mở ra hiên
    B(HW*2,H,.1,wallM,0,H/2,-HD);for(const x of [-HW+.05,-1.2,1.2,HW-.05])B(.14,H,.14,wood,x,H/2,-HD+.08);B(HW*2,.14,.14,wood,0,2.35,-HD+.08);
    const shoji=(len,place)=>{const g=new THREE.Group();const p=new THREE.Mesh(new THREE.BoxGeometry(len,H,.05),paper);p.position.y=H/2;g.add(p);for(let x=-len/2;x<=len/2+.01;x+=.6){const b=new THREE.Mesh(new THREE.BoxGeometry(.05,H,.08),woodD);b.position.set(x,H/2,.02);g.add(b)}for(let y=.4;y<H;y+=.5){const b=new THREE.Mesh(new THREE.BoxGeometry(len,.04,.07),woodD);b.position.set(0,y,.02);g.add(b)}place(g);sc.add(g)};
    shoji(HD*2,g=>{g.position.set(-HW,0,0);g.rotation.y=Math.PI/2});shoji(HD*2,g=>{g.position.set(HW,0,0);g.rotation.y=-Math.PI/2});
    /* mặt trước để mở (nhìn từ cửa vào), chỉ còn ngưỡng cửa gỗ */B(HW*2,.06,.14,woodD,0,.03,HD-.05);for(const s of [-1,1])B(.14,H,.14,wood,s*(HW-.05),H/2,HD-.08);
    // thảm, bàn trà tròn thấp, ấm và 6 chén, 6 bồ đoàn xếp đều quanh bàn (hai bồ đoàn phía trước để lối nhìn từ cửa vào)
    const TX=0,TZ=.35;add(new THREE.CircleGeometry(2.2,40),M('#d8c3a0',{roughness:1}),TX,.006,TZ).rotation.x=-Math.PI/2;add(new THREE.RingGeometry(1.95,2.05,40),M('#a98a5e',{roughness:1}),TX,.008,TZ).rotation.x=-Math.PI/2;
    C(.78,.78,.07,accM,TX,.36,TZ,28);C(.62,.66,.04,woodD,TX,.31,TZ,24);for(let k=0;k<4;k++){const a=k*Math.PI/2+.4;B(.08,.3,.08,woodD,TX+Math.cos(a)*.5,.15,TZ+Math.sin(a)*.5)}
    /* 27/11: ấm là một nhóm để nghiêng khi rót; 6 chén, chén thứ k ở trước bồ đoàn thứ k (buổi hẹn: Chủ nhà pha trà, rót vào chén trước mặt từng người) */
    const pot=new THREE.Group();pot.position.set(TX,.4,TZ);sc.add(pot);{const potM=M('#6a4a34'),b=new THREE.Mesh(new THREE.SphereGeometry(.12,14,10),potM);b.scale.y=.8;b.position.y=.08;pot.add(b);const l=new THREE.Mesh(new THREE.CylinderGeometry(.04,.05,.04,8),potM);l.position.y=.17;pot.add(l);const s=new THREE.Mesh(new THREE.CylinderGeometry(.015,.025,.14,6),potM);s.position.set(.13,.1,0);s.rotation.z=-1;pot.add(s)}
    const cupM=M('#efe8d8'),teaM=new THREE.MeshStandardMaterial({color:'#a87a2a',roughness:.2}),cups=[];for(let k=0;k<6;k++){const a=k/6*Math.PI*2+Math.PI/6,g=new THREE.Group();g.position.set(TX+Math.sin(a)*.45,.39,TZ+Math.cos(a)*.45);sc.add(g);const c=new THREE.Mesh(new THREE.CylinderGeometry(.045,.035,.06,10),cupM);c.position.y=.03;g.add(c);const te=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.008,10),teaM);te.position.y=.058;te.visible=false;g.add(te);cups.push({g,t:te,lift:0})}
    const seatHit=new THREE.BoxGeometry(.6,.6,.6),seatM=new THREE.MeshBasicMaterial({visible:false}),SEATS=[];
    for(let k=0;k<6;k++){const a=k/6*Math.PI*2+Math.PI/6,x=TX+Math.sin(a)*1.3,z=TZ+Math.cos(a)*1.3;const c=C(.32,.34,.16,cushM,x,.08,z,18);C(.25,.25,.01,M('#b59c72'),x,.165,z,18);
      const h=add(seatHit,seatM,x,.3,z);SEATS.push({x,z,a:Math.atan2(TX-x,TZ-z),y:.2,ax:x+Math.sin(a)*.7,az:z+Math.cos(a)*.7});
      rTap(st,h,()=>{if(seatsH.tap(k))rmHint('🍵 Ngồi bên bàn trà · bấm Đứng lên hoặc đi để rời chỗ')})}
    // kệ ô gỗ có đèn (Kệ Lưu Hương 3 × 3) bên trái vách sau
    {const sx=-2.55,sz=-HD+.3,w=1.7,h=1.8;B(w,.06,.4,woodD,sx,.05,sz);for(let i=0;i<4;i++){B(w,.05,.4,accM,sx,.1+i*.58,sz);B(.05,1.79,.4,accM,sx-w/2+i*w/3,1,sz)}B(w,1.8,.03,woodD,sx,1,sz-.19);
      for(let r=0;r<3;r++)for(let c=0;c<3;c++){const x=sx-w/3+c*w/3,y=.13+r*.58;add(new THREE.PlaneGeometry(.5,.5),new THREE.MeshBasicMaterial({color:'#ffd99a',transparent:true,opacity:.35}),x,y+.27,sz-.17);
        const k=(r*3+c)%4;if(k===0)C(.07,.09,.22,M('#e9e2d2'),x,y+.11,sz);else if(k===1){const b=add(new THREE.SphereGeometry(.1,10,8),M('#8fa68a'),x,y+.08,sz);b.scale.y=.7}else if(k===2)B(.28,.06,.2,M('#b59c72'),x,y+.03,sz);else C(.05,.05,.16,M('#c98a5a'),x,y+.08,sz,8)}
      const gl=new THREE.PointLight('#ffcf8a',.6,3,1.8);gl.position.set(sx,1.2,sz+.5);sc.add(gl)}
    // tranh hoa sen treo giữa vách sau
    {const t=tex(256,384,(c,w,h)=>{c.fillStyle='#f3ead6';c.fillRect(0,0,w,h);c.strokeStyle='#5f7a4a';c.lineWidth=3;c.beginPath();c.moveTo(128,330);c.quadraticCurveTo(120,250,128,190);c.stroke();c.fillStyle='rgba(95,140,80,.75)';c.beginPath();c.ellipse(86,300,52,16,-.25,0,Math.PI*2);c.fill();
      const pet=(a,l,wd,col)=>{c.save();c.translate(128,190);c.rotate(a);c.fillStyle=col;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(wd,-l*.55,0,-l);c.quadraticCurveTo(-wd,-l*.55,0,0);c.fill();c.restore()};for(const [a,l] of [[-1,55],[1,55],[-.5,70],[.5,70]])pet(a,l,22,'#f1b6c6');pet(0,80,24,'#f7cdd8');c.fillStyle='#8a6a48';c.fillRect(0,0,w,10);c.fillRect(0,h-10,w,10)});
      add(new THREE.PlaneGeometry(.9,1.35),M('#fff',{map:t,roughness:1}),0,1.75,-HD+.07);B(1,.04,.04,woodD,0,2.45,-HD+.08);B(1,.04,.04,woodD,0,1.05,-HD+.08)}
    // bonsai chậu trắng trên kệ thấp, bàn góc có bình hoa trắng và chén trà bốc hơi
    {B(1.1,.4,.5,woodD,1.0,.2,-HD+.35);C(.2,.16,.18,M('#f4f1ea'),1.0,.49,-HD+.35,14);const tr=C(.03,.05,.4,M('#5a3d26'),1.0,.75,-HD+.35,6);tr.rotation.z=.3;for(const [dx,dy,r] of [[-.12,.98,.2],[.1,.92,.16],[0,1.08,.14]]){const f=add(new THREE.IcosahedronGeometry(r,1),M('#4f7a3e'),1.0+dx,dy,-HD+.35);f.scale.y=.55}}
    const CX=HW-.6,CZ=-HD+.6;B(.9,.06,.9,accM,CX,.62,CZ);for(const a of [-1,1])for(const b of [-1,1])B(.06,.6,.06,woodD,CX+a*.38,.3,CZ+b*.38);
    {const v=add(new THREE.LatheGeometry([[0,0],[.08,.01],[.11,.12],[.06,.24],[.07,.27]].map(([a,b])=>new THREE.Vector2(a,b)),14),M('#f6f3ec'),CX-.15,.65,CZ-.1);for(let k=0;k<7;k++){const s=add(new THREE.CylinderGeometry(.005,.005,.3,4),M('#4f7a3a'),CX-.15+Math.cos(k)*.04,1.02,CZ-.1+Math.sin(k)*.04);s.rotation.z=Math.cos(k)*.25;add(new THREE.SphereGeometry(.04,6,5),M('#fbf8f0'),CX-.15+Math.cos(k)*.1,1.17+(k%3)*.03,CZ-.1+Math.sin(k)*.1)}}
    C(.05,.04,.06,M('#efe8d8'),CX+.2,.68,CZ+.15,10);const steam=[];const smM=new THREE.MeshBasicMaterial({color:'#f3eee4',transparent:true,opacity:.2,depthWrite:false});for(let k=0;k<6;k++){const p=add(new THREE.SphereGeometry(.03,6,4),smM.clone(),CX+.2,.75,CZ+.15);p.userData.k=k;steam.push(p)}
    st.tick.push(t=>{for(const p of steam){const u=(t*.35+p.userData.k/6)%1;p.position.set(CX+.2+Math.sin(t*2+p.userData.k)*.02,.74+u*.45,CZ+.15);p.scale.setScalar(1+u*2.2);p.material.opacity=.22*(1-u)}});
    // đèn lồng giấy treo trên bàn trà, đèn đứng ở góc trước trái
    {const l=add(new THREE.SphereGeometry(.26,16,12),M('#f6e6c4',{emissive:'#ffcc80',emissiveIntensity:.95}),TX,H-.62,TZ+.5);l.scale.y=1.2;B(.02,.3,.02,woodD,TX,H-.18,TZ+.5);const pl=new THREE.PointLight('#ffd49a',1.2,7,1.5);pl.position.set(TX,H-1.1,TZ);sc.add(pl)}
    {const lx=-HW+.5,lz=HD-1.1;B(.34,.06,.34,woodD,lx,.03,lz);for(const a of [-1,1])for(const b of [-1,1])B(.03,1.1,.03,woodD,lx+a*.14,.58,lz+b*.14);B(.26,.6,.26,M('#f6e6c4',{emissive:'#ffcc80',emissiveIntensity:.9}),lx,.9,lz);B(.36,.04,.36,woodD,lx,1.22,lz)}
    st.blocks=[[TX-.85,TZ-.85,TX+.85,TZ+.85],[-3.45,-HD,-1.65,-HD+.55],[.4,-HD,1.6,-HD+.65],[CX-.5,-HD,HW,CZ+.5],[-HW,HD-1.35,-HW+.75,HD-.85]];
    function apply(k){sty=k;try{localStorage.setItem('yen_home_style',k)}catch(e){}const S=HOME_STYLES[k];wallM.color.set(k==='gian_di'?'#efe2c6':S.wall);floorM.color.set(new THREE.Color(S.floor).lerp(new THREE.Color('#ffffff'),.55));accM.color.set(S.acc);cushM.color.set(k==='sang_chanh'?'#c8a96a':k==='hanh_phuc'?'#f3c3cf':'#c9b38a');render()}
    function render(){rmPanel.innerHTML='<div id="teaBox"></div><p>🏡 <b>Tư Gia Rừng Yên</b> · chạm bồ đoàn để ngồi bên bàn trà · Phong cách:</p><div class="rm-row">'+Object.entries(HOME_STYLES).map(([k,v])=>'<button type="button" data-hs="'+k+'"'+(k===sty?' class="sel"':'')+'>'+v.label+'</button>').join('')+'<button type="button" data-hs="sit">🍵 Ngồi bàn trà</button></div>'+
      '<p class="rm-note">Bàn trà 6 bồ đoàn · Kệ Lưu Hương 9 ô · Góc Gieo Hạt ở cạnh nhà.</p>';TH.el=rmPanel.querySelector('#teaBox');if(tea)tea.render()}
    // 27/11: buổi hẹn Tư Gia (Chủ nhà + tối đa 5 bạn): thấy nhau đi lại, đứng ngồi tự do, trò chuyện qua khung chat; Chủ nhà pha trà và mời trà như Healer ở Nhà Vị.
    let boiling=false,pour=0;const steamP=[];{const m=new THREE.MeshBasicMaterial({color:'#efe9dc',transparent:true,opacity:.2,depthWrite:false});for(let k=0;k<6;k++){const s=add(new THREE.SphereGeometry(.035,6,4),m.clone(),TX,.6,TZ);s.userData.k=k;s.visible=false;steamP.push(s)}}
    st.tick.push(t=>{for(const s of steamP){const u=(t*.4+s.userData.k/6)%1;s.visible=boiling;s.position.set(TX+Math.sin(t+s.userData.k)*.03*u,.6+u*.45,TZ);s.scale.setScalar(1+u*2);s.material.opacity=.2*(1-u)}
      if(pour>0){pour=Math.max(0,pour-.01);pot.rotation.z=-Math.sin(Math.min(1,pour*2)*Math.PI/2)*.6}const now=performance.now();for(const c of cups){const u=c.lift?(now-c.lift)/2200:1;c.g.position.y=.39+(u<1?Math.sin(u*Math.PI)*.22:0)}});
    const TH={el:null,guestWait:true,soloHidden:true,watchText:'mọi người cùng xem',leadHint:'🏡 Bạn là Chủ nhà · pha trà, mời trà, mỗi bước mọi người cùng thấy',guestHint:w=>'🏡 Đã tới Tư Gia của '+w+' · tự nhiên đi lại, ngồi bên bàn trà và trò chuyện',
      anim(i){if(i===0){boiling=true;strike(523,2,.03,[[1,1]]);setTimeout(()=>{boiling=false},2600)}else if(i===1||i===3||i===4)pour=1;else strike(700,1,.015,[[1,1]])},
      fill(list){(list||[0,1,2,3,4,5]).forEach((k,i)=>setTimeout(()=>{if(!st.run||!cups[k])return;cups[k].t.visible=true;strike(880,1.2,.02,[[1,1]])},300+i*350))},
      jump(s,list){if(s>=5)for(const k of list)if(cups[k])cups[k].t.visible=true},
      reset(){boiling=false;for(const c of cups){c.t.visible=false;c.lift=0}},
      lift(k){const c=cups[k];if(c&&c.t.visible){c.lift=performance.now();strike(660,1.4,.015,[[1,1],[2,.2]])}}};
    let tea=null;const sh=roomShare(venue||'tu_gia_me',{change:(S,was)=>{seatsH.refresh();tea.onChange(was)},people:(S,grew)=>{seatsH.onPeople(grew);tea.onPeople(grew)},msg:(m,name)=>{if(!seatsH.onMsg(m))tea.onMsg(m,name)}});
    const seatsH=roomSeats(st,sh,SEATS,{walkers:true,hint:rmHint});tea=roomTea(sh,seatsH,TH);
    rmPanel.onclick=e=>{const q=e.target.closest('[data-qt]');if(q){tea.click(q.dataset.qt);return}const b=e.target.closest('[data-hs]');if(!b)return;if(b.dataset.hs==='sit'){const k=seatsH.free();if(k!=null&&seatsH.tap(k))rmHint('🍵 Ngồi bên bàn trà · bấm Đứng lên hoặc đi để rời chỗ');else rmHint('Bàn trà đã kín chỗ');return}apply(b.dataset.hs)};apply(sty);
    rmHint('🏡 Tư Gia · chạm sàn để đi, chạm bồ đoàn để ngồi bên bàn trà · 🚪 Ra cửa để ra hiên');
    st.cleanup=()=>{for(const t of texs)t.dispose();sh.off();seatsH.dispose()}}
  function roomTinhThat(st){rmHint('Nhuộm vải, chọn số điều, rồi khâu từng mảnh · Chạm mảnh đã khâu để đổi màu');st.target.set(0,1.2,0);st.dist=3.6;st.pitch=.08;
    const fr=new THREE.Group();fr.position.set(0,0,-.6);st.sc.add(fr);const wood=mat('#5b3d2a');for(const x of [-1.5,1.5]){const l=new THREE.Mesh(new THREE.BoxGeometry(.1,2.3,.1),wood);l.position.set(x,1.15,0);fr.add(l)}for(const y of [.45,2.05]){const b=new THREE.Mesh(new THREE.BoxGeometry(3.1,.09,.09),wood);b.position.set(0,y,0);fr.add(b)}
    // Kho y: the robes hang open on the back wall above the sewing frame (five over four), each showing its patchwork as it was sewn
    const shelf=new THREE.Group();shelf.position.set(0,0,-3.38);st.sc.add(shelf);for(const y of [3.05,2.25]){const rod=new THREE.Mesh(new THREE.CylinderGeometry(.022,.022,7.4,8),mat('#4e3a2a'));rod.rotation.z=Math.PI/2;rod.position.set(0,y,.06);shelf.add(rod)}
    const drawKho=()=>{while(shelf.children.length>3){const o=shelf.children[3];shelf.remove(o);o.traverse(q=>{if(q.geometry)q.geometry.dispose();if(q.material)q.material.dispose()})}katRows.filter(r=>katAge(r)>KAT_CHANT_SEC||katInKho(r)).slice(0,9).forEach((r,i)=>{const top=i<5,c=robeCloth(r,1.3,.62);c.position.set(top?-2.9+i*1.45:-2.175+(i-5)*1.45,top?3.05-.37:2.25-.37,.08);shelf.add(c)})};drawKho();
    // dye tub: the strip of cloth dips into the dye of the chosen colour
    const tub=new THREE.Group();tub.position.set(-2.05,0,.35);st.sc.add(tub);tub.add(new THREE.Mesh(new THREE.CylinderGeometry(.36,.3,.5,16,1,true),mat('#5b3d2a')));tub.children[0].position.y=.25;
    const dye=new THREE.Mesh(new THREE.CircleGeometry(.34,20),new THREE.MeshStandardMaterial({color:kat.color,roughness:.3}));dye.rotation.x=-Math.PI/2;dye.position.y=.44;tub.add(dye);
    const strip=new THREE.Mesh(new THREE.PlaneGeometry(.22,.55),new THREE.MeshStandardMaterial({color:'#efe4cf',roughness:.95,side:THREE.DoubleSide}));strip.position.set(0,1.05,0);tub.add(strip);
    const bar=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.5,6),wood);bar.rotation.z=Math.PI/2;bar.position.y=1.34;tub.add(bar);
    /* 3.41: bày biện Nhà May Y theo ảnh: kệ gỗ xếp vải vàng, kem, nâu và giỏ mây, ma-nơ-canh mặc y, tranh hoa sen, cây chậu, thảm cói, đèn lồng giấy treo,
       bồ đoàn trước khung may, khay nhỏ có gối cắm kim, cuộn chỉ, kéo và chồng vải gấp với hoa sen */
    {const sc=st.sc,A=(geo,m,x,y,z)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);sc.add(o);return o},wd=mat('#7a5232'),wdD=mat('#4e3422');
      const rug=A(new THREE.PlaneGeometry(4.2,2.6),mat('#d9c39a'),0,.006,.1);rug.rotation.x=-Math.PI/2;A(new THREE.CylinderGeometry(.32,.34,.16,18),mat('#ece2cc'),0,.08,.75);
      const SX=-3.7;A(new THREE.BoxGeometry(.45,2.1,1.9),wdD,SX-.05,1.05,-1.4);const cloth=['#d99a2b','#efe3c8','#8a5a2a','#e8b84a','#f3ecd9','#a8673e'];
      for(let r=0;r<4;r++){A(new THREE.BoxGeometry(.5,.04,1.9),wd,SX+.05,.3+r*.5,-1.4);for(let k=0;k<3;k++){const z=-2.05+k*.62;if(r===0){A(new THREE.BoxGeometry(.38,.26,.5),mat('#c8a46a'),SX+.08,.45,z)}else for(let j=0;j<3;j++)A(new THREE.BoxGeometry(.36,.07,.48),mat(cloth[(r*3+k+j)%6]),SX+.08,.36+r*.5+j*.075,z)}}
      const MX=2.9,MZ=-1.6;A(new THREE.CylinderGeometry(.18,.22,.06,12),wdD,MX,.03,MZ);A(new THREE.CylinderGeometry(.025,.025,.6,6),wdD,MX,.33,MZ);A(new THREE.ConeGeometry(.42,1.25,12,1,true),mat('#d99a2b'),MX,1.1,MZ);A(new THREE.SphereGeometry(.2,10,8),mat('#e8b84a'),MX,1.72,MZ).scale.set(1.3,.7,.9);A(new THREE.SphereGeometry(.07,8,6),mat('#efe3c8'),MX,1.92,MZ);
      {const cv=document.createElement('canvas');cv.width=128;cv.height=256;const c=cv.getContext('2d');c.fillStyle='#f3ead6';c.fillRect(0,0,128,256);c.strokeStyle='#b08a4e';c.lineWidth=3;c.save();c.translate(64,150);for(const [a,l] of [[-1,30],[1,30],[-.5,40],[.5,40],[0,46]]){c.save();c.rotate(a);c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(13,-l*.55,0,-l);c.quadraticCurveTo(-13,-l*.55,0,0);c.stroke();c.restore()}c.restore();
        const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;const p=A(new THREE.PlaneGeometry(.7,1.4),new THREE.MeshStandardMaterial({map:t,roughness:1}),3.93,1.8,.4);p.rotation.y=-Math.PI/2;A(new THREE.BoxGeometry(.04,.04,.8),wdD,3.92,2.52,.4)}
      A(new THREE.CylinderGeometry(.2,.16,.34,12),mat('#f4f1ea'),3.4,.17,-2.9);for(let k=0;k<6;k++){const l=A(new THREE.IcosahedronGeometry(.17,0),mat(k%2?'#5f8a3a':'#4f7a2e'),3.4+Math.cos(k)*.14,.55+(k%3)*.13,-2.9+Math.sin(k)*.14);l.scale.y=.7}
      const TX=2.7,TZ=1.3;A(new THREE.BoxGeometry(1,.06,.6),wd,TX,.55,TZ);for(const a of [-1,1])for(const b of [-1,1])A(new THREE.BoxGeometry(.06,.53,.06),wdD,TX+a*.42,.27,TZ+b*.24);
      const pin=A(new THREE.SphereGeometry(.09,10,8),mat('#e8dcc2'),TX-.3,.62,TZ);pin.scale.y=.6;for(let k=0;k<5;k++)A(new THREE.CylinderGeometry(.004,.004,.12,4),mat('#c9a46a'),TX-.3+Math.cos(k*1.3)*.04,.68,TZ+Math.sin(k*1.3)*.04);
      ['#6b4a32','#e8b84a','#f3ecd9'].forEach((c,k)=>A(new THREE.CylinderGeometry(.035,.035,.1,10),mat(c),TX-.05+k*.1,.63,TZ-.1));A(new THREE.BoxGeometry(.18,.01,.06),mat('#9a9a9a'),TX+.05,.585,TZ+.15);
      ['#8a5a2a','#d99a2b','#efe3c8'].forEach((c,k)=>A(new THREE.BoxGeometry(.4,.06,.3),mat(c),TX+.3,.61+k*.06,TZ+.05));for(let k=0;k<6;k++){const p=A(new THREE.SphereGeometry(.035,6,5),mat('#f2b8c8'),TX+.3+Math.cos(k)*.04,.81,TZ+.05+Math.sin(k)*.04);p.scale.y=1.5}
      const lan=A(new THREE.SphereGeometry(.3,14,10),mat('#f6e6c4'),0,2.75,.2);lan.material.emissive=new THREE.Color('#ffcc80');lan.material.emissiveIntensity=.9;lan.scale.y=1.15;const pl=new THREE.PointLight('#ffd49a',1,7,1.6);pl.position.set(0,2.4,.4);sc.add(pl);
      st.blocks=(st.blocks||[]).concat([[-1.6,-.75,1.6,-.45],[-2.45,0,-1.65,.75],[SX-.3,-2.4,SX+.4,-.4],[MX-.35,MZ-.35,MX+.35,MZ+.35],[3.1,-3.2,3.8,-2.6],[TX-.55,TZ-.35,TX+.55,TZ+.35]])}
    const kv={on:false,t0:0,from:null};/* camera: sewing frame, or up to the robe store on the back wall */
    st.tick.push(()=>{if(!kv.from)return;const u=Math.min(1,(performance.now()-kv.t0)/900),q=u*u*(3-2*u),to=kv.on?[2.3,-3.3,4.3,.02]:[1.2,0,3.6,.08];st.target.y=kv.from[0]+(to[0]-kv.from[0])*q;st.target.z=kv.from[1]+(to[1]-kv.from[1])*q;st.dist=kv.from[2]+(to[2]-kv.from[2])*q;st.pitch=kv.from[3]+(to[3]-kv.from[3])*q;if(u>=1)kv.from=null});
    let dip=null;const dipTo=c=>{dye.material.color.set(c);dip={t0:performance.now(),from:strip.material.color.clone(),to:new THREE.Color(c)};strike(240,1.2,.03,[[1,1]])};
    const cloth=new THREE.Group();cloth.position.set(0,1.25,-.55);st.sc.add(cloth);let pieces=[],sewn=0;const stitches=[];
    function layout(){const oldP=new Set(pieces);st.picks=st.picks.filter(x=>!oldP.has(x.obj));cloth.clear();pieces=[];sewn=0;stitches.length=0;const cols=kat.dieu,W=2.7,H=1.45,gap=.045,cw=(W-gap*(cols+1))/cols,c=new THREE.Color(kat.color),dark=new THREE.Color('#4a2e1e');
      const back=new THREE.Mesh(new THREE.PlaneGeometry(W+.08,H+.08),new THREE.MeshStandardMaterial({color:dark,roughness:.95,side:THREE.DoubleSide}));back.position.z=-.005;cloth.add(back);
      for(let i=0;i<cols;i++){/* each strip: two long pieces and one short, alternating up/down like rice-field plots */const longH=(H-gap*4)*.4,shortH=(H-gap*4)*.2,seq=i%2?[shortH,longH,longH]:[longH,longH,shortH];let y=H/2-gap;
        for(const h of seq){const m=new THREE.Mesh(new THREE.PlaneGeometry(cw,h),new THREE.MeshStandardMaterial({color:c,roughness:.9,transparent:true,opacity:.12,side:THREE.DoubleSide}));m.position.set(-W/2+gap+cw/2+i*(cw+gap),y-h/2,0);m.userData.wh=[cw,h];cloth.add(m);pieces.push(m);rTap(st,m,()=>{if(m.userData.ci!=null){m.userData.ci=curIdx();m.material.color.set(kat.color);strike(620,.4,.02,[[1,1]]);render()}else sewNext()});y-=h+gap}}
      render()}
    const curIdx=()=>Math.max(0,KAT_COLORS.findIndex(x=>x[1]===kat.color));
    function tintUnsewn(){for(const m of pieces)if(m.userData.ci==null)m.material.color.set(kat.color)}
    // a running stitch drawn round the edge of the piece just sewn
    function stitch(m){const [w,h]=m.userData.wh,iw=w/2-.03,ih=h/2-.03,pts=[];const per=2*(iw+ih)*2,n=Math.max(16,Math.round(per/.035));for(let k=0;k<=n;k++){let t=k/n*per,x,y;const e=2*iw,f=2*ih;if(t<e){x=-iw+t;y=ih}else if((t-=e)<f){x=iw;y=ih-t}else if((t-=f)<e){x=iw-t;y=-ih}else{t-=e;x=-iw;y=-ih+t}pts.push(new THREE.Vector3(x,y,.004))}
      const g=new THREE.BufferGeometry().setFromPoints(pts),line=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:'#f3e2b0'}));line.position.copy(m.position);g.setDrawRange(0,0);cloth.add(line);stitches.push({g,n:pts.length,t0:performance.now()})}
    st.tick.push(()=>{const now=performance.now();for(const s of stitches){const u=Math.min(1,(now-s.t0)/700);s.g.setDrawRange(0,Math.floor(u*s.n/2)*2)}
      if(dip){const u=Math.min(1,(now-dip.t0)/1400);strip.position.y=1.05-Math.sin(u*Math.PI)*.6;if(u>.5)strip.material.color.copy(dip.from).lerp(dip.to,Math.min(1,(u-.5)*2.5));if(u>=1)dip=null}});
    function sewNext(){if(kv.on){kv.on=false;kv.t0=performance.now();kv.from=[st.target.y,st.target.z,st.dist,st.pitch]}if(sewn>=pieces.length)return;const m=pieces[sewn++];m.userData.ci=curIdx();m.material.color.set(kat.color);m.material.opacity=1;m.material.transparent=false;stitch(m);katSwish();
      if(sewn%3===0){strike(1320,2.5,.025,[[1,1],[2.4,.3]]);rmHint('🪡 '+KAT_SEW_WORDS[(sewn/3-1)%KAT_SEW_WORDS.length])}render();if(sewn>=pieces.length){rmHint('Tấm y đã may xong · Gửi lời hồi hướng (nếu muốn) rồi gấp y');strike(196,4,.08)}}
    const esc=t=>String(t||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    function render(){const done=sewn>=pieces.length;rmPanel.innerHTML='<p>Y được may từ nhiều mảnh ghép như ruộng lúa xứ Magadha, mỗi đường viền là một bờ ruộng. Mỗi mũi khâu là một hơi thở có mặt.</p>'
      +'<p class="rm-note">Nhuộm vải: chọn một chậu thuốc nhuộm. Mỗi mảnh khâu nhận màu đang chọn, có thể may nhiều màu; chạm mảnh đã khâu để đổi màu.</p>'
      +'<div class="rm-row">'+KAT_COLORS.map(([n,c],i)=>'<button data-kc="'+c+'"'+(kat.color===c?' class="sel"':'')+'><span class="rm-dot" style="background:'+c+'"></span>'+n+' · '+KAT_DYES[i]+'</button>').join('')+'</div>'
      +'<div class="rm-row">'+KAT_DIEU.map(d=>'<button data-kd="'+d+'"'+(kat.dieu===d?' class="sel"':'')+'>'+d+' điều</button>').join('')+'<span class="rm-note">Đã khâu '+sewn+'/'+pieces.length+' mảnh</span></div>'
      +'<p class="rm-note">'+KAT_DIEU_INFO[kat.dieu]+'</p>'
      +(done?'<label class="kt-wish">Lời hồi hướng (không bắt buộc, sẽ hiện trong sổ kho y)<input data-kw maxlength="80" value="'+esc(kat.wish)+'" placeholder="Ví dụ: Hồi hướng bình an cho mẹ"></label><div class="rm-row">'+KAT_WISHES.map(w=>'<button data-kwt="'+esc(w)+'">'+w+'</button>').join('')+'</div>':'')
      +'<div class="rm-row">'+(done?'<button class="rm-gold" data-ks="fold">🙏 Gấp y, đặt lên khay và đội lên đầu</button>':'<button class="rm-gold" data-ks="sew">🪡 Khâu mảnh tiếp</button>')+'</div>'
      +'<div class="rm-row"><button data-ks="view">'+(kv.on?'🪡 Về khung may':'🧺 Nhìn kho y')+'</button><button data-ks="kho">📜 Sổ kho y</button></div><p class="rm-note">Kho y treo 9 tấm y gần nhất, trải đủ như lúc may · chạm vào tấm y hoặc Sổ kho y để xem đầy đủ.</p>'}
    rmPanel.oninput=e=>{if(e.target.matches('[data-kw]'))kat.wish=e.target.value.slice(0,80)};
    rmPanel.onclick=e=>{const c=e.target.closest('[data-kc]'),d=e.target.closest('[data-kd]'),s2=e.target.closest('[data-ks]'),wt=e.target.closest('[data-kwt]');if(c){kat.color=c.dataset.kc;tintUnsewn();dipTo(kat.color);render();return}if(d){kat.dieu=+d.dataset.kd;layout();return}
      if(wt){kat.wish=wt.dataset.kwt;render();return}
      if(s2?.dataset.ks==='kho'){openArchive('robes');return}if(s2?.dataset.ks==='view'){kv.on=!kv.on;kv.t0=performance.now();kv.from=[st.target.y,st.target.z,st.dist,st.pitch];render();return}if(s2?.dataset.ks==='sew')sewNext();else if(s2?.dataset.ks==='fold'){kat.wish=String(kat.wish||'').trim().slice(0,80);kat.pieces=pieces.map(m=>m.userData.ci).join('');const cnt=[0,0,0,0];for(const ch of kat.pieces)cnt[+ch]++;kat.color=KAT_COLORS[cnt.indexOf(Math.max(...cnt))][1];kat.phase='carry';closeRoom();setCarry(true);refreshKatPill();say('🟧 Bạn đang đội y trên đầu · Bấm "Rước y" để nhiễu Phật ba vòng')}};
    layout();strip.material.color.set(kat.color);st.onKho=drawKho;rTap(st,shelf,()=>openArchive('robes'))}
  function roomXuongGom(st){st.target.set(0,.85,0);st.dist=3.5;st.pitch=.16;
    if(gom.phase==='fire'||gom.phase==='spray'){rmHint('🔥 Gốm của bạn đang nung ngoài bãi bên hông nhà');rmPanel.innerHTML='<p>Gốm của bạn đang nằm trong lửa ở bãi nung bên hông nhà. Ra bãi nung để chờ lửa tàn và phun nước tạo màu.</p>';return}
    if(gom.phase==='carry'){setGomCarry(false);refreshGomPill();gom.phase='room';gom.step='xong'}
    if(gom.phase!=='room'){Object.assign(gom,{phase:'room',step:'nhao',kneads:0,shape:0,pattern:0,rounds:0,polish:0,seed:Math.floor(Math.random()*9999)})}
    rmHint('Nhà Chạm · gốm Chăm Bàu Trúc nặn tay, không bàn xoay · Kéo khung hình để nhìn quanh');const CSEATS=[];let V=gom;/* V: gốm đang hiện trên đôn (của mình, hoặc của người đang làm khi xem lượt của họ) */
    rAdd(st,new THREE.Mesh(new THREE.CylinderGeometry(.32,.38,.55,12),mat('#6b4a32')),0,.275,0);const sand=rAdd(st,new THREE.Mesh(new THREE.CylinderGeometry(.36,.36,.02,18),mat('#d8cba8')),0,.56,0);sand.visible=false;
    const lump=rAdd(st,new THREE.Mesh(new THREE.DodecahedronGeometry(.2,1),mat('#7f604c')),0,.72,0);lump.scale.set(1,.75,1);
    const potMat=gomMaterial(gom.shape,-1,gom.seed,'wet',false);const pot=rAdd(st,new THREE.Mesh(gomGeo(gom.shape,.01),potMat),0,.57,0);pot.visible=false;
    const guestColor=(()=>{try{return JSON.parse(localStorage.getItem('yenGuestProfile17')||'{}').color||'#687b48'}catch(e){return '#687b48'}})();
    const potter=new THREE.Group();/* the guest, bent over the clay */{const body=new THREE.Mesh(new THREE.ConeGeometry(.24,.95,10),mat(guestColor));body.position.y=.48;potter.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.12,12,10),mat('#d9b48f'));head.position.set(0,1.02,0);potter.add(head);
      for(const s of [-1,1]){const arm=new THREE.Mesh(new THREE.CylinderGeometry(.035,.035,.42,6),mat(guestColor));arm.position.set(s*.13,.72,-.16);arm.rotation.x=.9;potter.add(arm)}}
    st.sc.add(potter);let ang=1.9;const placePotter=()=>{potter.position.set(Math.sin(ang)*.95,0,Math.cos(ang)*.95);potter.rotation.set(0,ang,0);potter.rotateX(-.32)};placePotter();
    const LT=!!window.anyenLite;potter.visible=false;roomBox.classList.add('cham-lite');/* không vẽ người thợ sẵn: chính người chơi chạm vào đất để nặn như ở các nhà khác (lite và full) */
    const shelf=new THREE.Group();shelf.position.set(0,0,-3.05);st.sc.add(shelf);for(let k=0;k<6;k++){const b=new THREE.Mesh(new THREE.BoxGeometry(4,.06,.45),mat('#4e3a2a'));b.position.y=.12+k*.44;shelf.add(b)}
    const drawShelf=()=>{while(shelf.children.length>6)gomDispose(shelf.children[6],shelf);gomRows.filter(r=>gomAge(r)>=GOM_FIRE_SEC).slice(0,9).forEach((r,i)=>{const m=gomMesh(r,.72);m.position.set(-1.65+(i%6)*.66,.15+Math.floor(i/6)*.44,0);shelf.add(m)})};drawShelf();st.onPots=drawShelf;rTap(st,shelf,()=>openArchive('pots'));
    /* 3.41: bày biện theo ảnh Nhà Chạm: thảm cói, bàn xoay thứ hai có bình đang nặn, 6 bồ đoàn (3 quanh mỗi bàn, ngồi được), bàn gỗ bên phải có ống bút
       dụng cụ và bình hoa trắng, kệ thấp bên trái bày bình gốm, chum lớn ở góc, đèn lồng treo và dây leo hai bên kệ */
    {const sc=st.sc,A=(geo,m,x,y,z)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);sc.add(o);return o},Lt=(pts,seg=12)=>new THREE.LatheGeometry(pts.map(([a,b])=>new THREE.Vector2(a,b)),seg);
      const wood=mat('#7a5232'),woodD=mat('#4e3422'),cream=mat('#efe3c8'),clay=mat('#c98a5a'),jade=mat('#8fb3a0'),cush=mat('#ece2cc');
      const rug=A(new THREE.PlaneGeometry(5.2,3.4),mat('#d9c39a'),-.9,.006,.35);rug.rotation.x=-Math.PI/2;const rim=A(new THREE.PlaneGeometry(5.4,3.6),mat('#b89a6a'),-.9,.004,.35);rim.rotation.x=-Math.PI/2;
      const W2=[-2.05,.35];A(new THREE.CylinderGeometry(.34,.4,.55,12),mat('#6b4a32'),W2[0],.275,W2[1]);A(new THREE.CylinderGeometry(.36,.36,.05,16),woodD,W2[0],.57,W2[1]);A(Lt([[0,0],[.12,.01],[.2,.16],[.12,.34],[.13,.4]]),cream,W2[0],.6,W2[1]);
      const seatHit=new THREE.BoxGeometry(.6,.6,.6),seatM=new THREE.MeshBasicMaterial({visible:false});st.gomSeats=[];
      const seat=(cx,cz,a,r)=>{const x=cx+Math.sin(a)*r,z=cz+Math.cos(a)*r;A(new THREE.CylinderGeometry(.27,.29,.13,16),cush,x,.065,z);const h=A(seatHit,seatM,x,.3,z);const face=Math.atan2(cx-x,cz-z),ax=x+Math.sin(a)*.65,az=z+Math.cos(a)*.65;st.gomSeats.push([x,z]);const k=CSEATS.length;CSEATS.push({x,z,a:face,y:.14,ax,az});
        rTap(st,h,()=>{if(seatsH.tap(k))rmHint('🏺 Ngồi bồ đoàn bên bàn xoay · bấm Đứng lên hoặc đi để rời chỗ')})};
      for(const a of [0,-Math.PI/2,Math.PI])seat(W2[0],W2[1],a,1.05);for(const a of [Math.PI*.35,Math.PI*.0,-Math.PI*.35])seat(0,0,a+Math.PI*.0,1.45);
      const TX=2.75,TZ=-1.1;A(new THREE.BoxGeometry(1.4,.07,.8),wood,TX,.74,TZ);for(const a of [-1,1])for(const b of [-1,1])A(new THREE.BoxGeometry(.07,.72,.07),woodD,TX+a*.6,.36,TZ+b*.32);
      A(Lt([[0,0],[.1,.01],[.14,.13],[.08,.22]]),clay,TX+.35,.78,TZ-.12);for(let k=0;k<7;k++)A(new THREE.IcosahedronGeometry(.05,0),mat('#fbf7ee'),TX+.35+Math.cos(k)*.09,1.02+(k%3)*.05,TZ-.12+Math.sin(k)*.09);
      A(new THREE.CylinderGeometry(.05,.05,.13,8),cream,TX-.3,.84,TZ-.15);for(const k of [-1,0,1])A(new THREE.CylinderGeometry(.008,.008,.24,4),woodD,TX-.3+k*.015,.95,TZ-.15);A(new THREE.BoxGeometry(.42,.01,.3),mat('#f3ecd9'),TX-.05,.78,TZ+.16);
      const LX=-3.6,LZ=-1.3;A(new THREE.BoxGeometry(.5,.6,1.6),wood,LX,.3,LZ);[[cream,-.5,1.3],[jade,.05,1.1],[clay,.55,1.2]].forEach(([m,dz,s])=>A(Lt([[0,0],[.1*s,.01],[.14*s,.12*s],[.08*s,.24*s],[.09*s,.28*s]]),m,LX,.6,LZ+dz));
      A(Lt([[0,0],[.26,.02],[.42,.3],[.32,.64],[.23,.72],[.25,.76]],14),cream,-3.45,0,2.35);
      for(const x of [-2.6,2.4]){const l=A(new THREE.SphereGeometry(.2,12,10),mat('#f6e6c4'),x,2.45,-2.2);l.material.emissive=new THREE.Color('#ffcc80');l.material.emissiveIntensity=.9;l.scale.y=1.2;A(new THREE.BoxGeometry(.02,.8,.02),woodD,x,3.05,-2.2)}
      const pl=new THREE.PointLight('#ffd49a',1,8,1.6);pl.position.set(0,2.4,-.5);sc.add(pl);
      for(const s of [-1,1])for(let k=0;k<10;k++)A(new THREE.IcosahedronGeometry(.1,0),mat(k%2?'#6fa04a':'#86b85a'),s*2.15+Math.sin(k*2.1)*.12,3.2-k*.2,-2.9);
      {const cols=[cream,clay,jade,mat('#b9c49a'),mat('#a8673e')];for(let r=2;r<6;r++)for(let k=0;k<9;k++){const sc2=.8+((k+r)%3)*.25,x=-1.85+k*.46,y=.15+r*.44,m=cols[(k*3+r)%5];A(Lt((k+r)%2?[[0,0],[.07*sc2,.01],[.15*sc2,.09*sc2],[.16*sc2,.13*sc2]]:[[0,0],[.1*sc2,.01],[.14*sc2,.12*sc2],[.08*sc2,.24*sc2],[.09*sc2,.28*sc2]],10),m,x,y,-3.05)}}
      st.blocks=[[-.45,-.45,.45,.45],[W2[0]-.45,W2[1]-.45,W2[0]+.45,W2[1]+.45],[TX-.75,TZ-.45,TX+.75,TZ+.45],[LX-.3,LZ-.85,LX+.3,LZ+.85],[-3.9,2.0,-3.0,2.8],[-4,-3.4,4,-2.75]]}
    let anim=null,dryT=null;
    const setPot=(frac,shp)=>{pot.geometry.dispose();pot.geometry=gomGeo(shp==null?V.shape:shp,frac);pot.visible=frac>0;lump.visible=frac<1;const k=Math.max(.15,1-frac);lump.scale.set(k,.75*k,k);lump.position.y=.57+.15*k};
    const retex=(stage,g)=>{g=g||V;potMat.map.dispose();const t=new THREE.CanvasTexture(gomCanvas(g.shape,['nhao','cat','dang','nan','chuot','hoavan'].includes(g.step)?-1:g.pattern,g.seed,stage));t.colorSpace=THREE.SRGBColorSpace;t.wrapS=THREE.RepeatWrapping;potMat.map=t;potMat.roughness=g.polish>=2?.55:g.polish?.75:.95;potMat.needsUpdate=true};
    // resume a half-made pot if the guest stepped out
    if(['nan','chuot','hoavan','phoi','xong'].includes(gom.step)){sand.visible=true;setPot(gom.rounds/GOM_ROUNDS);retex(gom.step==='xong'?'dry':'wet')}else if(gom.step==='dang'||gom.step==='cat'){sand.visible=gom.step==='dang'}
    st.tick.push(t=>{if(anim){const u=Math.min(1,(performance.now()-anim.t0)/anim.dur);if(anim.kind==='round'){if(st.walk){const W=st.walk,b=anim.a0+u*Math.PI*2;W.dest=null;W.x=Math.sin(b)*.95;W.z=Math.cos(b)*.95;W.a=b+Math.PI}/* full: chính hình khách đi lùi quanh đôn */else st.yaw=anim.y0-u*Math.PI*2;ang=anim.a0+u*Math.PI*2;placePotter();potter.position.y=Math.abs(Math.sin(u*Math.PI*8))*.03;setPot((gom.rounds-1+u)/GOM_ROUNDS);const h=u<.5?'Hít vào…':'Thở ra…';if(anim.h!==h){anim.h=h;rmHint('🚶 Đi lùi quanh đôn · vòng '+gom.rounds+'/'+GOM_ROUNDS+' · '+h)}}
        else if(anim.kind==='knead'){const s=1-Math.sin(u*Math.PI)*.25;lump.scale.set(1+(1-s)*.6,.75*s,1+(1-s)*.6)}
        else if(anim.kind==='vround')setPot((anim.from+(anim.to-anim.from)*u)/GOM_ROUNDS);/* xem người khác đi lùi một vòng: thân gốm cao dần */
        if(u>=1){const k=anim.kind;anim=null;if(k==='round'&&gom.rounds>=GOM_ROUNDS){gom.step='chuot';setPot(1)}render()}}});
    st.cleanup=()=>{clearInterval(dryT);st.onPots=null;roomBox.classList.remove('cham-lite');share.off();seatsH.dispose()};
    const btn=(k,label,gold)=>'<button data-gm="'+k+'"'+(gold?' class="rm-gold"':'')+(anim?' disabled':'')+'>'+label+'</button>';
    function render(){if(turns.watching()){const v=V;rmPanel.innerHTML=turns.bar()+'<p>👀 <b>'+esc(turns.who(turns.turn()))+'</b> đang nặn gốm'+(v.step==='nan'?' · vòng '+v.rounds+'/'+GOM_ROUNDS:'')+'</p><p>'+talkOf(v.step)+'</p>';return}
      const s=gom.step;let h='';
      if(s==='nhao')h='<p>Đất sét ven sông được đập nhỏ, trộn cát rồi nhào kỹ. Mỗi lần nhào là một hơi thở.</p><div class="rm-row">'+btn('knead','👐 Nhào đất · '+gom.kneads+'/5',1)+'</div>';
      else if(s==='cat')h='<p>Rắc một lớp cát trắng mỏng lên mặt đôn để đất không dính, rồi đặt khối đất lên.</p><div class="rm-row">'+btn('sand','🤲 Rắc cát, đặt đất lên đôn',1)+'</div>';
      else if(s==='dang')h='<p>Chọn dáng gốm. Ở Bàu Trúc không dùng khuôn: mỗi món là một độc bản.</p><div class="rm-row">'+GOM_SHAPES.map((g,i)=>'<button data-gs="'+i+'"'+(gom.shape===i?' class="sel"':'')+'>'+g.name+'</button>').join('')+'</div><div class="rm-row">'+btn('start','🚶 Bắt đầu nặn',1)+'</div>';
      else if(s==='nan')h='<p>Không có bàn xoay: người thợ cúi xuống, đôi tay vuốt đất, chân đi lùi quanh đôn. Mỗi vòng thân gốm cao thêm một chút. Bước theo hơi thở.</p><div class="rm-row">'+btn('round','🚶 Đi lùi một vòng · '+gom.rounds+'/'+GOM_ROUNDS,1)+'</div>';
      else if(s==='chuot')h='<p>Chuốt láng thân gốm: vuốt bằng miếng vải ướt, rồi làm bóng bằng cật tre.</p><div class="rm-row">'+btn('polish0','💧 Vuốt vải ướt'+(gom.polish>=1?' ✓':''),!gom.polish)+btn('polish1','🎋 Làm bóng bằng cật tre',gom.polish===1)+'</div>';
      else if(s==='hoavan')h='<p>Khắc hoa văn bằng những dụng cụ mộc mạc.</p><div class="rm-row">'+GOM_TOOLS.map((t,i)=>'<button data-gt="'+i+'"'+(gom.pattern===i?' class="sel"':'')+'>'+t[0]+' · '+t[1]+'</button>').join('')+'</div><div class="rm-row">'+btn('carve','✍️ Khắc hoa văn',1)+'</div>';
      else if(s==='phoi')h='<p>Phơi gốm dưới nắng cho khô. <span class="rm-note">Thực tế ở Bàu Trúc gốm phơi nắng khoảng 4–6 giờ; trong Rừng Yên rút lại '+GOM_DRY_SEC+' giây.</span></p><div class="rm-row">'+(dryT?'<span class="rm-note">☀️ Đang phơi nắng · còn '+gom.dryLeft+' giây</span>':btn('dry','☀️ Phơi nắng',1))+'</div>';
      else if(s==='xong')h='<p>Gốm mộc đã khô. Đội gốm lên đầu như các bà, các mẹ ở làng gốm, mang ra bãi nung bên hông nhà.</p><div class="rm-row">'+btn('carry','🏺 Đội gốm ra bãi nung',1)+'</div>';
      if(s==='xong'&&window.anyenLite)h='<p>Gốm mộc đã khô. Ở bản nhẹ, gốm được nung ngay, có áo gốm hỏa biến và vào kho gốm luôn.</p><div class="rm-row">'+btn('carry','🔥 Nung gốm',1)+'</div>';
      if(!anim){const LH={nhao:'👐 Chạm khối đất để nhào · '+gom.kneads+'/5',cat:'🤲 Chạm đôn để rắc cát, đặt đất lên',dang:'Chọn dáng gốm bên dưới, rồi chạm đất để bắt đầu nặn',nan:'🚶 Chạm đất, đi lùi một vòng quanh đôn · '+gom.rounds+'/'+GOM_ROUNDS,chuot:gom.polish?'🎋 Chạm gốm để làm bóng bằng cật tre':'💧 Chạm gốm để vuốt vải ướt',hoavan:'✍️ Chọn dụng cụ bên dưới, rồi chạm gốm để khắc',phoi:dryT?'☀️ Đang phơi nắng · còn '+gom.dryLeft+' giây':'☀️ Chạm gốm để đem phơi nắng',xong:LT?'🔥 Chạm gốm để nung':'🏺 Chạm gốm để đội ra bãi nung'};if(LH[s])rmHint(LH[s])}
      rmPanel.innerHTML=turns.bar()+h+'<div class="rm-row"><button data-gm="kho">📜 Xem kho gốm</button></div><p class="rm-note">Kệ gốm 6 × 6 bày 36 chiếc gần nhất · chạm kệ hoặc nút trên để xem đầy đủ.</p>';turns.share(snap())}
    // 27/11: phiên Healer ở Nhà Chạm: Healer nặn mẫu trước, rồi mời lần lượt từng người (roomTurns); cả phòng thấy khối gốm của người đang làm lớn dần trên đôn
    // và thấy họ đi lùi quanh đôn (roomSeats walkers). Lời dẫn từng bước Healer gửi vào khung chat bằng một chạm.
    const GOM_TALK={nhao:'Đất sét ven sông được đập nhỏ, trộn cát rồi nhào kỹ. Mỗi lần nhào là một hơi thở.',cat:'Rắc một lớp cát trắng mỏng lên mặt đôn để đất không dính, rồi đặt khối đất lên.',dang:'Ở Bàu Trúc không dùng khuôn: mỗi món là một độc bản. Chọn dáng gốm hợp với lòng mình.',nan:'Không có bàn xoay: người thợ cúi xuống, đôi tay vuốt đất, chân đi lùi quanh đôn. Mỗi vòng thân gốm cao thêm một chút. Bước theo hơi thở.',chuot:'Chuốt láng thân gốm: vuốt bằng miếng vải ướt, rồi làm bóng bằng cật tre.',hoavan:'Khắc hoa văn bằng những dụng cụ mộc mạc: que tre, răng lược, vỏ sò.',phoi:'Phơi gốm dưới nắng cho khô. Chờ đợi cũng là một phần của việc làm gốm.',xong:'Gốm mộc đã khô, sẵn sàng vào lửa. Hỏa biến sẽ để lại những sắc màu không lặp lại.'};
    const talkOf=step=>GOM_TALK[step]||'';
    const snap=()=>({step:gom.step,kneads:gom.kneads,shape:gom.shape,pattern:gom.pattern,rounds:gom.rounds,polish:gom.polish,seed:gom.seed});
    function paint(s){sand.visible=!['nhao','cat'].includes(s.step);if(['nan','chuot','hoavan','phoi','xong'].includes(s.step)){setPot(s.rounds/GOM_ROUNDS,s.shape);retex(s.step==='xong'?'dry':'wet',s)}else{setPot(0,s.shape);lump.scale.set(1,.75,1);lump.position.y=.72}}
    function watchView(v){const prev=V;anim=null;const s=v&&typeof v.step==='string'&&GOM_TALK[v.step]?{step:v.step,kneads:+v.kneads||0,shape:Math.max(0,Math.min(GOM_SHAPES.length-1,+v.shape||0)),pattern:Math.max(0,Math.min(GOM_TOOLS.length-1,+v.pattern||0)),rounds:Math.max(0,Math.min(GOM_ROUNDS,+v.rounds||0)),polish:+v.polish||0,seed:+v.seed||1}:{step:'nhao',kneads:0,shape:0,pattern:0,rounds:0,polish:0,seed:1};
      V=s;paint(s);const same=prev!==gom&&prev.shape===s.shape;if(same&&s.step==='nan'&&s.rounds===prev.rounds+1){setPot(prev.rounds/GOM_ROUNDS);anim={kind:'vround',t0:performance.now(),dur:4800,from:prev.rounds,to:s.rounds}}
      else if(same&&s.step==='nhao'&&s.kneads>prev.kneads){anim={kind:'knead',t0:performance.now(),dur:600};strike(82,.6,.1,[[1,1],[1.6,.3]])}}
    const share=roomShare('xuong_gom',{change:()=>{seatsH.refresh();turns.onChange()},people:(S,grew)=>{seatsH.onPeople(grew);turns.onPeople(grew);render()},msg:m=>{if(!seatsH.onMsg(m))turns.onMsg(m)}});
    const seatsH=roomSeats(st,share,CSEATS,{walkers:true,hint:rmHint});
    const turns=roomTurns(share,{watch:watchView,own:()=>{anim=null;V=gom;paint(gom)},render:()=>render(),resend:()=>turns.share(snap()),talk:()=>talkOf((turns.watching()?V:gom).step)});
    render();
    rmPanel.onclick=e=>{if(turns.click(e)||turns.watching())return;const sh=e.target.closest('[data-gs]');if(sh){gom.shape=+sh.dataset.gs;render();return}const tl=e.target.closest('[data-gt]');if(tl){gom.pattern=+tl.dataset.gt;render();return}
      const a=e.target.closest('[data-gm]')?.dataset.gm;if(a==='kho'){openArchive('pots');return}act(a)};
    {const hit=rAdd(st,new THREE.Mesh(new THREE.CylinderGeometry(.5,.5,1.3,12),new THREE.MeshBasicMaterial({visible:false})),0,.65,0);
      rTap(st,hit,()=>{const s=gom.step;act({nhao:'knead',cat:'sand',dang:'start',nan:'round',chuot:gom.polish?'polish1':'polish0',hoavan:'carve',phoi:dryT?null:'dry',xong:'carry'}[s])})}
    function act(a){if(!a)return;if(turns.watching()){rmHint('👀 Đang xem '+turns.who(turns.turn())+' làm · chờ tới lượt mình nhé');return}if(anim)return;
      if(a==='knead'){gom.kneads++;strike(82,.6,.1,[[1,1],[1.6,.3]]);anim={kind:'knead',t0:performance.now(),dur:600};if(gom.kneads>=5)gom.step='cat';render()}
      else if(a==='sand'){sand.visible=true;strike(2400,.4,.012,[[1,1]]);gom.step='dang';render()}
      else if(a==='start'){gom.step='nan';gom.rounds=0;pot.geometry.dispose();pot.geometry=gomGeo(gom.shape,.01);render()}
      else if(a==='round'){gom.rounds++;anim={kind:'round',t0:performance.now(),dur:4800,a0:ang,y0:st.yaw};render()}
      else if(a==='polish0'){gom.polish=Math.max(1,gom.polish);retex('wet');strike(520,.8,.02,[[1,1]]);render()}
      else if(a==='polish1'){if(!gom.polish)return;gom.polish=2;retex('wet');strike(700,.8,.02,[[1,1]]);gom.step='hoavan';render()}
      else if(a==='carve'){gom.step='phoi';retex('wet');strike(900,.5,.02,[[1,1],[2.2,.3]]);render()}
      else if(a==='dry'){gom.dryLeft=GOM_DRY_SEC;dryT=setInterval(()=>{gom.dryLeft--;if(gom.dryLeft<=0){clearInterval(dryT);dryT=null;gom.step='xong';retex('dry');rmHint('☀️ Gốm mộc đã khô')}render()},1000);render()}
      else if(a==='carry'&&window.anyenLite&&window.__gomLiteFire){const R=window.__gomLiteFire();pot.visible=false;sand.visible=false;lump.visible=true;lump.scale.set(1,.75,1);rmHint('🏺 Gốm nung xong · đã vào kho gốm');
        rmPanel.innerHTML='<p><b>🏺 '+R.name+' · áo gốm '+R.fired+'</b></p><div class="rm-gom-done"></div><p>Hỏa biến đã để lại trên gốm của bạn những sắc màu không lặp lại. Gốm đã vào kho gốm và Túi An Yên.</p><div class="rm-row"><button data-gm="kho">📜 Xem kho gốm</button><button class="rm-gold" data-gm="again">👐 Nặn gốm mới</button></div>';
        if(R.img){R.img.style.cssText='display:block;max-width:180px;margin:4px auto';rmPanel.querySelector('.rm-gom-done').appendChild(R.img)}drawShelf()}
      else if(a==='again'){render()}
      else if(a==='carry'){closeRoom();gom.phase='carry';setGomCarry(true);refreshGomPill();say('🏺 Đội gốm ra bãi nung · Chạm nút bên dưới để đi');}}}
  // ---------------------------------------------------------------- Nhà Niệm · House of Mindfulness (Đ1)
  // Bản vẽ nội thất 11 × 11 × 6,2 m: gỗ trầm #4A3C2E, cột #261C14, đá bazan #4C4A43, chiếu cói #9E8969.
  // Cửa vòm Trăng (R 1,8 m) nhìn ra Hồ Niệm, giếng trời Oculus (R 1,8 m) rọi cột nắng xuống Đèn Thở ở tâm phòng.
  // Đèn Thở là PointLight duy nhất; toàn bộ lưới nội thất dưới 1.750 tam giác (window.__niem.tris() để kiểm).
  // 00 Gột bụi rồi chọn luồng: Solo (không vào kênh nào) hoặc Phiên 1+5 (kênh phiên riêng của lịch Healer, qua space-chat.js).
  // 01 Thở cùng Đèn Thở · 02 Khoảng Lặng 18 phút · 03 Lần chuỗi 108 hạt · 04 Bát Buông Bỏ (chữ chỉ ở trên máy, tan ngay, không lưu, không gửi) & Kệ 9 thẻ.
  // Không tạo kho vật phẩm: mốc lần chuỗi chỉ ghi nhẹ vào Nhật ký An Yên trên máy.
  function roomNhaNiem(st){
    const R=5.5,H=6.2,C={wood:'#4A3C2E',col:'#261C14',basalt:'#4C4A43',mat:'#9E8969',floor:'#3a2d21',brass:'#a6824b',pine:'#2f5a48',lampW:'#FFFDF5',lampG:'#D9A338'};
    const sc=st.sc,texs=[],offs=[];
    const on=(t,n,f,o)=>{t.addEventListener(n,f,o);offs.push(()=>t.removeEventListener(n,f,o))};
    const M=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.9,side:THREE.DoubleSide},o||{}));
    const add=(geo,m,x,y,z,rx,ry)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);if(rx)o.rotation.x=rx;if(ry)o.rotation.y=ry;sc.add(o);return o};
    const tex=(w,h,draw,rep)=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d');draw(c,w,h);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1])}texs.push(t);t.cv=cv;t.c=c;return t};
    const glow=(c,o)=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
    const LS=(k,v)=>{try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}};
    sc.background=new THREE.Color('#17120d');roomBox.classList.add('niem');
    // ---- ánh sáng: bán cầu dịu + nắng giếng trời (định hướng) + 1 PointLight Đèn Thở
    const LIGHT={hemi:.7,key:.9,lamp:4.2};st.hemi.color.set('#f3e2c2');st.hemi.groundColor.set('#2a2016');st.key.color.set('#ffe7bd');st.key.position.set(1.2,9,2.5);
    // ---- vỏ phòng: sàn ván, tường ván gỗ trầm, vách lam phía sau lưng (Đông-Bắc), trần có giếng trời
    const boards=(seam,rx,ry)=>tex(128,128,(c,w,h)=>{c.fillStyle=C.wood;c.fillRect(0,0,w,h);for(let i=0;i<40;i++){c.fillStyle='rgba(20,12,6,'+(.04+Math.random()*.05)+')';c.fillRect(Math.random()*w,0,1+Math.random()*2,h)}c.fillStyle=seam;c.fillRect(0,0,3,h);c.fillRect(w/2,0,3,h)},[rx,ry]);
    const floorT=tex(128,128,(c,w,h)=>{c.fillStyle=C.floor;c.fillRect(0,0,w,h);for(let i=0;i<4;i++){c.fillStyle='rgba(0,0,0,.28)';c.fillRect(0,i*32,w,2);c.fillStyle='rgba(255,230,190,.035)';c.fillRect(0,i*32+2,w,14)}},[6,6]);
    add(new THREE.PlaneGeometry(2*R,2*R),M('#fff',{map:floorT}),0,0,0,-Math.PI/2);
    add(new THREE.PlaneGeometry(2*R,H),M('#fff',{map:boards('#231910',11,1)}),-R,H/2,0,0,Math.PI/2);
    add(new THREE.PlaneGeometry(2*R,H),M('#fff',{map:boards('#231910',11,1)}),R,H/2,0,0,-Math.PI/2);
    const lamT=tex(64,64,(c,w,h)=>{c.fillStyle='#1c140d';c.fillRect(0,0,w,h);const g=c.createLinearGradient(0,0,w,0);g.addColorStop(0,'#3a2d20');g.addColorStop(.5,'#5a4632');g.addColorStop(1,'#3a2d20');c.fillStyle=g;c.fillRect(8,0,w-16,h)},[26,1]);
    add(new THREE.PlaneGeometry(2*R,H),M('#fff',{map:lamT}),0,H/2,R,0,Math.PI);
    // mặt tường Tây-Nam có lỗ tròn cửa vòm Trăng
    const MY=2.2,MR=1.8;{const s=new THREE.Shape();s.moveTo(-R,0);s.lineTo(R,0);s.lineTo(R,H);s.lineTo(-R,H);s.lineTo(-R,0);const hole=new THREE.Path();hole.absarc(0,MY,MR,0,Math.PI*2,true);s.holes.push(hole);
      const t=boards('#231910',1,1);t.repeat.set(1,1);add(new THREE.ShapeGeometry(s,8),M('#fff',{map:t}),0,0,-R)}
    add(new THREE.RingGeometry(MR,MR+.18,32),M(C.col),0,MY,-R+.02);
    // khung nhìn ra Hồ Niệm: mặt nước phẳng gương, rừng thông, sen trắng
    const viewT=tex(512,512,(c,w,h)=>{let g=c.createLinearGradient(0,0,0,h*.52);g.addColorStop(0,'#cfdcd6');g.addColorStop(1,'#f1e6cb');c.fillStyle=g;c.fillRect(0,0,w,h);
      c.fillStyle='#8fa596';c.beginPath();c.moveTo(0,250);for(let x=0;x<=w;x+=32)c.lineTo(x,226+Math.sin(x*.02)*14);c.lineTo(w,262);c.lineTo(0,262);c.fill();
      for(const [x,s,col] of [[70,1.25,'#29483a'],[130,.85,'#35574a'],[190,1,'#2c4b3e'],[330,1.15,'#29483a'],[392,.8,'#36584a'],[452,1.3,'#253f34']]){c.fillStyle=col;for(let k=0;k<3;k++){c.beginPath();c.moveTo(x,262-170*s+k*48*s);c.lineTo(x-34*s-k*10*s,262-90*s+k*40*s);c.lineTo(x+34*s+k*10*s,262-90*s+k*40*s);c.fill()}}
      g=c.createLinearGradient(0,262,0,h);g.addColorStop(0,'#7fa5a2');g.addColorStop(1,'#3c6466');c.fillStyle=g;c.fillRect(0,262,w,h-262);c.fillStyle='rgba(255,255,255,.18)';for(let k=0;k<9;k++)c.fillRect(60+k*41%380,290+k*22,90-k*5,2);
      for(const [x,y,r] of [[170,372,30],[330,410,38],[240,452,24],[400,350,20]]){c.fillStyle='#4f7d5c';c.beginPath();c.ellipse(x,y,r,r*.35,0,.3,Math.PI*2-.1);c.fill()}
      for(const [x,y] of [[178,360],[338,396]]){c.fillStyle='#fbfaf3';for(let k=-2;k<=2;k++){c.beginPath();c.ellipse(x+k*7,y-6,6,14,k*.35,0,Math.PI*2);c.fill()}c.fillStyle='#d8a73a';c.beginPath();c.arc(x,y-4,4,0,Math.PI*2);c.fill()}});
    add(new THREE.PlaneGeometry(4.4,4.4),new THREE.MeshBasicMaterial({map:viewT}),0,MY,-R-.4);
    add(new THREE.BoxGeometry(3.8,.4,.5),M(C.basalt),0,.2,-R+.25);/* bậu cửa đá bazan */
    // trần gỗ tối mở giếng trời tròn, đĩa trời sáng phía trên, xà và cột góc
    {const s=new THREE.Shape();s.moveTo(-R,-R);s.lineTo(R,-R);s.lineTo(R,R);s.lineTo(-R,R);s.lineTo(-R,-R);const hole=new THREE.Path();hole.absarc(0,0,MR,0,Math.PI*2,true);s.holes.push(hole);add(new THREE.ShapeGeometry(s,8),M(C.col),0,H,0,Math.PI/2)}
    add(new THREE.CircleGeometry(MR,16),new THREE.MeshBasicMaterial({color:'#fbf1d4'}),0,H+.35,0,Math.PI/2);
    for(const [w,d,x,z] of [[2*R,.35,0,-R+.18],[2*R,.35,0,R-.18],[.35,2*R,-R+.18,0],[.35,2*R,R-.18,0]])add(new THREE.BoxGeometry(w,.4,d),M(C.col),x,H-.2,z);
    for(const [x,z] of [[-R+.2,-R+.2],[R-.2,-R+.2],[-R+.2,R-.2],[R-.2,R-.2],[-2.6,-R+.2],[2.6,-R+.2]])add(new THREE.BoxGeometry(.4,H,.4),M(C.col),x,H/2,z);
    // ---- tâm phòng: chiếu cói, vũng nắng, cột nắng giếng trời, Đèn Thở trên bệ đá
    const matT=tex(64,64,(c,w,h)=>{c.fillStyle=C.mat;c.fillRect(0,0,w,h);c.strokeStyle='rgba(60,45,25,.25)';for(let y=0;y<h;y+=4){c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke()}c.fillStyle='rgba(255,240,200,.08)';for(let x=0;x<w;x+=8)c.fillRect(x,0,3,h)},[7,7]);
    add(new THREE.CircleGeometry(3.3,24),M('#fff',{map:matT}),0,.012,0,-Math.PI/2);
    const pool=add(new THREE.CircleGeometry(2.1,16),glow('#ffe2a0',.12),0,.022,0,-Math.PI/2);
    const beamCol=add(new THREE.CylinderGeometry(MR*.95,2.1,H,16,1,true),glow('#ffe6a8',.07),0,H/2,0);
    add(new THREE.CylinderGeometry(.32,.42,.55,8),M(C.basalt),0,.275,0);
    const lamp=add(new THREE.SphereGeometry(.2,10,7),new THREE.MeshStandardMaterial({color:'#ffffff',emissive:C.lampW,emissiveIntensity:.85,roughness:.4}),0,.86,0);
    const haloT=tex(64,64,(c,w)=>{const g=c.createRadialGradient(32,32,0,32,32,32);g.addColorStop(0,'rgba(255,240,200,.9)');g.addColorStop(.35,'rgba(217,163,56,.35)');g.addColorStop(1,'rgba(217,163,56,0)');c.fillStyle=g;c.fillRect(0,0,w,w)});
    const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:haloT,blending:THREE.AdditiveBlending,depthWrite:false,transparent:true}));halo.position.copy(lamp.position);halo.scale.setScalar(1.7);sc.add(halo);
    const light=new THREE.PointLight(C.lampG,LIGHT.lamp,12,1.5);light.position.set(0,1.05,0);sc.add(light);
    // ---- vòng tọa cụ 1 + 5: Healer (vàng đồng trầm) quay lưng ra cửa vòm Trăng, 5 khách (xanh thông trầm)
    const seats=[];for(let k=0;k<6;k++){const a=Math.PI+k*Math.PI/3,x=Math.sin(a)*2.4,z=Math.cos(a)*2.4,healer=k===0;
      const m=M(healer?C.brass:C.pine,{emissive:healer?'#7a5a24':'#1f4a3a',emissiveIntensity:0,roughness:.85});const s=add(new THREE.CylinderGeometry(.36,.4,.14,8),m,x,.08,z);s.userData={k,healer};seats.push(s)}
    const seatA=k=>Math.PI+k*Math.PI/3;
    st.blocks=(st.blocks||[]).concat([[-.45,-.45,.45,.45]]);/* 27/11: Đèn Thở giữa vòng: đi vòng, không xuyên qua */
    // nhân vật ngồi tọa thiền (kiết già) trên tọa cụ: thân áo + vạt chân là 1 Lathe, đầu là khối 20 mặt; mỗi người 68 tam giác
    const ROBE=['#b8873f','#5b7f6b','#8a6a8e','#4f6f86','#9a6b4f','#6f7d52'],SKIN=new THREE.Color('#e2b98f');
    const bodyG=new THREE.LatheGeometry([[.34,0],[.36,.08],[.2,.17],[.22,.42],[.07,.5]].map(([a,b])=>new THREE.Vector2(a,b)),6);
    const bodies=new THREE.InstancedMesh(bodyG,new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.85,side:THREE.DoubleSide,emissive:'#2a1d10',emissiveIntensity:.35}),6),heads=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.11,0),new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.7,flatShading:true}),6);
    bodies.count=heads.count=0;sc.add(bodies,heads);
    // bệ Chuông Đồng ngay dưới bậu cửa, cạnh tọa cụ Healer
    add(new THREE.BoxGeometry(.5,.18,.5),M(C.basalt),.85,.09,-3.05);
    const bell=add(new THREE.LatheGeometry([[0,0],[.13,.01],[.21,.08],[.23,.19],[.215,.21]].map(([a,b])=>new THREE.Vector2(a,b)),8),M('#b88d45',{metalness:.65,roughness:.32}),.85,.18,-3.05);
    const wave=add(new THREE.RingGeometry(.95,1,24),glow('#ffd88a',0),0,.03,0,-Math.PI/2);
    // ---- Tường trái · Trạm 3: bảng lần chuỗi 108 hạt (1 InstancedMesh), số đếm giữa vòng, vòng sáng đồng
    const BY=2.35,BR=1.02,bx=-R+.08;
    add(new THREE.BoxGeometry(.06,2.9,2.9),M(C.col),-R+.03,BY,0);const board=add(new THREE.PlaneGeometry(2.66,2.66),M('#e9dcc0',{roughness:1}),bx,BY,0,0,Math.PI/2);
    const beadT=tex(64,64,(c,w)=>{const g=c.createRadialGradient(24,22,2,32,32,30);g.addColorStop(0,'#fff3dc');g.addColorStop(.45,'#d9b48a');g.addColorStop(1,'#6b4a2c');c.fillStyle=g;c.beginPath();c.arc(32,32,29,0,Math.PI*2);c.fill()});
    const beads=new THREE.InstancedMesh(new THREE.PlaneGeometry(.09,.09),new THREE.MeshBasicMaterial({map:beadT,alphaTest:.5,side:THREE.DoubleSide}),108);sc.add(beads);
    const dummy=new THREE.Object3D(),cDone=new THREE.Color('#f1c98a'),cTodo=new THREE.Color('#7a5638');
    const countT=tex(256,256,()=>{});const counter=add(new THREE.PlaneGeometry(1.1,1.1),new THREE.MeshBasicMaterial({map:countT,transparent:true}),bx+.01,BY,0,0,Math.PI/2);
    const beadRing=add(new THREE.RingGeometry(BR+.09,BR+.15,28),glow('#f2c46a',.12),bx+.02,BY,0,0,Math.PI/2);
    // ---- Tường phải · Trạm 4: kệ 9 thẻ, Bát Nước Buông Bỏ bằng đá bazan
    add(new THREE.BoxGeometry(.06,1.75,2.7),M(C.col),R-.03,3.0,0);
    const cardT=tex(128,72,(c,w,h)=>{c.fillStyle='#f4ead6';c.fillRect(0,0,w,h);c.fillStyle='rgba(120,90,50,.35)';c.fillRect(22,26,84,4);c.fillRect(32,42,64,4);c.strokeStyle='#c8a96a';c.lineWidth=3;c.strokeRect(4,4,w-8,h-8)});
    const cards=new THREE.InstancedMesh(new THREE.PlaneGeometry(.66,.38),new THREE.MeshBasicMaterial({map:cardT,side:THREE.DoubleSide}),9);sc.add(cards);
    const cardPos=k=>[R-.09,3.45-Math.floor(k/3)*.5,(k%3-1)*.82];
    const drawCards=pick=>{for(let k=0;k<9;k++){const [x,y,z]=cardPos(k);dummy.position.set(x-(k===pick?.08:0),y,z);dummy.rotation.set(0,-Math.PI/2,0);dummy.scale.setScalar(k===pick?1.12:1);dummy.updateMatrix();cards.setMatrixAt(k,dummy.matrix);cards.setColorAt(k,new THREE.Color(k===pick?'#fff8e2':pick==null?'#b8ab92':'#6e6555'))}cards.instanceMatrix.needsUpdate=true;cards.instanceColor.needsUpdate=true};
    add(new THREE.BoxGeometry(1.1,.72,.9),M(C.col),R-.8,.36,0);
    const bowl=add(new THREE.LatheGeometry([[0,0],[.3,.02],[.46,.14],[.52,.3],[.5,.32]].map(([a,b])=>new THREE.Vector2(a,b)),10),M(C.basalt,{roughness:.75}),R-.8,.72,0);
    const waterT=tex(256,256,()=>{});const water=add(new THREE.CircleGeometry(.47,20),new THREE.MeshBasicMaterial({map:waterT}),R-.8,.72+.27,0);water.rotation.set(-Math.PI/2,0,-Math.PI/2);
    const ripple=add(new THREE.RingGeometry(.9,1,24),glow('#d8f0ee',0),R-.8,.72+.28,0,-Math.PI/2);
    // ---- âm thanh
    const ac=audio();
    const knock=()=>{strike(1150,.09,.07,[[1,1],[1.6,.4]]);strike(380,.14,.05,[[1,1]])};
    const bellSound=()=>{strike(196,10,.15,[[1,1],[2.76,.4],[5.4,.14],[1.5,.18]]);bell.userData.ring=performance.now();wave.userData.t0=performance.now()};
    const softBell=()=>strike(392,7,.07,[[1,1],[2.76,.3],[5.4,.1]]);
    let noiseBuf=null;const noise=()=>{if(noiseBuf||!ac)return noiseBuf;const n=ac.sampleRate*2,b=ac.createBuffer(1,n,ac.sampleRate),d=b.getChannelData(0);let l=0;for(let i=0;i<n;i++){l=(l+.02*(Math.random()*2-1))/1.02;d[i]=l*3.5}return noiseBuf=b};
    const splash=()=>{if(!ac)return;const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain(),t=ac.currentTime;s.buffer=noise();f.type='bandpass';f.frequency.value=1400;f.Q.value=.8;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.35,t+.15);g.gain.exponentialRampToValueAtTime(.001,t+1.6);s.connect(f).connect(g).connect(ac.destination);s.start(t);s.stop(t+1.7);[0,.35,.8].forEach(d=>setTimeout(()=>strike(1900+Math.random()*700,.25,.012,[[1,1]]),300+d*1000))};
    const bamboo=()=>[[523,0],[659,180],[587,420],[784,700]].forEach(([f,d])=>setTimeout(()=>strike(f,.9,.035,[[1,1],[2.7,.25],[4.1,.08]]),d));
    let amb=null;
    function ambientOn(){if(amb||!ac)return;const g=ac.createGain(),t=ac.currentTime;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(1,t+5);g.connect(ac.destination);
      const mk=(type,freq,q,vol)=>{const s=ac.createBufferSource(),f=ac.createBiquadFilter(),v=ac.createGain();s.buffer=noise();s.loop=true;f.type=type;f.frequency.value=freq;f.Q.value=q;v.gain.value=vol;s.connect(f).connect(v).connect(g);s.start();return {s,v}};
      const wind=mk('lowpass',420,.4,.22),wat=mk('bandpass',900,.7,.05);const lfo=ac.createOscillator(),lg=ac.createGain();lfo.frequency.value=.07;lg.gain.value=.1;lfo.connect(lg).connect(wind.v.gain);lfo.start();
      const drip=setInterval(()=>{if(Math.random()<.5)strike(1700+Math.random()*900,.3,.006,[[1,1]])},2600);amb={g,srcs:[wind.s,wat.s,lfo],drip}}
    function ambientOff(){if(!amb)return;const a=amb;amb=null;clearInterval(a.drip);try{const t=ac.currentTime;a.g.gain.cancelScheduledValues(t);a.g.gain.setValueAtTime(a.g.gain.value,t);a.g.gain.linearRampToValueAtTime(0,t+1.2)}catch(e){}setTimeout(()=>{for(const s of a.srcs)try{s.stop()}catch(e){}a.g.disconnect()},1400)}
    // ---- góc nhìn từng trạm (trượt mềm)
    const VIEWS={overview:[0,1.4,.6,0,.2,4.3],gate:[0,2.1,-3.2,0,.06,3.6],beads:[-R+.1,BY,0,Math.PI/2,.02,2.9],cards:[R-.1,2.95,0,-Math.PI/2,.04,2.7],bowl:[R-.8,1.0,0,-Math.PI/2,.62,2.1]};
    let tw=null;function goView(k){if(k==='seat'||k==='seatH'){const a=seatA(S.mySeat==null?3:S.mySeat);VIEWS.seat=[0,.45,0,a,.62,4.4];/* sau lưng mình, cao vừa đủ thấy cả vòng tọa cụ */k='seat'}const v=VIEWS[k];tw={a:[st.target.x,st.target.y,st.target.z,st.yaw,st.pitch,st.dist],b:v,t0:performance.now()};st.yawC=v[3]}
    st.minD=1.8;st.maxD=4.5;st.target.set(0,1.6,-1.2);st.yaw=0;st.pitch=.1;st.dist=4.4;goView('gate');
    // ---- trạng thái
    const S={entered:false,mode:'solo',pending:false,healer:false,healerHere:false,people:0,mySeat:3,occ:{},therapist:null,me:null,list:[],act:null,tab:'home',beads:0,mark:{},card:null,rel:null,dim:0,quiet:false};
    const BREATH={'446':[4,4,6],'478':[4,7,8]};
    const STATE_LINES={khoi:['Khởi','Hôm nay cần một cú đẩy nhẹ để bắt đầu.'],giao:['Giao','Hôm nay cần sự ấm áp và kết nối.'],an:['An','Hôm nay cần buông căng thẳng và ngủ yên.'],hoa:['Hoa','Hôm nay đang ổn, hãy sáng tạo và lan toả.'],tinh:['Tịnh','Hôm nay cần lắng xuống và hạ nhiệt.']};
    const ansense=()=>{try{const r=JSON.parse(localStorage.getItem('anyen-ansense-v1')||'{}').result;return r&&STATE_LINES[r.state]?r.state:null}catch(e){return null}};
    const CARDS=[['Thở ra dài hơn hít vào. Thế là đủ cho phút này.',['an','tinh']],['Buông một điều nhỏ. Bàn tay nhẹ thì lòng cũng nhẹ.',['tinh']],['Uống một ngụm nước thật chậm, cảm nhận nó đi qua.',['tinh','an']],
      ['Đặt một ý định nhỏ cho hôm nay, rồi bước bước đầu tiên.',['khoi']],['Đứng dậy, vươn vai, để ánh sáng chạm vào mặt.',['khoi']],['Gửi một lời cảm ơn cho một người, dù chỉ một dòng.',['giao']],
      ['Đặt tay lên ngực và nói thầm: mình đang ở đây với mình.',['giao','an']],['Nhìn một vật quen như thể lần đầu bạn thấy nó.',['hoa']],['Điều đang có mặt bây giờ là đủ để bắt đầu.',['hoa','khoi']]];
    const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
    const today=()=>new Date().toLocaleDateString('sv');
    const journal=(quote)=>{window.dispatchEvent(new CustomEvent('anyen-journal-add',{detail:{lake:'Niệm',title:'🕯️ Nhà Niệm',quote,at:Date.now()}}))};
    const inSession=()=>S.mode==='session';
    const send=p=>{if(inSession()&&S.healer&&window.anyenSpaceChat)window.anyenSpaceChat.send(p)};
    // ---- 108 hạt
    function drawBeads(){const cur=S.beads%108;for(let k=0;k<108;k++){const a=k/108*Math.PI*2;dummy.position.set(bx+.015,BY+Math.cos(a)*BR,-Math.sin(a)*BR);dummy.rotation.set(0,Math.PI/2,0);dummy.scale.setScalar(k===cur?1.45:1);dummy.updateMatrix();beads.setMatrixAt(k,dummy.matrix);beads.setColorAt(k,k<cur||(S.beads&&cur===0&&S.full)?cDone:cTodo)}beads.instanceMatrix.needsUpdate=true;beads.instanceColor.needsUpdate=true;
      const c=countT.c;c.clearRect(0,0,256,256);c.fillStyle='rgba(250,244,230,.92)';c.beginPath();c.arc(128,128,96,0,Math.PI*2);c.fill();c.strokeStyle='#a6824b';c.lineWidth=4;c.stroke();c.fillStyle='#3a2a1c';c.textAlign='center';c.font='600 72px Georgia, serif';c.fillText(String(S.full&&cur===0?108:cur),128,138);c.font='600 22px system-ui, sans-serif';c.fillStyle='#8c6a34';c.fillText('HẠT LÀNH',128,178);countT.needsUpdate=true}
    function bead(){S.beads++;S.full=false;knock();const n=S.beads%108||108;if(n===108)S.full=true;
      if(n===18||n===54||n===108){beadRing.userData.t0=performance.now();setTimeout(()=>strike(n===108?262:330,4,.05,[[1,1],[2,.3],[3,.12]]),120);
        const key=Math.floor((S.beads-1)/108)+':'+n;if(!S.mark[key]){S.mark[key]=1;journal('Lần chuỗi '+n+' hạt theo hơi thở'+(n===108?' · tròn một vòng':''));rmHint('📿 '+n+' hạt · đã ghi nhẹ vào Nhật ký An Yên')}}
      drawBeads();if(S.tab==='beads')render()}
    // ---- Bát Buông Bỏ: chữ chỉ nằm trong biến tạm, vẽ lên mặt nước rồi tan; không lưu, không gửi đi đâu
    const textCv=document.createElement('canvas');textCv.width=textCv.height=256;
    function paintWater(p){const c=waterT.c;let g=c.createRadialGradient(128,128,10,128,128,130);g.addColorStop(0,'#6f9ea2');g.addColorStop(1,'#29474b');c.fillStyle=g;c.fillRect(0,0,256,256);
      if(S.rel){const k=Math.max(0,p);for(let y=0;y<256;y+=3){const dx=Math.sin(y*.09+k*16)*k*k*30,dy=Math.sin(k*9+y*.05)*k*6;c.globalAlpha=Math.max(0,Math.min(1,(p<0?1+p/0.4:1)-k*1.05));c.drawImage(textCv,0,y,256,3,dx,y+dy,256,3)}c.globalAlpha=1}
      c.strokeStyle='rgba(230,248,246,.25)';c.lineWidth=2;for(let i=0;i<3;i++){const r=((performance.now()/40+i*40)%130);c.beginPath();c.arc(128,128,r,0,Math.PI*2);c.stroke()}waterT.needsUpdate=true}
    function release(text){text=String(text||'').trim().slice(0,80);if(!text||S.rel)return;const c=textCv.getContext('2d');c.clearRect(0,0,256,256);c.fillStyle='#fbf6e8';c.textAlign='center';c.font='italic 21px Georgia, serif';
      const words=text.split(/\s+/),lines=[];let ln='';for(const w of words){const t=ln?ln+' '+w:w;if(c.measureText(t).width>186&&ln){lines.push(ln);ln=w}else ln=t}if(ln)lines.push(ln);lines.slice(0,5).forEach((l,i,a)=>c.fillText(l,128,128-(a.length-1)*13+i*26+7));
      text=null;S.rel={t0:performance.now()};splash();goView('bowl');ripple.userData.t0=performance.now()+1400}
    // ---- Kệ 9 thẻ: mỗi ngày một thẻ, ưu tiên khớp trạng thái AnSense
    function drawCard(){const d=today();let saved=null;try{saved=JSON.parse(LS('yen_niem_the')||'null')}catch(e){}
      if(saved&&saved.d===d&&CARDS[saved.i]){S.card=saved.i;S.cardAgain=true}else{const stt=ansense(),pool=CARDS.map((c,i)=>i).filter(i=>!stt||CARDS[i][1].includes(stt));S.card=pool[Math.floor(Math.random()*pool.length)];S.cardAgain=false;LS('yen_niem_the',JSON.stringify({d,i:S.card}))}
      drawCards(S.card);strike(880,1.2,.025,[[1,1],[2,.2]]);goView('cards')}
    // ---- Thở cùng Đèn Thở · Khoảng Lặng 18 phút
    const brEl=roomBox.querySelector('#roomBreath'),brTxt=brEl.querySelector('span');
    function stopAct(remote,silent){const a=S.act;if(!a)return;S.act=null;brEl.hidden=true;brTxt.textContent='';setQuiet(false);ambientOff();if(!remote&&a.shared)send({k:'stop'});if(!silent&&a.kind==='breath')rmHint('🕯️ Đã thở '+Math.max(1,Math.round((Date.now()-a.t0)/60000))+' phút cùng Đèn Thở');render()}
    function startBreath(p,m,el,remote){stopAct(true,true);S.act={kind:'breath',p:BREATH[p]?p:'446',m:[3,6,10].includes(+m)?+m:3,t0:Date.now()-(el||0)*1000,ph:-1,shared:inSession()&&S.healer&&!remote};
      if(S.act.shared)send({k:'breath',p:S.act.p,m:S.act.m,el:0});brEl.hidden=false;goView(S.healer&&inSession()?'seatH':'seat');softBell();S.tab='breath';render()}
    function startSilence(el,remote){stopAct(true,true);S.act={kind:'silence',m:18,t0:Date.now()-(el||0)*1000,bells:{},shared:inSession()&&S.healer&&!remote};if(S.act.shared)send({k:'silence',el:0});
      ambientOn();goView(S.healer&&inSession()?'seatH':'seat');S.tab='silence';render();setQuiet(true)}
    function tickAct(){const a=S.act;if(!a)return 0;const el=(Date.now()-a.t0)/1000;
      if(a.kind==='silence'){for(const [m,k] of [[0,'a'],[9,'b'],[18,'c']])if(el>=m*60&&!a.bells[k]){a.bells[k]=1;bellSound()}
        if(el>=18*60){S.act=null;ambientOff();setQuiet(false);S.tab='silenceDone';render()}return .5+.5*Math.sin(el*2*Math.PI/10)}
      const pat=BREATH[a.p],cyc=pat[0]+pat[1]+pat[2];if(el>=a.m*60){S.act=null;brEl.hidden=true;bellSound();S.tab='breathDone';render();return 0}
      const u=el%cyc;let ph,left,b;if(u<pat[0]){ph=0;left=pat[0]-u;b=u/pat[0]}else if(u<pat[0]+pat[1]){ph=1;left=pat[0]+pat[1]-u;b=1}else{ph=2;left=cyc-u;b=1-(u-pat[0]-pat[1])/pat[2]}
      b=b*b*(3-2*b);if(ph!==a.ph){a.ph=ph;strike([330,392,262][ph],2.2,.02,[[1,1],[2,.2]])}brTxt.textContent=['Hít vào','Giữ hơi','Thở ra'][ph]+' · '+Math.ceil(left);return b}
    // ---- giao diện tự ẩn trong Khoảng Lặng (chạm màn hình để hiện lại 3 giây)
    let peekT=0;function setQuiet(v){S.quiet=v;roomBox.classList.toggle('niem-quiet',v);document.body.classList.toggle('niem-quiet',v);if(v)peek()}
    function peek(){roomBox.classList.add('peek');clearTimeout(peekT);peekT=setTimeout(()=>roomBox.classList.remove('peek'),3000)}
    on(roomBox,'pointerdown',()=>{if(S.quiet)peek()});
    // ---- Phiên 1+5: dùng kênh phiên riêng của Lịch trị liệu (space-chat.js xin chỗ anyen_space_enter → anyen:sp:nha_niem__s<phiên>)
    let pendT=0;
    function chooseSolo(note){S.mode='solo';S.pending=false;S.healer=false;S.healerHere=false;S.people=0;S.list=[];S.therapist=null;if(S.mySeat==null||S.mySeat===0)S.mySeat=3;clearTimeout(pendT);window.dispatchEvent(new CustomEvent('anyen-space',{detail:{space:'solo:nha_niem'}}));if(note)rmHint(note);litSeats();render()}
    function chooseSession(){S.pending=true;render();window.dispatchEvent(new CustomEvent('anyen-space',{detail:{space:'room:nha_niem'}}));clearTimeout(pendT);pendT=setTimeout(()=>{if(S.pending)chooseSolo('Chưa kết nối được phiên 1+5 · bạn đang ở chế độ Solo')},12000)}
    on(window,'anyen-space-result',e=>{const d=e.detail||{};if(d.id!=='nha_niem'||!S.entered)return;
      if(d.ok&&d.session){const was=inSession();S.mode='session';S.pending=false;clearTimeout(pendT);S.healer=!!d.healer;S.therapist=d.therapist||null;if(d.me)S.me=d.me;if(!was){S.list=[];S.colSent=false;S.mySeat=S.healer?0:null}if(!was){rmHint(S.healer?'🌿 Bạn dẫn phiên 1+5 · chuông và nhịp thở của bạn vang tới cả phòng':'🌿 Đã vào phiên 1+5 cùng Healer');goView(S.healer?'seatH':'seat')}litSeats();render();return}
      if(!S.pending&&!inSession())return;const was=inSession();
      const why=d.ok?(was?'Phiên 1+5 đã kết thúc · bạn tiếp tục Solo':'Bạn chưa có phiên 1+5 nào đang diễn ra ở Nhà Niệm · đặt lịch Healer ở trang Lịch trị liệu'):d.reason==='guest'||d.reason==='auth'?'Đăng nhập thành viên và đặt lịch Healer để vào phiên 1+5':d.reason==='session'?'Đang có phiên riêng ở đây · bạn trải nghiệm Solo, không phiên nào thấy bạn':d.reason==='full'?'Phiên đã đủ người · bạn trải nghiệm Solo':'Chưa vào được phiên · bạn đang ở chế độ Solo';
      if(was&&S.act&&!S.act.shared)stopAct(true,true);chooseSolo(why);S.sessNote=why;render()});
    on(window,'anyen-space-people',e=>{const d=e.detail||{};if(d.id!=='nha_niem'||!inSession())return;const grew=(d.n||0)>S.people;S.people=d.n||0;S.healerHere=!!d.healer;if(d.me)S.me=d.me;if(Array.isArray(d.list))S.list=d.list.slice(0,8);litSeats();if(S.tab!=='bowl')render();
      if(grew&&S.healer&&S.act&&S.act.shared){const el=(Date.now()-S.act.t0)/1000;send(S.act.kind==='breath'?{k:'breath',p:S.act.p,m:S.act.m,el}:{k:'silence',el})}});
    on(window,'anyen-space-room',e=>{const m=e.detail||{};if(!inSession()||!m.fromHealer)return;const el=Math.max(0,Math.min(1200,+m.el||0));
      if(m.k==='bell')bellSound();else if(m.k==='breath')startBreath(String(m.p),+m.m,el,true);else if(m.k==='silence')startSilence(el,true);else if(m.k==='stop')stopAct(true)});
    // Healer luôn ở tọa cụ 0. Khách giữ chỗ bằng cờ c; hai người cùng chọn một chỗ thì ai vào trước giữ chỗ, người sau tự sang chỗ trống kế tiếp.
    function claim(k){S.mySeat=k;if(inSession()&&window.anyenSpaceChat&&window.anyenSpaceChat.meta)window.anyenSpaceChat.meta({c:k,col:myRobe()})}
    function seatPeople(){const occ={};if(!S.entered){S.occ=occ;drawPeople();return}
      if(!inSession()){occ[S.mySeat==null?3:S.mySeat]={id:'me',name:'Bạn',me:true}}
      else{const list=S.list.slice().sort((x,y)=>(x.t||0)-(y.t||0)||String(x.id).localeCompare(String(y.id)));
        for(const p of list){const healer=S.therapist&&p.id===S.therapist,k=healer?0:p.c;if(k==null||(k===0&&!healer)||occ[k])continue;occ[k]={id:p.id,name:p.name||'Một người bạn',healer,me:p.id===S.me,col:p.col||null}}
        if(S.healer){if(!occ[0]||!occ[0].me){occ[0]={id:S.me,name:'Bạn',healer:true,me:true}}if(S.mySeat!==0||!S.colSent){S.colSent=true;claim(0)}}
        else{const mine=Object.entries(occ).find(([k,o])=>o.me);if(mine)S.mySeat=+mine[0];else if(S.list.length){/* chờ danh sách có mặt rồi mới chọn chỗ */const free=[1,2,3,4,5].filter(k=>!occ[k]),k=free.includes(S.mySeat)?S.mySeat:free[0];if(k!=null){claim(k);occ[k]={id:S.me,name:'Bạn',me:true}}}}}
      S.occ=occ;drawPeople()}
    function drawPeople(){let n=0;for(let k=0;k<6;k++){const o=S.occ[k];seats[k].material.emissiveIntensity=o?(o.me?.9:.45):0;if(!o||(o.me&&st.walk))continue;/* mình đã có nhân vật đi lại, không vẽ thêm hình ngồi */const a=seatA(k);
        dummy.position.set(Math.sin(a)*2.4,.15,Math.cos(a)*2.4);dummy.rotation.set(0,a+Math.PI,0);dummy.scale.set(1.2,1,.95);dummy.updateMatrix();bodies.setMatrixAt(n,dummy.matrix);bodies.setColorAt(n,new THREE.Color(o.me?myRobe():o.col||(o.healer||k===0?ROBE[0]:ROBE[k])));/* màu áo mỗi người tự chọn, gửi qua presence */
        dummy.position.y=.15+.6;dummy.scale.set(1,1.12,1);dummy.updateMatrix();heads.setMatrixAt(n,dummy.matrix);heads.setColorAt(n,SKIN);n++}
      bodies.count=heads.count=n;bodies.instanceMatrix.needsUpdate=heads.instanceMatrix.needsUpdate=true;if(n){bodies.instanceColor.needsUpdate=heads.instanceColor.needsUpdate=true}}
    const myRobe=()=>{try{const c=JSON.parse(localStorage.getItem('yenGuestProfile17')||'{}').color;return /^#[0-9a-f]{6}$/i.test(c)?c:ROBE[3]}catch(e){return ROBE[3]}};
    function litSeats(){seatPeople()}
    /* 27/11: chạm tọa cụ thì nhân vật của mình đi tới ngồi đúng chỗ đó, mặt hướng vào Đèn Thở */
    function sitAt(k){const W=st.walk;if(!W||!W.goSeat)return;const a=seatA(k);W.goSeat({x:Math.sin(a)*2.4,z:Math.cos(a)*2.4,a:a+Math.PI,y:.13,ax:Math.sin(a)*2.95,az:Math.cos(a)*2.95})}
    function tapSeat(k){const o=S.occ[k];
      if(!S.entered){if(k===0&&!S.healer){rmHint('Tọa cụ vàng đồng dành cho Healer dẫn phiên');return}if(!inSession())S.mySeat=k;sitAt(k);return}
      if(o&&o.me){sitAt(k);goView('seat');return}
      if(k===0&&!S.healer){rmHint('Tọa cụ vàng đồng dành cho Healer dẫn phiên');return}
      if(S.healer&&inSession()){rmHint('Healer ngồi ở tọa cụ vàng đồng, quay lưng ra cửa vòm Trăng');return}
      if(o){rmHint('Chỗ này đã có '+o.name+' ngồi · chạm một tọa cụ còn trống');return}
      claim(k);seatPeople();sitAt(k);goView('seat');rmHint('🧘 Đã ngồi vào tọa cụ K'+k);if(S.tab!=='bowl')render()}
    // ---- chạm vào vật trong phòng
    rTap(st,lamp,()=>{if(!S.entered)return;S.tab='breath';goView('seat');render()});/* ngồi tại tọa cụ của mình */
    rTap(st,board,()=>{if(!S.entered)return;if(S.tab!=='beads'){S.tab='beads';goView('beads');render()}else bead()});rTap(st,counter,()=>{if(S.entered){if(S.tab!=='beads'){S.tab='beads';goView('beads');render()}else bead()}});
    rTap(st,cards,()=>{if(!S.entered)return;S.tab='cards';drawCard();render()});
    rTap(st,bowl,()=>{if(!S.entered)return;S.tab='bowl';goView('bowl');render()});rTap(st,water,()=>{if(!S.entered)return;S.tab='bowl';goView('bowl');render()});
    rTap(st,bell,()=>{if(!S.entered)return;bellSound();if(inSession()&&S.healer)send({k:'bell'})});
    seats.forEach(s=>rTap(st,s,()=>tapSeat(s.userData.k)));
    const spaceKey=e=>{if(e.code!=='Space'||!S.entered||S.tab!=='beads')return false;const t=e.target;return !(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable))};
    on(document,'keydown',e=>{if(!spaceKey(e))return;e.preventDefault();if(!e.repeat)bead()});on(document,'keyup',e=>{if(spaceKey(e))e.preventDefault()});/* nút đang được chọn không nhận thêm một lần bấm */
    // ---- bảng điều khiển
    const ritualDone=()=>{S.entered=true;seatPeople();goView('overview');rmHint('Kéo để nhìn quanh · chạm Đèn Thở, bảng 108 hạt, Bát Buông Bỏ hay Kệ thẻ');const fromSched=window.__anyenSchedHouse==='nha_niem';window.__anyenSchedHouse=null;S.suggest=fromSched;render()};
    function modeBadge(){if(S.pending)return '<p class="nm-mode">⏳ Đang vào phiên 1+5…</p>';
      if(inSession())return '<p class="nm-mode">🌿 Phiên 1+5'+(S.healer?' · bạn là Healer dẫn phiên':' · cùng Healer')+' · '+Math.max(1,S.people)+'/6 người · phiên khác không thấy phiên này <button type="button" data-nm="solo">Chuyển Solo</button></p>';
      return '<p class="nm-mode">🧘 Solo · yên tĩnh, không ai thấy bạn <button type="button" data-nm="session">Vào Phiên 1+5</button></p>'}
    function render(){let h='';const t=S.tab,a=S.act;
      if(!S.entered){h='<p><b>00 · Nghi thức Gột bụi</b> · Trước khi bước qua cửa vòm Trăng, chạm bồn đá bazan để rửa tay và nghe một tiếng chuông gió tre.</p>'+
        (S.washed?'<p class="rm-quote">Bụi đường đã lắng. Mời bạn chọn cách bước vào.</p><div class="rm-row"><button type="button" class="'+(window.__anyenSchedHouse==='nha_niem'?'':'rm-gold')+'" data-nm="go-solo">🧘 Đi Solo · hoàn toàn yên tĩnh</button><button type="button" class="'+(window.__anyenSchedHouse==='nha_niem'?'rm-gold':'')+'" data-nm="go-session">🌿 Vào Phiên 1+5 cùng Healer</button></div><p class="rm-note">Phiên 1+5 là phiên bạn đã đặt ở Lịch trị liệu. Mỗi phiên có kênh riêng; các phiên chạy song song không thấy nhau.</p>'
        :'<div class="rm-row"><button type="button" class="rm-gold" data-nm="wash">💧 Chạm bồn đá · rửa tay</button></div>');rmPanel.innerHTML=h;return}
      h=modeBadge()+(S.sessNote&&!inSession()?'<p class="rm-note">'+esc(S.sessNote)+(/Lịch trị liệu|đặt lịch/.test(S.sessNote)?' · <a href="lich.html" style="color:#f2dca8">Mở Lịch trị liệu</a>':'')+'</p>':'');
      h+='<div class="rm-row nm-tabs">'+[['breath','🕯️ 01 Thở'],['silence','🌙 02 Khoảng Lặng'],['beads','📿 03 Chuỗi 108'],['bowl','💧 04 Buông Bỏ'],['cards','🃏 Kệ 9 thẻ']].map(([k,l])=>'<button type="button" data-tab="'+k+'"'+(t===k||t===k+'Done'?' class="sel"':'')+'>'+l+'</button>').join('')+'</div>';
      if(inSession()&&S.healer)h+='<div class="rm-row"><button type="button" class="rm-gold" data-nm="bell">🔔 Thỉnh chuông đồng · cả phòng cùng nghe</button></div>';
      {const names=Object.entries(S.occ).filter(([k,o])=>!o.me).map(([k,o])=>(+k===0?'Healer ':'K'+k+' ')+esc(o.name));h+='<p class="rm-note">🧘 Bạn ngồi ở '+(S.mySeat===0?'tọa cụ Healer':'K'+(S.mySeat==null?'…':S.mySeat))+(names.length?' · cùng ngồi: '+names.join(' · '):'')+' · chạm một tọa cụ trống để đổi chỗ</p>'}
      if(t==='home')h+='<p>Chạm Đèn Thở ở tâm phòng, bảng 108 hạt ở tường trái, Bát Buông Bỏ và Kệ thẻ ở tường phải. Kéo để nhìn quanh.</p>';
      else if(t==='breath'){if(a&&a.kind==='breath')h+='<p>Quả cầu sáng và cột nắng giếng trời co giãn theo nhịp '+a.p.split('').join('–')+' · '+a.m+' phút. Không chấm điểm, chỉ cần có mặt.</p><div class="rm-row"><button type="button" data-nm="stop">⏹ Dừng</button></div>';
        else{const sel=S.bp||'446',sm=S.bm||3,follow=inSession()&&!S.healer;h+='<p><b>01 · Thở Chánh Niệm cùng Đèn Thở</b>'+(follow?' · Healer sẽ bắt đầu cho cả phòng; bạn cũng có thể thở riêng.':'')+'</p><div class="rm-row">Nhịp: '+[['446','4–4–6'],['478','4–7–8']].map(([k,l])=>'<button type="button" data-bp="'+k+'"'+(k===sel?' class="sel"':'')+'>'+l+'</button>').join('')+'</div><div class="rm-row">Thời gian: '+[3,6,10].map(m=>'<button type="button" data-bm="'+m+'"'+(m===sm?' class="sel"':'')+'>'+m+' phút</button>').join('')+'</div><div class="rm-row"><button type="button" class="rm-gold" data-nm="breathe">🕯️ '+(inSession()&&S.healer?'Bắt đầu cho cả phòng':'Bắt đầu thở')+'</button></div>'}}
      else if(t==='breathDone')h+='<p class="rm-quote">Bạn vừa thở cùng Đèn Thở. Mang nhịp thở này theo bạn ra khỏi Nhà Niệm.</p><div class="rm-row"><button type="button" data-tab="breath">🔁 Thở thêm</button></div>';
      else if(t==='silence'){if(a&&a.kind==='silence'){const el=Math.floor((Date.now()-a.t0)/1000);h+='<p>🌙 Khoảng Lặng · phút '+Math.min(18,Math.floor(el/60))+'/18 · chuông ngân ở phút 0 · 9 · 18. Chữ và nút tự ẩn, chạm màn hình để hiện lại.</p><div class="rm-row"><button type="button" data-nm="stop">⏹ Kết thúc sớm</button></div>'}
        else{const stt=ansense();h+='<p><b>02 · Khoảng Lặng 18 phút</b> · Ánh sáng dịu xuống tông ấm, chỉ còn gió rừng thông và nước Hồ Niệm. Ba tiếng chuông ở phút 0 · 9 · 18.</p>'+(stt?'<p class="rm-note">Theo bài test AnSense, trạng thái hôm nay của bạn là <b>'+STATE_LINES[stt][0]+'</b>: '+STATE_LINES[stt][1]+'</p>':'<p class="rm-note">Làm bài test AnSense 3 phút trước để Khoảng Lặng và Kệ thẻ gợi ý theo trạng thái hôm nay của bạn. <a href="ansense.html" style="color:#f2dca8">Mở AnSense</a></p>')+'<div class="rm-row"><button type="button" class="rm-gold" data-nm="silence">🌙 '+(inSession()&&S.healer?'Bắt đầu cho cả phòng':'Bắt đầu 18 phút')+'</button></div>'}}
      else if(t==='silenceDone')h+='<p class="rm-quote">Mười tám phút lặng đã trọn. Bạn có thể nối tiếp sáu chặng Khoảng Lặng của AnSense, hoặc ghi lại một dòng.</p><div class="rm-row"><button type="button" data-nm="jsilence">📔 Ghi vào Nhật ký An Yên</button><a href="ansense.html#silence" style="color:#f2dca8">Khoảng Lặng sáu chặng (AnSense) →</a></div>';
      else if(t==='beads'){const n=S.beads%108||(S.full?108:0);h+='<p><b>03 · Lần chuỗi 108 hạt</b> · Chạm bảng hạt hoặc bấm phím Space theo mỗi nhịp thở. Mốc 18 · 54 · 108 vòng sáng đồng bừng lên và ghi nhẹ vào Nhật ký An Yên. Không chuỗi ngày, không áp lực.</p><div class="rm-row"><button type="button" class="rm-gold" data-nm="bead">📿 Lần 1 hạt · '+n+'/108</button></div>'}
      else if(t==='bowl')h+='<p><b>04 · Bát Nước Buông Bỏ</b> · Gõ một nỗi lo rồi thả vào bát. Chữ tan thành gợn sóng và biến mất hẳn: chỉ ở trên máy bạn trong vài giây, không lưu, không gửi đi đâu.</p><form class="rm-row" data-nm="rel"><input type="text" maxlength="80" autocomplete="off" placeholder="Một nỗi lo (tối đa 80 ký tự)" aria-label="Nỗi lo muốn buông" style="flex:1;min-width:0;border:1px solid #a18a5e;border-radius:10px;background:#0b2d28;color:#f6e3b4;padding:8px 10px;font-size:16px"><button type="submit" class="rm-gold">💧 Thả vào bát</button></form>';
      else if(t==='cards'){if(S.card==null)h+='<p><b>Kệ 9 thẻ chánh niệm</b> · Rút một lời nhắc an tĩnh cho hôm nay'+(ansense()?' (gợi ý theo trạng thái AnSense của bạn)':'')+'.</p><div class="rm-row"><button type="button" class="rm-gold" data-nm="card">🃏 Rút thẻ hôm nay</button></div>';
        else h+='<p class="rm-quote">“'+esc(CARDS[S.card][0])+'”</p><p class="rm-note">'+(S.cardAgain?'Đây là thẻ bạn đã rút hôm nay. Mai kệ sẽ có lời nhắc mới.':'Thẻ của hôm nay. Mai kệ sẽ có lời nhắc mới.')+'</p>'}
      rmPanel.innerHTML=h;const f=rmPanel.querySelector('form[data-nm="rel"]');if(f){const inp=f.querySelector('input');f.onsubmit=e=>{e.preventDefault();const v=inp.value;inp.value='';inp.blur();release(v)}}}
    on(rmPanel,'click',e=>{const b=e.target.closest('button');if(!b)return;const tab=b.dataset.tab,a=b.dataset.nm;
      if(tab){S.tab=tab;if(tab==='beads')goView('beads');else if(tab==='bowl')goView('bowl');else if(tab==='cards'){goView('cards');if(S.card==null){try{const s=JSON.parse(LS('yen_niem_the')||'null');if(s&&s.d===today()&&CARDS[s.i]){S.card=s.i;S.cardAgain=true;drawCards(s.i)}}catch(e){}}}else if(tab==='breath'||tab==='silence')goView(S.healer&&inSession()?'seatH':'seat');render();return}
      if(b.dataset.bp){S.bp=b.dataset.bp;render();return}if(b.dataset.bm){S.bm=+b.dataset.bm;render();return}
      if(a==='wash'){S.washed=true;splash();setTimeout(bamboo,700);render()}
      else if(a==='go-solo'){chooseSolo();ritualDone()}else if(a==='go-session'){ritualDone();chooseSession()}
      else if(a==='solo'){if(S.act&&!S.act.shared)stopAct(true,true);S.sessNote='';chooseSolo('🧘 Đã chuyển sang Solo')}else if(a==='session'){S.sessNote='';chooseSession()}
      else if(a==='bell'){bellSound();send({k:'bell'})}
      else if(a==='breathe')startBreath(S.bp||'446',S.bm||3,0,false);else if(a==='silence')startSilence(0,false);else if(a==='stop')stopAct(false);
      else if(a==='jsilence'){journal('Ngồi Khoảng Lặng 18 phút trong Nhà Niệm');rmHint('📔 Đã ghi vào Nhật ký An Yên');b.disabled=true}
      else if(a==='bead')bead();else if(a==='card'){drawCard();render()}});
    // ---- vòng vẽ: Đèn Thở thở theo nhịp, cột nắng co giãn, chuông ngân, gợn nước, vòng sáng đồng
    drawBeads();drawCards(null);paintWater(1);litSeats();
    const cWarm=new THREE.Color('#c98a3a'),cLamp=new THREE.Color(C.lampG),bgA=new THREE.Color('#17120d'),bgB=new THREE.Color('#0a0806');
    let fade=0;st.tick.push(t=>{const now=performance.now();{const asp=st.cam.aspect,f=asp<1?Math.min(74,50/Math.sqrt(asp)):50;if(Math.abs(st.cam.fov-f)>.5){st.cam.fov=f;st.cam.updateProjectionMatrix()}}/* điện thoại dọc: mở góc nhìn */
      if(tw){const u=Math.min(1,(now-tw.t0)/1200),k=u*u*(3-2*u),A=tw.a,B=tw.b;st.target.set(A[0]+(B[0]-A[0])*k,A[1]+(B[1]-A[1])*k,A[2]+(B[2]-A[2])*k);st.yaw=A[3]+(B[3]-A[3])*k;st.pitch=A[4]+(B[4]-A[4])*k;st.dist=A[5]+(B[5]-A[5])*k;if(u>=1)tw=null}
      fade=Math.min(1,fade+.012);const want=S.act&&S.act.kind==='silence'?1:0;S.dim+=(want-S.dim)*.006;
      let b=tickAct();if(!S.act)b=.5+.5*Math.sin(t*2*Math.PI/14);const amp=S.act?1:.45;
      lamp.scale.setScalar(1+.38*b*amp);bodies.scale.y=1+.025*b*amp;halo.scale.setScalar(1.1+.9*b*amp);
      st.hemi.intensity=LIGHT.hemi*fade*(1-.7*S.dim);st.key.intensity=LIGHT.key*fade*(1-.8*S.dim);light.intensity=LIGHT.lamp*fade*(.75+.5*b*amp)*(1-.45*S.dim);light.color.copy(cLamp).lerp(cWarm,S.dim);sc.background.copy(bgA).lerp(bgB,S.dim);
      beamCol.material.opacity=(.04+.07*b*amp)*(1-.6*S.dim);pool.material.opacity=(.03+.07*b*amp)*(1-.5*S.dim);
      const ub=(now-(bell.userData.ring||0))/1000;bell.rotation.z=ub<2.5?Math.sin(ub*30)*.03*(2.5-ub):0;
      const uw=(now-(wave.userData.t0||-1e9))/1000;if(uw<4){wave.scale.setScalar(.4+uw*1.4);wave.material.opacity=.5*(1-uw/4)}else wave.material.opacity=0;
      const ur=(now-(beadRing.userData.t0||-1e9))/1000;beadRing.material.opacity=ur<3?.12+.8*Math.max(0,1-ur/3)*(ur<.3?ur/.3:1):.12;
      if(S.rel){const u=(now-S.rel.t0)/1000,p=u<1.6?(u-1.6)/1.6*.4:Math.min(1,(u-1.6)/3.6);paintWater(p);if(u>5.4){S.rel=null;textCv.getContext('2d').clearRect(0,0,256,256);paintWater(1);rmHint('💧 Đã tan vào nước · không còn lại gì')}}
      else if(((t*10)|0)%3===0)paintWater(1);
      const up=(now-(ripple.userData.t0||-1e9))/1000;if(up>0&&up<4){ripple.scale.setScalar(.08+up*.11);ripple.material.opacity=.6*(1-up/4)}else ripple.material.opacity=0;
      if(S.act&&S.tab==='silence'&&((t*2)|0)!==S.lastSec){S.lastSec=(t*2)|0;if(((t)|0)%15===0)render()}});
    rmHint('Nhà Niệm · chạm bồn đá ở hiên để Gột bụi trước khi bước vào');render();
    st.cleanup=()=>{roomBox.classList.remove('niem');clearTimeout(pendT);clearTimeout(peekT);ambientOff();setQuiet(false);roomBox.classList.remove('peek');brEl.hidden=true;S.rel=null;textCv.getContext('2d').clearRect(0,0,256,256);
      for(const f of offs)f();for(const t of texs)t.dispose();sc.traverse(o=>{if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose())});delete window.__niem};
    // kiểm tra: số tam giác nội thất, số PointLight, trạng thái; tua nhanh hoạt động
    window.__niem={tris:()=>{let n=0;sc.traverse(o=>{if(!o.isMesh&&!o.isSprite)return;const g=o.geometry;if(!g)return;const c=(g.index?g.index.count:g.attributes.position.count)/3;n+=c*(o.isInstancedMesh?o.count:1)});return n},
      points:()=>{let n=0;sc.traverse(o=>{if(o.isPointLight)n++});return n},state:()=>({mySeat:S.mySeat,entered:S.entered,mode:S.mode,healer:S.healer,people:S.people,act:S.act&&S.act.kind,tab:S.tab,beads:S.beads,card:S.card,rel:!!S.rel,quiet:S.quiet}),
      skip:sec=>{if(S.act)S.act.t0-=sec*1000},seats:()=>Object.fromEntries(Object.entries(S.occ).map(([k,o])=>[k,(o.me?'*':'')+o.name])),tap:k=>tapSeat(k),
      people:(list,me)=>window.dispatchEvent(new CustomEvent('anyen-space-people',{detail:{id:'nha_niem',n:list.length,me,healer:list.some(p=>p.id===S.therapist),list}})),enter:mode=>{S.washed=true;if(mode==='session'){ritualDone();chooseSession()}else{chooseSolo();ritualDone()}}};
  }
  // ---------------------------------------------------------------- Nhà Văn Hóa · 36 người · Ca Múa Nhạc & 5 hoạt động tập thể
  // Khối 16 × 11 × 6,8 m gỗ trầm. Đồng bộ qua kênh cộng đồng anyen:sp:nha_van_hoa (space-chat.js, tối đa 36 người); không cần SQL mới, không tạo kho mới.
  // Người dẫn: Healer/Admin có mặt sớm nhất; vắng Healer/Admin thì người vào phòng sớm nhất dẫn tạm. Chỉ nhận lệnh sân khấu, câu đố, thả đèn từ người dẫn.
  function roomNhaVanHoa(st){
    const W=16,D=11,HW=W/2,HD=D/2,EAVE=4.6,RIDGE=6.8,STAGE_Y=.6;
    const C={wood:'#6b4a2e',floor:'#a37a4c',col:'#4a311f',stage:'#5b3a24',screen:'#101712',gold:'#d9a338',lamp:'#ffd59a',cream:'#efe2c4',moss:'#55653f'};
    const sc=st.sc,texs=[],offs=[];
    const on=(t,n,f,o)=>{t.addEventListener(n,f,o);offs.push(()=>t.removeEventListener(n,f,o))};
    const M=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.9},o||{}));
    const add=(geo,m,x,y,z,rx,ry,rz)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);if(rx)o.rotation.x=rx;if(ry)o.rotation.y=ry;if(rz)o.rotation.z=rz;sc.add(o);return o};
    const tex=(w,h,draw,rep)=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d');draw(c,w,h);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1])}texs.push(t);t.cv=cv;t.c=c;return t};
    const glow=(c,o,map)=>new THREE.MeshBasicMaterial({color:c,map:map||null,transparent:true,opacity:o,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide});
    const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
    const clean=(t,n)=>String(t||'').replace(/[\u0000-\u001f<>]/g,'').replace(/\s+/g,' ').trim().slice(0,n);
    const myColor=()=>{try{const c=JSON.parse(localStorage.getItem('yenGuestProfile17')||'{}').color;return /^#[0-9a-f]{6}$/i.test(c||'')?c:'#d9b67d'}catch(e){return '#d9b67d'}};
    const myName=()=>{try{return clean(JSON.parse(localStorage.getItem('yenGuestProfile17')||'{}').name,24)||'Khách Làng Yên'}catch(e){return 'Khách Làng Yên'}};
    const journal=q=>window.dispatchEvent(new CustomEvent('anyen-journal-add',{detail:{lake:'Văn Hóa',title:'🏛️ Nhà Văn Hóa',quote:q,at:Date.now()}}));
    sc.background=new THREE.Color('#1d1a12');roomBox.classList.add('vanhoa');
    st.hemi.color.set('#fff3dc');st.hemi.groundColor.set('#5a4630');st.hemi.intensity=1.55;st.key.color.set('#ffe6bd');st.key.intensity=1.1;st.key.position.set(-3,9,6);
    const dummy0=new THREE.Object3D();
    // ---- vỏ phòng (thiết kế 2026-11): tường kem trát vữa có chân tường gỗ, cột và xà gỗ nâu trầm, trần mái xanh rêu với rui gỗ, sàn gỗ mật ong; khe sáng cổ diêm dọc nóc
    const plaster=(rx,ry,wain)=>tex(256,256,(c,w,h)=>{c.fillStyle=C.cream;c.fillRect(0,0,w,h);for(let i=0;i<260;i++){c.fillStyle='rgba(150,120,80,'+(Math.random()*.05)+')';c.fillRect(Math.random()*w,Math.random()*h,2+Math.random()*6,2+Math.random()*6)}
      if(wain){const y=h*(1-wain);c.fillStyle=C.wood;c.fillRect(0,y,w,h-y);for(let x=0;x<w;x+=32){c.fillStyle='rgba(30,18,8,.35)';c.fillRect(x,y,2,h-y)}c.fillStyle=C.gold;c.fillRect(0,y-5,w,3);c.fillStyle='#3a2616';c.fillRect(0,y-2,w,4)}},[rx,ry]);
    const floorT=tex(256,256,(c,w,h)=>{c.fillStyle=C.floor;c.fillRect(0,0,w,h);for(let i=0;i<8;i++){c.fillStyle='rgba(60,35,15,.35)';c.fillRect(0,i*32,w,2);c.fillStyle='rgba(255,235,200,'+(.03+Math.random()*.04)+')';c.fillRect(0,i*32+3,w,12);const o=Math.random()*w;c.fillStyle='rgba(60,35,15,.25)';c.fillRect(o,i*32,2,32)}},[5,4]);
    add(new THREE.PlaneGeometry(W,D),M('#fff',{map:floorT,roughness:.75}),0,0,0,-Math.PI/2);
    add(new THREE.PlaneGeometry(W,EAVE),M('#fff',{map:plaster(4,1,.24)}),0,EAVE/2,-HD);/* tường Nam sau sân khấu */
    {const t=tex(1024,256,(c,w,h)=>{c.drawImage(plaster(1,1,.24).cv,0,0,w,h);const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#fbe6b4');g.addColorStop(1,'#d8a860');c.fillStyle='#4a311f';c.fillRect(w/2-100,h-176,200,176);c.fillStyle=g;c.fillRect(w/2-90,h-168,180,168);c.fillStyle='#4a311f';c.fillRect(w/2-3,h-168,6,168);
      for(const sx of [-1,1]){const x=w/2+sx*300;c.fillStyle='#4a311f';c.fillRect(x-74,h-178,148,96);c.fillStyle='#f6dca0';c.fillRect(x-66,h-170,132,80);c.strokeStyle='#4a311f';c.lineWidth=4;for(let k=1;k<4;k++){c.beginPath();c.moveTo(x-66+k*33,h-170);c.lineTo(x-66+k*33,h-90);c.stroke()}c.beginPath();c.moveTo(x-66,h-130);c.lineTo(x+66,h-130);c.stroke()}});
      add(new THREE.PlaneGeometry(W,EAVE),M('#fff',{map:t,emissive:'#3a2a10',emissiveIntensity:.25}),0,EAVE/2,HD,0,Math.PI)}/* tường Bắc: cửa gỗ, hai ô cửa song gỗ sáng ấm */
    for(const sx of [-1,1]){const s=new THREE.Shape();s.moveTo(-HD,0);s.lineTo(HD,0);s.lineTo(HD,EAVE);s.lineTo(0,RIDGE);s.lineTo(-HD,EAVE);s.lineTo(-HD,0);const t=plaster(1,1,.24);t.repeat.set(1/11*3,1/6.8*1.5);
      add(new THREE.ShapeGeometry(s),M('#fff',{map:t}),sx*HW,0,0,0,-sx*Math.PI/2)}
    const roofT=tex(256,128,(c,w,h)=>{c.fillStyle=C.moss;c.fillRect(0,0,w,h);for(let i=0;i<8;i++){c.fillStyle='rgba(30,40,20,.35)';c.fillRect(i*32,0,3,h)}c.fillStyle='#4a311f';for(let i=0;i<4;i++)c.fillRect(i*64+26,0,12,h)},[6,1]);
    const SL=Math.hypot(HD,RIDGE-EAVE);for(const sz of [-1,1]){const th=Math.atan2(-sz*HD,RIDGE-EAVE);add(new THREE.PlaneGeometry(W,SL),M('#fff',{map:roofT,side:THREE.DoubleSide}),0,(EAVE+RIDGE)/2,sz*HD/2,th)}
    const slit=add(new THREE.PlaneGeometry(W-.4,.32),glow('#ffcf86',.55),0,RIDGE-.22,0,Math.PI/2);/* khe sáng cổ diêm dọc nóc */
    for(const x of [-5.4,0,5.4]){add(new THREE.BoxGeometry(.28,.3,D),M(C.col),x,EAVE,0);add(new THREE.BoxGeometry(.2,RIDGE-EAVE,.2),M(C.col),x,(EAVE+RIDGE)/2,0)}/* xà ngang và trụ đỡ nóc */
    add(new THREE.BoxGeometry(W,.24,.24),M(C.col),0,RIDGE-.12,0);for(const z of [-HD+.15,HD-.15])add(new THREE.BoxGeometry(W,.22,.22),M(C.col),0,EAVE-.05,z);
    for(const x of [-HW+.2,HW-.2])for(const z of [-HD+.2,0,HD-.2])add(new THREE.BoxGeometry(.34,EAVE,.34),M(C.col),x,EAVE/2,z);/* 6 cột gỗ */
    // đèn lồng giấy treo dưới xà: 1 InstancedMesh phát sáng + dây treo, không thêm PointLight
    {const LP=[[-5.4,-1.6],[5.4,-1.6],[-5.4,1.6],[5.4,1.6],[-2.7,4.2],[2.7,4.2]];/* tránh trục nhìn lên sân khấu */const lg=new THREE.InstancedMesh(new THREE.SphereGeometry(.24,12,8),new THREE.MeshBasicMaterial({color:'#ffd8a0',toneMapped:false}),LP.length);
      LP.forEach(([x,z],i)=>{dummy0.position.set(x,EAVE-.6,z);dummy0.scale.set(1,1.25,1);dummy0.updateMatrix();lg.setMatrixAt(i,dummy0.matrix);add(new THREE.CylinderGeometry(.008,.008,.45,3),M('#2a1a0e'),x,EAVE-.25,z)});sc.add(lg);
      const hT=tex(64,64,(c,w)=>{const g=c.createRadialGradient(32,32,0,32,32,31);g.addColorStop(0,'rgba(255,210,140,.9)');g.addColorStop(.4,'rgba(255,190,110,.25)');g.addColorStop(1,'rgba(255,190,110,0)');c.fillStyle=g;c.fillRect(0,0,w,w)});
      for(const [x,z] of LP){const h=new THREE.Sprite(new THREE.SpriteMaterial({map:hT,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));h.scale.set(1.3,1.3,1);h.position.set(x,EAVE-.6,z);sc.add(h)}}
    // ---- sân khấu gỗ trầm 6,4 × 2,8 m, màn chiếu 16:9, 1 PointLight ấm
    const SZ=-HD+1.5;add(new THREE.BoxGeometry(6.4,STAGE_Y,2.8),M(C.stage,{roughness:.6}),0,STAGE_Y/2,SZ);add(new THREE.BoxGeometry(6.44,.06,.06),M(C.gold,{metalness:.4,roughness:.4}),0,STAGE_Y-.03,SZ+1.41);add(new THREE.BoxGeometry(2.4,.2,.5),M(C.stage),0,.1,SZ+1.65);
    // phông sân khấu: tấm xanh rêu viền vàng, vòm hoa sen vẽ tay; hai rèm lụa vàng nghệ buông hai bên; hai chậu sen ở mép sân khấu
    {const t=tex(1024,512,(c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#3e4c2e');g.addColorStop(1,'#56663e');c.fillStyle=g;c.fillRect(0,0,w,h);c.strokeStyle='#d9b45c';c.lineWidth=10;c.strokeRect(10,10,w-20,h-20);c.lineWidth=3;c.strokeRect(26,26,w-52,h-52);
      c.save();c.translate(w/2,h+40);for(let k=0;k<15;k++){const a=-Math.PI/2+(k-7)*.2;c.save();c.rotate(a+Math.PI/2);c.fillStyle=k%2?'rgba(242,190,200,.55)':'rgba(250,215,220,.65)';c.beginPath();c.moveTo(0,-390);c.quadraticCurveTo(46,-470,0,-520);c.quadraticCurveTo(-46,-470,0,-390);c.fill();c.restore()}c.restore();
      c.fillStyle='rgba(217,180,92,.85)';for(const sx of [-1,1])for(let k=0;k<4;k++){const x=w/2+sx*(410-k*14),y=80+k*110;c.beginPath();c.arc(x,y,7,0,Math.PI*2);c.fill()}});
      add(new THREE.PlaneGeometry(7.6,3.8),M('#fff',{map:t,roughness:.95}),0,STAGE_Y+1.9+.4,-HD+.03)}
    {const ct=tex(128,256,(c,w,h)=>{for(let x=0;x<w;x++){const v=.75+.25*Math.sin(x/w*Math.PI*8);c.fillStyle='rgb('+Math.round(214*v)+','+Math.round(150*v)+','+Math.round(52*v)+')';c.fillRect(x,0,1,h)}c.fillStyle='#8a5a1c';c.fillRect(0,h-14,w,14);c.fillStyle='#f2d58a';c.fillRect(0,h-18,w,3)});
      for(const sx of [-1,1]){const cu=add(new THREE.PlaneGeometry(1.1,4.2,6,1),M('#fff',{map:ct,side:THREE.DoubleSide,roughness:.7}),sx*3.55,STAGE_Y+2.1,SZ-.6,0,-sx*.35);const pa=cu.geometry.attributes.position;for(let i=0;i<pa.count;i++)pa.setZ(i,Math.sin(pa.getX(i)*9)*.06);cu.geometry.computeVertexNormals()}
      add(new THREE.BoxGeometry(7.6,.5,.08),M('#fff',{map:ct}),0,STAGE_Y+4.0,SZ-.75)}/* diềm rèm */
    {const petalG=new THREE.SphereGeometry(.16,8,6,0,Math.PI*2,0,Math.PI/2);for(const sx of [-1,1]){const x=sx*2.85,z=SZ+1.1;add(new THREE.CylinderGeometry(.24,.18,.36,12),M('#7b4a2c',{roughness:.5}),x,STAGE_Y+.18,z);add(new THREE.CircleGeometry(.23,12),M('#2f4a2a'),x,STAGE_Y+.36,z,-Math.PI/2);
      for(let k=0;k<3;k++){const a=k*2.1,px=x+Math.sin(a)*.1,pz=z+Math.cos(a)*.1;add(new THREE.CylinderGeometry(.012,.012,.5+k*.1,3),M('#5a7a3a'),px,STAGE_Y+.6+k*.05,pz);const fl=add(new THREE.ConeGeometry(.09,.2,6,1,true),M('#f2b8c6',{emissive:'#6a2a3a',emissiveIntensity:.3,side:THREE.DoubleSide}),px,STAGE_Y+.9+k*.1,pz);fl.rotation.x=Math.PI}
      const leaf=add(new THREE.CircleGeometry(.22,10),M('#4f7a3a',{side:THREE.DoubleSide}),x+sx*.18,STAGE_Y+.62,z,-Math.PI/2.4)}}
    const SCW=4.8,SCH=2.7,SCY=3.0;add(new THREE.BoxGeometry(SCW+.3,SCH+.3,.08),M('#4a311f'),0,SCY,-HD+.07);add(new THREE.BoxGeometry(SCW+.12,SCH+.12,.09),M(C.gold,{metalness:.4,roughness:.45}),0,SCY,-HD+.075);
    const scrT=tex(1024,576,()=>{});const scrMat=new THREE.MeshBasicMaterial({map:scrT,toneMapped:false});const screen=add(new THREE.PlaneGeometry(SCW,SCH),scrMat,0,SCY,-HD+.135);
    const stageLight=new THREE.PointLight(C.lamp,5,10,1.4);stageLight.position.set(0,3.2,SZ+1.6);sc.add(stageLight);
    // ---- 6 cụm bàn × 6 ghế = 36 chỗ (2 InstancedMesh), nhãn nhạc cụ, sóng ánh sáng trên sàn
    const CL=[['C1','Đàn Tranh','tranh','#d9a338'],['C2','Chuông Xoay','chuong','#e6c27a'],['C3','Sáo Trúc','sao','#9fd3a8'],['C4','Đàn Tranh','tranh','#d9a338'],['C5','Mõ & Chuông','mo','#e0a070'],['C6',"Đàn T'rưng",'trung','#b9d77a']];
    const CPOS=[[-4.6,.3],[0,.3],[4.6,.3],[-4.6,3.3],[0,3.3],[4.6,3.3]];
    const dummy=new THREE.Object3D();
    const tables=new THREE.InstancedMesh(new THREE.CylinderGeometry(.62,.56,.42,20,1),M('#7a3a22',{roughness:.45}),6);sc.add(tables);/* bàn tròn thấp sơn son */
    const tRim=new THREE.InstancedMesh(new THREE.TorusGeometry(.62,.025,4,24),M(C.gold,{metalness:.4,roughness:.4}),6);sc.add(tRim);
    const rugT=tex(256,256,(c,w)=>{c.translate(w/2,w/2);for(const [r,a] of [[124,.55],[112,.0],[104,.35],[60,.0],[54,.25]]){c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fillStyle=a?'rgba(255,255,255,'+a+')':'rgba(0,0,0,0)';if(a)c.fill();else{c.globalCompositeOperation='destination-out';c.fill();c.globalCompositeOperation='source-over'}}for(let k=0;k<8;k++){c.rotate(Math.PI/4);c.fillStyle='rgba(255,255,255,.5)';c.beginPath();c.ellipse(0,-82,9,20,0,0,Math.PI*2);c.fill()}});
    CPOS.forEach(([x,z],k)=>{dummy.position.set(x,.21,z);dummy.rotation.set(0,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();tables.setMatrixAt(k,dummy.matrix);tables.setColorAt(k,new THREE.Color('#ffffff'));dummy.position.y=.42;dummy.rotation.x=Math.PI/2;dummy.updateMatrix();tRim.setMatrixAt(k,dummy.matrix);
      add(new THREE.CircleGeometry(1.7,32),new THREE.MeshBasicMaterial({map:rugT,color:new THREE.Color(CL[k][3]).multiplyScalar(.55),transparent:true,depthWrite:false}),x,.012,z,-Math.PI/2)});/* thảm tròn hoa văn sen theo màu cụm */
    const SEAT_OFF=new THREE.Color('#8a6a48'),SEAT_ON=new THREE.Color('#c98a3a'),SEAT_ME=new THREE.Color('#f2d58a');
    const seats=new THREE.InstancedMesh(new THREE.CylinderGeometry(.27,.29,.2,14,1),M('#ffffff',{roughness:.95}),36);sc.add(seats);/* bồ đoàn tròn */
    // nhân vật ngồi tọa thiền trên bục có người: thân + gối xếp bằng gộp 1 lưới (màu áo theo từng người) + đầu (màu da); 2 InstancedMesh, mỗi người 22 tam giác
    const mergeGeo=gs=>{const pos=[],nor=[];for(const [g,m] of gs){const n=g.toNonIndexed();n.applyMatrix4(m);pos.push(...n.attributes.position.array);nor.push(...n.attributes.normal.array)}const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));out.setAttribute('normal',new THREE.Float32BufferAttribute(nor,3));return out};
    const mx=(x,y,z,sx,sy,sz)=>new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion(),new THREE.Vector3(sx,sy,sz));
    const sitBody=new THREE.InstancedMesh(mergeGeo([[new THREE.OctahedronGeometry(.3,0),mx(0,.08,.04,1.15,.26,.85)],[new THREE.ConeGeometry(.2,.58,6,1,true),mx(0,.36,-.02,1,1,.8)]]),M('#ffffff',{roughness:.85}),36);
    const sitHead=new THREE.InstancedMesh(new THREE.OctahedronGeometry(.13,0),M('#e2bf98'),36);sitBody.count=sitHead.count=0;sitBody.frustumCulled=sitHead.frustumCulled=false;sc.add(sitBody,sitHead);
    const seatPos=i=>{const k=i%6,s=Math.floor(i/6),a=s/6*Math.PI*2+Math.PI/6;return [CPOS[k][0]+Math.sin(a)*1.08,CPOS[k][1]+Math.cos(a)*1.08,a]};
    for(let i=0;i<36;i++){const [x,z,a]=seatPos(i);dummy.position.set(x,.1,z);dummy.rotation.set(0,a,0);dummy.updateMatrix();seats.setMatrixAt(i,dummy.matrix);seats.setColorAt(i,SEAT_OFF)}
    const labels=CL.map(([id,nm,,col],k)=>{const t=tex(256,64,(c,w,h)=>{c.fillStyle='rgba(20,14,8,.78)';c.beginPath();c.roundRect?c.roundRect(2,2,w-4,h-4,18):c.rect(2,2,w-4,h-4);c.fill();c.strokeStyle=col;c.lineWidth=3;c.stroke();c.fillStyle='#f6e7c8';c.font='600 26px system-ui, sans-serif';c.textAlign='center';c.fillText(id+' · '+nm,w/2,42)});
      const s=new THREE.Sprite(new THREE.SpriteMaterial({map:t,transparent:true,depthWrite:false}));s.scale.set(1.1,.275,1);s.position.set(CPOS[k][0],1.05,CPOS[k][1]);sc.add(s);return s});
    const ringT=tex(128,128,(c,w)=>{const g=c.createRadialGradient(64,64,40,64,64,62);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(.7,'rgba(255,255,255,.9)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,w,w)});
    const WAVES=12,waves=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:ringT,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}),WAVES);waves.frustumCulled=false;sc.add(waves);
    const waveS=[...Array(WAVES)].map(()=>({t0:-1e9,x:0,z:0,c:new THREE.Color()}));let waveI=0;const BLACK=new THREE.Color(0,0,0);
    for(let i=0;i<WAVES;i++){dummy.position.set(0,-1,0);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.setScalar(.01);dummy.updateMatrix();waves.setMatrixAt(i,dummy.matrix);waves.setColorAt(i,BLACK)}
    function wave(k,col){const w=waveS[waveI++%WAVES];w.t0=performance.now();w.x=CPOS[k][0];w.z=CPOS[k][1];w.c.set(col||CL[k][3])}
    // ---- 3 NPC biểu diễn low-poly (Múa Sen · Múa Quạt Lụa · Hòa tấu) và đạo cụ
    const skin=M('#e2bf98'),hair=M('#1b130d');
    // vũ công áo dài (thiết kế 2026-11): thân áo ôm eo, quần lụa kem ống rộng, hai tà áo bay theo nhịp, tóc dài hoặc búi; nón lá cho Múa Quạt
    const lathe=(pts,m)=>new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r,y])=>new THREE.Vector2(r,y)),12),m);
    const pantsM=M('#f4ecdc',{roughness:.7}),nonM=M('#e8d39a',{roughness:.8,side:THREE.DoubleSide});
    const NPC=[0,1,2].map(i=>{const g=new THREE.Group(),robe=M('#e8b4b8',{roughness:.55,side:THREE.DoubleSide}),arms=[],body=new THREE.Group();body.position.y=.62;g.add(body);
      body.add(lathe([[0,-.62],[.2,-.62],[.15,-.25],[.13,0]],pantsM));
      body.add(lathe([[.135,-.04],[.15,.06],[.115,.2],[.15,.34],[.14,.46],[.07,.56],[.045,.64]],robe));
      const flaps=[-1,1].map(sz=>{const f=new THREE.Mesh(new THREE.PlaneGeometry(.26,.6,1,3),robe);f.geometry.translate(0,-.3,0);f.position.set(0,0,sz*.11);f.rotation.x=-sz*.2;body.add(f);return f});
      const head=new THREE.Mesh(new THREE.SphereGeometry(.13,12,10),skin);head.position.y=1.42;head.scale.y=1.12;g.add(head);
      const bun=new THREE.Mesh(new THREE.SphereGeometry(.075,8,6),hair);bun.position.set(0,.06,-.1);head.add(bun);const hl=new THREE.Mesh(new THREE.BoxGeometry(.2,.42,.05),hair);hl.position.set(0,-.18,-.1);head.add(hl);
      const non=new THREE.Mesh(new THREE.ConeGeometry(.3,.16,16,1,true),nonM);non.position.y=.15;head.add(non);
      for(const sx of [-1,1]){const p=new THREE.Group();p.position.set(sx*.15,1.16,0);const a=new THREE.Mesh(new THREE.CylinderGeometry(.03,.04,.5,6),robe);a.position.y=-.25;p.add(a);const hd=new THREE.Mesh(new THREE.SphereGeometry(.04,6,5),skin);hd.position.y=-.52;p.add(hd);p.rotation.z=sx*.25;g.add(p);arms.push(p)}
      const lotus=new THREE.Group();{const pm=M('#f4a7b9',{emissive:'#7a2a42',emissiveIntensity:.35,side:THREE.DoubleSide});for(let k=0;k<6;k++){const pt=new THREE.Mesh(new THREE.SphereGeometry(.09,6,4,0,Math.PI*2,0,Math.PI/2),pm);pt.scale.set(.55,1.6,.3);pt.rotation.set(.5,k*Math.PI/3,0,'YXZ');lotus.add(pt)}const core=new THREE.Mesh(new THREE.CylinderGeometry(.04,.03,.04,8),M('#f2d06a',{emissive:'#6a5010',emissiveIntensity:.4}));core.position.y=.04;lotus.add(core)}lotus.position.set(0,-.6,0);arms[1].add(lotus);
      const lotus2=lotus.clone();arms[0].add(lotus2);
      const fanT=tex(128,64,(c,w,h)=>{c.fillStyle='#c0392b';c.beginPath();c.moveTo(w/2,h);c.arc(w/2,h,h,Math.PI,0);c.fill();c.strokeStyle='#f2d06a';c.lineWidth=2;for(let k=0;k<=8;k++){const a=Math.PI+k*Math.PI/8;c.beginPath();c.moveTo(w/2,h);c.lineTo(w/2+Math.cos(a)*h,h+Math.sin(a)*h);c.stroke()}c.beginPath();c.arc(w/2,h,h-3,Math.PI,0);c.stroke()});
      const fan=new THREE.Mesh(new THREE.CircleGeometry(.34,10,0,Math.PI),M('#fff',{map:fanT,side:THREE.DoubleSide,emissive:'#3a1008',emissiveIntensity:.3}));fan.position.set(0,-.58,0);arms[1].add(fan);const fan2=fan.clone();arms[0].add(fan2);
      const inst=new THREE.Mesh(i===0?new THREE.BoxGeometry(1.05,.07,.3):i===1?new THREE.BoxGeometry(.5,.035,.035):new THREE.BoxGeometry(.9,.1,.16),M(i===1?'#c9b07a':'#6b4a2c'));g.add(inst);
      g.position.set((i-1)*1.9,STAGE_Y,SZ-.2);sc.add(g);return {g,body,robe,arms,lotus,lotus2,fan,fan2,inst,head,non,flaps,i}});
    // ---- 36 Đèn Hoa An Yên: 1 InstancedMesh (bát diện kéo dài như đèn giấy), bay từ cụm bàn lên lơ lửng dưới vòm mái
    const lotusLamp=(()=>{const gs=[];for(let ring=0;ring<2;ring++)for(let k=0;k<8;k++){const pg=new THREE.SphereGeometry(.1,5,3,0,Math.PI*2,0,Math.PI/2);const m=new THREE.Matrix4().makeRotationY(k*Math.PI/4+ring*.39).multiply(new THREE.Matrix4().makeTranslation(0,0,ring?.05:.09)).multiply(new THREE.Matrix4().makeRotationX(ring?.35:.75)).multiply(new THREE.Matrix4().makeScale(.55,ring?1.7:1.4,.32));gs.push([pg,m])}
      gs.push([new THREE.CylinderGeometry(.15,.1,.05,10),new THREE.Matrix4().makeTranslation(0,-.02,0)]);return mergeGeo(gs)})();/* đèn hoa sen 2 tầng cánh */
    const lanterns=new THREE.InstancedMesh(lotusLamp,new THREE.MeshBasicMaterial({color:'#ffffff',toneMapped:false}),36);lanterns.frustumCulled=false;sc.add(lanterns);
    const LCOL=new THREE.Color('#ffb0bf'),LCOL2=new THREE.Color('#ffe2b8');
    const lgPos=new Float32Array(36*3).fill(-9),lgGeo=new THREE.BufferGeometry();lgGeo.setAttribute('position',new THREE.BufferAttribute(lgPos,3));const lgT=tex(64,64,(c,w)=>{const g=c.createRadialGradient(32,32,0,32,32,31);g.addColorStop(0,'rgba(255,220,170,1)');g.addColorStop(.35,'rgba(255,190,150,.35)');g.addColorStop(1,'rgba(255,190,150,0)');c.fillStyle=g;c.fillRect(0,0,w,w)});
    const lgGlow=new THREE.Points(lgGeo,new THREE.PointsMaterial({size:.9,map:lgT,color:'#ffd2a8',transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));lgGlow.frustumCulled=false;sc.add(lgGlow);/* quầng sáng quanh mỗi đèn */
    for(let i=0;i<36;i++){dummy.position.set(0,-2,0);dummy.rotation.set(0,0,0);dummy.scale.setScalar(.001);dummy.updateMatrix();lanterns.setMatrixAt(i,dummy.matrix);lanterns.setColorAt(i,LCOL)}
    const roofY=z=>EAVE+(HD-Math.abs(z))/HD*(RIDGE-EAVE);
    const slotPos=i=>{const col=i%6,row=Math.floor(i/6),x=-6.25+col*2.5+(row%2)*.6,z=-3.6+row*1.45;return [x,roofY(z)-.85-((col+row)%3)*.18,z]};
    // ---- Tường Tây: triển lãm 9 ô (đọc từ 4 kho 69/9 sẵn có) · Tường Đông: 18 lời chúc và Quầy trà
    const galT=tex(512,512,()=>{});const gallery=add(new THREE.PlaneGeometry(3.4,3.4),new THREE.MeshBasicMaterial({map:galT}),-HW+.06,2.55,2.65,0,Math.PI/2);add(new THREE.BoxGeometry(.05,3.6,3.6),M(C.col),-HW+.03,2.55,2.65);
    const wallT=tex(768,384,()=>{});const wishWall=add(new THREE.PlaneGeometry(4.4,2.2),new THREE.MeshBasicMaterial({map:wallT}),HW-.06,2.9,2.65,0,-Math.PI/2);add(new THREE.BoxGeometry(.05,2.4,4.6),M(C.col),HW-.03,2.9,2.65);
    const counter=add(new THREE.BoxGeometry(.7,.95,3.0),M('#5a452f'),HW-.55,.475,2.65);
    const pot=add(new THREE.LatheGeometry([[0,0],[.12,.01],[.16,.1],[.13,.2],[.05,.24]].map(([a,b])=>new THREE.Vector2(a,b)),8),M('#7a3e2a',{roughness:.6}),HW-.55,.95,1.75);
    const steam=add(new THREE.PlaneGeometry(.25,.6),glow('#fff4e0',0),HW-.55,1.45,1.75,0,-Math.PI/2);
    // ---- cổ vũ dịu nhẹ: Points (cánh sen · lụa vàng · vỗ tay êm) bay quanh sân khấu
    const PN=120,pGeo=new THREE.BufferGeometry(),pPos=new Float32Array(PN*3),pCol=new Float32Array(PN*3);pGeo.setAttribute('position',new THREE.BufferAttribute(pPos,3));pGeo.setAttribute('color',new THREE.BufferAttribute(pCol,3));
    const dotT=tex(64,64,(c,w)=>{const g=c.createRadialGradient(32,32,0,32,32,30);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.5,'rgba(255,255,255,.5)');g.addColorStop(1,'rgba(255,255,255,0)');c.fillStyle=g;c.fillRect(0,0,w,w)});
    const pts=new THREE.Points(pGeo,new THREE.PointsMaterial({size:.2,map:dotT,vertexColors:true,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));pts.frustumCulled=false;sc.add(pts);
    const parts=[...Array(PN)].map(()=>({life:0,x:0,y:-5,z:0,a:0,r:0,vy:0,va:0}));let partI=0;for(let i=0;i<PN;i++)pPos[i*3+1]=-5;
    const CHEER=[['🌸','Cánh sen','#f4a7b9'],['🎗️','Lụa vàng','#f2c75c'],['👏','Vỗ tay êm','#fff4dc']];
    function cheerBurst(e,k){const col=new THREE.Color(CHEER[e][2]),from=k==null?[0,2,SZ+2]:[CPOS[k][0],1.2,CPOS[k][1]];for(let n=0;n<14;n++){const p=parts[partI++%PN];p.life=1;p.x=from[0]+(Math.random()-.5)*.6;p.y=from[1];p.z=from[2];p.a=Math.random()*Math.PI*2;p.r=2.2+Math.random()*1.6;p.vy=.5+Math.random()*.5;p.va=(Math.random()<.5?-1:1)*(.4+Math.random()*.4);p.tx=0;p.tz=SZ+.4;p.k=0;p.c=col}
      if(e===2){strike(1600+Math.random()*300,.08,.03,[[1,1]]);setTimeout(()=>strike(1500,.08,.025,[[1,1]]),110)}else strike(e?988:784,1.2,.02,[[1,1],[2,.2]])}
    // ---- âm thanh: ngũ cung C–D–E–G–A, 6 chất âm mộc
    const ac=audio();const NOTE=[261.63,293.66,329.63,392,440];
    function voice(kind,p,g){if(!ac)return;const f=NOTE[(p-1)%5]*(p>5?2:1);g=g==null?1:g;
      if(kind==='tranh'){strike(f,1.8,.09*g,[[1,1],[2,.35],[3,.12],[4,.05]])}
      else if(kind==='chuong'){strike(f*2,3.2,.06*g,[[1,1],[2.76,.3],[5.4,.1]])}
      else if(kind==='mo'){strike(f*1.5,.14,.11*g,[[1,1],[1.6,.4]]);if(p>=4)strike(f*2,1.6,.03*g,[[1,1],[2.76,.25]])}
      else if(kind==='trung'){strike(f*2,.55,.09*g,[[1,1],[3.9,.25],[9.1,.06]])}
      else if(kind==='sao'||kind==='bau'){const t=ac.currentTime,o=ac.createOscillator(),v=ac.createGain(),lfo=ac.createOscillator(),lg=ac.createGain(),dur=kind==='sao'?1.3:1.9;o.type=kind==='sao'?'sine':'triangle';
        if(kind==='bau'){o.frequency.setValueAtTime(f*.94,t);o.frequency.exponentialRampToValueAtTime(f,t+.16)}else o.frequency.value=f*2;lfo.frequency.value=5.2;lg.gain.value=kind==='sao'?f*.012:f*.006;lfo.connect(lg).connect(o.frequency);
        v.gain.setValueAtTime(0,t);v.gain.linearRampToValueAtTime((kind==='sao'?.07:.09)*g,t+(kind==='sao'?.09:.02));v.gain.exponentialRampToValueAtTime(.0004,t+dur);o.connect(v).connect(ac.destination);o.start(t);lfo.start(t);o.stop(t+dur+.05);lfo.stop(t+dur+.05)}}
    // ---- nội dung: chương trình, câu đố văn hóa, ghép câu, đàm đạo, hái lộc
    const PROGRAMS={sen:{name:'Múa Sen',dur:150,step:.6,robe:'#f0c4c8',seed:11},quat:{name:'Múa Quạt Lụa',dur:150,step:.45,robe:'#e9c46a',seed:23},hoatau:{name:'Hòa tấu Đàn Tranh · Sáo Trúc · Đàn Bầu',dur:180,step:.5,robe:'#7a5a3c',seed:37}};
    const QUIZ=[
      ['do','Đàn bầu (độc huyền cầm) có mấy dây?',['1 dây','2 dây','3 dây','16 dây'],0,'Đàn bầu chỉ có một dây; người chơi tạo cao độ bằng cần đàn và bồi âm.'],
      ['do','Đàn tranh phổ biến ngày nay thường có bao nhiêu dây?',['7 dây','12 dây','16 dây','36 dây'],2,'Đàn tranh còn gọi là đàn thập lục: 16 dây.'],
      ['do',"Đàn T'rưng là nhạc cụ tre nứa của vùng nào?",['Tây Bắc','Tây Nguyên','Nam Bộ','Đồng bằng sông Hồng'],1,"Đàn T'rưng gắn với đồng bào các dân tộc Tây Nguyên."],
      ['do','Quan họ là dân ca của vùng nào?',['Huế','Nghệ Tĩnh','Kinh Bắc (Bắc Ninh, Bắc Giang)','Nam Bộ'],2,'Dân ca Quan họ Bắc Ninh được UNESCO ghi danh năm 2009.'],
      ['do','Nhã nhạc cung đình Huế được UNESCO vinh danh năm nào?',['1993','2003','2013','2023'],1,'Năm 2003, Nhã nhạc được công nhận là kiệt tác di sản phi vật thể.'],
      ['do','Thang âm ngũ cung có mấy âm?',['3','5','7','12'],1,'Năm âm: vì thế ai bấm phím nào cũng hòa âm êm tai.'],
      ['do','Múa rối nước sinh ra từ vùng nào?',['Đồng bằng sông Hồng','Tây Nguyên','Duyên hải miền Trung','Đồng bằng sông Cửu Long'],0,'Múa rối nước gắn với làng quê đồng bằng Bắc Bộ.'],
      ['do','Tết Trung thu rơi vào ngày nào âm lịch?',['Rằm tháng Giêng','Mùng 5 tháng 5','Rằm tháng 7','Rằm tháng 8'],3,'Rằm tháng Tám, đêm trăng tròn sáng nhất năm.'],
      ['doi','Ghép câu: «Thịt mỡ, dưa hành, câu đối đỏ»',['Cây nêu, tràng pháo, bánh chưng xanh','Hoa đào, mứt bí, áo dài hồng','Trăng rằm, đèn kéo, bánh nướng thơm','Ruộng lúa, cánh cò, khói lam chiều'],0,'Câu đối Tết quen thuộc của người Việt.'],
      ['doi','Ghép câu ca dao: «Gió đưa cành trúc la đà»',['Mây trôi lững thững qua nhà người thương','Tiếng chuông Trấn Vũ, canh gà Thọ Xương','Đêm khuya thanh vắng một mình ngân nga','Đường lên xứ Lạng bao xa'],1,'Ca dao về Hà Nội: Trấn Vũ, Thọ Xương.'],
      ['doi','Ghép câu ca dao: «Công cha như núi Thái Sơn»',['Nghĩa mẹ như nước trong nguồn chảy ra','Lòng con như biển bao la','Thờ cha kính mẹ mới là đạo con','Ơn thầy như ánh trăng rằm'],0,'Câu tiếp theo: «Một lòng thờ mẹ kính cha…»'],
      ['talk','Đàm đạo tối nay: mình cùng kể về điều gì?',['Ký ức Tết quê','Một câu hát mẹ ru','Món ăn chữa lành','Một nơi thấy bình yên'],-1,''],
      ['talk','Tiết mục nào bạn muốn xem tiếp?',['Múa Sen','Múa Quạt Lụa','Hòa tấu Đàn Tranh & Sáo','Một bài hát cùng hát'],-1,'']];
    const LOC=['Bình an như nước, mềm mà bền.','Năm nay lòng nhẹ, bước chân vững.','Có người thương, có việc vui, có giấc ngủ ngon.','Sức khỏe dồi dào, tâm ý thong dong.','Gieo một hạt lành, gặt mùa an.','Lời hiền đi trước, phúc lành theo sau.','Thở chậm một nhịp, việc khó hóa dễ.','Nhà ấm, bếp đỏ, bạn hiền.','Mỗi ngày một niềm biết ơn nhỏ.','Học điều mới, giữ điều tốt.','Sen trong đầm: gần bùn mà vẫn thơm.','Đi chậm mà xa, sống hiền mà sáng.'];
    // ---- trạng thái chung (chỉ trong bộ nhớ của trang: lời chúc, đèn, phiếu chọn không lưu Supabase)
    const S={joined:false,me:'me',role:'guest',list:[],assign:{},leader:'me',myC:0,pickC:null,tab:'stage',show:null,quiz:null,tally:[0,0,0,0],votes:new Map(),myVote:null,lantern:new Map(),wall:new Map(),lgo:null,loc:null,n:0,note:'',muted:false,video:null};
    const isLeader=()=>!S.joined||S.leader===S.me;
    const canHost=()=>isLeader();
    const nameOf=id=>{if(id===S.me)return myName();const p=S.list.find(x=>x.id===id);return clean(p&&p.name,24)||'Một người bạn'};
    const send=p=>{if(S.joined&&window.anyenSpaceChat)return window.anyenSpaceChat.send(p);return false};
    // Xếp chỗ giống nhau trên mọi máy: theo giờ vào; ai đã chọn đúng một bục còn trống thì ngồi bục đó, ai chọn cụm thì vào bục trống đầu tiên của cụm, còn lại tự vào bục trống theo vòng 6 cụm.
    function computeSeats(){const list=S.joined?S.list:[{id:S.me,t:0,c:S.pickC,s:S.pickS}];const taken=new Set(),assign={};let rr=0;
      const order=[...list].sort((a,b)=>(a.t||0)-(b.t||0)||String(a.id).localeCompare(String(b.id)));
      for(const p of order)if(Number.isInteger(p.s)&&p.s>=0&&p.s<36&&!taken.has(p.s)){assign[p.id]=p.s;taken.add(p.s)}
      const freeIn=k=>{for(let j=0;j<6;j++){const i=k+j*6;if(!taken.has(i))return i}return -1};
      for(const p of order){if(assign[p.id]!=null)continue;let i=Number.isInteger(p.c)&&p.c>=0&&p.c<6?freeIn(p.c):-1;if(i<0){for(let j=0;j<6&&i<0;j++)i=freeIn((rr+j)%6);if(i>=0)rr=(i%6+1)%6}if(i<0)break;assign[p.id]=i;taken.add(i)}
      S.assign=assign;const mine=assign[S.me];S.myC=mine==null?(S.pickC||0):mine%6;
      const hosts=S.list.filter(p=>p.host).sort((a,b)=>(a.t||0)-(b.t||0));S.leader=S.joined?((hosts[0]||[...S.list].sort((a,b)=>(a.t||0)-(b.t||0)||String(a.id).localeCompare(String(b.id)))[0]||{id:S.me}).id):S.me;
      for(let i=0;i<36;i++)seats.setColorAt(i,SEAT_OFF);for(const [id,i] of Object.entries(assign))seats.setColorAt(i,id===S.me?SEAT_ME:SEAT_ON);seats.instanceColor.needsUpdate=true;
      let n=0;S.sitIds=[];for(const [id,i] of Object.entries(assign)){if(id===S.me&&st.walk)continue;S.sitIds.push(id);const [x,z]=seatPos(i),p=id===S.me?{col:myColor()}:list.find(q=>q.id===id)||{},yaw=Math.atan2(-x*.15,SZ-z);/* quay mặt về sân khấu */
        dummy.position.set(x,.2,z);dummy.rotation.set(0,yaw,0);dummy.scale.setScalar(1);dummy.updateMatrix();sitBody.setMatrixAt(n,dummy.matrix);sitBody.setColorAt(n,new THREE.Color(/^#[0-9a-f]{6}$/i.test(p.col||'')?p.col:'#c9b48c'));
        dummy.position.set(x,.2+.78,z);dummy.scale.set(1,1.2,1);dummy.updateMatrix();sitHead.setMatrixAt(n,dummy.matrix);n++}
      sitBody.count=sitHead.count=n;sitBody.instanceMatrix.needsUpdate=sitHead.instanceMatrix.needsUpdate=true;if(sitBody.instanceColor)sitBody.instanceColor.needsUpdate=true;sitBody.boundingSphere=null;
      CPOS.forEach((_,k)=>tables.setColorAt(k,new THREE.Color(k===S.myC?'#f6dca0':'#ffffff')));tables.instanceColor.needsUpdate=true}
    function walkToMySeat(){const i=S.assign[S.me];if(i==null||!st.walk||!st.walk.goSeat)return;const [x,z,a]=seatPos(i);st.camOv=false;st.walk.goSeat({x,z,a:Math.atan2(-x*.15,SZ-z),y:.2,ax:x+Math.sin(a)*.5,az:z+Math.cos(a)*.5})}
    const clusterOf=id=>{const i=S.assign[id];return i==null?null:i%6};
    // ---- màn chiếu 16:9
    function roundRect(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
    function wrap(c,text,x,y,maxW,lh,maxL){const words=String(text).split(' ');let ln='',n=0;for(const w of words){const t=ln?ln+' '+w:w;if(c.measureText(t).width>maxW&&ln){c.fillText(ln,x,y+n*lh);n++;ln=w;if(n>=maxL)return}else ln=t}if(ln&&n<maxL)c.fillText(ln,x,y+n*lh)}
    let scrDirty=true,scrLast=0;
    function drawScreen(){const c=scrT.c,w=1024,h=576;const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#1b2a22');g.addColorStop(1,'#0e1512');c.fillStyle=g;c.fillRect(0,0,w,h);c.strokeStyle='#c8a96a';c.lineWidth=3;c.strokeRect(14,14,w-28,h-28);c.textAlign='center';
      const now=Date.now();
      if(S.lgo&&S.lgo>now-1500){const s=Math.max(0,Math.ceil((S.lgo-now)/1000));c.fillStyle='#f6dca0';c.font='600 40px system-ui, sans-serif';c.fillText('🏮 CÙNG THẢ 36 ĐÈN HOA AN YÊN',w/2,150);c.font='700 200px Georgia, serif';c.fillText(s?String(s):'✦',w/2,390);c.font='26px system-ui, sans-serif';c.fillStyle='#e8d7b0';c.fillText('Viết một lời chúc bình an ở bảng dưới, đèn sẽ tự bay khi đếm xong',w/2,470);}
      else if(S.quiz){const q=QUIZ[S.quiz.i];if(!q)return;c.fillStyle='#e8cf95';c.font='600 26px system-ui, sans-serif';c.fillText(q[0]==='talk'?'💬 ĐÀM ĐẠO · BÌNH CHỌN':q[0]==='doi'?'📜 GHÉP CÂU ĐỐI · CA DAO':'❓ ĐỐ VUI VĂN HÓA VIỆT',w/2,64);c.fillStyle='#fbf1dc';c.font='600 36px Georgia, serif';wrap(c,q[1],w/2,118,880,44,2);
        const tot=S.tally.reduce((a,b)=>a+b,0);q[2].forEach((o,k)=>{const y=210+k*80,pct=tot?S.tally[k]/tot:0,right=S.quiz.r&&q[3]===k;c.fillStyle='rgba(255,255,255,.06)';roundRect(c,80,y,864,62,14);c.fill();c.fillStyle=right?'rgba(140,200,140,.55)':'rgba(217,163,56,.42)';if(pct>0){roundRect(c,80,y,Math.max(28,864*pct),62,14);c.fill()}
          c.strokeStyle=S.myVote===k?'#f6dca0':'rgba(200,169,106,.5)';c.lineWidth=S.myVote===k?3:1.5;roundRect(c,80,y,864,62,14);c.stroke();c.textAlign='left';c.fillStyle='#fbf1dc';c.font='28px system-ui, sans-serif';c.fillText('ABCD'[k]+'. '+o+(right?'  ✓':''),104,y+41);c.textAlign='right';c.fillText(Math.round(pct*100)+'%',920,y+41);c.textAlign='center'});
        c.fillStyle='#cdb98e';c.font='22px system-ui, sans-serif';c.fillText(S.quiz.r&&q[4]?q[4]:tot+' phiếu · tỷ lệ chọn hiện trực tiếp · không chấm điểm',w/2,548)}
      else if(S.loc&&now-S.loc.at<20000){c.fillStyle='#f2c46a';c.font='600 40px system-ui, sans-serif';c.fillText('🧧 HÁI LỘC ĐẦU XUÂN',w/2,150);c.fillStyle='#fbf1dc';c.font='italic 44px Georgia, serif';wrap(c,'“'+LOC[S.loc.i]+'”',w/2,280,820,58,3);c.font='24px system-ui, sans-serif';c.fillStyle='#cdb98e';c.fillText('Lộc của riêng bạn · mỗi người một lá',w/2,480)}
      else if(S.show&&S.show.p!=='video'){const P=PROGRAMS[S.show.p],el=Math.max(0,(now-S.show.at)/1000);c.fillStyle='#e8cf95';c.font='600 28px system-ui, sans-serif';c.fillText('ĐÊM CA MÚA NHẠC AN YÊN · ĐANG DIỄN',w/2,80);c.fillStyle='#fbf1dc';c.font='600 56px Georgia, serif';wrap(c,P.name,w/2,200,900,64,2);
        c.fillStyle='rgba(255,255,255,.12)';c.fillRect(160,400,704,10);c.fillStyle='#d9a338';c.fillRect(160,400,704*Math.min(1,el/P.dur),10);c.font='26px system-ui, sans-serif';c.fillStyle='#cdb98e';const mm=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');c.fillText(mm(Math.min(el,P.dur))+' / '+mm(P.dur)+' · đồng bộ '+(S.joined?S.n:1)+' khán giả',w/2,460);c.fillText('Bấm 🌸 🎗️ 👏 để cổ vũ dịu nhẹ',w/2,505)}
      else{c.fillStyle='#e8cf95';c.font='600 30px system-ui, sans-serif';c.fillText('NHÀ VĂN HÓA LÀNG YÊN',w/2,100);c.fillStyle='#fbf1dc';c.font='600 52px Georgia, serif';c.fillText('Đêm Ca Múa Nhạc An Yên',w/2,190);c.font='28px system-ui, sans-serif';c.fillStyle='#e8d7b0';
        ['🎭 Múa Sen · Múa Quạt Lụa · Hòa tấu Đàn Tranh, Sáo Trúc, Đàn Bầu','🎶 Hòa tấu 36 nhịp gõ ngũ cung · phím 1–5','🏮 Thả 36 đèn hoa lên vòm mái','❓ Đố vui văn hóa · ghép câu đối · hái lộc','🍵 Tiệc trà · triển lãm 9 ô · 18 lời chúc'].forEach((t,k)=>c.fillText(t,w/2,270+k*48));
        c.fillStyle='#cdb98e';c.font='24px system-ui, sans-serif';c.fillText((S.joined?S.n+'/36 người trong phòng':'Trải nghiệm riêng')+(isLeader()?' · bạn đang dẫn chương trình':''),w/2,535)}
      scrT.needsUpdate=true;scrDirty=false}
    // ---- tường lời chúc 18 thẻ và triển lãm 9 ô
    function drawWall(){const c=wallT.c,w=768,h=384;c.fillStyle='#46552f';c.fillRect(0,0,w,h);c.fillStyle='#e8cf95';c.font='600 20px system-ui, sans-serif';c.textAlign='center';c.fillText('BỨC TƯỜNG 18 LỜI CHÚC LÀNH',w/2,26);
      const items=[...S.wall.values()].sort((a,b)=>b.at-a.at).slice(0,18);for(let k=0;k<18;k++){const x=12+(k%6)*125,y=40+Math.floor(k/6)*114,it=items[k];c.save();c.translate(x+58,y+52);c.rotate(((k*37)%7-3)*.012);c.fillStyle=it?['#f4ead6','#f6e2c4','#efe6d0'][k%3]:'rgba(244,234,214,.22)';c.fillRect(-56,-48,112,98);c.fillStyle='#b8873a';c.beginPath();c.arc(0,-42,4,0,Math.PI*2);c.fill();
        if(it){c.fillStyle='#3a2a1c';c.font='italic 13px Georgia, serif';c.textAlign='center';wrap(c,it.w,0,-20,100,15,4);c.font='600 11px system-ui, sans-serif';c.fillStyle='#8c6a34';c.fillText('— '+clean(it.name,14),0,40)}c.restore()}wallT.needsUpdate=true}
    const GAL={rows:[],state:'loading'};
    function drawGallery(){const c=galT.c,w=512;c.fillStyle='#46552f';c.fillRect(0,0,w,w);c.fillStyle='#e8cf95';c.font='600 18px system-ui, sans-serif';c.textAlign='center';c.fillText('TRIỂN LÃM 9 Ô · 4 KHO LÀNG',w/2,24);
      for(let k=0;k<9;k++){const x=16+(k%3)*162,y=36+Math.floor(k/3)*158,it=GAL.rows[k];c.fillStyle='#1c140d';c.fillRect(x,y,150,146);c.strokeStyle='#a6824b';c.lineWidth=3;c.strokeRect(x+3,y+3,144,140);
        if(!it){c.fillStyle='rgba(232,207,149,.35)';c.font='13px system-ui, sans-serif';c.fillText(GAL.state==='loading'?'Đang mở kho…':'Ô trống',x+75,y+78);continue}
        c.fillStyle=it.bg;c.fillRect(x+12,y+12,126,92);c.font='44px system-ui, sans-serif';c.fillStyle='#fff';c.fillText(it.icon,x+75,y+74);c.font='600 12px system-ui, sans-serif';c.fillStyle='#f6e7c8';c.fillText(clean(it.title,20),x+75,y+122);c.font='11px system-ui, sans-serif';c.fillStyle='#cdb98e';c.fillText(clean(it.by,18),x+75,y+137)}galT.needsUpdate=true}
    async function loadGallery(){drawGallery();const db=typeof flowerDb!=='undefined'?flowerDb:null;const out={flowers:[],robes:[],pots:[],aromas:[]};
      if(db&&typeof ARCH!=='undefined'){await Promise.all(Object.keys(out).map(async kind=>{const A=ARCH[kind];if(!A)return;for(const cols of A.cols){try{const {data,error}=await db.from(A.table).select(cols).order('seq',{ascending:false}).limit(STORE_FETCH);if(!error&&data){out[kind]=pickNine(data);return}}catch(e){return}}}))}
      const card={flowers:r=>({icon:(r.flowers||[]).slice(0,3).map(f=>(FLOWER_KINDS[f]||{}).icon||'🌸').join('')||'💐',bg:'#3d4a32',title:'Bó hoa dâng Phật',kind:'flowers'}),
        robes:r=>({icon:'🟧',bg:String(r.color||'#c98a1c').replace(/[^#0-9a-fA-F]/g,'').slice(0,7)||'#c98a1c',title:(Number(r.dieu)||5)+' điều y',kind:'robes'}),
        pots:r=>({icon:'🏺',bg:(typeof GOM_FIRED!=='undefined'&&GOM_FIRED[(Number(r.seed)||0)%GOM_FIRED.length]||[0,'#a0502e'])[1],title:(typeof GOM_SHAPES!=='undefined'&&(GOM_SHAPES[r.shape]||GOM_SHAPES[0]).name)||'Gốm Bàu Trúc',kind:'pots'}),
        aromas:r=>({icon:r.form==='tui'?'👝':'🫙',bg:'#4a3a52',title:clean(r.title,20)||(r.form==='tui'?'Túi thơm':'Lọ Ước'),kind:'aromas'})};
      const take=[['pots',3],['flowers',2],['robes',2],['aromas',2]],rows=[];for(const [k,n] of take)for(const r of out[k].slice(0,n))rows.push(Object.assign(card[k](r),{by:clean(r.name,18)||'Khách Làng Yên',row:r}));
      for(const [k] of take)for(const r of out[k].slice(take.find(x=>x[0]===k)[1]))if(rows.length<9)rows.push(Object.assign(card[k](r),{by:clean(r.name,18)||'Khách Làng Yên',row:r}));
      GAL.rows=rows.slice(0,9);GAL.state='ready';drawGallery();if(S.tab==='tea'&&S.sub==='gallery')render()}
    // ---- đèn hoa
    const L=[];/* {id,w,name,k,t0,slot} */
    function placeLantern(id,w,name){w=clean(w,60);if(!w)return;let it=S.lantern.get(id);if(it){it.w=w;it.name=name;return it}
      const used=new Set([...S.lantern.values()].map(x=>x.slot));let slot=0;while(used.has(slot)&&slot<36)slot++;if(slot>=36){const old=[...S.lantern.values()].sort((a,b)=>a.t0-b.t0)[0];if(!old)return;S.lantern.delete(old.id);slot=old.slot}
      const k=clusterOf(id);it={id,w,name,k:k==null?Math.floor(Math.random()*6):k,t0:performance.now(),slot};S.lantern.set(id,it);strike(523,2.5,.035,[[1,1],[2,.25],[3,.08]]);return it}
    function releaseMine(w){w=clean(w,60);if(!w){rmHint('Viết một lời chúc bình an ngắn trước khi thả đèn nhé');return}S.myWish=w;placeLantern(S.me,w,myName());send({k:'l',w});rmHint('🏮 Đèn hoa của bạn đang bay lên vòm mái · chạm một đèn để đọc lời chúc');goView('roof');render()}
    // ---- góc nhìn (trượt mềm)
    const VIEWS={overview:[0,1.1,-.8,0,.34,8.6],stage:[0,1.8,-3.3,0,.16,4.4],roof:[0,4.4,-.6,0,-.22,6.4],gallery:[-HW+.1,2.5,2.65,Math.PI/2,.04,3.6],wall:[HW-.1,2.8,2.65,-Math.PI/2,.04,3.6],tea:[HW-.6,1.2,2.2,-Math.PI/2+.3,.25,3]};
    /* có nhân vật đi lại: góc máy dựng sẵn bắt đầu từ đúng chỗ camera đang đứng, giữ tới khi người chơi bước đi (world3d st.camOv) */
    let tw=null;function goView(k){let v=VIEWS[k];if(k==='mine'){const [x,z]=CPOS[S.myC];v=[x,.8,z-.4,0,.5,4.6]}if(!v)return;
      if(st.walk&&!st.camOv){const f=new THREE.Vector3();st.cam.getWorldDirection(f);st.dist=5;st.pitch=Math.asin(Math.max(-1,Math.min(1,-f.y)));st.yaw=Math.atan2(-f.x,-f.z);st.target.copy(st.cam.position).addScaledVector(f,5);st.target.y-=.4}
      v=v.slice();{const asp=st.cam.aspect||1.6;if(asp<1)v[5]=Math.min(st.maxD,v[5]/Math.sqrt(asp))}/* điện thoại dọc: lùi xa hơn cho vừa khung */v[3]=st.yaw+Math.atan2(Math.sin(v[3]-st.yaw),Math.cos(v[3]-st.yaw));st.camOv=true;tw={a:[st.target.x,st.target.y,st.target.z,st.yaw,st.pitch,st.dist],b:v,t0:performance.now()};st.yawC=v[3]}
    st.minD=2.4;st.maxD=9.2;st.target.set(0,1.5,1.5);st.yaw=0;st.pitch=.12;st.dist=6;goView('overview');if(st.walk)st.camOv=false;
    /* bàn, bục ngồi và quầy trà là vật cản: nhân vật đi vòng, không xuyên qua */
    st.blocks=CPOS.map(([x,z])=>[x-1.2,z-1.2,x+1.2,z+1.2]).concat([[HW-.95,1.1,HW,4.2]]);
    // ---- chương trình biểu diễn (đồng bộ mốc giây sync_ts: mỗi máy tính thời điểm bắt đầu theo đồng hồ của người dẫn trừ độ lệch)
    let vidEl=null,vidTex=null;
    function stopVideo(){if(vidEl){try{vidEl.pause()}catch(e){}vidEl.removeAttribute('src');try{vidEl.load()}catch(e){}vidEl=null}if(vidTex){vidTex.dispose();vidTex=null}scrMat.map=scrT;scrMat.needsUpdate=true}
    function startVideo(url,at){stopVideo();const v=document.createElement('video');v.crossOrigin='anonymous';v.playsInline=true;v.setAttribute('playsinline','');v.preload='auto';v.src=url;vidEl=v;
      const sync=()=>{if(vidEl!==v||!S.show)return;const el=(Date.now()-S.show.at)/1000;if(isFinite(v.duration)&&el>v.duration+1){return}if(Math.abs(v.currentTime-el)>1.5)try{v.currentTime=Math.max(0,el)}catch(e){}};
      v.addEventListener('loadedmetadata',sync);v.addEventListener('error',()=>{if(vidEl===v){rmHint('Không mở được video này trên máy bạn (cần đường dẫn https tới tệp mp4/webm cho phép CORS)');stopVideo()}});
      vidTex=new THREE.VideoTexture(v);vidTex.colorSpace=THREE.SRGBColorSpace;scrMat.map=vidTex;scrMat.needsUpdate=true;v.muted=S.muted;v.play().catch(()=>{v.muted=true;S.muted=true;v.play().catch(()=>{});rmHint('Video đang chạy không tiếng · bấm 🔊 Bật tiếng ở bảng Sân khấu');render()});S.vsync=sync}
    function startShow(p,at,url,remote){if(p!=='video'&&!PROGRAMS[p])return;stopShow(true);S.show={p,at,url:p==='video'?url:null,step:-1};
      if(p==='video')startVideo(url,at);else{const P=PROGRAMS[p];NPC.forEach(n=>{n.robe.color.set(p==='hoatau'?['#7a5a3c','#5a6a4c','#6a4a5c'][n.i]:P.robe)})}
      layoutNPC();if(!remote){send({k:'show',p,at,u:p==='video'?url:undefined})}scrDirty=true;goView('stage');render()}
    function stopShow(silent,remote){if(!S.show)return;S.show=null;stopVideo();layoutNPC();if(!silent&&!remote)send({k:'stop'});scrDirty=true;render()}
    function layoutNPC(){const p=S.show&&S.show.p;NPC.forEach(n=>{n.g.visible=p!=='video';n.lotus.visible=n.lotus2.visible=p==='sen';n.fan.visible=n.fan2.visible=p==='quat';n.non.visible=p==='quat';n.flaps.forEach(f=>f.visible=p!=='hoatau');n.inst.visible=p==='hoatau';n.body.scale.set(1,p==='hoatau'?.62:1,1);n.body.position.y=p==='hoatau'?.39:.62;n.head.position.y=p==='hoatau'?1.0:1.42;
      n.arms.forEach(a=>a.position.y=p==='hoatau'?.8:1.18);n.inst.position.set(0,p==='hoatau'?(n.i===1?.95:.12):0,p==='hoatau'?(n.i===1?.18:.42):0);n.inst.rotation.set(0,n.i===1?0:0,0);n.g.position.set((n.i-1)*1.9,STAGE_Y,SZ-.2);n.g.rotation.set(0,0,0)})}
    const rng=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
    function melodyAt(p,step){const r=rng(PROGRAMS[p].seed*1000+Math.floor(step/8))();const phrase=[0,1,2,4,3,2,1,0].map((d,i)=>(d+Math.floor(r*5)+(i===7?0:0))%5+1);return phrase[step%8]}
    function tickShow(t){const sh=S.show;if(!sh){NPC.forEach(n=>{n.arms[0].rotation.z=-.25+Math.sin(t*.8+n.i)*.03;n.arms[1].rotation.z=.25;n.g.rotation.y=0});return}
      const el=(Date.now()-sh.at)/1000;if(sh.p==='video'){if(((t*2)|0)%10===0&&S.vsync)S.vsync();return}
      const P=PROGRAMS[sh.p];if(el>=P.dur){if(isLeader())stopShow(false);else stopShow(true,true);rmHint('🎭 '+P.name+' đã khép lại · cảm ơn bạn đã cùng xem');return}if(el<0)return;
      const step=Math.floor(el/P.step);if(step!==sh.step){const first=sh.step<0;sh.step=step;if(!first||el-step*P.step<.2){const m=melodyAt(sh.p,step);
        if(sh.p==='sen'){voice('tranh',m,.8);if(step%4===0)voice('sao',melodyAt(sh.p,step+2),.9)}else if(sh.p==='quat'){voice('tranh',m,.8);if(step%2===0)voice('mo',3,.6)}else{voice('tranh',m,.8);if(step%4===0)voice('sao',melodyAt(sh.p,step+3),.8);if(step%2===1)voice('bau',melodyAt(sh.p,step+5),.8);NPC.forEach(n=>n.hit=performance.now())}}}
      NPC.forEach(n=>{const i=n.i,ph=el*(sh.p==='quat'?1.6:1)+i*2.1;n.flaps.forEach((f,j)=>{f.rotation.x=(j?-1:1)*(.18+.22*Math.abs(Math.sin(ph*1.3+j)))});if(sh.p==='sen'){n.g.position.x=(i-1)*1.9+Math.sin(el*.35+i*2.1)*.7;n.g.position.z=SZ-.2+Math.cos(el*.35+i*2.1)*.5;n.g.rotation.y=Math.sin(ph*.6)*.7;n.arms[0].rotation.z=-1.3-Math.sin(ph*1.1)*.5;n.arms[1].rotation.z=1.5+Math.sin(ph*1.1+1)*.6}
        else if(sh.p==='quat'){n.g.position.x=(i-1)*1.9+Math.sin(el*.5+i)*.5;n.g.rotation.y=Math.sin(ph*.8)*.9;n.arms[0].rotation.z=-.9-Math.sin(ph*2)*.4;n.arms[1].rotation.z=1.1+Math.sin(ph*2.4)*.8;n.fan.rotation.z=Math.sin(ph*3)*.6}
        else{const u=Math.max(0,1-(performance.now()-(n.hit||0))/300);n.arms[0].rotation.z=-.7-u*.25;n.arms[1].rotation.z=.7+u*.3;n.g.rotation.y=0}})}
    // ---- câu đố / bình chọn
    let qsT=0;function pushTally(){if(!isLeader()||!S.quiz)return;clearTimeout(qsT);qsT=setTimeout(()=>{if(S.quiz)send({k:'qs',i:S.quiz.i,c:S.tally,r:S.quiz.r?1:0,at:S.quiz.at})},350)}
    function recount(){const c=[0,0,0,0];for(const v of S.votes.values())if(v>=0&&v<4)c[v]++;S.tally=c;scrDirty=true}
    function openQuiz(i,at,remote){if(!QUIZ[i])return;S.quiz={i,r:false,at};S.votes=new Map();S.myVote=null;S.tally=[0,0,0,0];S.lgo=null;if(!remote)send({k:'q',i,at});scrDirty=true;S.tab='quiz';goView('stage');render()}
    function vote(c){if(!S.quiz||c<0||c>3)return;S.myVote=c;strike(660,.6,.03,[[1,1],[2,.2]]);if(isLeader()){S.votes.set(S.me,c);recount();pushTally()}else{send({k:'v',i:S.quiz.i,c});S.tally=S.tally.slice();scrDirty=true}render()}
    function reveal(remote){if(!S.quiz)return;S.quiz.r=true;if(!remote){send({k:'qa',i:S.quiz.i});pushTally()}const q=QUIZ[S.quiz.i];if(q&&q[3]>=0)strike(784,2,.04,[[1,1],[2,.3],[3,.1]]);scrDirty=true;render()}
    function closeQuiz(remote){if(!S.quiz)return;S.quiz=null;if(!remote)send({k:'qx'});scrDirty=true;render()}
    function haiLoc(remote){const i=Math.floor(Math.random()*LOC.length);S.loc={i,at:Date.now()};scrDirty=true;strike(880,1.4,.04,[[1,1],[2,.3]]);if(!remote&&isLeader()&&S.joined)send({k:'loc'});rmHint('🧧 Lộc của bạn: '+LOC[i]);journal('Hái lộc ở Nhà Văn Hóa: '+LOC[i]);render()}
    // ---- hòa tấu: gói nốt nhỏ, gửi theo lô 200 ms (tối đa 5 gói/giây/người)
    let batch=[],batchT0=0,batchTimer=0,recent=[];
    function playNote(p,remote,k){k=k==null?S.myC:k;const kind=CL[k][2];const now=performance.now();recent=recent.filter(x=>now-x<600);if(!remote||recent.length<10){voice(kind,p,remote?.55:1);recent.push(now)}wave(k);
      if(!remote){if(!batch.length)batchT0=now;batch.push([p,Math.min(999,Math.round(now-batchT0))]);if(batch.length>=8)flushNotes();else if(!batchTimer)batchTimer=setTimeout(flushNotes,200)}}
    function flushNotes(){clearTimeout(batchTimer);batchTimer=0;if(batch.length)send({k:'n',n:batch});batch=[]}
    // ---- tín hiệu phòng (mọi gói đều đã qua space-chat: kênh riêng nha_van_hoa, có from và t)
    let cheerLast=0,teaLast=0;
    on(window,'anyen-space-room',e=>{const m=e.detail||{};if(!S.joined||!m.from||m.from===S.me)return;const from=String(m.from),lead=from===S.leader,skew=Number.isFinite(+m.t)?Date.now()-(+m.t):0,local=x=>Number.isFinite(+x)?+x+skew:Date.now();
      switch(m.k){
        case 'n':{const k=clusterOf(from);if(k==null||!Array.isArray(m.n))return;m.n.slice(0,8).forEach(x=>{const p=Array.isArray(x)?x[0]|0:0,dt=Array.isArray(x)?Math.max(0,Math.min(999,x[1]|0)):0;if(p>=1&&p<=5)setTimeout(()=>playNote(p,true,k),dt)});return}
        case 'ch':{const e2=m.e|0;if(e2>=0&&e2<3)cheerBurst(e2,clusterOf(from));return}
        case 'l':{placeLantern(from,m.w,nameOf(from));if(S.tab==='lantern')render();return}
        case 'w':{const w=clean(m.w,60);if(w){S.wall.set(from,{w,name:nameOf(from),at:Date.now()});drawWall();if(S.tab==='tea')render()}return}
        case 'tea':{rmHint('🍵 '+nameOf(from)+' vừa rót trà ở Quầy Đông');return}
        case 'v':{if(isLeader()&&S.quiz&&(m.i|0)===S.quiz.i){const c=m.c|0;if(c>=0&&c<4){S.votes.set(from,c);recount();pushTally();if(S.tab==='quiz')render()}}return}
      }
      if(!lead)return;/* từ đây: chỉ người dẫn */
      if(m.k==='show'){const p=String(m.p||''),u=typeof m.u==='string'&&/^https:\/\/[^\s"'<>]{4,400}$/.test(m.u)?m.u:null;if(p==='video'&&!u)return;if(S.show&&S.show.p===p&&Math.abs(S.show.at-local(m.at))<1500)return;startShow(p,local(m.at),u,true);rmHint('🎭 Người dẫn mở tiết mục · cả phòng cùng xem')}
      else if(m.k==='stop')stopShow(true,true);
      else if(m.k==='q'){const i=m.i|0;if(!S.quiz||S.quiz.i!==i)openQuiz(i,local(m.at),true)}
      else if(m.k==='qs'){const i=m.i|0;if(!QUIZ[i])return;if(!S.quiz||S.quiz.i!==i)openQuiz(i,local(m.at),true);if(Array.isArray(m.c))S.tally=[0,1,2,3].map(k=>Math.max(0,Math.min(99,m.c[k]|0)));if(m.r)S.quiz.r=true;scrDirty=true;if(S.tab==='quiz')render()}
      else if(m.k==='qa')reveal(true);else if(m.k==='qx')closeQuiz(true);
      else if(m.k==='lgo'){const at=local(m.at);if(at>Date.now()-2000&&at<Date.now()+30000){S.lgo=at;scrDirty=true;S.tab='lantern';goView('roof');render()}}
      else if(m.k==='loc')haiLoc(true);
      else if(m.k==='vr'){if(S.quiz&&(m.i|0)===S.quiz.i&&S.myVote!=null)setTimeout(()=>send({k:'v',i:S.quiz.i,c:S.myVote}),200+Math.random()*1500)}});
    function resendMine(){const j=600+Math.random()*3500;setTimeout(()=>{if(!S.joined)return;if(S.myWish)send({k:'l',w:S.myWish});if(S.myWall)setTimeout(()=>send({k:'w',w:S.myWall}),400)},j)}
    function resendLeader(){if(!isLeader()||!S.joined)return;setTimeout(()=>{if(!isLeader())return;if(S.show)send({k:'show',p:S.show.p,at:S.show.at,u:S.show.url||undefined});if(S.quiz)send({k:'qs',i:S.quiz.i,c:S.tally,r:S.quiz.r?1:0,at:S.quiz.at})},300)}
    on(window,'anyen-space-result',e=>{const d=e.detail||{};if(d.id!=='nha_van_hoa')return;if(d.ok){S.joined=true;S.me=d.me||S.me;S.note='';resendMine()}else{S.joined=false;S.list=[];S.n=0;
      S.note=d.reason==='guest'||d.reason==='auth'?'Bạn đang trải nghiệm riêng · đăng nhập thành viên để cùng 36 người xem, chơi nhạc và thả đèn':d.reason==='full'?'Nhà Văn Hóa đã đủ 36 người · bạn đang trải nghiệm riêng':'Chưa kết nối được phòng 36 người · bạn đang trải nghiệm riêng'}computeSeats();scrDirty=true;render()});
    on(window,'anyen-space-people',e=>{const d=e.detail||{};if(d.id!=='nha_van_hoa')return;const grew=(d.n||0)>S.n;S.n=d.n||0;if(d.me)S.me=d.me;S.joined=true;
      S.list=Array.isArray(d.list)?d.list.map(p=>({id:String(p.id),name:clean(p.name,24),t:+p.t||0,host:!!p.host,c:Number.isInteger(p.c)?p.c:null,s:Number.isInteger(p.s)?p.s:null,col:/^#[0-9a-f]{6}$/i.test(p.col||'')?p.col:null})):[];const wasLead=S.leader;computeSeats();
      if(grew){resendLeader();resendMine()}if(wasLead!==S.leader&&S.leader===S.me){rmHint('🎙️ Bạn đang dẫn chương trình cho cả phòng');if(S.quiz){S.votes=new Map();if(S.myVote!=null)S.votes.set(S.me,S.myVote);recount();send({k:'vr',i:S.quiz.i});pushTally()}}scrDirty=true;render()});
    // vai trò: Healer/Admin được ưu tiên dẫn (tự báo trong presence; chỉ ảnh hưởng ai điều khiển màn chiếu, không mở quyền dữ liệu nào)
    if(window.anyenSpaceChat&&window.anyenSpaceChat.meta)window.anyenSpaceChat.meta({col:myColor()});
    (async()=>{try{if(typeof window.anyenAuthClient!=='function')return;const c=await window.anyenAuthClient();if(!c)return;const {data}=await c.rpc('anyen_my_role');S.role=String(data||'guest');if(/therapist|admin/.test(S.role)&&window.anyenSpaceChat&&window.anyenSpaceChat.meta)window.anyenSpaceChat.meta({host:true})}catch(e){}})();
    function pickSeat(i){if(!(i>=0&&i<36))return;const who=Object.entries(S.assign).find(([id,j])=>j===i);if(who&&who[0]!==S.me){rmHint('Bục này đã có '+nameOf(who[0])+' ngồi · chạm một bục trống (màu tối) để ngồi');return}
      S.pickS=i;S.pickC=i%6;if(S.joined&&window.anyenSpaceChat&&window.anyenSpaceChat.meta)window.anyenSpaceChat.meta({s:i,c:i%6});computeSeats();walkToMySeat();wave(i%6);voice(CL[i%6][2],1);rmHint('🧘 Bạn đã ngồi vào bục '+(Math.floor(i/6)+1)+' cụm '+CL[i%6][0]+' · '+CL[i%6][1]);render()}
    function pickCluster(k){if(k<0||k>5)return;S.pickC=k;S.pickS=null;if(S.joined&&window.anyenSpaceChat&&window.anyenSpaceChat.meta)window.anyenSpaceChat.meta({c:k,s:-1});computeSeats();walkToMySeat();wave(k);voice(CL[k][2],1);rmHint('🎶 Bạn ngồi cụm '+CL[k][0]+' · '+CL[k][1]+' · bấm phím 1–5 để hòa tấu');render()}
    // ---- chạm trong phòng: dùng vị trí ngón tay cuối cùng để biết chạm vào bàn nào, đèn nào, ô nào
    let lastP=null;on(rmCanvas,'pointerdown',e=>{lastP={x:e.clientX,y:e.clientY}});
    const ray=new THREE.Raycaster();function hitOf(obj){if(!lastP)return null;const rc=rmCanvas.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((lastP.x-rc.left)/rc.width*2-1,-(lastP.y-rc.top)/rc.height*2+1),st.cam);return ray.intersectObject(obj,false)[0]||null}
    rTap(st,tables,()=>{const h=hitOf(tables);if(h&&h.instanceId!=null){S.tab='jam';pickCluster(h.instanceId);if(!st.walk)goView('mine')}});
    rTap(st,seats,()=>{const h=hitOf(seats);if(h&&h.instanceId!=null)pickSeat(h.instanceId)});
    rTap(st,sitBody,()=>{const h=hitOf(sitBody);if(!h||h.instanceId==null)return;const id=(S.sitIds||[])[h.instanceId],e=id!=null&&[id,S.assign[id]];if(e)rmHint(e[0]===S.me?'🧘 Đây là chỗ của bạn · chạm một bục trống để đổi chỗ':'🧘 '+nameOf(e[0])+' đang ngồi ở cụm '+CL[e[1]%6][0])});
    rTap(st,lanterns,()=>{const h=hitOf(lanterns);if(!h||h.instanceId==null)return;const it=[...S.lantern.values()].find(x=>x.slot===h.instanceId);if(it){S.readL=it.id;rmHint('🏮 '+clean(it.name,24)+': “'+it.w+'”');S.tab='lantern';render()}});
    rTap(st,screen,()=>{S.tab=S.quiz?'quiz':'stage';goView('stage');render()});
    rTap(st,gallery,()=>{S.tab='tea';S.sub='gallery';goView('gallery');const h=hitOf(gallery);if(h&&h.uv){const px=h.uv.x*512,py=(1-h.uv.y)*512,col=Math.max(0,Math.min(2,Math.floor((px-16)/162))),row=Math.max(0,Math.min(2,Math.floor((py-36)/158)));S.galSel=row*3+col}if(GAL.state!=='ready')loadGallery();render()});
    rTap(st,wishWall,()=>{S.tab='tea';S.sub='wall';goView('wall');render()});
    rTap(st,counter,()=>{S.tab='tea';S.sub='tea';goView('tea');render()});rTap(st,pot,()=>pourTea());
    NPC.forEach(n=>rTap(st,n.g,()=>{S.tab='stage';goView('stage');render()}));
    function pourTea(){if(performance.now()-teaLast<2500)return;teaLast=performance.now();steam.userData.t0=teaLast;strike(1900,.4,.01,[[1,1]]);setTimeout(()=>strike(620,1.2,.02,[[1,1],[2.4,.2]]),400);rmHint('🍵 Bạn rót một chén trà ấm ở Quầy Đông');send({k:'tea'})}
    const typing=e=>{const t=e.target;return t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.isContentEditable)};
    on(document,'keydown',e=>{if(!roomOpen||typing(e)||e.repeat)return;const p=+e.key;if(p>=1&&p<=5){e.preventDefault();playNote(p);if(S.tab!=='jam'){S.tab='jam';render()}}});
    // ---- bảng điều khiển
    function modeBadge(){const lead=isLeader();return '<p class="vh-mode">'+(S.joined?'👥 '+S.n+'/36 người':'🧘 Trải nghiệm riêng')+' · bạn ở <b>'+CL[S.myC][0]+' '+CL[S.myC][1]+'</b>'+(S.joined?(lead?' · 🎙️ bạn đang dẫn chương trình':' · người dẫn: '+esc(nameOf(S.leader))):'')+'</p>'+(S.note?'<p class="rm-note">'+esc(S.note)+'</p>':'')}
    function render(){{const ae=document.activeElement;if(ae&&ae.tagName==='INPUT'&&rmPanel.contains(ae)){S.pend=true;return}}const t=S.tab,lead=canHost();let h=modeBadge();
      h+='<div class="rm-row vh-tabs">'+[['stage','🎭 Sân khấu'],['jam','🎶 Hòa tấu'],['lantern','🏮 Đèn hoa'],['quiz','❓ Đố vui'],['tea','🍵 Tiệc trà']].map(([k,l])=>'<button type="button" data-tab="'+k+'"'+(t===k?' class="sel"':'')+'>'+l+'</button>').join('')+'</div>';
      if(t==='stage'){const sh=S.show;h+=sh?'<p>🎭 Đang diễn: <b>'+esc(sh.p==='video'?'Video / Livestream 16:9':PROGRAMS[sh.p].name)+'</b> · cả phòng xem cùng một mốc giây.</p>':'<p><b>01 · Ca Múa Nhạc Dân tộc</b> · '+(lead?'Bạn chọn tiết mục cho cả phòng.':'Người dẫn sẽ mở tiết mục; mọi người xem cùng lúc.')+'</p>';
        if(lead){h+='<div class="rm-row">'+Object.entries(PROGRAMS).map(([k,P])=>'<button type="button" data-vh="show" data-p="'+k+'"'+(sh&&sh.p===k?' class="sel"':'')+'>'+(k==='sen'?'🪷 ':k==='quat'?'🪭 ':'🎼 ')+esc(P.name)+'</button>').join('')+(sh?'<button type="button" data-vh="stop">⏹ Dừng</button>':'')+'</div>'+
          '<form class="rm-row" data-vh="video"><input type="url" inputmode="url" maxlength="400" placeholder="Đường dẫn video https (mp4/webm) cho màn chiếu" aria-label="Đường dẫn video" class="vh-in"><button type="submit">📺 Chiếu</button></form>'}
        if(sh&&sh.p==='video')h+='<div class="rm-row"><button type="button" data-vh="unmute">'+(S.muted?'🔊 Bật tiếng':'🔈 Tắt tiếng')+'</button></div>';
        h+='<div class="rm-row">Cổ vũ: '+CHEER.map(([i,l],k)=>'<button type="button" data-vh="cheer" data-e="'+k+'">'+i+' '+l+'</button>').join('')+'</div>'}
      else if(t==='jam')h+='<p><b>02 · Hòa tấu 36 nhịp gõ ngũ cung</b> · Bấm 1–5 (hoặc phím số) lúc nào cũng hòa âm êm tai, không lệch tông. Chạm một bàn để đổi cụm nhạc cụ, hoặc chạm một bục trống để ngồi đúng chỗ đó.</p><div class="rm-row vh-keys">'+['Đô','Rê','Mi','Son','La'].map((n,k)=>'<button type="button" data-vh="note" data-p="'+(k+1)+'"><b>'+(k+1)+'</b><small>'+n+'</small></button>').join('')+'</div><div class="rm-row">'+CL.map(([id,nm],k)=>'<button type="button" data-vh="cluster" data-c="'+k+'"'+(k===S.myC?' class="sel"':'')+'>'+id+' '+esc(nm)+'</button>').join('')+'</div>';
      else if(t==='lantern'){const mine=S.lantern.get(S.me),cnt=S.lantern.size;h+='<p><b>03 · Thả đèn hoa An Yên</b> · '+cnt+'/36 đèn đang lơ lửng dưới vòm mái. Chạm một đèn để đọc lời chúc.</p>'+
        (S.readL&&S.lantern.get(S.readL)?'<p class="rm-quote">🏮 '+esc(S.lantern.get(S.readL).name)+': “'+esc(S.lantern.get(S.readL).w)+'”</p>':'')+
        '<form class="rm-row" data-vh="lantern"><input type="text" maxlength="60" autocomplete="off" placeholder="Lời chúc bình an ngắn (tối đa 60 ký tự)" aria-label="Lời chúc" class="vh-in" value="'+esc(S.draftWish||'')+'"><button type="submit" class="rm-gold">🏮 '+(mine?'Đổi lời chúc':'Thả đèn hoa')+'</button></form>'+
        (lead&&S.joined?'<div class="rm-row"><button type="button" data-vh="lgo">✨ Cả phòng cùng thả sau 10 giây</button></div>':'')+'<p class="rm-note">Lời chúc chỉ gửi cho người đang ở trong phòng, không lưu lại.</p>'}
      else if(t==='quiz'){const q=S.quiz&&QUIZ[S.quiz.i];h+='<p><b>04 · Đố vui văn hóa · Ghép câu đối · Bình chọn</b> · Tỷ lệ chọn hiện trực tiếp trên màn chiếu, không chấm điểm.</p>';
        if(q)h+='<p>'+esc(q[1])+'</p><div class="rm-row vh-opts">'+q[2].map((o,k)=>'<button type="button" data-vh="vote" data-c="'+k+'"'+(S.myVote===k?' class="sel"':'')+'>'+'ABCD'[k]+'. '+esc(o)+'</button>').join('')+'</div>'+(S.quiz.r&&q[4]?'<p class="rm-note">'+esc(q[4])+'</p>':'');
        else h+='<p class="rm-note">'+(lead?'Chọn một câu để mở cho cả phòng.':'Chờ người dẫn mở câu hỏi trên màn chiếu.')+'</p>';
        if(lead){h+='<div class="rm-row">'+(q?(q[3]>=0&&!S.quiz.r?'<button type="button" data-vh="reveal">✓ Hiện đáp án</button>':'')+'<button type="button" data-vh="next">⏭ Câu tiếp</button><button type="button" data-vh="qclose">✕ Đóng câu</button>':'<button type="button" class="rm-gold" data-vh="next">❓ Mở câu đố</button><button type="button" data-vh="doi">📜 Ghép câu đối</button><button type="button" data-vh="talk">💬 Chủ đề đàm đạo</button>')+'<button type="button" data-vh="loc">🧧 Hái lộc cùng nhau</button></div>'}
        else h+='<div class="rm-row"><button type="button" data-vh="loc">🧧 Hái lộc cho mình</button></div>'}
      else if(t==='tea'){const sub=S.sub||'tea';h+='<p><b>05 · Tiệc trà · Triển lãm 9 ô · 18 lời chúc · Quà Túi An Yên</b></p><div class="rm-row">'+[['tea','🍵 Quầy trà'],['wall','📜 18 lời chúc'],['gallery','🖼️ Triển lãm 9 ô']].map(([k,l])=>'<button type="button" data-sub="'+k+'"'+(sub===k?' class="sel"':'')+'>'+l+'</button>').join('')+'<button type="button" data-vh="gift">🎁 Tặng quà</button></div>';
        if(sub==='tea')h+='<p>Quầy Đông tự phục vụ: chạm ấm trà hoặc bấm nút để rót một chén cho mình, mọi người trong phòng thấy bạn đang dùng trà.</p><div class="rm-row"><button type="button" class="rm-gold" data-vh="tea">🍵 Rót trà</button></div>';
        else if(sub==='wall')h+='<p>Treo một lời chúc lên Tường Đông (18 thẻ mới nhất của phòng).</p><form class="rm-row" data-vh="wall"><input type="text" maxlength="60" autocomplete="off" placeholder="Lời chúc (tối đa 60 ký tự)" aria-label="Lời chúc treo tường" class="vh-in"><button type="submit" class="rm-gold">📜 Treo thẻ</button></form>';
        else{const it=GAL.rows[S.galSel|0];h+='<p>Tường Tây bày 9 tác phẩm từ 4 kho sẵn có (Gốm · Hoa · May Y · Lọ Ước), theo quy tắc kho 69/9. Chỉ xem, không tạo kho mới.</p>'+(GAL.state!=='ready'?'<p class="rm-note">Đang mở kho…</p>':!GAL.rows.length?'<p class="rm-note">Các kho đang trống hoặc chưa kết nối được.</p>':'<div class="rm-row">'+GAL.rows.map((r,k)=>'<button type="button" data-vh="gal" data-c="'+k+'"'+(k===(S.galSel|0)?' class="sel"':'')+'>'+r.icon+' '+(k+1)+'</button>').join('')+'</div>'+(it?'<p class="rm-quote">'+it.icon+' '+esc(it.title)+' · '+esc(it.by)+(typeof ARCH!=='undefined'&&ARCH[it.kind]?'</p><div class="vh-arch">'+ARCH[it.kind].row(it.row)+'</div>':'</p>'):''))}}
      rmPanel.innerHTML=h;
      rmPanel.querySelectorAll('form[data-vh]').forEach(f=>{const inp=f.querySelector('input');if(f.dataset.vh==='lantern')inp.oninput=()=>{S.draftWish=inp.value};f.onsubmit=e=>{e.preventDefault();const v=inp.value;inp.blur();
        if(f.dataset.vh==='lantern'){S.draftWish='';releaseMine(v)}else if(f.dataset.vh==='wall'){const w=clean(v,60);if(!w)return;S.myWall=w;S.wall.set(S.me,{w,name:myName(),at:Date.now()});drawWall();send({k:'w',w});rmHint('📜 Đã treo lời chúc lên Tường Đông');goView('wall');render()}
        else if(f.dataset.vh==='video'){const u=String(v||'').trim();if(!/^https:\/\/[^\s"'<>]{4,400}$/.test(u)){rmHint('Cần đường dẫn https tới tệp video');return}startShow('video',Date.now(),u,false)}}})}
    on(rmPanel,'focusout',()=>{if(S.pend){S.pend=false;setTimeout(render,0)}});
    let cheerBusy=0;
    on(rmPanel,'click',e=>{const b=e.target.closest('button');if(!b||b.type==='submit')return;if(b.dataset.tab){S.tab=b.dataset.tab;goView(S.tab==='jam'?'mine':S.tab==='lantern'?'roof':S.tab==='tea'?(S.sub==='wall'?'wall':S.sub==='gallery'?'gallery':'tea'):'stage');render();return}
      if(b.dataset.sub){S.sub=b.dataset.sub;goView(S.sub==='wall'?'wall':S.sub==='gallery'?'gallery':'tea');if(S.sub==='gallery'&&GAL.state!=='ready')loadGallery();render();return}
      const a=b.dataset.vh;
      if(a==='note')playNote(+b.dataset.p);
      else if(a==='cluster')pickCluster(+b.dataset.c);
      else if(a==='cheer'){const now=performance.now();if(now-cheerBusy<700)return;cheerBusy=now;const k=+b.dataset.e;cheerBurst(k,S.myC);send({k:'ch',e:k})}
      else if(a==='show'&&canHost())startShow(b.dataset.p,Date.now(),null,false);
      else if(a==='stop'&&canHost())stopShow(false);
      else if(a==='unmute'){S.muted=!S.muted;if(vidEl){vidEl.muted=S.muted;if(!S.muted)vidEl.play().catch(()=>{})}render()}
      else if(a==='lgo'&&canHost()){const at=Date.now()+10000;S.lgo=at;send({k:'lgo',at});scrDirty=true;goView('roof');render()}
      else if(a==='vote')vote(+b.dataset.c);
      else if(a==='reveal'&&canHost())reveal(false);
      else if(a==='qclose'&&canHost())closeQuiz(false);
      else if((a==='next'||a==='doi'||a==='talk')&&canHost()){const kind=a==='next'?(S.quiz?QUIZ[S.quiz.i][0]:'do'):a;const cur=S.quiz?S.quiz.i:-1;let i=-1;for(let j=1;j<=QUIZ.length;j++){const q=(cur+j)%QUIZ.length;if(QUIZ[q][0]===kind){i=q;break}}if(i>=0)openQuiz(i,Date.now(),false)}
      else if(a==='loc')haiLoc(false);
      else if(a==='tea')pourTea();
      else if(a==='gal'){S.galSel=+b.dataset.c;render()}
      else if(a==='gift'){document.body.classList.add('zen-sheet-bag');rmHint('🎁 Chọn một vật phẩm trong Túi An Yên rồi chọn người nhận đang cùng phòng')}});
    // ---- vòng vẽ
    computeSeats();drawWall();drawGallery();drawScreen();layoutNPC();loadGallery();
    const tmpC=new THREE.Color();let lgoFired=false;
    st.tick.push(t=>{const now=performance.now();{const asp=st.cam.aspect,f=asp<1?Math.min(78,52/Math.sqrt(asp)):52;if(Math.abs(st.cam.fov-f)>.5){st.cam.fov=f;st.cam.updateProjectionMatrix()}}/* điện thoại dọc: mở góc nhìn */
      if(tw){const u=Math.min(1,(now-tw.t0)/1200),k=u*u*(3-2*u),A=tw.a,B=tw.b;st.target.set(A[0]+(B[0]-A[0])*k,A[1]+(B[1]-A[1])*k,A[2]+(B[2]-A[2])*k);st.yaw=A[3]+(B[3]-A[3])*k;st.pitch=A[4]+(B[4]-A[4])*k;st.dist=A[5]+(B[5]-A[5])*k;if(u>=1)tw=null}
      tickShow(t);slit.material.opacity=.42+.12*Math.sin(t*.4);stageLight.intensity=S.show?6+Math.sin(t*2.2)*.6:4;
      // sóng ánh sáng
      for(let i=0;i<WAVES;i++){const w=waveS[i],u=(now-w.t0)/1600;if(u>=0&&u<1){dummy.position.set(w.x,.03,w.z);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.setScalar(1.4+u*4.2);dummy.updateMatrix();waves.setMatrixAt(i,dummy.matrix);waves.setColorAt(i,tmpC.copy(w.c).multiplyScalar(.32*(1-u)))}else if(u>=1&&u<1.2){waves.setColorAt(i,BLACK)}}
      waves.instanceMatrix.needsUpdate=true;waves.instanceColor.needsUpdate=true;
      // đèn hoa
      for(const it of S.lantern.values()){const [sx,sy,sz]=slotPos(it.slot),[cx,cz]=CPOS[it.k],u=Math.min(1,(now-it.t0)/6000),k=u*u*(3-2*u),i=it.slot;dummy.position.set(cx+(sx-cx)*k+Math.sin(t*.25+i)*.12*k,1+(sy-1)*k+Math.sin(t*.6+i*1.7)*.1*k,cz+(sz-cz)*k+Math.cos(t*.22+i)*.1*k);dummy.rotation.set(Math.sin(t*.7+i)*.08,t*.2+i,Math.cos(t*.6+i)*.08);dummy.scale.setScalar(1.25);dummy.updateMatrix();lanterns.setMatrixAt(i,dummy.matrix);lgPos[i*3]=dummy.position.x;lgPos[i*3+1]=dummy.position.y+.06;lgPos[i*3+2]=dummy.position.z;lgGeo.attributes.position.needsUpdate=true;lanterns.setColorAt(i,tmpC.copy(LCOL).lerp(LCOL2,.5+.5*Math.sin(t*1.3+i)))}
      lanterns.instanceMatrix.needsUpdate=true;lanterns.instanceColor.needsUpdate=true;lanterns.boundingSphere=null;lanterns.boundingBox=null;
      if(S.lgo){const left=S.lgo-Date.now();if(left<=0&&!lgoFired){lgoFired=true;if(S.myWish||clean(S.draftWish,60))releaseMine(S.myWish||S.draftWish);else rmHint('🏮 Cả phòng vừa thả đèn · viết lời chúc để thả đèn của bạn');setTimeout(()=>{S.lgo=null;lgoFired=false;scrDirty=true},1600)}if(((now/250)|0)!==S.lgoTick){S.lgoTick=(now/250)|0;scrDirty=true}}
      // cổ vũ
      let alive=false;for(let i=0;i<PN;i++){const p=parts[i];if(p.life<=0)continue;alive=true;p.life-=.0045;p.k=Math.min(1,p.k+.02);p.a+=p.va*.016;p.y+=p.vy*.016;const cx=p.x+(p.tx-p.x)*p.k*.02,cz=p.z+(p.tz-p.z)*p.k*.02;p.x=cx;p.z=cz;
        pPos[i*3]=p.x+Math.sin(p.a)*p.r*p.k*.6;pPos[i*3+1]=p.life>0?p.y:-5;pPos[i*3+2]=p.z+Math.cos(p.a)*p.r*p.k*.35;pCol[i*3]=p.c.r*p.life;pCol[i*3+1]=p.c.g*p.life;pCol[i*3+2]=p.c.b*p.life}
      if(alive||pts.userData.alive){pGeo.attributes.position.needsUpdate=true;pGeo.attributes.color.needsUpdate=true}pts.userData.alive=alive;
      const us=(now-(steam.userData.t0||-1e9))/1000;steam.material.opacity=us<4?.25*Math.sin(Math.min(1,us/4)*Math.PI):0;steam.position.y=1.3+us*.06;
      if(scrDirty||(now-scrLast>1000&&(S.show||S.lgo))){scrLast=now;drawScreen()}});
    rmHint('Nhà Văn Hóa · 36 người · chạm sân khấu, bàn nhạc cụ, đèn hoa, Tường Tây hay Quầy Đông');render();
    window.dispatchEvent(new CustomEvent('anyen-space-ask'));/* xin space-chat phát lại danh sách người nếu đã ở trong kênh */
    st.cleanup=()=>{roomBox.classList.remove('vanhoa');flushNotes();clearTimeout(qsT);stopVideo();document.body.classList.remove('zen-sheet-bag');for(const f of offs)f();for(const t of texs)t.dispose();
      sc.traverse(o=>{if(o.material)(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>m.dispose())});delete window.__vanhoa};
    // kiểm tra: số tam giác đang vẽ, số PointLight, trạng thái; giả lập người khác
    window.__vanhoa={tris:()=>{let n=0;sc.traverse(o=>{if(!o.visible||(!o.isMesh&&!o.isSprite))return;let p=o.parent,vis=true;while(p){if(!p.visible)vis=false;p=p.parent}if(!vis)return;const g=o.geometry;if(!g)return;const c=(g.index?g.index.count:g.attributes.position.count)/3;n+=c*(o.isInstancedMesh?o.count:1)});return n},
      points:()=>{let n=0;sc.traverse(o=>{if(o.isPointLight)n++});return n},state:()=>({joined:S.joined,me:S.me,leader:S.leader,myC:S.myC,n:S.n,show:S.show&&S.show.p,quiz:S.quiz&&S.quiz.i,tally:S.tally.slice(),lanterns:S.lantern.size,wall:S.wall.size,gallery:GAL.rows.length,tab:S.tab}),
      fake:(id,msg)=>window.dispatchEvent(new CustomEvent('anyen-space-room',{detail:Object.assign({from:id,t:Date.now()},msg)})),
      people:list=>window.dispatchEvent(new CustomEvent('anyen-space-people',{detail:{id:'nha_van_hoa',n:list.length,me:S.me,list}})),
      lanternAll:()=>{for(let i=0;i<36;i++)placeLantern('t'+i,'Lời chúc bình an số '+(i+1),'Khách '+(i+1))},skip:s=>{if(S.show)S.show.at-=s*1000}};
  }
  // Nhà Sắc · hoa lan (House of Sight): nhà kính trưng 6 dòng lan; chạm chậu để xem, Thiền ngắm hoa 2 phút.
  // Cổng Viverse là lối riêng bên hông nhà, không mở từ trong nhà.
  function roomNhaSac(st){st.target.set(0,.9,-.6);st.dist=4.4;st.pitch=.14;st.minD=1.1;st.maxD=6;
    rmHint('Nhà Sắc · chạm một chậu lan để ngắm gần · Kéo để nhìn quanh');
    const iron=mat('#2f3a33',.5),glass=new THREE.MeshStandardMaterial({color:'#e3f2ea',roughness:.1,metalness:.1,transparent:true,opacity:.18,depthWrite:false,side:THREE.DoubleSide});
    // khung kính: song sắt trên tường sau và hai bên, mái kính có xà
    for(let i=-3;i<=3;i++)rAdd(st,new THREE.Mesh(new THREE.BoxGeometry(.05,4,.05),iron),i*1.15,2,-3.42);
    for(const y of [1.1,2.4])rAdd(st,new THREE.Mesh(new THREE.BoxGeometry(8,.05,.05),iron),0,y,-3.42);
    for(const sx of [-3.92,3.92])for(let i=-2;i<=2;i++)rAdd(st,new THREE.Mesh(new THREE.BoxGeometry(.05,4,.05),iron),sx,2,i*1.3);
    rAdd(st,new THREE.Mesh(new THREE.PlaneGeometry(8,7),glass),0,3.95,0).rotation.x=Math.PI/2;
    for(let i=-3;i<=3;i++)rAdd(st,new THREE.Mesh(new THREE.BoxGeometry(.06,.06,7),iron),i*1.15,3.9,0);
    const sky=new THREE.DirectionalLight('#f4fff4',1.1);sky.position.set(-1,6,1);st.sc.add(sky);st.sc.background=new THREE.Color('#203328');
    // 27/11: bỏ lối sỏi trắng và tọa cụ; nhà này chỉ đứng ngắm lan, nền là sàn gỗ trơn. Bục gỗ trưng lan hình vòng cung
    const deck=mat('#6b4e36'),soil=mat('#3b2c20');
    // kệ ba tầng sát tường sau với các chậu lan nhỏ
    for(const [k,y,z] of [[0,.45,-3.05],[1,.9,-3.2],[2,1.35,-3.3]]){rAdd(st,new THREE.Mesh(new THREE.BoxGeometry(6.6,.06,.34),deck),0,y,z);for(const x of [-3.2,3.2])rAdd(st,new THREE.Mesh(new THREE.BoxGeometry(.06,y,.06),iron),x,y/2,z)}
    const KINDS=[
      {id:'ho_diep',name:'Lan Hồ Điệp',sci:'Phalaenopsis',col:'#f6f0f4',lip:'#d0507a',n:5,size:.065,arch:1.6,note:'Cánh tròn, xếp như đàn bướm đậu trên một cành cong.',look:'Nhìn đường cong của cành hoa, từ gốc ra đến nụ cuối.'},
      {id:'dia_lan',name:'Địa lan',sci:'Cymbidium',col:'#d9cf7a',lip:'#a0402e',n:8,size:.06,arch:.25,note:'Lan đất, lá dài như lá kiếm, ngồng hoa thẳng mọc từ gốc; được trồng nhiều ở Đà Lạt.',look:'Nhìn màu chuyển từ cánh sang môi hoa, nhìn chấm đỏ nhỏ ở giữa.'},
      {id:'hoang_thao',name:'Lan Hoàng thảo',sci:'Dendrobium',col:'#c78bc9',lip:'#7a2c78',n:6,size:.05,arch:.6,cane:true,note:'Thân có đốt như đốt trúc, hoa mọc dọc theo đốt.',look:'Nhìn từng đốt thân, đếm chậm các đốt như đếm hơi thở.'},
      {id:'lan_hai',name:'Lan Hài',sci:'Paphiopedilum',col:'#c7b27a',lip:'#7c4a2a',n:1,size:.085,arch:.15,slipper:true,note:'Môi hoa phồng thành túi như chiếc hài; Việt Nam có nhiều loài lan hài quý.',look:'Nhìn chiếc túi của môi hoa, nhìn ánh sáng trượt trên bề mặt bóng.'},
      {id:'vu_nu',name:'Lan Vũ nữ',sci:'Oncidium',col:'#f0c93a',lip:'#e6b21e',n:14,size:.035,arch:.9,spray:true,note:'Chùm hoa vàng nhỏ, mỗi bông như một vũ công xoè váy.',look:'Nhìn cả chùm như một đám mây vàng, rồi chọn một bông nhỏ nhất.'},
      {id:'vanda',name:'Lan Vanda',sci:'Vanda',col:'#7f6ac0',lip:'#5a3f9a',n:6,size:.075,arch:.2,hang:true,note:'Treo trong giỏ, rễ khí sinh buông dài hút hơi ẩm từ không khí.',look:'Nhìn những sợi rễ buông xuống, nhìn khoảng trống giữa chúng.'}];
    const petalG=new THREE.SphereGeometry(1,10,6),stemM=mat('#5f7a3a'),leafM=new THREE.MeshStandardMaterial({color:'#4f7a3a',roughness:.55,side:THREE.DoubleSide});
    function flower(k){const g=new THREE.Group(),pm=new THREE.MeshStandardMaterial({color:k.col,roughness:.45,side:THREE.DoubleSide}),lm=new THREE.MeshStandardMaterial({color:k.lip,roughness:.4});
      for(let i=0;i<5;i++){const a=i/5*Math.PI*2+Math.PI/2,p=new THREE.Mesh(petalG,pm),w=i===1||i===4?1.15:.8;p.scale.set(w*.55,1,.12);p.position.set(Math.cos(a)*.85,Math.sin(a)*.85,0);p.rotation.z=a-Math.PI/2;g.add(p)}
      const lip=new THREE.Mesh(petalG,lm);if(k.slipper){lip.scale.set(.7,.8,.75);lip.position.set(0,-.55,.35)}else{lip.scale.set(.45,.55,.3);lip.position.set(0,-.35,.15)}g.add(lip);
      g.scale.setScalar(k.size);return g}
    function orchid(k){const g=new THREE.Group(),pot=new THREE.Mesh(new THREE.CylinderGeometry(.16,.12,.24,14),k.hang?mat('#7a5a38'):mat(k.id==='ho_diep'?'#ece6da':'#a4583a'));pot.position.y=.12;g.add(pot);
      const s=new THREE.Mesh(new THREE.CylinderGeometry(.15,.15,.02,14),soil);s.position.y=.235;g.add(s);
      const nl=k.cane?0:k.id==='dia_lan'?7:4;for(let i=0;i<nl;i++){const a=i/nl*Math.PI*2+.3,l=new THREE.Mesh(petalG,leafM);if(k.id==='dia_lan'){l.scale.set(.03,.42,.01);l.position.set(Math.sin(a)*.08,.6,Math.cos(a)*.08);l.rotation.set(Math.cos(a)*.35,0,-Math.sin(a)*.35)}else{l.scale.set(.07,.012,.2);l.position.set(Math.sin(a)*.14,.27,Math.cos(a)*.14);l.rotation.y=a;l.rotation.x=-.25}g.add(l)}
      if(k.cane)for(let i=0;i<3;i++){const c=new THREE.Mesh(new THREE.CylinderGeometry(.018,.022,.75,6),stemM);c.position.set((i-1)*.06,.6,(i%2)*.04);c.rotation.z=(i-1)*.12;g.add(c);for(let j=0;j<5;j++){const r=new THREE.Mesh(new THREE.TorusGeometry(.021,.004,4,8),mat('#8a9a5a'));r.rotation.x=Math.PI/2;r.position.set(c.position.x+Math.sin(c.rotation.z)*-(j*.14-.3),.3+j*.14,c.position.z);g.add(r)}}
      if(k.hang)for(let i=0;i<9;i++){const r=new THREE.Mesh(new THREE.CylinderGeometry(.006,.004,.5+Math.random()*.4,4),mat('#b9b9a0'));r.position.set((Math.random()-.5)*.24,-.25,(Math.random()-.5)*.24);g.add(r)}
      // ngồng hoa: một đường cong, hoa xếp dần về ngọn
      const base=new THREE.Vector3(0,.25,0),top=new THREE.Vector3(.25*k.arch+.05,.95+(k.hang?-.1:0),.12*k.arch),mid=new THREE.Vector3(.05,.8,0);
      if(k.id==='dia_lan'){top.set(.12,1.05,.05);mid.set(.04,.7,.02)}else if(k.hang){top.set(.38,-.05,.12);mid.set(.3,.5,.05)}
      const curve=new THREE.QuadraticBezierCurve3(base,mid,top);g.add(new THREE.Mesh(new THREE.TubeGeometry(curve,16,.008,5),stemM));
      const fl=[];for(let i=0;i<k.n;i++){const u=k.n===1?1:.45+.55*i/(k.n-1),f=flower(k),p=curve.getPoint(u);
        if(k.spray){p.x+=Math.sin(i*2.4)*.12;p.y+=Math.cos(i*1.7)*.06;p.z+=Math.cos(i*2.4)*.1}
        f.position.copy(p);f.position.z+=.03;if(i===k.n-1&&k.n>3)f.scale.multiplyScalar(.6);f.rotation.y=Math.sin(i)*.4;g.add(f);fl.push(f)}
      g.userData.flowers=fl;g.userData.kind=k;return g}
    // 6 chậu chính trên bục vòng cung, Vanda treo từ xà mái
    /* 27/11: bục ngoài uốn hình dấu ngã (~) một nhịp sóng, đặt cách kệ sát tường một lối đi; hai đầu bục chừa lối rộng để vào tới kệ */
    const TL=2.3,TZ=-1.3,TA=.35,TW=.5,tz=x=>TZ+TA*Math.sin(Math.PI*x/TL);
    const spots=[-1.85,-.92,0,.92,1.85].map(x=>[x,tz(x)]),pots=[];
    {const N=64,L=[],R=[],sh=new THREE.Shape();
      for(let i=0;i<=N;i++){const x=-TL+2*TL*i/N,z=tz(x),d=TA*Math.PI/TL*Math.cos(Math.PI*x/TL),n=Math.hypot(1,d),nx=-d/n,nz=1/n;L.push([x+nx*TW/2,z+nz*TW/2]);R.push([x-nx*TW/2,z-nz*TW/2])}
      /* đầu bục bo tròn: nửa vòng quanh tâm đầu mút, từ mép này sang mép kia (sg=1 đầu phải, -1 đầu trái) */
      const cap=(x,sg)=>{const z=tz(x),d=TA*Math.PI/TL*Math.cos(Math.PI*x/TL),n=Math.hypot(1,d),nx=-d/n*sg,nz=1/n*sg,tx=1/n*sg,tw=d/n*sg,out=[];
        for(let k=1;k<12;k++){const f=Math.PI*k/12;out.push([x+TW/2*(Math.cos(f)*nx+Math.sin(f)*tx),z+TW/2*(Math.cos(f)*nz+Math.sin(f)*tw)])}return out};
      const pts=[...L,...cap(TL,1),...R.slice().reverse(),...cap(-TL,-1)];
      pts.forEach(([x,z],k)=>k?sh.lineTo(x,-z):sh.moveTo(x,-z));
      const dg=new THREE.ExtrudeGeometry(sh,{depth:.3,bevelEnabled:false,curveSegments:1});dg.rotateX(-Math.PI/2);dg.computeVertexNormals();
      rAdd(st,new THREE.Mesh(dg,new THREE.MeshStandardMaterial({color:'#6b4e36',roughness:1,side:THREE.DoubleSide})),0,.02,0);
      /* không cho nhân vật đi xuyên qua bục: chia đường cong thành từng đoạn chữ nhật nhỏ */
      st.blocks=st.blocks||[];for(let i=0;i<16;i++){const xa=-TL-TW/2+(2*TL+TW)*i/16,xb=-TL-TW/2+(2*TL+TW)*(i+1)/16,zs=[];for(let t=0;t<=4;t++){const x=Math.max(-TL,Math.min(TL,xa+(xb-xa)*t/4));zs.push(tz(x))}st.blocks.push([xa,Math.min(...zs)-TW/2,xb,Math.max(...zs)+TW/2])}}
    KINDS.forEach((k,i)=>{const o=orchid(k);if(k.hang){o.position.set(1.95,1.95,-1.25);const ch=new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,1.7,4),iron);ch.position.y=.95;o.add(ch)}else{const [x,z]=spots[i];o.position.set(x,.32,z);o.rotation.y=Math.atan2(-x,2-z)*.6}
      st.sc.add(o);pots.push(o);rTap(st,o,()=>focus(i))});
    // chậu nhỏ trang trí trên kệ (bản sao thu nhỏ)
    for(let t=0;t<3;t++)for(let j=0;j<6;j++){const k=KINDS[(j+t*2)%5],o=orchid(k);o.scale.setScalar(.55);o.position.set(-2.75+j*1.1+(t%2)*.3,[.48,.93,1.38][t],[-3.05,-3.2,-3.3][t]);o.rotation.y=j;st.sc.add(o)}
    const want={tx:0,ty:.9,tz:-.6,dist:4.4,pitch:.14};let cur=-1,sess=null;
    st.tick.push(t=>{const a=.08;st.target.x+=(want.tx-st.target.x)*a;st.target.y+=(want.ty-st.target.y)*a;st.target.z+=(want.tz-st.target.z)*a;if(want.dist!=null){st.dist+=(want.dist-st.dist)*a;if(Math.abs(want.dist-st.dist)<.01)want.dist=null}
      for(const [i,o] of pots.entries()){const sway=Math.sin(t*.8+i)*.012;for(const [j,f] of o.userData.flowers.entries())f.rotation.z=sway*(1+j*.2)}
      if(sess)sky.intensity=1.1+Math.sin(t*2*Math.PI/10)*.35});
    function focus(i){cur=i;const o=pots[i],p=new THREE.Vector3();o.getWorldPosition(p);const k=KINDS[i];want.tx=p.x;want.ty=p.y+(k.hang?.35:.75);want.tz=p.z;want.dist=1.6;st.yawC=st.yaw=Math.atan2(-p.x,1);
      rmHint(k.name+' · '+k.sci+' · '+k.note);render()}
    function overview(){cur=-1;want.tx=0;want.ty=.9;want.tz=-.6;want.dist=4.4;st.yawC=0;render()}
    // 27/11: hai bài nhìn chậm, nhẹ cho cả bản lite (không thêm đèn, chỉ một vòng sáng nhỏ):
    // · Tìm năm sắc: chạm năm màu khác nhau mình thấy trong nhà kính, mỗi lần một tiếng chuông nhỏ và tên màu hiện lên.
    // · Một màu hôm nay: chọn một màu hợp với lòng mình, nhà kính nhuộm dịu màu đó, ngồi ngắm một phút, rồi mang màu ấy ra đời thực;
    //   tự nguyện ghi vào phần Kết quả AnSense của Nhật ký (localStorage yenSacLog, không cần cơ sở dữ liệu).
    const SAC_BELLS=[262,294,330,392,440],hsl={},tmpC=new THREE.Color(),darkC=new THREE.Color('#0d1612');
    function sacName(c){c.getHSL(hsl,THREE.SRGBColorSpace);const H=hsl.h*360,S=hsl.s,L=hsl.l;
      if(L>.8&&S<.6)return 'Trắng ngà';if(L<.13)return 'Nâu than';if(S<.13)return L>.5?'Xám bạc':'Xám đá';
      if(H<14||H>=345)return L<.34?'Đỏ trầm':'Đỏ son';if(H<42)return L<.4?'Nâu gỗ':'Cam đất';if(H<68)return L<.36?'Nâu vàng':'Vàng nắng';
      if(H<165)return L<.3?'Xanh rêu':'Xanh lá';if(H<200)return 'Xanh ngọc';if(H<255)return 'Xanh lam';if(H<292)return 'Tím lan';return L<.38?'Tím hồng':'Hồng phấn'}
    const MAU=[['Xanh lá non','#9cc79a','tươi mới, như lá vừa mở','một chiếc lá, một khoảng cỏ'],['Xanh lam','#8fb3cf','lắng dịu, như mặt nước yên','một góc trời, một ly nước'],
      ['Vàng nắng','#e6cf8f','ấm áp, như nắng sớm','một vệt nắng, một quả chín'],['Hồng phấn','#e3b1bf','dịu dàng với chính mình','một cánh hoa, một chiếc áo'],
      ['Tím lan','#b9a3cf','lặng yên, muốn chậm lại','một bông hoa nhỏ ven đường, ánh chiều'],['Trắng sữa','#ece4d6','nhẹ tênh, muốn buông bớt','một đám mây, một tách trà']];
    const dot=(hex,dash)=>'<span style="display:inline-block;width:14px;height:14px;border-radius:50%;vertical-align:-2px;margin-right:5px;'+(dash?'border:1px dashed #f5e6c988':'border:1px solid #f5e6c966;background:'+hex)+'"></span>';
    // vòng sáng nhỏ nở ra chỗ vừa chạm
    const ping=new THREE.Mesh(new THREE.RingGeometry(.05,.075,24),new THREE.MeshBasicMaterial({color:'#fff6dc',transparent:true,opacity:0,depthTest:false}));ping.renderOrder=9;ping.raycast=()=>{};ping.visible=false;st.sc.add(ping);
    let lamp=null;st.sc.traverse(o=>{if(o.isPointLight&&!lamp)lamp=o});
    const T0={bg:st.sc.background.clone(),hemi:st.hemi.color.clone(),key:st.key.color.clone(),sky:sky.color.clone(),lamp:lamp&&lamp.color.clone()},tint={c:new THREE.Color(),k:0,want:0,t:0};
    st.tick.push(()=>{if(ping.visible){const u=(performance.now()-ping.userData.t0)/1000;if(u>1.2)ping.visible=false;else{ping.scale.setScalar(1+u*3);ping.material.opacity=.85*(1-u/1.2);ping.lookAt(st.cam.position)}}
      const nw=performance.now(),dt=Math.min(.1,(nw-(tint.t||nw))/1000);tint.t=nw;
      if(tint.k!==tint.want){tint.k+=Math.sign(tint.want-tint.k)*Math.min(Math.abs(tint.want-tint.k),dt/3);const k=tint.k;/* chuyển màu trong khoảng 3 giây, chỉ đổi sắc ánh sáng, không tăng độ sáng */
        st.sc.background.copy(T0.bg).lerp(tmpC.copy(tint.c).lerp(darkC,.55),.6*k);st.hemi.color.copy(T0.hemi).lerp(tint.c,.7*k);st.key.color.copy(T0.key).lerp(tint.c,.55*k);sky.color.copy(T0.sky).lerp(tint.c,.6*k);if(lamp)lamp.color.copy(T0.lamp).lerp(tint.c,.6*k)}});
    let act=null;
    function stopAct(){if(act&&act.id)clearInterval(act.id);act=null;st.tapAny=null;tint.want=0}
    function hitColor(ray){for(const h of ray.intersectObjects(st.sc.children,true)){let o=h.object,vis=o.isMesh;for(let p=o;p&&vis;p=p.parent)if(!p.visible)vis=false;if(!vis)continue;
        let m=o.material;if(Array.isArray(m))m=m[h.face?h.face.materialIndex:0];if(!m||!m.color||(m.transparent&&m.opacity<.3))continue;return {h,c:m.color}}return null}
    function tapSac(ray){if(!act||act.k!=='nam'||act.done)return false;const r=hitColor(ray);if(!r){rmHint('Chạm vào một chậu lan, chiếc lá hay sàn gỗ nhé');return true}
      ping.position.copy(r.h.point);ping.userData.t0=performance.now();ping.visible=true;const n=sacName(r.c);
      if(act.found.some(f=>f.n===n)){rmHint('Màu '+n+' bạn đã thấy rồi · thử nhìn sang chỗ khác');return true}
      act.found.push({n,hex:'#'+r.c.getHexString(THREE.SRGBColorSpace)});strike(SAC_BELLS[act.found.length-1],4,.07,[[1,1],[2.76,.2]]);
      if(act.found.length<5)rmHint('✨ '+n+' · còn '+(5-act.found.length)+' màu nữa');
      else{act.done=true;st.tapAny=null;rmHint('🙏 Bạn vừa nhìn thấy năm sắc · thở ra một hơi thật chậm');setTimeout(()=>{if(st.run&&act&&act.k==='nam')strike(196,7,.08,[[1,1],[2.76,.3]])},1400)}
      render();return true}
    function sacLog(m){try{const L=JSON.parse(localStorage.getItem('yenSacLog')||'[]'),E=Array.isArray(L)?L:[],t=Date.now(),d=new Date(t);
      E.unshift({kind:'sac',title:'🌸 Nhà Sắc · Một màu hôm nay',start:t,end:t,when:d.toLocaleDateString('vi-VN')+' '+d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'}),dur:'',
        line:'Màu '+m[0]+' · '+m[2]+' · Mang về đời thực: tìm màu ấy ở '+m[3],hex:m[1],qa:[]});
      localStorage.setItem('yenSacLog',JSON.stringify(E.slice(0,60)));window.dispatchEvent(new Event('anyen-ansense-refresh'));return true}catch(e){return false}}
    function render(){const k=KINDS[cur];
      if(act&&act.k==='nam'){rmPanel.innerHTML='<p>🎨 <b>Tìm năm sắc</b> · '+(act.done?'Năm sắc của bạn lúc này. Lát nữa ra ngoài, thử tìm lại vài màu trong số này quanh mình.':'Nhìn chậm quanh nhà kính, chạm vào năm màu khác nhau mà bạn thấy: cánh hoa, chậu đất, chiếc lá, sàn gỗ…')+'</p>'+
        '<div class="rm-row">'+[0,1,2,3,4].map(i=>{const f=act.found[i];return '<span style="font-size:13px;padding:3px 8px;border-radius:999px;border:1px solid #c8a96a44">'+(f?dot(f.hex)+f.n:dot('',1)+'<span style="opacity:.5">…</span>')+'</span>'}).join('')+'</div>'+
        '<div class="rm-row">'+(act.done?'<button data-ns="nam">🔁 Tìm lại</button>':'')+'<button data-ns="stop">↩ '+(act.done?'Xong':'Dừng')+'</button></div>';return}
      if(act&&act.k==='mau'){const m=MAU[act.m];
        if(act.phase==='pick'){rmPanel.innerHTML='<p>🌈 <b>Một màu hôm nay</b> · Lòng mình lúc này gần với màu nào? Không có màu đúng hay sai.</p><div class="rm-row">'+
          MAU.map((x,i)=>'<button data-ns="m'+i+'" title="'+x[2]+'">'+dot(x[1])+x[0]+'</button>').join('')+'</div><div class="rm-row"><button data-ns="stop">↩ Thôi</button></div>';return}
        if(act.phase==='sit'){rmPanel.innerHTML='<p>'+dot(m[1])+'<b>'+m[0]+'</b> · '+m[2]+'. Ngồi yên, để màu ấy lan nhẹ khắp nhà kính · còn <span data-ns-left>'+act.left+'</span>s</p><div class="rm-row"><button data-ns="stop">⏹ Dừng</button></div>';return}
        rmPanel.innerHTML='<p>'+dot(m[1])+'Hôm nay, thử tìm màu <b>'+m[0]+'</b> ngoài đời: '+m[3]+'. Gặp được thì dừng lại một hơi thở.</p><div class="rm-row">'+
          (act.saved?'<span style="font-size:13px;opacity:.85">✓ Đã ghi vào Nhật ký · Kết quả AnSense</span>':'<button data-ns="log">📓 Ghi màu này vào nhật ký</button>')+'<button data-ns="stop">↩ Xong</button></div>'+(act.saved?'':'<p class="rm-quote" style="font-size:12px">Ghi hay không tuỳ bạn.</p>');return}
      rmPanel.innerHTML='<p>'+(sess?'🧘 '+(KINDS[sess.i].look)+' · còn '+sess.left+'s':k?'<b>'+k.name+'</b> <i>'+k.sci+'</i> · '+k.note:'Sắc là cửa của mắt. Chọn một chậu lan, nhìn thật chậm, không cần gọi tên điều mình thấy.')+'</p>'+
        (sess?'':'<div class="rm-row">'+KINDS.map((x,i)=>'<button data-ns="f'+i+'"'+(i===cur?' class="rm-gold"':'')+'>🌸 '+x.name.replace('Lan ','')+'</button>').join('')+'</div>')+
        '<div class="rm-row"><button class="rm-gold" data-ns="sess">'+(sess?'⏹ Dừng thiền ngắm hoa':'🧘 Thiền ngắm hoa 2 phút')+'</button>'+(sess?'':'<button data-ns="nam">🎨 Tìm năm sắc</button><button data-ns="mau">🌈 Một màu hôm nay</button>')+(cur>=0&&!sess?'<button data-ns="all">↩ Nhìn toàn nhà</button>':'')+'</div>'+
        '<p class="rm-quote">🌀 Muốn sang cảnh Viverse “ORCHID hoa lan”, hãy ra Cổng Viverse bên hông nhà.</p>'}
    const LOOKS=['Thở vào, mắt mở nhẹ. Thở ra, để ánh nhìn mềm lại.','Nhìn màu sắc như lần đầu được thấy.','Nếu ý nghĩ trôi đi, nhẹ nhàng đưa mắt về bông hoa.','Nhìn cả khoảng trống quanh bông hoa.','Một bông hoa nở không vội. Hơi thở cũng không cần vội.','Mỉm cười với bông hoa, rồi khép mắt một hơi thở.'];
    const MAU_LOOKS={40:'Màu này đang ở đâu trong lòng bạn? Không cần trả lời, chỉ cần cảm.',20:'Thở ra thật dài · vai mềm xuống'};
    function stopSess(){if(sess){clearInterval(sess.id);sess=null;sky.intensity=1.1}}
    render();rmPanel.onclick=e=>{const a=e.target.closest('[data-ns]')?.dataset.ns;if(!a)return;
      if(a==='stop'){const was=act&&act.k;stopAct();rmHint(was==='nam'?'Mắt đã nghỉ một chút · chạm một chậu lan để ngắm gần':'Nhà Sắc · chạm một chậu lan để ngắm gần');render();return}
      if(a==='nam'){stopSess();stopAct();overview();act={k:'nam',found:[]};st.tapAny=tapSac;rmHint('Nhìn quanh nhà kính · chạm vào một màu bạn thấy');render();return}
      if(a==='mau'){stopSess();stopAct();overview();act={k:'mau',phase:'pick',m:0};rmHint('Chọn một màu hợp với lòng mình lúc này');render();return}
      if(a[0]==='m'&&act&&act.k==='mau'&&act.phase==='pick'){const m=MAU[act.m=+a.slice(1)];tint.c.set(m[1]);tint.want=1;act.phase='sit';act.left=60;strike(262,6,.07,[[1,1],[2.76,.3]]);rmHint('Để màu '+m[0]+' lan nhẹ khắp nhà kính · thở chậm, chỉ cần ngắm');render();
        act.id=setInterval(()=>{if(!roomOpen||!st.run||!act||act.k!=='mau'){if(act&&act.id)clearInterval(act.id);return}act.left--;if(MAU_LOOKS[act.left])rmHint(MAU_LOOKS[act.left]);
          if(act.left<=0){clearInterval(act.id);act.id=0;act.phase='done';strike(196,8,.08,[[1,1],[2.76,.3]]);rmHint('🙏 Một phút cùng màu '+MAU[act.m][0]+' đã xong');render();return}
          const s=rmPanel.querySelector('[data-ns-left]');if(s)s.textContent=act.left},1000);return}
      if(a==='log'&&act&&act.k==='mau'){act.saved=sacLog(MAU[act.m]);if(!act.saved)rmHint('Chưa ghi được, trình duyệt đang chặn lưu trữ');render();return}
      if(act)return;
      if(a[0]==='f'){if(sess)return;focus(+a.slice(1));return}
      if(a==='all'){overview();return}
      if(a==='sess'){if(sess){stopSess();rmHint('Đã dừng thiền ngắm hoa');render();return}
        const i=cur>=0?cur:Math.floor(Math.random()*KINDS.length);focus(i);sess={i,left:120,id:0};strike(262,6,.08,[[1,1],[2.76,.3]]);rmHint(LOOKS[0]);render();
        sess.id=setInterval(()=>{if(!roomOpen||!st.run){clearInterval(sess.id);sess=null;return}sess.left--;if(sess.left%20===0&&sess.left>0)rmHint(LOOKS[(120-sess.left)/20%LOOKS.length]);
          if(sess.left<=0){clearInterval(sess.id);sess=null;sky.intensity=1.1;strike(196,8,.1,[[1,1],[2.76,.3]]);rmHint('🙏 Buổi thiền ngắm hoa đã xong · Mang ánh nhìn dịu dàng này ra ngoài kia')}
          const p=rmPanel.querySelector('p');if(p&&sess)p.textContent='🧘 '+KINDS[sess.i].look+' · còn '+sess.left+'s';else render()},1000)}};
    st.cleanup=()=>{if(sess)clearInterval(sess.id);if(act&&act.id)clearInterval(act.id);st.tapAny=null}}
  // ---------------------------------------------------------------- Nhà chính Đảo Yên (theo phối cảnh: nhà gỗ mái dốc, trần đan mây, sofa chữ L, bàn ăn 6 ghế, kệ san hô)
  function roomDaoYen(st){
    const sc=st.sc,texs=[],HW=6,HD=4,EAVE=3.3,RIDGE=5.4;
    const M=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.85},o||{}));
    const tex=(w,h,draw,rep)=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d');draw(c,w,h);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1])}texs.push(t);return t};
    const add=(geo,m,x,y,z,ry,rx)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);if(ry)o.rotation.y=ry;if(rx)o.rotation.x=rx;sc.add(o);return o};
    const B=(w,h,d,m,x,y,z,ry)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z,ry);
    sc.background=new THREE.Color('#a9c08e');sc.fog=new THREE.Fog('#b9c99a',14,30);
    st.hemi.color.set('#fff0d8');st.hemi.groundColor.set('#6a4a30');st.hemi.intensity=1.35;st.key.color.set('#ffd49a');st.key.intensity=1.5;st.key.position.set(5,8,6);
    // ---- vật liệu
    const plank=(base,line,rep)=>tex(256,256,(c,w,h)=>{c.fillStyle=base;c.fillRect(0,0,w,h);for(let i=0;i<8;i++){c.fillStyle=line;c.fillRect(0,i*32,w,2);for(let k=0;k<3;k++){c.fillStyle='rgba(255,230,190,'+(.03+Math.random()*.04)+')';c.fillRect(Math.random()*w,i*32+4+Math.random()*24,40+Math.random()*80,2)}c.fillStyle=line;c.fillRect(((i*97)%w),i*32,2,32)}},rep);
    const floorM=M('#fff',{map:plank('#a8754a','rgba(60,30,12,.45)',[3,2]),roughness:.6});
    const deckM=M('#fff',{map:plank('#9a6a42','rgba(50,25,10,.5)',[2,1])});
    const wood=M('#8a5a34'),woodD=M('#5e3c22'),woodL=M('#b98250');
    const rattanT=tex(128,128,(c,w,h)=>{c.fillStyle='#c9a46a';c.fillRect(0,0,w,h);for(let i=0;i<16;i++){c.fillStyle=i%2?'rgba(120,80,40,.35)':'rgba(255,235,190,.25)';c.fillRect(i*8,0,4,h);c.fillRect(0,i*8+2,w,3)}},[6,3]);
    const rattan=M('#fff',{map:rattanT,emissive:'#7a4a1a',emissiveIntensity:.35});
    const plaster=M('#efe6d6'),stoneT=tex(128,128,(c,w,h)=>{c.fillStyle='#e9e2d4';c.fillRect(0,0,w,h);for(let i=0;i<260;i++){c.fillStyle='rgba(150,135,110,'+Math.random()*.18+')';c.fillRect(Math.random()*w,Math.random()*h,2+Math.random()*3,1+Math.random()*2)}}),stone=M('#fff',{map:stoneT,roughness:.5});
    const cream=M('#ece3d2',{roughness:.95}),pillowA=M('#d9ccb2',{roughness:.95}),pillowB=M('#b8ab88',{roughness:.95}),black=M('#2a2622',{roughness:.5}),white=M('#f7f3ea'),leaf=M('#5f8a3a'),leafD=M('#3f6a2a');
    const glass=new THREE.MeshStandardMaterial({color:'#dfeee8',transparent:true,opacity:.12,roughness:.1,metalness:.2,depthWrite:false});
    const glow=(c,o)=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,blending:THREE.AdditiveBlending,depthWrite:false});
    // ---- sàn trong nhà, hiên gỗ bao quanh, bậc đá
    add(new THREE.PlaneGeometry(HW*2,HD*2),floorM,0,0,0,0,-Math.PI/2);
    {const d=add(new THREE.PlaneGeometry(HW*2+4.4,HD*2+5),deckM,0,-.02,.5,0,-Math.PI/2);d.receiveShadow=false}
    B(3.2,.16,.7,stone,0,-.1,6.8);add(new THREE.PlaneGeometry(40,40),M('#6f8f4a'),0,-.25,0,0,-Math.PI/2);
    // lan can hành lang hai bên và phía sau
    for(const sx of [-1,1]){B(.08,.08,HD*2+4,woodD,sx*(HW+2.1),.9,.5);B(.08,.08,HD*2+4,woodD,sx*(HW+2.1),.5,.5);for(let k=0;k<=8;k++)B(.1,1,.1,woodD,sx*(HW+2.1),.5,-HD-1.5+k*(HD*2+4)/8)}
    // cây xanh nhiệt đới ngoài hiên
    {const g=new THREE.IcosahedronGeometry(1,0);for(let i=0;i<22;i++){const sx=i%2?1:-1,z=-6+(i>>1)*1.25,s=.9+Math.random()*1.1;const m=add(g,Math.random()<.5?leaf:leafD,sx*(HW+3.4+Math.random()*1.8),s*.8,z);m.scale.set(s,s*1.3,s)}
      for(let i=0;i<9;i++){const s=1+Math.random()*.9;const m=add(g,leafD,-7+i*1.75,s,-HD-3.2-Math.random());m.scale.set(s,s*1.4,s)}}
    // ---- khung gỗ, cột, mái dốc trần đan mây có đèn hắt
    for(const x of [-HW,0,HW])for(const z of [-HD,HD])if(x||z<0)B(.28,EAVE,.28,wood,x,EAVE/2,z);/* mặt trước để trống giữa: cửa kính trượt mở rộng */for(const x of [-HW,HW])B(.28,EAVE,.28,wood,x,EAVE/2,0);
    for(const z of [-HD,HD])B(HW*2+.5,.26,.3,wood,0,EAVE,z);for(const x of [-HW,HW])B(.3,.26,HD*2+.4,wood,x,EAVE,0);
    {const SL=Math.hypot(HW+1.6,RIDGE-EAVE+.5),th=Math.atan2(RIDGE-EAVE+.5,HW+1.6),Lz=HD*2+3.6;for(const sx of [-1,1]){const r=B(SL,.04,Lz,rattan,sx*(HW+1.6)/2,(EAVE-.5+RIDGE)/2,.5);r.rotation.z=-sx*th;
        for(let k=0;k<=6;k++){const b=B(SL,.16,.14,woodD,sx*(HW+1.6)/2,(EAVE-.5+RIDGE)/2-.1,-HD-1.3+k*(Lz-.2)/6);b.rotation.z=-sx*th}}
      B(.24,.3,Lz,woodD,0,RIDGE-.05,.5);/* xà nóc */for(const sx of [-1,1])B(.12,.05,HD*2+3.4,glow('#ffc070',.55),sx*(HW-.2),EAVE+.18,0);/* đèn hắt dọc mái */}
    {const s=new THREE.Shape();s.moveTo(-HW,0);s.lineTo(HW,0);s.lineTo(0,RIDGE-EAVE);s.lineTo(-HW,0);add(new THREE.ShapeGeometry(s),M('#fff',{map:plank('#a06a3c','rgba(60,30,12,.4)',[.3,1])}),0,EAVE,-HD+.02)}
    // ---- tường sau: tường trát trắng, giữa là mảng đá, kệ gỗ hai bên trưng san hô và vỏ sò, vách nan gỗ
    B(HW*2,EAVE,.14,plaster,0,EAVE/2,-HD-.05);B(3,2.3,.06,stone,0,1.45,-HD+.06);B(3.1,.06,.12,glow('#ffd590',.6),0,2.62,-HD+.1);
    const coralG=new THREE.IcosahedronGeometry(.09,0),shellG=new THREE.SphereGeometry(.08,8,6,0,Math.PI*2,0,Math.PI/2);
    for(const sx of [-1,1]){const cx=sx*2.65;B(1.7,2.62,.04,woodL,cx,1.31,-HD+.06);for(const ex of [-.83,.83])B(.06,2.62,.42,woodL,cx+ex,1.31,-HD+.25);B(1.7,.06,.42,woodL,cx,2.62,-HD+.25);for(let r=0;r<6;r++){const y=.08+r*.42;B(1.62,.04,.4,woodL,cx,y,-HD+.25);B(1.6,.025,.03,glow('#ffd28a',.45),cx,y+.39,-HD+.08)}
      for(let k=0;k<7;k++){B(.05,2.6,.08,woodD,cx+sx*(.95+k*.07),1.3,-HD+.3);B(.03,2.6,.08,woodD,sx*(1.53+k*.04),1.3,-HD+.3)}}
    // ---- hai kệ bày đồ trong Túi An Yên: mỗi kệ 18 ô (6 tầng × 3), kệ trái ô 1–18, kệ phải ô 19–36; ô trống để trống
    {const L=(window.anyenBagList?window.anyenBagList():[]).slice(0,36),fit=(g,W,H)=>{const b=new THREE.Box3().setFromObject(g),sz=b.getSize(new THREE.Vector3()),k=Math.min(W/Math.max(sz.x,sz.z,.01),H/Math.max(sz.y,.01));g.scale.multiplyScalar(k);const b2=new THREE.Box3().setFromObject(g);g.position.y-=b2.min.y;const c=b2.getCenter(new THREE.Vector3());g.position.x-=c.x;g.position.z-=c.z;const o=new THREE.Group();o.add(g);return o};
      const mk=e=>{const g=new THREE.Group(),P=(geo,m,x,y,z)=>{const o=new THREE.Mesh(geo,m);o.position.set(x||0,y||0,z||0);g.add(o);return o},d=e.data||{};
        if(e.made==='shell'&&window.__shellMesh){const m=window.__shellMesh(d.s|0,d.t|0);m.rotation.y=Math.PI;/* mặt trước vỏ hướng ra phòng */g.add(m)}
        else if(e.made==='shelltray'&&window.__binMesh){const b=window.__binMesh(Math.max(0,Math.min(2,d.tray|0)));g.add(b);const sh=Array.isArray(d.shells)?d.shells.slice(0,6):[];sh.forEach(([s2,t2],k)=>{if(!window.__shellMesh)return;const m=window.__shellMesh(s2|0,t2|0);m.scale.multiplyScalar(.9);const a=k/Math.max(1,sh.length)*Math.PI*2;m.position.set(Math.cos(a)*.12,.12,Math.sin(a)*.12);b.add(m)})}
        else if(e.made==='robe'&&typeof robeTray==='function'){g.add(robeTray(/^#[0-9a-f]{6}$/i.test(d.color||'')?d.color:'#c98a1c'))}
        else if(e.made==='flower'){P(new THREE.ConeGeometry(.1,.3,8),M('#efe4cf'),0,.15,0).rotation.x=Math.PI;for(let k=0;k<7;k++)P(new THREE.IcosahedronGeometry(.07,0),M(['#f6f1e6','#f2b8c6','#f5d36a'][k%3]),Math.cos(k)*.08,.33+(k%2)*.04,Math.sin(k)*.08)}
        else if(e.made==='pot'){const pts=[];for(let k=0;k<=8;k++){const t=k/8;pts.push(new THREE.Vector2(.06+.1*Math.sin(t*Math.PI*.95)+(t>.85?.02:0),t*.3))}P(new THREE.LatheGeometry(pts,14),M('#b8794a'),0,0,0)}
        else if(e.made==='aroma'){P(new THREE.CylinderGeometry(.09,.09,.2,12),M('#d9efe6',{transparent:true,opacity:.75}),0,.1,0);P(new THREE.CylinderGeometry(.06,.06,.05,10),woodD,0,.22,0)}
        else{const id=e.id;
          if(id==='chuong')P(new THREE.SphereGeometry(.14,16,8,0,Math.PI*2,Math.PI/2,Math.PI/2),M('#b08a3e',{metalness:.6,roughness:.35,side:THREE.DoubleSide}),0,.14,0);
          else if(id==='sen'){for(let k=0;k<8;k++){const p=P(new THREE.ConeGeometry(.05,.16,5),M('#f2a7bf'),Math.cos(k*.8)*.06,.08,Math.sin(k*.8)*.06);p.rotation.set(Math.sin(k*.8)*.5,0,-Math.cos(k*.8)*.5)}P(new THREE.CylinderGeometry(.04,.05,.04,10),M('#e8c24a'),0,.1,0)}
          else if(id==='nen'){P(new THREE.CylinderGeometry(.06,.06,.18,12),M('#f3ead6'),0,.09,0);P(new THREE.SphereGeometry(.03,8,6),M('#ffcf70',{emissive:'#ffa030',emissiveIntensity:1.2}),0,.21,0)}
          else if(id==='nhang'){P(new THREE.CylinderGeometry(.08,.07,.06,12),M('#8a6a48'),0,.03,0);for(let k=-1;k<=1;k++)P(new THREE.CylinderGeometry(.006,.006,.3,5),M('#a0522d'),k*.025,.2,0)}
          else if(id==='hat'){const t=P(new THREE.TorusGeometry(.1,.022,6,18),M('#7a4a28'),0,.03,0);t.rotation.x=Math.PI/2}
          else if(id==='tra'){P(new THREE.SphereGeometry(.09,12,10),M('#5c4a3a'),-.05,.08,0);P(new THREE.CylinderGeometry(.04,.035,.06,10),M('#efe6d4'),.1,.03,0)}
          else if(id==='so'){P(new THREE.BoxGeometry(.2,.05,.26),M('#7d5a3c'),0,.025,0)}
          else if(id==='cay'){P(new THREE.CylinderGeometry(.07,.06,.1,10),M('#b8794a'),0,.05,0);P(new THREE.IcosahedronGeometry(.07,0),leaf,0,.16,0)}
          else{const r=P(new THREE.SphereGeometry(.1,10,8),M('#9a978c'),0,.06,0);r.scale.y=.6}}
        return g};
      L.forEach((e,i)=>{let o;try{o=fit(mk(e),.36,.3)}catch(er){return}const sx=i<18?-1:1,k=i%18,r=Math.floor(k/3),c=k%3;o.position.set(sx*2.65-.5+c*.5,.1+(5-r)*.42,-HD+.27);sc.add(o);rTap(st,o,()=>rmHint('🎒 '+(e.name||'Vật phẩm Túi An Yên')+' · ô '+(i+1)+'/36'))})}
    B(2.2,.12,.5,stone,0,.82,-HD+.4);B(.2,.8,.4,stone,-.9,.4,-HD+.4);B(.2,.8,.4,stone,.9,.4,-HD+.4);
    {/* vỏ sò điệp lớn */const g=new THREE.Group();for(let k=0;k<9;k++){const a=-1.2+k*.3,f=add(new THREE.ConeGeometry(.09,.62,6),M(k%2?'#f6ecdd':'#ead8c0'),0,0,0);sc.remove(f);f.position.set(Math.sin(a)*.3,Math.cos(a)*.3,0);f.rotation.z=-a;g.add(f)}g.position.set(0,.95,-HD+.45);g.scale.set(1.15,1,1);sc.add(g)}
    for(const sx of [-1,1]){const p=add(new THREE.IcosahedronGeometry(.14,0),leaf,sx*.75,1.0,-HD+.42);p.scale.y=.8}
    // ---- hai bên hông: vách kính khung đen, rèm trắng
    for(const sx of [-1,1]){add(new THREE.PlaneGeometry(HD*2,EAVE),glass,sx*HW,EAVE/2,0,sx*Math.PI/2);for(let k=0;k<=4;k++)B(.06,EAVE,.06,black,sx*HW,EAVE/2,-HD+k*HD/2);
      for(const z of [-HD+.6,HD-.7]){const c=B(.08,EAVE-.3,1.1,M('#f6f1e6',{transparent:true,opacity:.88}),sx*(HW-.15),EAVE/2-.1,z);c.scale.x=1}}
    // ---- mặt trước: cửa kính trượt khung đen, hiên gỗ có 2 chậu cây tròn và 2 đèn trụ
    add(new THREE.PlaneGeometry(HW*2,EAVE),glass,0,EAVE/2,HD);for(const x of [-HW,-4,-2,2,4,HW])B(.06,EAVE-.1,.06,black,x,EAVE/2,HD);B(HW*2,.06,.06,black,0,EAVE-.1,HD);B(HW*2,.05,.08,black,0,.03,HD);
    for(const sx of [-1,1]){const x=sx*2.1;add(new THREE.CylinderGeometry(.38,.3,.75,10),M('#ece6da'),x,.37,HD+1.2);const b=add(new THREE.IcosahedronGeometry(.55,1),leaf,x,1.15,HD+1.2);b.scale.y=.9;
      const lx=sx*4.6;B(.06,1.1,.06,black,lx,.55,HD+1.9);B(.3,.36,.3,black,lx,1.25,HD+1.9);B(.24,.3,.24,glow('#ffe4a8',.9),lx,1.25,HD+1.9)}
    // ---- phòng khách: thảm cói lớn, sofa chữ L màu kem nhiều gối, bàn đá trắng có bình hoa trắng, đôn mây
    const rugT=tex(128,128,(c,w,h)=>{c.fillStyle='#c9ab7c';c.fillRect(0,0,w,h);for(let i=0;i<64;i++){c.fillStyle=i%2?'rgba(110,80,40,.2)':'rgba(255,240,200,.15)';c.fillRect(i*2,0,1,h);c.fillRect(0,i*2,w,1)}},[4,3]);
    add(new THREE.PlaneGeometry(4.8,3.9),M('#fff',{map:rugT,roughness:1}),-1.3,.012,.5,0,-Math.PI/2);
    const SF={x0:-3.6,x1:.3,zb:-1.25,z1:2.5};/* sofa: lưng dọc theo z=zb (x0..x1), cánh trái dọc x=x0 (zb..z1) */
    B(SF.x1-SF.x0,.12,.95,woodL,(SF.x0+SF.x1)/2,.08,SF.zb);B(SF.x1-SF.x0,.2,.9,cream,(SF.x0+SF.x1)/2,.24,SF.zb+.02);B(SF.x1-SF.x0,.55,.22,cream,(SF.x0+SF.x1)/2,.62,SF.zb-.36);
    B(.95,.12,SF.z1-SF.zb-.5,woodL,SF.x0,.08,(SF.zb+SF.z1)/2+.25);B(.9,.2,SF.z1-SF.zb-.5,cream,SF.x0+.02,.24,(SF.zb+SF.z1)/2+.25);B(.22,.55,SF.z1-SF.zb+.4,cream,SF.x0-.36,.62,(SF.zb+SF.z1)/2-.2);
    B(.25,.42,.9,cream,SF.x1+.12,.42,SF.zb);B(.9,.42,.25,cream,SF.x0,.42,SF.z1+.12);
    /* 3.40: đệm và gối mềm: khối bo tròn, mép mỏng giữa phồng; đệm ngồi nằm phẳng trên khung, gối tựa nghiêng ngả vào lưng ghế */
    const softGeo=(w,h,d,puff)=>{const g=new THREE.SphereGeometry(1,18,12),P=g.attributes.position;for(let i=0;i<P.count;i++){let x=P.getX(i),y=P.getY(i),z=P.getZ(i);const f=v=>Math.sign(v)*Math.pow(Math.abs(v),.42);x=f(x);y=f(y);z=f(z);const e=1-puff*(x*x+y*y)*.5;P.setXYZ(i,x*w/2,y*h/2,z*d/2*e)}g.computeVertexNormals();return g};
    {const cush=softGeo(.78,.8,.16,.6);for(const x of [-3.0,-2.2,-1.4,-.6]){const c=add(cush,cream,x,.42,SF.zb+.1);c.rotation.x=-Math.PI/2}
      for(const z of [-.2,.6,1.4,2.1]){const c=add(cush,cream,SF.x0+.07,.42,z);c.rotation.x=-Math.PI/2;c.rotation.z=Math.PI/2}
      const pg=softGeo(.48,.44,.2,.9);const P=[[-3.1,0],[-2.45,1],[-1.75,0],[-1.0,1],[-.3,0]];for(const [x,k] of P){const p=add(pg,k?pillowB:pillowA,x,.7,SF.zb-.17);p.rotation.set(-.42,0,(k?.05:-.04))}
      for(const [z,k] of [[-.55,1],[.25,0],[1.05,1],[1.8,0]]){const p=add(pg,k?pillowB:pillowA,SF.x0-.17,.7,z);p.rotation.order='YXZ';p.rotation.set(-.42,Math.PI/2,(k?.05:-.04))}}
    B(1.3,.4,1,stone,-1.4,.2,.75);{const v=add(new THREE.CylinderGeometry(.08,.1,.22,10),glass,-1.4,.51,.75);v.material=M('#dfece4',{transparent:true,opacity:.6});for(let k=0;k<9;k++){const f=add(new THREE.IcosahedronGeometry(.075,0),white,-1.4+Math.cos(k*.7)*.12*(k%3?1:.3),.7+(k%3)*.05,.75+Math.sin(k*.7)*.12*(k%3?1:.3))}
      B(.18,.03,.18,woodD,-1.75,.415,1.0);B(.2,.05,.14,woodD,-1.05,.42,.95);add(new THREE.CylinderGeometry(.04,.04,.06,8),M('#fff2d2',{emissive:'#ffcf80',emissiveIntensity:.6}),-1.05,.47,.95)}
    {const p=add(new THREE.SphereGeometry(.34,14,10),M('#fff',{map:rattanT}),.2,.24,2.05);p.scale.y=.7}
    // ba đèn mây tròn treo
    const pend=[[-1.9,2.55,-.55],[-1.2,2.35,-.05],[-.6,2.6,-.7]];for(const [x,y,z] of pend){B(.01,EAVE+1.2-y,.01,black,x,(y+EAVE+1.2)/2,z);const s=add(new THREE.SphereGeometry(.3,12,10),M('#fff',{map:rattanT,emissive:'#ffb860',emissiveIntensity:.9,transparent:true,opacity:.93}),x,y,z);s.scale.y=1.05;add(new THREE.SphereGeometry(.1,8,6),glow('#fff0c0',.9),x,y-.02,z)}
    {const L=new THREE.PointLight('#ffc77a',7,11,1.5);L.position.set(-1.2,2.2,-.3);sc.add(L);const L2=new THREE.PointLight('#ffd39a',4,9,1.6);L2.position.set(3.3,2.4,.2);sc.add(L2)}
    // ---- bàn ăn gỗ dài 6 ghế đệm, bình hoa thiên điểu
    const DT={x:3.3,z:.25};B(1.05,.08,2.7,wood,DT.x,.76,DT.z);for(const sx of [-1,1])for(const sz of [-1,1])B(.08,.72,.08,woodD,DT.x+sx*.42,.36,DT.z+sz*1.2);B(.36,.005,2.4,M('#efe7d6'),DT.x,.805,DT.z);
    const chairs=[];for(const sx of [-1,1])for(const dz of [-.85,0,.85]){const x=DT.x+sx*.88,z=DT.z+dz;B(.5,.42,.46,woodL,x,.21,z);B(.48,.08,.44,cream,x,.46,z);chairs.push([x,z,sx])}
    {add(new THREE.CylinderGeometry(.07,.09,.3,10),M('#dfece4',{transparent:true,opacity:.6}),DT.x,.95,DT.z);const bird=M('#f08a2a',{emissive:'#a04010',emissiveIntensity:.25});for(let k=0;k<5;k++){const a=k*1.25;const st2=B(.02,.45+k%2*.15,.02,leafD,DT.x+Math.cos(a)*.05,1.2+k%2*.07,DT.z+Math.sin(a)*.05);st2.rotation.z=Math.cos(a)*.25;st2.rotation.x=Math.sin(a)*.25;const f=add(new THREE.ConeGeometry(.04,.22,4),bird,DT.x+Math.cos(a)*.17,1.45+k%2*.12,DT.z+Math.sin(a)*.17);f.rotation.z=Math.PI/2.4*Math.sign(Math.cos(a)||1)}
      B(.22,.04,.22,woodD,DT.x,.82,DT.z-.85);B(.22,.04,.22,woodD,DT.x,.82,DT.z+.85);add(new THREE.SphereGeometry(.05,8,6),white,DT.x,.87,DT.z+.85)}
    // góc phòng: bàn console nhỏ có chậu cây (trái), chậu monstera (phải)
    B(.45,.8,1.1,stone,-HW+.45,.4,-2.6);add(new THREE.IcosahedronGeometry(.2,0),leaf,-HW+.45,1.0,-2.6);
    add(new THREE.CylinderGeometry(.28,.22,.45,10),white,HW-.6,.22,-HD+.65);for(let k=0;k<7;k++){const a=k*.9,l=add(new THREE.CircleGeometry(.32,7),leafD,HW-.6+Math.cos(a)*.3,.75+k*.08,-HD+.65+Math.sin(a)*.3);l.rotation.set(-1+Math.random()*.6,a,0);l.material.side=THREE.DoubleSide}
    // ---- đi lại tránh đồ vật, chỗ ngồi trên sofa và ghế ăn
    st.blocks=[[SF.x0-.6,SF.zb-.6,SF.x1+.3,SF.zb+.5],[SF.x0-.6,SF.zb-.6,SF.x0+.5,SF.z1+.3],[-2.1,.25,-.75,1.25],[-.15,1.7,.55,2.4],[DT.x-1.2,DT.z-1.6,DT.x+1.2,DT.z+1.6],[-HW,-2.6-.6,-HW+.75,-2.6+.6],[HW-1,-HD,HW,-HD+1.1],[-1.2,-HD,1.2,-HD+.75],[-HW,-HD,-1.8,-HD+.65],[1.8,-HD,HW,-HD+.65]];
    const seatHit=new THREE.BoxGeometry(.6,.6,.6),seatM=new THREE.MeshBasicMaterial({visible:false});
    const SEATS=[];const seat=(x,z,a,y,ax,az,lab)=>{const k=SEATS.length;SEATS.push({x,z,a,y,ax,az});const h=add(seatHit,seatM,x,y,z);rTap(st,h,()=>{if(seatsH.tap(k))rmHint('🛋 '+lab)})};/* 27/11: chỗ 0–7 sofa, 8–13 ghế bàn ăn */
    for(const x of [-3.0,-2.2,-1.4,-.6])seat(x,SF.zb+.12,0,.5,x,SF.zb+1.05,'Ngồi nghỉ trên sofa · bấm Đứng lên hoặc đi để rời ghế');
    for(const z of [-.2,.6,1.4,2.1])seat(SF.x0+.12,z,Math.PI/2,.5,SF.x0+1.05,z,'Ngồi nghỉ trên sofa · bấm Đứng lên hoặc đi để rời ghế');
    for(const [x,z,sx] of chairs)seat(x,z,-sx*Math.PI/2,.46,x+sx*.75,z,'Ngồi bên bàn ăn gỗ · ngắm bình hoa thiên điểu');
    rmHint('🏡 Nhà chính Đảo Yên · chạm sàn để đi, chạm sofa hoặc ghế để ngồi · 🚪 Ra cửa để ra hiên');
    // 27/11: buổi hẹn Đảo Yên (Chủ nhà + tối đa 5 bạn, kênh tu_dao_me): thấy nhau đi lại, đứng ngồi tự do, trò chuyện qua khung chat;
    // Chủ nhà pha trà trên bàn ăn và mời trà như Healer ở Nhà Vị (chén trước mỗi ghế bàn ăn; người ngồi sofa nâng chén thì nhận lời nhắn, không có chén).
    const potM=M('#6a4a34'),pot=new THREE.Group();pot.position.set(DT.x,.8,DT.z-.45);sc.add(pot);{const b=new THREE.Mesh(new THREE.SphereGeometry(.11,14,10),potM);b.scale.y=.8;b.position.y=.08;pot.add(b);const l=new THREE.Mesh(new THREE.CylinderGeometry(.035,.045,.04,8),potM);l.position.y=.16;pot.add(l);const sp=new THREE.Mesh(new THREE.CylinderGeometry(.014,.024,.13,6),potM);sp.position.set(.12,.1,0);sp.rotation.z=-1;pot.add(sp)}
    const cupM=M('#f6f3ec'),teaM=new THREE.MeshStandardMaterial({color:'#a87a2a',roughness:.2}),cups=chairs.map(([x,z,sx])=>{const g=new THREE.Group();g.position.set(DT.x+sx*.3,.8,z);sc.add(g);const c=new THREE.Mesh(new THREE.CylinderGeometry(.045,.035,.06,10),cupM);c.position.y=.03;g.add(c);const te=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,.008,10),teaM);te.position.y=.058;te.visible=false;g.add(te);return {g,t:te,lift:0}});
    const cupOf=k=>cups[k-8];let boiling=false,pour=0;const steamP=[];{const m=new THREE.MeshBasicMaterial({color:'#efe9dc',transparent:true,opacity:.2,depthWrite:false});for(let k=0;k<6;k++){const s2=add(new THREE.SphereGeometry(.035,6,4),m.clone(),DT.x,1,DT.z-.45);s2.userData.k=k;s2.visible=false;steamP.push(s2)}}
    st.tick.push(t=>{for(const s2 of steamP){const u=(t*.4+s2.userData.k/6)%1;s2.visible=boiling;s2.position.set(DT.x+Math.sin(t+s2.userData.k)*.03*u,1+u*.45,DT.z-.45);s2.scale.setScalar(1+u*2);s2.material.opacity=.2*(1-u)}
      if(pour>0){pour=Math.max(0,pour-.01);pot.rotation.z=-Math.sin(Math.min(1,pour*2)*Math.PI/2)*.6}const now=performance.now();for(const c of cups){const u=c.lift?(now-c.lift)/2200:1;c.g.position.y=.8+(u<1?Math.sin(u*Math.PI)*.22:0)}});
    const TH={el:null,guestWait:true,soloHidden:true,watchText:'mọi người cùng xem',leadHint:'🏝 Bạn là Chủ nhà · pha trà, mời trà, mỗi bước mọi người cùng thấy',guestHint:w=>'🏝 Đã tới nhà của '+w+' trên Đảo Yên · tự nhiên đi lại, ngồi nghỉ và trò chuyện',
      anim(i){if(i===0){boiling=true;strike(523,2,.03,[[1,1]]);setTimeout(()=>{boiling=false},2600)}else if(i===1||i===3||i===4)pour=1;else strike(700,1,.015,[[1,1]])},
      fill(list){(list||[]).map(cupOf).filter(Boolean).forEach((c,i)=>setTimeout(()=>{if(!st.run)return;c.t.visible=true;strike(880,1.2,.02,[[1,1]])},300+i*350))},
      jump(s2,list){if(s2>=5)for(const k of list){const c=cupOf(k);if(c)c.t.visible=true}},
      reset(){boiling=false;for(const c of cups){c.t.visible=false;c.lift=0}},
      lift(k){const c=cupOf(k);if(c&&c.t.visible){c.lift=performance.now();strike(660,1.4,.015,[[1,1],[2,.2]])}}};
    let tea=null;const sh=roomShare('tu_dao_me',{change:(S,was)=>{seatsH.refresh();tea.onChange(was)},people:(S,grew)=>{seatsH.onPeople(grew);tea.onPeople(grew)},msg:(m,name)=>{if(!seatsH.onMsg(m))tea.onMsg(m,name)}});
    const seatsH=roomSeats(st,sh,SEATS,{walkers:true,hint:rmHint});rmPanel.innerHTML='<div id="teaBox"></div>';TH.el=rmPanel.querySelector('#teaBox');tea=roomTea(sh,seatsH,TH);tea.render();
    rmPanel.onclick=e=>{const q=e.target.closest('[data-qt]');if(q)tea.click(q.dataset.qt)};
    st.cleanup=()=>{for(const t of texs)t.dispose();sh.off();seatsH.dispose()}}
  // Nhà Thiền trên Đảo Yên (bên trong): sàn gỗ, vách giấy dó khung gỗ, bàn thờ Phật ngồi thiền, 6 bồ đoàn, chuông lớn; Thỉnh chuông và Nghi thức chỉ có ở đây.
  function roomDaoThien(st){
    const sc=st.sc,texs=[],HW=4,HD=3.6,H=3.4,lights=[];
    const M=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c,roughness:.85},o||{}));
    const add=(geo,m,x,y,z,ry)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);if(ry)o.rotation.y=ry;sc.add(o);return o};
    const B=(w,h,d,m,x,y,z,ry)=>add(new THREE.BoxGeometry(w,h,d),m,x,y,z,ry);
    const C=(rt,rb,h,m,x,y,z,n=16)=>add(new THREE.CylinderGeometry(rt,rb,h,n),m,x,y,z);
    const tex=(w,h,draw,rep)=>{const cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d');draw(c,w,h);const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;if(rep){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(rep[0],rep[1])}texs.push(t);return t};
    sc.background=new THREE.Color('#2a2018');sc.fog=null;
    st.hemi.color.set('#ffe8c8');st.hemi.groundColor.set('#5a3a22');st.hemi.intensity=1.1;st.key.color.set('#ffd49a');st.key.intensity=.9;st.key.position.set(3,7,5);
    const floorT=tex(256,256,(c,w,h)=>{c.fillStyle='#9a6a42';c.fillRect(0,0,w,h);for(let i=0;i<8;i++){c.fillStyle='rgba(50,25,10,.45)';c.fillRect(0,i*32,w,2);c.fillRect((i*97)%w,i*32,2,32);for(let k=0;k<3;k++){c.fillStyle='rgba(255,230,190,'+(.03+Math.random()*.04)+')';c.fillRect(Math.random()*w,i*32+4+Math.random()*24,40+Math.random()*80,2)}}},[3,3]);
    const wood=M('#7a5034'),woodD=M('#4a3020'),gold=M('#d8b25a',{metalness:.55,roughness:.35,emissive:'#5a3a08',emissiveIntensity:.25}),paper=M('#f3ead6',{roughness:.95,emissive:'#ffdca6',emissiveIntensity:.22}),red=M('#7a2f2a',{roughness:.95}),mat2=M('#b9a77a',{roughness:.95});
    // sàn, trần, vách
    B(HW*2,.1,HD*2,M('#fff',{map:floorT,roughness:.6}),0,-.05,0);B(HW*2,.1,HD*2,wood,0,H+.05,0);
    for(let x=-HW+.6;x<HW;x+=1.2)B(.12,.16,HD*2,woodD,x,H-.08,0);
    const shoji=(len,place)=>{const g=new THREE.Group();const p=new THREE.Mesh(new THREE.BoxGeometry(len,H,.05),paper);p.position.y=H/2;g.add(p);for(let x=-len/2;x<=len/2+.01;x+=.6){const b=new THREE.Mesh(new THREE.BoxGeometry(.05,H,.08),woodD);b.position.set(x,H/2,.02);g.add(b)}for(let y=.4;y<H;y+=.5){const b=new THREE.Mesh(new THREE.BoxGeometry(len,.04,.07),woodD);b.position.set(0,y,.02);g.add(b)}place(g);sc.add(g);return g};
    shoji(HD*2,g=>{g.position.set(-HW,0,0);g.rotation.y=Math.PI/2});shoji(HD*2,g=>{g.position.set(HW,0,0);g.rotation.y=-Math.PI/2});
    for(const s of [-1,1])shoji(HW-.9,g=>{g.position.set(s*(HW+.9)/2,0,HD);g.rotation.y=Math.PI});/* mặt tiền hai bên cửa lùa */
    for(const s of [-1,1]){const d=B(.88,H-.3,.05,paper,s*1.35,(H-.3)/2,HD-.06);for(const k of [-.33,0,.33])B(.04,H-.3,.07,woodD,s*1.35+k*.88,(H-.3)/2,HD-.04)}/* cửa lùa mở sang hai bên */
    B(1.8,.14,.12,woodD,0,H-.25,HD-.05);
    B(HW*2,H,.1,M('#5e3c26'),0,H/2,-HD);/* vách gỗ sau bàn thờ */
    for(const x of [-HW,HW])for(const z of [-HD,HD])C(.1,.12,H,wood,x*.98,H/2,z*.98,8);
    // 27/11 vẽ lại theo ảnh mẫu: bàn thờ gỗ thấp mặt gỗ sáng, bệ gỗ, đài sen gỗ sáng, tượng Phật trắng ngà dáng tối giản bo tròn
    // (không vẽ nét mặt, búi tóc nhỏ trên đỉnh, y vắt chéo vai trái, ngồi kiết già, hai tay xếp trong lòng); ô tròn sáng dịu phía sau có dáng núi mờ.
    const AZ=-HD+.75,woodS=M('#c8955c',{roughness:.6});B(2.6,.46,1.0,woodD,0,.23,AZ);B(2.8,.06,1.15,woodS,0,.49,AZ);B(1.3,.3,.7,woodS,0,.67,AZ-.12);
    const P=(geo,m,x,y,z,par)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);(par||sc).add(o);return o};
    const bd=new THREE.Group();bd.position.set(0,.82,AZ-.12);sc.add(bd);
    {const ivory=M('#f6dca6',{roughness:.45,emissive:'#e8a850',emissiveIntensity:.22}),robe=M('#f1d49a',{roughness:.5,emissive:'#e0a048',emissiveIntensity:.18}),fold=M('#e2bf80',{roughness:.55,emissive:'#d89840',emissiveIntensity:.15})/* 27/11: vàng kem ấm như ảnh mẫu */,lotusM=M('#e9c68e',{roughness:.5,emissive:'#6a4818',emissiveIntensity:.15});
      // đài sen: đế tròn + hai vòng cánh sen
      P(new THREE.CylinderGeometry(.42,.46,.1,24),lotusM,0,.05,0,bd);
      for(const [n,r,y,s,o] of [[12,.42,.17,.18,0],[12,.32,.24,.16,.5]])for(let i=0;i<n;i++){const a=(i+o)/n*Math.PI*2,pt=P(new THREE.SphereGeometry(s,10,8),lotusM,Math.cos(a)*r,y,Math.sin(a)*r,bd);pt.rotation.order='YXZ';pt.rotation.y=Math.PI/2-a;pt.rotation.x=-.45;pt.scale.set(.62,1,.3)}/* cánh sen nhọn, ngả ra ngoài */
      const sg=new THREE.Group();sg.position.y=.3;sg.scale.setScalar(1.25);bd.add(sg);
      // chân xếp kiết già: khối bầu dục rộng, hai bàn chân ngửa
      P(new THREE.SphereGeometry(.5,24,14),robe,0,.12,.04,sg).scale.set(.95,.3,.62);
      for(const s of [-1,1])P(new THREE.SphereGeometry(.07,10,8),ivory,s*.2,.22,.24,sg).scale.set(1.2,.5,.8);
      // thân áo: tiện tròn thon dần lên vai
      const body=P(new THREE.LatheGeometry([[0,0],[.3,0],[.33,.12],[.3,.32],[.27,.46],[.22,.56],[.1,.62],[0,.63]].map(([x,y])=>new THREE.Vector2(x,y)),24),robe,0,.16,-.02,sg);body.scale.z=.72;
      // y vắt chéo: dải áo từ vai trái xuống hông phải, mép áo quanh cổ
      const limb=(a,b2,r,m)=>{const A=new THREE.Vector3(...a),Bv=new THREE.Vector3(...b2),d=Bv.clone().sub(A),o=P(new THREE.CapsuleGeometry(r,d.length(),4,10),m,0,0,0,sg);o.position.copy(A).add(Bv).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());return o};
      limb([.17,.66,.15],[-.2,.32,.22],.016,fold);/* nếp y vắt chéo từ vai trái xuống hông phải */
      P(new THREE.TorusGeometry(.12,.025,8,20),robe,0,.76,0,sg).rotation.x=Math.PI/2;
      // hai tay xếp trong lòng
      P(new THREE.SphereGeometry(.16,14,10),ivory,0,.26,.2,sg).scale.set(1.15,.42,.7);
      for(const s of [-1,1]){limb([s*.25,.62,0],[s*.31,.36,.08],.075,robe);limb([s*.31,.36,.08],[s*.1,.27,.2],.065,robe)}/* tay buông theo thân, xếp trong lòng */
      // đầu tròn không nét mặt, búi tóc nhỏ
      P(new THREE.CylinderGeometry(.07,.08,.08,12),ivory,0,.82,0,sg);P(new THREE.SphereGeometry(.17,20,14),ivory,0,1.0,0,sg).scale.set(.95,1.1,.95);
      P(new THREE.SphereGeometry(.07,12,10),ivory,0,1.2,-.01,sg);P(new THREE.SphereGeometry(.035,8,6),ivory,0,1.27,-.01,sg)}
    {/* ô tròn sáng dịu sau tượng: viền gỗ, nền sáng ấm, hai lớp núi mờ */const mw=new THREE.Group();mw.position.set(0,1.95,-HD+.07);sc.add(mw);
      P(new THREE.TorusGeometry(1.18,.08,10,48),M('#8a5a34',{roughness:.6}),0,0,0,mw);
      P(new THREE.CircleGeometry(1.32,48),new THREE.MeshBasicMaterial({color:'#a8693a',transparent:true,opacity:.35,depthWrite:false}),0,0,-.005,mw);
      P(new THREE.CircleGeometry(1.15,48),M('#f3d6a2',{emissive:'#ffcf8a',emissiveIntensity:.5,roughness:.9}),0,0,.01,mw);
      for(const [x,s2,c,y0] of [[-.5,.7,'#d9bd94',-.25],[.55,.55,'#cfb289',-.3],[0,.42,'#c4a67c',-.45]]){const m=P(new THREE.ConeGeometry(s2,s2*.75,3),M(c,{emissive:'#ffcf8a',emissiveIntensity:.25,roughness:.95}),x,y0,.02+(.45-s2)*.02,mw);m.scale.z=.03;m.scale.y=.65}}
    const glow=new THREE.PointLight('#ffcf8a',1.1,5,1.6);glow.position.set(0,2.0,AZ+.9);sc.add(glow);
    // bốn cây nến trắng (hai cây mỗi bên, dâng đèn thì thắp; chỉ hai cây ngoài có ánh sáng để nhẹ máy), bát hương, hai bình hoa
    const flames=[];for(const s of [-1,1])for(const [x,hh,lit] of [[.82,.26,false],[1.08,.36,true]]){C(.06,.06,hh,M('#f7f3ea'),s*x,.52+hh/2,AZ+.28,12);const f=P(new THREE.SphereGeometry(.04,8,6),M('#ffd27a',{emissive:'#ffb040',emissiveIntensity:2}),s*x,.56+hh,AZ+.28);f.scale.y=1.6;f.visible=false;let l={intensity:0};if(lit){l=new THREE.PointLight('#ffb050',0,3.5,1.8);l.position.set(s*x,.62+hh,AZ+.35);sc.add(l)}flames.push([f,l])}
    C(.17,.13,.16,M('#6b5a48',{metalness:.3}),0,.6,AZ+.42,14);
    const sticks=new THREE.Group();sticks.position.set(0,.66,AZ+.42);sticks.visible=false;sc.add(sticks);for(const k of [-1,0,1]){const s=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.42,4),M('#8a3a2a'));s.position.set(k*.04,.21,0);s.rotation.z=k*.08;sticks.add(s);const tip=new THREE.Mesh(new THREE.SphereGeometry(.014,6,4),M('#ff7030',{emissive:'#ff5010',emissiveIntensity:2}));tip.position.set(k*.04+k*.017,.42,0);sticks.add(tip)}
    const smoke=[];for(let i=0;i<14;i++){const p=P(new THREE.SphereGeometry(.05,6,4),new THREE.MeshBasicMaterial({color:'#e8e2d8',transparent:true,opacity:0,depthWrite:false}),0,1,AZ+.42);p.userData.o=i/14;smoke.push(p)}
    const vases=[];for(const s of [-1,1]){C(.08,.1,.28,M('#e8e0cc'),s*1.2,.66,AZ-.32,12);const fl=new THREE.Group();fl.position.set(s*1.2,.8,AZ-.32);fl.visible=false;sc.add(fl);for(let k=0;k<7;k++){const a=k/7*6.28,st2=new THREE.Mesh(new THREE.CylinderGeometry(.008,.008,.3,4),M('#4f7a3a'));st2.position.set(Math.cos(a)*.05,.12,Math.sin(a)*.05);st2.rotation.set(Math.sin(a)*.25,0,Math.cos(a)*.25);fl.add(st2);const b=new THREE.Mesh(new THREE.SphereGeometry(.055,8,6),M(k%2?'#f3d7e0':'#fff6ea'));b.position.set(Math.cos(a)*.1,.28,Math.sin(a)*.1);fl.add(b)}vases.push(fl)}
    // sen dâng trước bàn thờ
    const lotus=new THREE.Group();lotus.position.set(0,.02,AZ+.95);lotus.visible=false;sc.add(lotus);P(new THREE.CylinderGeometry(.3,.26,.06,20),M('#6b4a32'),0,.03,0,lotus);for(let k=0;k<3;k++){const lg=new THREE.Group();lg.position.set((k-1)*.18,.08,0);lotus.add(lg);for(let i=0;i<8;i++){const pt=new THREE.Mesh(new THREE.SphereGeometry(.06,8,6),M(i%2?'#f2b8c8':'#f7d0dc'));const a=i/8*6.28;pt.position.set(Math.cos(a)*.05,.05,Math.sin(a)*.05);pt.scale.set(.6,1.3,.6);pt.rotation.set(Math.sin(a)*.5,0,-Math.cos(a)*.5);lg.add(pt)}}
    // chuông lớn trên đôn đỏ bên trái bàn thờ
    const bowlM=new THREE.MeshStandardMaterial({color:'#b88d45',metalness:.65,roughness:.3});B(.7,.4,.7,woodD,-2.1,.2,AZ+.4);C(.36,.38,.12,red,-2.1,.46,AZ+.4,18);
    const bell=add(new THREE.LatheGeometry([[0,0],[.18,.02],[.3,.15],[.33,.3]].map(([a,c])=>new THREE.Vector2(a,c)),28),bowlM,-2.1,.52,AZ+.4);bell.material.side=THREE.DoubleSide;
    C(.025,.03,.36,woodD,-1.75,.56,AZ+.6,6).rotation.z=1.2;
    const ring=()=>{strike(147,8,.16,[[1,1],[2.76,.35],[5.4,.12]]);bell.userData.ring=performance.now()};rTap(st,bell,()=>{ring();rmHint('🥣 Tiếng chuông ngân · thở vào, thở ra theo tiếng chuông')});
    st.tick.push(()=>{const u=(performance.now()-(bell.userData.ring||0))/1000;bell.scale.setScalar(u<1.5?1+Math.sin(u*40)*.014*(1.5-u):1)});
    // bồ đoàn trên chiếu: 2 hàng × 3, quay về bàn thờ
    const seatHit=new THREE.BoxGeometry(.6,.6,.6),seatM=new THREE.MeshBasicMaterial({visible:false}),cush=[];
    for(const z of [-.4,1.0])for(const x of [-1.4,0,1.4]){B(.8,.03,.8,mat2,x,.015,z);C(.3,.33,.2,red,x,.13,z,18);const h=add(seatHit,seatM,x,.3,z);cush.push([x,z]);rTap(st,h,()=>{const W=st.walk;if(!W||!W.goSeat)return;W.goSeat({x,z,a:Math.PI,y:.24,ax:x,az:z+.8});rmHint('🧘 Ngồi thiền trên bồ đoàn · bấm Đứng lên hoặc đi để rời chỗ')})}
    // đèn lồng giấy treo, cây xanh góc
    for(const x of [-1.8,1.8]){const l=P(new THREE.SphereGeometry(.26,14,10),M('#f6e6c4',{emissive:'#ffcc80',emissiveIntensity:.9}),x,H-.75,.6);l.scale.y=1.25;B(.02,.5,.02,woodD,x,H-.25,.6);const pl=new THREE.PointLight('#ffd49a',.9,6,1.6);pl.position.set(x,H-.9,.6);sc.add(pl)}
    {/* 27/11: chậu bonsai trên đôn gỗ bên phải bàn thờ, đối xứng với chuông */const bx=2.1,bz=AZ+.4,tr=M('#5b3b26');B(.7,.4,.7,woodD,bx,.2,bz);C(.24,.18,.14,M('#5d7a52',{roughness:.5}),bx,.47,bz,16);
      const t1=C(.035,.05,.34,tr,bx-.03,.68,bz,7);t1.rotation.z=.35;const t2=C(.03,.035,.26,tr,bx+.04,.92,bz,7);t2.rotation.z=-.5;
      for(const [dx,dy,dz,r] of [[-.16,.88,0,.15],[.14,1.08,.02,.17],[-.02,1.2,-.04,.13],[.24,.92,.05,.11]]){const f=P(new THREE.SphereGeometry(r,10,7),M('#4f7a3a'),bx+dx,dy,bz+dz);f.scale.y=.55}}
    for(const [x,z] of [[-HW+.45,-HD+.45]]){C(.22,.18,.36,M('#3d5a48'),x,.18,z,12);for(let k=0;k<5;k++){const lf=P(new THREE.ConeGeometry(.12,.9,5),M(k%2?'#4f7a3a':'#3f6a2a'),x+Math.cos(k*1.3)*.08,.75,z+Math.sin(k*1.3)*.08);lf.rotation.set(Math.sin(k*1.3)*.3,0,Math.cos(k*1.3)*.3)}}
    // 25/11 theo ảnh mẫu Nhà Thiền: góc trà (bàn trà thấp, bonsai, bộ ấm, hai bồ đoàn), kệ gốm vách trái, hai đèn giấy đứng ở góc cửa
    const TX=3.0,TZ=.8,inkM=M('#3e2a1e',{roughness:.6});
    B(.75,.07,1.15,inkM,TX,.34,TZ);for(const a of [-1,1])for(const b of [-1,1])B(.07,.31,.07,inkM,TX+a*.3,.155,TZ+b*.5);
    B(.3,.12,.22,M('#3d4a52',{roughness:.6}),TX,.43,TZ-.3);C(.025,.035,.3,M('#5b3b26'),TX,.6,TZ-.3,6);
    for(const [dx,dy,dz,r] of [[0,.8,0,.17],[-.12,.7,.12,.12],[.1,.72,-.1,.11]]){const f=P(new THREE.SphereGeometry(r,10,7),M('#3f6a2a'),TX+dx,dy,TZ-.3+dz);f.scale.y=.6}
    {const tea=M('#e7e0d2',{roughness:.4});P(new THREE.SphereGeometry(.09,12,8),tea,TX,.46,TZ+.15).scale.y=.8;for(const z of [.38,.5])C(.04,.035,.06,tea,TX+.18,.41,TZ+z,10)}
    for(const z of [TZ-.95,TZ+.95])C(.3,.33,.18,M('#d8c49a'),TX,.09,z,18);
    {const KX=-HW+.25;for(const y of [.03,.6,1.17,1.74])B(.4,.05,1.3,woodD,KX,y,.1);for(const z of [-.55,.75])B(.4,1.8,.05,woodD,KX,.9,z);
      const cer=['#7d8f86','#c9b28c','#4f5d63','#a9744e','#e7dfcf','#6e7c5d'];let k=0;for(const y of [.06,.63,1.2])for(const z of [-.3,.1,.5]){const r=.08+.03*(k%3);const v=P(new THREE.SphereGeometry(r,12,8),M(cer[k%6],{roughness:.45}),KX,y+r*.9,z);v.scale.y=1.1+.3*(k%2);k++}}
    for(const x of [-HW+.45,HW-.45]){B(.06,.7,.06,woodD,x,.35,HD-.45);B(.38,.62,.38,M('#f6e6c4',{emissive:'#ffcc80',emissiveIntensity:.9}),x,.95,HD-.45);for(const y of [.64,1.26])B(.42,.04,.42,woodD,x,y,HD-.45)}
    st.blocks=[[-1.45,-HD,1.45,AZ+.65],[-2.5,AZ,-1.7,AZ+.8],[1.7,AZ,2.5,AZ+.8],[-HW,-HD,-HW+.7,-HD+.7],[HW-.7,-HD,HW,-HD+.7],[TX-.45,TZ-1.3,TX+.45,TZ+1.3],[-HW,-.65,-HW+.5,.85],[-HW,HD-.7,-HW+.7,HD],[HW-.7,HD-.7,HW,HD]];
    // nghi thức
    let incT=0;st.tick.push(t=>{if(!sticks.visible)return;for(const p of smoke){const u=((t*.18+p.userData.o)%1);p.position.set(Math.sin(u*9+p.userData.o*6)*.06*u*3,1.08+u*1.6,AZ+.42+Math.cos(u*7)*.04);p.material.opacity=.32*(1-u)*Math.min(1,u*6);p.scale.setScalar(1+u*3)}for(const [f,l] of flames)if(f.visible){l.intensity=1.1+Math.sin(t*13+f.position.x)*.15}});
    const RIT={incense:['🪔 Dâng hương','Nén hương đã thắp · khói hương nhẹ bay, tâm lắng xuống',()=>{sticks.visible=true}],flower:['🪷 Dâng hoa sen','Hoa sen đã dâng trước bàn thờ',()=>{lotus.visible=true}],candle:['🕯 Dâng đèn','Hai ngọn đèn đã thắp sáng',()=>{for(const [f,l] of flames){f.visible=true;l.intensity=1.1}}],vase:['💐 Dâng hoa','Hai bình hoa đã cắm hoa tươi',()=>{for(const v of vases)v.visible=true}]};
    let ritOpen=false;
    function render(){rmPanel.innerHTML='<p>🧘 <b>Nhà Thiền Đảo Yên</b> · ngồi trên bồ đoàn, thỉnh một tiếng chuông, dâng hương hoa trước bàn thờ.</p><div class="rm-row"><button type="button" data-th="bell">🥣 Thỉnh chuông</button><button type="button" data-th="rit"'+(ritOpen?' class="sel"':'')+'>🪷 Nghi thức</button><button type="button" data-th="sit">🧘 Toạ thiền</button></div>'+(ritOpen?'<div class="rm-row">'+Object.entries(RIT).map(([k,v])=>'<button type="button" data-th="r:'+k+'">'+v[0]+'</button>').join('')+'</div>':'')}
    render();rmPanel.onclick=e=>{const a=e.target.closest('[data-th]')?.dataset.th;if(!a)return;
      if(a==='bell'){ring();rmHint('🥣 Tiếng chuông ngân · thở vào, thở ra theo tiếng chuông')}
      else if(a==='rit'){ritOpen=!ritOpen;render()}
      else if(a==='sit'){const W=st.walk;if(W&&W.goSeat){const [x,z]=cush[1];W.goSeat({x,z,a:Math.PI,y:.24,ax:x,az:z+.8});rmHint('🧘 Đi tới bồ đoàn giữa để ngồi thiền')}}
      else if(a.startsWith('r:')){const r=RIT[a.slice(2)];if(r){r[2]();rmHint('🙏 '+r[1]);playChime&&playChime()}}};
    rmHint('🧘 Nhà Thiền · chạm sàn để đi, chạm bồ đoàn để ngồi, chạm chuông để thỉnh · 🚪 Ra cửa để ra ngoài');
    st.cleanup=()=>{for(const t of texs)t.dispose()}}
  __roomsExport({roomNhaSac,roomChuongGio,roomXongHuong,roomQuanTra,roomTuGia,roomTinhThat,roomXuongGom,roomNhaNiem,roomNhaVanHoa,roomDaoYen,roomDaoThien});
