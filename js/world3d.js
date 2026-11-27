// LÀNG YÊN · thế giới 3D (Rừng Yên, Vịnh Yên, các nhà và phòng). Tách khỏi index.html để trang chủ tải nhẹ hơn trên 4G
// và được trình duyệt lưu đệm riêng. Nạp bằng <script defer> sau activity-lock.js và space-chat.js, chạy khi trang đã dựng xong.
// Dùng chung các hàm toàn cục khai báo trong index.html ($, toast, go, anyenLoadThree, ...).
window.anyenRetry3D=async function initialize3D(){
 window.anyen3DLoading=true;document.body.classList.remove('yen-3d-error');document.querySelector('#sceneMode').textContent='Đang tải không gian 3D…';
 try{
  const THREE=await anyenLoadThree();
  if(!anyenWebGLAvailable()){const err=new Error('Trình duyệt hoặc thiết bị này chưa bật WebGL nên chưa mở được 3D. Trên iPhone, hãy tắt Chế độ Phong tỏa (Lockdown Mode) cho trang này hoặc thử trình duyệt khác.');err.kind='webgl';throw err}
  const softwareGL=anyenSoftwareGL();window.anyenIsSoftwareGL=softwareGL;
  const renderer=new THREE.WebGLRenderer({antialias:!softwareGL,alpha:false,powerPreference:'low-power'});
  renderer.setPixelRatio(softwareGL?1:Math.min(window.devicePixelRatio||1,matchMedia('(pointer:coarse)').matches?1.5:1.7));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.domElement.className='webgl';renderer.domElement.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block;';
  const holder=document.querySelector('.scene');holder.append(renderer.domElement);window.anyenRetry3D=null;
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();console.warn('LÀNG YÊN 3D: WebGL context lost');document.getElementById('zenHint').textContent='Đang khôi phục không gian 3D… Nếu màn hình vẫn đứng, hãy tải lại trang.'},false);
  renderer.domElement.addEventListener('webglcontextrestored',()=>{console.info('LÀNG YÊN 3D: WebGL context restored');document.getElementById('zenHint').textContent='Đã khôi phục không gian 3D.'},false);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#173c35');scene.fog=new THREE.FogExp2('#264b42',.016);
  const camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,.1,320);camera.position.set(0,7,21);
  const hemiLight=new THREE.HemisphereLight('#f6dfaf','#1b4234',2.1);scene.add(hemiLight);const sun=new THREE.DirectionalLight('#f5c78c',2.4);sun.position.set(-8,19,-8);scene.add(sun);
  const mat=(color,roughness=1)=>new THREE.MeshStandardMaterial({color,roughness,side:THREE.DoubleSide});
  let bayMode=false;
  // 3.8: Bản đồ mở rộng. Phía nam là hồ sen hai cánh, phía bắc là đồi tượng Phật; vành ngoài nâng thành triền thông.
  // terrainHeight() là nguồn duy nhất cho cao độ: lưới mặt đất, người đi, cây và tọa cụ đều đọc từ đây.
  const HILL={x:0,z:-62,top:8,flat:11,foot:26};
  const LOTUS_LAKE={z:-4,lobes:[[-18,15,13],[18,15,13]],channel:[7,4]};
  function lakeSDF(x,z){let d=Infinity;for(const [cx,rx,rz] of LOTUS_LAKE.lobes){const dx=(x-cx)/rx,dz=(z-LOTUS_LAKE.z)/rz;d=Math.min(d,(Math.hypot(dx,dz)-1)*Math.min(rx,rz))}const qx=Math.abs(x)-LOTUS_LAKE.channel[0],qz=Math.abs(z-LOTUS_LAKE.z)-LOTUS_LAKE.channel[1];return Math.min(d,Math.hypot(Math.max(qx,0),Math.max(qz,0))+Math.min(Math.max(qx,qz),0))}
  const smoothstep=(a,b,v)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t)};
  function terrainHeight(x,z){
    const lk=lakeSDF(x,z);if(lk<0)return Math.max(-1.1,lk*.35)-.12;
    const hr=Math.hypot(x-HILL.x,z-HILL.z),slope=smoothstep(HILL.foot,HILL.flat,hr);
    let y=HILL.top*slope+.5*Math.sin(Math.atan2(z-HILL.z,x-HILL.x)*3+.7)*slope*(1-slope)*4;
    const e=Math.max((Math.abs(x)-70)/14,(z-37)/12,(-z-125)/10);
    if(e>0)y+=9*smoothstep(0,1,e)+Math.sin(x*.21+z*.13)*.8*smoothstep(0,.5,e);
    return y;
  }
  const ground=(()=>{const g=new THREE.PlaneGeometry(226,222,226,222);g.rotateX(-Math.PI/2);g.translate(0,0,-45);const p=g.attributes.position;
    for(let i=0;i<p.count;i++)p.setY(i,terrainHeight(p.getX(i),p.getZ(i)));g.computeVertexNormals();
    g.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(p.count*3).fill(.25),3));
    return new THREE.Mesh(g,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1}))})();scene.add(ground);
  const water=new THREE.Mesh(new THREE.PlaneGeometry(78,38),new THREE.MeshStandardMaterial({color:'#306c68',metalness:.35,roughness:.24,transparent:true,opacity:.91}));water.rotation.x=-Math.PI/2;water.position.set(0,-.05,-4);scene.add(water);

// Bản đồ v3.6: Hồ Sen (hồ sen hai cánh) và sáu hồ Lục Căn (r 5.5 m) đối xứng quanh đồi, cách đỉnh đồi 38 m.
// Tây (Bắc→Nam): Chạm, Thanh, Sắc · Đông: Niệm, Hương, Vị.
const POND_R=5.5;
const wishLakes=[
 {name:'Sắc',x:-28.2,z:-36.6,color:'#547d81',theme:'thịnh vượng'},
 {name:'Thanh',x:-37.9,z:-65.3,color:'#57758b',theme:'công việc'},
 {name:'Hương',x:37.9,z:-65.3,color:'#688b78',theme:'sức khỏe'},
 {name:'Vị',x:28.2,z:-36.6,color:'#947a67',theme:'tình duyên'},
 {name:'Chạm',x:-23.4,z:-91.9,color:'#8c7188',theme:'kết nối'},
 {name:'Niệm',x:23.4,z:-91.9,color:'#6a9c98',theme:'chánh niệm'},/* bản đồ v3.6: hồ mới Đông-Bắc, đối xứng Hồ Chạm, sen trắng */
 {name:'Sen',x:0,z:-4,color:'#5a9b91',theme:'an yên',lotus:true}/* hồ sen hai cánh (trước gọi là Hồ Niệm) */
];
const lakeVisuals=new Map();let wishDestination=null;let selectedWishLake='Sen';window.anyenSelectedWishLake='Sen';
// 3.32: Sáu hồ Lục Căn vẽ lại theo bộ mẫu three.js "6 hồ giác quan" và tranh tham khảo: nền hồ sẫm, mặt nước xanh ngọc,
// viền đá cuội tròn dẹt (một InstancedMesh cho cả sáu hồ), lá súng nổi; Hồ Sắc có ba cá Koi vàng, đỏ, cam bơi vòng, Hồ Thanh có gợn sóng
// lan tròn, Hồ Niệm có vài bông sen trắng hồng nhỏ, thưa. Luống hoa của mỗi hồ dựng ở phần vườn hoa (FLOWER_GARDENS).
const POND_WATER='#2a6a66',pondAnims=[];
const pondStoneGeo=new THREE.DodecahedronGeometry(1,0),pondStoneMat=new THREE.MeshStandardMaterial({roughness:.9,flatShading:true});
const pondPadGeo=new THREE.CircleGeometry(.5,10,.35,Math.PI*2-.35);pondPadGeo.rotateX(-Math.PI/2);
const pondPadMat=new THREE.MeshStandardMaterial({color:'#5b9a43',roughness:.95,flatShading:true,side:THREE.DoubleSide});
{const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),sc=new THREE.Vector3(),stoneCols=['#77766a','#898779','#9b9787','#6d7069','#a6a08e'].map(c=>new THREE.Color(c));
for(const l of wishLakes){
 const group=new THREE.Group();group.position.set(l.x,.035,l.z);scene.add(group);
 if(!l.lotus){
   const clear=l.name==='Niệm'||l.name==='Chạm'||l.name==='Vị'||l.name==='Hương';/* 3.34: bốn hồ vẽ theo mẫu Sen Thanh, Hoa Súng, Hoa Rơi, Sóng Thiền: nước xanh ngọc sẫm, trong, phẳng */
   const bed=new THREE.Mesh(new THREE.CircleGeometry(POND_R+.08,40),mat(clear?'#0f2e2b':'#43583b'));bed.rotation.x=-Math.PI/2;bed.position.y=-.01;group.add(bed);
   const pool=new THREE.Mesh(new THREE.CircleGeometry(POND_R-.1,40),new THREE.MeshStandardMaterial({color:clear?'#175651':POND_WATER,transparent:true,opacity:clear?.94:.91,metalness:clear?.18:.08,roughness:clear?.12:.28}));pool.rotation.x=-Math.PI/2;pool.position.y=.06;group.add(pool);l.pool=pool;
   /* đá và lá súng: mỗi hồ một InstancedMesh, toạ độ theo hồ nên vẫn đi theo khi hồ được dời từ dữ liệu */const pondStones=new THREE.InstancedMesh(pondStoneGeo,pondStoneMat,52);
   for(let i=0;i<52;i++){const a=i*Math.PI*2/52,r=POND_R+.1+Math.sin(i*2.7)*.045,s=.24+(i%4)*.025;e.set(.04*(i%3),a+(i%2)*.3,.06*(i%4));q.setFromEuler(e);v.set(Math.cos(a)*r,.1,Math.sin(a)*r);sc.set(s*1.05,.13+(i%3)*.018,s*.82);
     pondStones.setMatrixAt(i,m4.compose(v,q,sc));pondStones.setColorAt(i,stoneCols[i%5])}
   pondStones.instanceMatrix.needsUpdate=true;pondStones.instanceColor.needsUpdate=true;group.add(pondStones);
   const nPad=clear?0:l.name==='Sắc'?8:5,pondPads=new THREE.InstancedMesh(pondPadGeo,pondPadMat,nPad);for(let i=0;i<nPad;i++){const a=i*2.399+l.x*.1,r=POND_R*(.25+(i%3)*.17),s=.85+(i%3)*.2;e.set(0,a,0);q.setFromEuler(e);v.set(Math.cos(a)*r,.075,Math.sin(a)*r);sc.set(s*1.2,1,s*.85);pondPads.setMatrixAt(i,m4.compose(v,q,sc))}pondPads.instanceMatrix.needsUpdate=true;group.add(pondPads);
   if(l.name==='Sắc'){// 3.33: chỉ ba con Koi, mỗi con một màu (vàng, đỏ, cam), nhỏ gọn cân với hồ; ba con dùng chung một vật liệu, đuôi vẫy nhẹ bằng cách lắc thân
     const koiMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.5,flatShading:true,side:THREE.DoubleSide}),fish=[];
     [['#f2c53d','#fbe7a1'],['#d8322c','#f08a7c'],['#f07a22','#f9bd88']].forEach(([c,fin],i)=>{const P=[],add=(g,col)=>P.push([g,col]);
       const body=new THREE.SphereGeometry(.26,10,6);body.scale(1.6,.5,.66);add(body,c);
       const head=new THREE.SphereGeometry(.17,8,5);head.scale(1.1,.6,.9);head.translate(.3,-.01,0);add(head,c);
       const dorsal=new THREE.BufferGeometry();dorsal.setAttribute('position',new THREE.Float32BufferAttribute([.18,.11,0,-.24,.11,0,-.06,.24,0],3));add(dorsal,fin);
       const tail=new THREE.BufferGeometry();tail.setAttribute('position',new THREE.Float32BufferAttribute([-.36,0,0,-.66,.02,.22,-.58,0,0,-.36,0,0,-.58,0,0,-.66,.02,-.22],3));add(tail,fin);
       for(const z of [1,-1]){const pec=new THREE.BufferGeometry();pec.setAttribute('position',new THREE.Float32BufferAttribute([.2,-.04,.1*z,.02,-.05,.12*z,.06,-.05,.28*z],3));add(pec,fin);
         const eye=new THREE.SphereGeometry(.028,5,4);eye.translate(.4,.04,.1*z);add(eye,'#1d2222')}
       const f=new THREE.Mesh(mergeColored(P),koiMat);f.scale.setScalar(1.2);
       f.userData={orbit:i*Math.PI*2/3,radius:POND_R*[.36,.56,.46][i],phase:i*2.1,dir:i===1?-1:1,speed:[.13,.1,.115][i]};group.add(f);fish.push(f)});
     pondAnims.push(t=>{for(const f of fish){const u=f.userData,a=u.orbit+u.dir*t*u.speed,r=u.radius+Math.sin(t*.3+u.phase)*.35;f.position.set(Math.cos(a)*r,.09+Math.sin(t*1.2+u.phase)*.012,Math.sin(a)*r);f.rotation.y=-a-u.dir*Math.PI/2+Math.sin(t*3+u.phase)*.1}})}
   if(l.name==='Thanh'){// gợn sóng tròn lan dần từ giữa hồ: Thanh là âm thanh
     const rings=[0,1,2].map(k=>{const r=new THREE.Mesh(new THREE.RingGeometry(.92,1,40),new THREE.MeshBasicMaterial({color:'#e8fbf4',transparent:true,opacity:.5,depthWrite:false}));r.rotation.x=-Math.PI/2;r.position.y=.075;group.add(r);return r});
     pondAnims.push(t=>rings.forEach((r,k)=>{const u=((t*.25+k/3)%1);r.scale.setScalar(.3+u*2.6);r.material.opacity=.55*(1-u)}))}
   if(clear){// 3.34: lòng hồ giản dị, thoáng như mẫu. Mỗi hồ gộp thành MỘT lưới (một lần vẽ), không chuyển động, nhẹ cho điện thoại.
     // Hồ Niệm (mẫu Sen Thanh): một bông sen trắng nhụy vàng, một nụ trắng phớt hồng, bốn lá sen tròn (một lá lớn vươn cao trên cuống), giọt nước trên lá.
     // Hồ Chạm (mẫu Hoa Súng): hai bông súng hồng nhụy vàng cam nằm sát mặt nước, một nụ hồng, năm lá súng tròn dẹt có khe chữ V.
     // Hồ Vị (mẫu Hoa Rơi): không lá, chỉ bốn bông hoa năm cánh hồng nhạt nhụy vàng nổi rải rác và vài cánh hoa rơi lẻ.
     // Hồ Hương (mẫu Sóng Thiền): vòng sóng tròn đồng tâm từ tâm hồ, thở chậm; ba bông hoa nhỏ và vài cánh hoa rơi gần mép.
     const P=[],R=POND_R-.25,put=(g,col,x,y,z,ry=0,sx=1,sy=sx,sz=sx)=>{g.scale(sx,sy,sz);if(ry)g.rotateY(ry);g.translate(x,y,z);P.push([g,col])};
     const petal=(cx,cy,cz,a,tilt,len,wid,col,s)=>{const g=new THREE.SphereGeometry(1,7,5);g.scale(wid,.045,len);g.translate(0,0,len);g.rotateX(-tilt);g.rotateY(a);put(g,col,cx,cy,cz,0,s)};
     const stem=(x,z,h,r=.035)=>{const g=new THREE.CylinderGeometry(r*.8,r,h,6);g.translate(0,h/2,0);put(g,'#4f8a35',x,0,z)};
     const drop=(x,y,z,s=.07)=>put(new THREE.SphereGeometry(1,6,4),'#eef9ff',x,y,z,0,s,s*.6,s);
     const at=(fx,fz)=>[fx*R,fz*R];
     // hoa năm cánh kiểu anh đào nổi trên mặt nước: cánh tròn hồng nhạt, chân cánh sáng hơn, nhụy vàng
       const bloom=(fx,fz,s,ry)=>{const [x,z]=at(fx,fz),y=.09;
         for(let k=0;k<5;k++){const a=ry+k*Math.PI*2/5;petal(x,y,z,a,.1,.26,.17,'#f294b5',s);petal(x,y+.012,z,a,.1,.13,.1,'#fde3ec',s)}
         put(new THREE.CylinderGeometry(.06*s,.05*s,.04*s,8),'#f6c234',x,y+.035*s,z);
         for(let k=0;k<7;k++){const a=k*Math.PI*2/7;put(new THREE.SphereGeometry(.018*s,4,3),'#f9d64c',x+Math.cos(a)*.08*s,y+.06*s,z+Math.sin(a)*.08*s)}};
       const fallen=(fx,fz,ry,s)=>{const [x,z]=at(fx,fz),g=new THREE.SphereGeometry(1,7,4);g.scale(.16,.02,.12);put(g,'#f4a6c1',x,.085,z,ry,s)};
     if(l.name==='Niệm'){
       // lá sen: chén nông, mép gợn nhẹ, gân sáng ở tâm
       const leaf=(fx,fz,r,h,tilt=0)=>{const [x,z]=at(fx,fz),g=new THREE.SphereGeometry(2.1,18,3,0,Math.PI*2,Math.PI-.5,.5),q=g.attributes.position;
         for(let k=0;k<q.count;k++){const px=q.getX(k),pz=q.getZ(k),rr=Math.hypot(px,pz);q.setY(k,(q.getY(k)+2.1)*.55+Math.sin(Math.atan2(pz,px)*7)*.035*rr)}g.computeVertexNormals();g.scale(r,r,r);if(tilt)g.rotateX(tilt);put(g,'#4a9e2e',x,h,z);
         const c=new THREE.CircleGeometry(r*.16,8);c.rotateX(-Math.PI/2);put(c,'#79bd47',x,h+.012,z);drop(x+r*.32,h+r*.07,z-r*.18,.06+r*.02);if(h>.2)stem(x,z,h)};
       leaf(.34,-.32,1.75,.95,.08);leaf(-.44,.42,1.3,.07);leaf(.58,.2,.78,.07);leaf(.02,.64,.72,.07);
       // bông sen trắng: ba lớp cánh, gương sen vàng
       {const [x,z]=at(-.05,.16),y=.42,S=1.6;stem(x,z,y);
        for(let k=0;k<9;k++)petal(x,y,z,k*Math.PI*2/9,.32,.34,.15,'#f2efe4',S);
        for(let k=0;k<8;k++)petal(x,y+.03*S,z,(k+.5)*Math.PI*2/8,.78,.31,.14,'#fbf9f2',S);
        for(let k=0;k<6;k++)petal(x,y+.06*S,z,k*Math.PI/3+.25,1.2,.24,.11,'#fffdf8',S);
        const pod=new THREE.CylinderGeometry(.12*S,.08*S,.12*S,10);put(pod,'#f2c531',x,y+.15*S,z);
        for(let k=0;k<12;k++){const a=k*Math.PI/6,g=new THREE.CylinderGeometry(.012*S,.012*S,.1*S,3);put(g,'#f7d85c',x+Math.cos(a)*.14*S,y+.15*S,z+Math.sin(a)*.14*S)}}
       // nụ sen trắng phớt hồng trên cuống cao
       {const [x,z]=at(-.5,-.02),h=1.05;stem(x,z,h,.03);const b=new THREE.SphereGeometry(1,9,7);put(b,'#f8f0ea',x,h+.3,z,0,.24,.38,.24);const tip=new THREE.ConeGeometry(.17,.32,9);put(tip,'#f0a9bd',x,h+.6,z)}
     }else if(l.name==='Chạm'){
       // lá súng: đĩa phẳng nổi sát nước, khe chữ V, chấm sáng ở tâm
       const pad=(fx,fz,r,ry)=>{const [x,z]=at(fx,fz),g=new THREE.CircleGeometry(1,22,.2,Math.PI*2-.4);g.rotateX(-Math.PI/2);put(g,'#469a2f',x,.085,z,ry,r,1,r);
         const c=new THREE.CircleGeometry(r*.06,6);c.rotateX(-Math.PI/2);put(c,'#d9eba6',x,.09,z);drop(x+r*.4,.11,z+r*.2,.05)};
       pad(-.48,-.27,1.45,.6);pad(.17,-.55,1.0,2.2);pad(.55,.03,1.0,4.1);pad(-.55,.27,1.25,5.3);pad(-.08,.58,1.0,1.4);
       // súng hồng: cánh nhọn xoè gần phẳng, nhụy vàng cam
       const lily=(fx,fz,s)=>{const [x,z]=at(fx,fz),y=.1;
         for(let k=0;k<10;k++)petal(x,y,z,k*Math.PI/5,.12,.3,.11,'#e66f9b',s);
         for(let k=0;k<8;k++)petal(x,y+.02*s,z,(k+.5)*Math.PI/4,.5,.27,.1,'#ef8db2',s);
         for(let k=0;k<6;k++)petal(x,y+.04*s,z,k*Math.PI/3+.3,.95,.21,.085,'#f6b0c8',s);
         const c=new THREE.CylinderGeometry(.1*s,.08*s,.08*s,10);put(c,'#f5a623',x,y+.07*s,z)};
       lily(-.16,-.02,1.35);lily(.3,.36,1.3);
       {const [x,z]=at(.47,-.34),h=.5;stem(x,z,h,.03);const b=new THREE.SphereGeometry(1,9,7);put(b,'#f39bbb',x,h+.18,z,0,.14,.23,.14);const tip=new THREE.ConeGeometry(.1,.18,9);put(tip,'#f7bcd0',x,h+.36,z)}
     }else if(l.name==='Vị'){
       bloom(.58,-.38,1.6,.3);bloom(.29,-.14,1.1,1.1);bloom(-.49,.3,1.4,2.0);bloom(.4,.66,1.25,.7);
       // cánh hoa rơi lẻ, nằm phẳng trên nước
       for(const [fx,fz,ry,s] of [[.23,-.65,.4,1.2],[-.61,-.44,2.1,.9],[-.74,.09,1.0,1.1],[-.19,.47,2.6,1],[.64,.42,.2,1.1],[.71,-.1,1.7,.7],[.8,-.2,3.0,.6],[-.69,.47,.9,.7],[-.47,.65,2.2,.8],[-.18,-.73,1.3,.7],[.05,.15,2.8,.6]])fallen(fx,fz,ry,s)
     }else{
       bloom(-.6,-.51,1.05,.4);bloom(.67,0,1.1,1.3);bloom(-.54,.36,1.05,2.2);
       for(const [fx,fz,ry,s] of [[-.74,-.31,.5,.8],[.75,-.39,1.9,.8],[-.69,.2,2.6,.7],[.54,.24,1.1,.8],[-.35,.52,.2,.75]])fallen(fx,fz,ry,s);
       // vòng sóng: chín vòng mảnh gộp một lưới trong suốt, sáng dần về tâm; cả bộ phồng nhẹ theo nhịp thở (khoảng 8 giây một nhịp)
       const W=[];for(let k=1;k<=9;k++){const r=k*R*.093,g=new THREE.RingGeometry(r-.05,r+.05,48,1);g.rotateX(-Math.PI/2);W.push([g,k<4?'#d8fff2':k<7?'#a9e6d5':'#7fcdbb'])}
       const waves=new THREE.Mesh(mergeColored(W),new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.32,depthWrite:false}));waves.position.y=.072;group.add(waves);
       pondAnims.push(t=>{const u=(Math.sin(t*.78)+1)/2;waves.scale.setScalar(.9+u*.1);waves.material.opacity=.24+u*.12})
     }
     const m=new THREE.Mesh(mergeColored(P),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.6,side:THREE.DoubleSide,emissive:'#ffffff',emissiveIntensity:.04}));group.add(m)}
 }
 const labelCanvas=document.createElement('canvas');labelCanvas.width=512;labelCanvas.height=128;const ctx=labelCanvas.getContext('2d');const drawLakeLabel=()=>{ctx.clearRect(0,0,512,128);ctx.fillStyle='#f1d69f';ctx.font='bold 48px serif';ctx.textAlign='center';ctx.fillText('HỒ '+l.name.toUpperCase(),256,62);ctx.font='28px sans-serif';ctx.fillText(l.theme,256,103)};drawLakeLabel();
 const tex=new THREE.CanvasTexture(labelCanvas);l.redrawLabel=()=>{drawLakeLabel();tex.needsUpdate=true};const label=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));label.position.set(0,l.lotus?5.4:1.5,0);label.scale.set(5,1.25,1);group.add(label);/* Hồ Sen's sign floats above the arched bridge */
 lakeVisuals.set(l.name,group);
}}
function animateCoin(lake,remote){const l=wishLakes.find(v=>v.name===lake);if(!l)return;const coin=new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,.04,24),new THREE.MeshStandardMaterial({color:'#e5c178',metalness:.8,roughness:.2}));const from=remote?new THREE.Vector3(l.x+5,1.7,l.z+5):mePosition.clone().add(new THREE.Vector3(0,1.7,0));scene.add(coin);const start=performance.now();function frame(now){const t=Math.min(1,(now-start)/1400);coin.position.set(from.x+(l.x-from.x)*t,from.y+(.12-from.y)*t+Math.sin(Math.PI*t)*2.8,from.z+(l.z-from.z)*t);coin.rotation.z=t*15;if(t<1)requestAnimationFrame(frame);else{scene.remove(coin);coin.geometry.dispose();coin.material.dispose()}}requestAnimationFrame(frame)}
const wishQuotes={"Sắc":["Thịnh vượng là biết điều gì thật sự đủ.","Giá trị hôm nay tạo nên cơ hội ngày mai.","Kiên nhẫn cũng là một hình thức đầu tư.","Hãy chăm sóc nền móng trước khi xây thêm tầng.","Một quyết định sáng suốt cần ít vội vàng hơn.","Tài sản quý nhất là khả năng bắt đầu lại.","Đừng so tốc độ của mình với người khác.","Dành chỗ cho cả tích lũy và tận hưởng.","Điều bền vững thường lớn lên trong im lặng.","Thành công có ý nghĩa khi bạn vẫn là chính mình.","Hôm nay, hãy tạo ra một giá trị thật.","Không phải cánh cửa nào mở ra cũng cần bước vào."],"Thanh":["Làm việc quan trọng trước khi làm việc khẩn cấp.","Bạn không cần giỏi mọi thứ để tạo khác biệt.","Một lời nói rõ ràng có thể tháo gỡ hiểu lầm.","Đừng nhầm bận rộn với tiến bộ.","Có những bước lùi giúp nhìn rõ đường đi.","Tài năng nở rộ trong đúng môi trường.","Hãy xin giúp đỡ trước khi kiệt sức.","Tập trung là món quà dành cho mục tiêu.","Một ngày làm việc tốt vẫn cần điểm dừng.","Bạn được phép học trong lúc đang làm.","Lắng nghe đồng đội là một năng lực lãnh đạo.","Cơ hội đôi khi đến từ cuộc trò chuyện chân thành."],"Hương":["Cơ thể không phải cỗ máy chạy hết công suất.","Một giấc ngủ đủ là quyết định khôn ngoan.","Chăm sóc bản thân không cần đợi lúc mệt.","Hãy uống nước và trở về với hiện tại.","Nghỉ ngơi cũng là một phần của phát triển.","Mỗi hơi thở chậm là một lời nhắc dịu dàng.","Đừng dùng một ngày khó để đánh giá cả đời.","Đi bộ vài phút cũng giúp tâm trí rộng mở.","Lắng nghe cơ thể trước khi nó lên tiếng lớn.","Một bữa ăn thong thả đáng được trân trọng.","Sức khỏe đến từ điều nhỏ được lặp lại.","Cân bằng là điều được điều chỉnh mỗi ngày."],"Vị":["Tình yêu đẹp không khiến bạn đánh mất mình.","Một câu hỏi chân thành hơn mười lời đoán.","Hãy yêu bằng sự hiện diện, không chỉ lời hứa.","Bền lâu cần cả gần gũi lẫn khoảng riêng.","Đừng mong người khác đọc điều bạn chưa nói.","Sự dịu dàng có sức mạnh riêng.","Yêu thương không phải cuộc thi hy sinh.","Một lời xin lỗi đúng lúc có thể mở cửa.","Lắng nghe là cách ôm nhau bằng tâm trí.","Bạn xứng đáng với sự tôn trọng.","Đừng kết luận khi trái tim còn đang nóng.","Tình cảm cần được tưới bằng hành động."],"Chạm":["Kết nối thật bắt đầu khi ta hiện diện thật.","Một lời hỏi thăm có thể thay đổi một ngày.","Hãy tìm người để cùng đi, không chỉ cùng đến.","Không phải cuộc gặp nào cũng cần mục đích.","Được lắng nghe là một dạng được yêu thương.","Tình bạn lớn lên từ những lần có mặt.","Bạn có thể chủ động mở lời trước.","Khác biệt không nhất thiết là khoảng cách.","Hãy giữ lời hứa nhỏ để nuôi niềm tin.","Mỗi người mang theo câu chuyện chưa kể.","Hãy tập hiểu người trước khi mong được hiểu.","Chân thành là chiếc cầu không cần trang trí."],"Niệm":["Mỗi hơi thở tỉnh thức là một lần trở về nhà.","Làm chậm một việc nhỏ, bạn sẽ thấy nó trọn vẹn.","Chánh niệm là biết mình đang làm gì khi đang làm điều đó.","Hãy để tâm nghỉ một chút như mặt hồ lặng.","Sen trắng nở giữa bùn mà không nhiễm bùn.","Một ngọn đèn nhỏ đủ soi một bước chân.","Lắng nghe hơi thở vào, mỉm cười với hơi thở ra.","Điều đang có mặt bây giờ là đủ để bắt đầu."],"Sen":["Bạn không cần giải quyết cả tương lai hôm nay.","Trở về với hơi thở, trở về với chính mình.","Bình an không đợi mọi việc hoàn tất.","Một khoảnh khắc tỉnh thức cũng đáng quý.","Hãy để suy nghĩ đi qua mà không chạy theo.","Bạn có thể bắt đầu lại từ phút này.","Im lặng là khoảng trống để lắng nghe.","Chậm một nhịp để nhìn rõ điều đang xảy ra.","Có câu trả lời đến khi ta ngừng ép tìm.","Một ngày bình thường vẫn chứa điều kỳ diệu.","Bạn được phép chưa biết bước tiếp theo.","Hãy đối xử với mình bằng sự tử tế."]};
function wishQuote(lake){const arr=wishQuotes[lake]||wishQuotes.Sen;window.anyenLastQuote=window.anyenLastQuote||{};let index=Math.floor(Math.random()*arr.length);if(arr.length>1&&index===window.anyenLastQuote[lake])index=(index+1)%arr.length;window.anyenLastQuote[lake]=index;
 let toast=document.getElementById('anyenWishQuoteToast');if(!toast){toast=document.createElement('div');toast.id='anyenWishQuoteToast';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');document.body.append(toast);}toast.textContent='✧ Hồ '+lake+' · '+arr[index];toast.classList.add('show');window.dispatchEvent(new CustomEvent('anyen-journal-add',{detail:{lake,quote:arr[index],at:Date.now()}}));clearTimeout(window.anyenQuoteTimer);window.anyenQuoteTimer=setTimeout(()=>toast.classList.remove('show'),6500);}
window.addEventListener('anyen-item-receive',e=>{const {id,emoji,name,source,from}=e.detail||{};if(!id)return;
 // Screen-space animation stays visible on mobile even when the camera is turned.
 const el=document.createElement('div');el.className='anyen-flying-item';el.textContent=emoji||'🎁';document.body.append(el);
 requestAnimationFrame(()=>{el.classList.add('arrive')});
 setTimeout(()=>{el.remove();const toast=document.getElementById('anyenWishQuoteToast');if(toast){toast.textContent=source==='gift'?'🎁 '+(from||'Một người bạn')+' tặng bạn '+(name||'vật phẩm')+' · đã cất vào Túi An Yên':'🎒 Đã cất '+(name||'vật phẩm')+' vào Túi An Yên';toast.classList.add('show');clearTimeout(window.anyenQuoteTimer);window.anyenQuoteTimer=setTimeout(()=>toast.classList.remove('show'),2600)}},1450);
});

window.addEventListener('anyen-wish-select',e=>{const l=wishLakes.find(v=>v.name===e.detail?.lake);if(!l)return;selectedWishLake=l.name;window.anyenSelectedWishLake=l.name;const selector=document.getElementById('anyenWishLake');if(selector)selector.value=l.name;
 const candidates=[];for(let k=0;k<24;k++){const a=k*Math.PI/12;if(l.lotus){for(const s of [-1,1])candidates.push([s*18+Math.cos(a)*16.6,-4+Math.sin(a)*14.6]);}else candidates.push([l.x+Math.cos(a)*(POND_R+1.4),l.z+Math.sin(a)*(POND_R+1.4)]);}
 candidates.sort((a,b)=>Math.hypot(a[0]-mePosition.x,a[1]-mePosition.z)-Math.hypot(b[0]-mePosition.x,b[1]-mePosition.z));
 let ok=false;for(const p of candidates){if(!walkable(...p))continue;if(navigateTo(...p)){ok=true;break;}}
 wishDestination=ok?l.name:null;if(!ok)document.getElementById('zenHint').textContent='Chưa tìm được đường đến Hồ '+l.name+'. Hãy thử đến gần hơn.';});
// Measure to the shore, not the centre: Hồ Sen is the large two-lobed lotus lake, the others are sense ponds (r POND_R).
function lakeShoreDistance(l){return l.lotus?lakeSDF(mePosition.x,mePosition.z):Math.hypot(mePosition.x-l.x,mePosition.z-l.z)-POND_R}
function nearestWishLake(){let best=wishLakes[0],distance=Infinity;for(const l of wishLakes){const d=lakeShoreDistance(l);if(d<distance){distance=d;best=l}}return best.name}
function isNearWishLake(){return wishLakes.some(l=>lakeShoreDistance(l)<=7)}
function updateWishLake(){const name=nearestWishLake();if(name===selectedWishLake)return;selectedWishLake=name;window.anyenSelectedWishLake=name;const el=document.getElementById('anyenCurrentLake');if(el)el.textContent='🪷 Hồ '+name;const selector=document.getElementById('anyenWishLake');if(selector)selector.value=name}
window.addEventListener('anyen-coin',e=>{if(!e.detail?.remote&&!isNearWishLake()){const near=nearestWishLake();let toast=document.getElementById('anyenWishQuoteToast');if(!toast){toast=document.createElement('div');toast.id='anyenWishQuoteToast';toast.setAttribute('role','status');document.body.append(toast)}toast.textContent='🪙 Hãy đi đến gần một hồ rồi ném xu. Hồ gần nhất: Hồ '+near+'.';toast.classList.add('show');clearTimeout(window.anyenQuoteTimer);window.anyenQuoteTimer=setTimeout(()=>toast.classList.remove('show'),3200);return}
 const lake=e.detail?.remote?e.detail?.lake:nearestWishLake();if(!wishLakes.some(v=>v.name===lake))return;animateCoin(lake,!!e.detail?.remote);if(!e.detail?.remote){wishQuote(lake);window.dispatchEvent(new CustomEvent('anyen-coin-thrown',{detail:{lake}}))}});
  const box=(w,h,d,m,x,y,z)=>{let o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);scene.add(o);return o};
  const wood=mat('#654c33'),roof=mat('#23332f'),gold=mat('#c8a96a'),stone=mat('#6f7166');
  // 3.8: The meditation terrace sits on the flat top of the hill at the north end. A seated Buddha under a wide roof,
  // facing the lake and the gate, with rings of meditation cushions in front. Everything here is in the shrine group,
  // which is lifted to the hilltop; x/z stay in world coordinates.
  const STATUE={x:HILL.x,z:HILL.z},TERRACE_TOP=.3;
  const shrine=new THREE.Group();shrine.position.y=HILL.top;scene.add(shrine);
  const sbox=(w,h,d,m,x,y,z)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);shrine.add(o);return o};
  const FOOT={x:0,z:-31,r:6},GATHER={x:0,z:24,r:6.5};
  const STAIRS=[[0,-36.6],[5,-41.4],[-5,-46.4],[0,-51.4]];
  function stairsDistance(x,z){let best=Infinity;for(let i=0;i<STAIRS.length-1;i++){const [ax,az]=STAIRS[i],[bx,bz]=STAIRS[i+1],vx=bx-ax,vz=bz-az,u=Math.max(0,Math.min(1,((x-ax)*vx+(z-az)*vz)/(vx*vx+vz*vz)));best=Math.min(best,Math.hypot(ax+vx*u-x,az+vz*u-z))}return best}
  const terraceMat=mat('#77735f'),terraceEdge=mat('#5f5c4d'),tile=mat('#4b3a31'),eave=mat('#6b4a32');
  const TERRACE_R=8.2;
  // Arched footbridge over Hồ Sen: walkers follow this height while on the bridge.
  const BRIDGE_ARCH=[-17,9],BRIDGE_RISE=2.6;let bridgePick=null;/* lưới cầu để bấm trúng mặt cầu *//* cầu dài 26 m, giữ độ cao đỉnh, dốc thoải dần về hai đầu */
  function bridgeHeight(z){if(z<=BRIDGE_ARCH[0]||z>=BRIDGE_ARCH[1])return 0;const u=(z-BRIDGE_ARCH[0])/(BRIDGE_ARCH[1]-BRIDGE_ARCH[0]);return .18+BRIDGE_RISE*(1-Math.cos(2*Math.PI*u))/2;}
  // Mặt bậc đá lên tượng Phật: mỗi phiến đá phẳng (bậc thang), không trượt theo dốc đất nên chân không chìm vào phiến đá.
  function stairStepY(x,z){let y=null;for(let i=0;i<STAIRS.length-1;i++){const [ax,az]=STAIRS[i],[bx,bz]=STAIRS[i+1],len=Math.hypot(bx-ax,bz-az),dx=(bx-ax)/len,dz=(bz-az)/len,t=(x-ax)*dx+(z-az)*dz,d=Math.abs((x-ax)*dz-(z-az)*dx);
    if(d>1.45||t<-.32||t>len+.32)continue;const k=Math.max(0,Math.min(Math.floor(len/.62),Math.round(t/.62))),cx=ax+dx*k*.62,cz=az+dz*k*.62,h=terrainHeight(cx,cz)+.14;y=y==null?h:Math.max(y,h)}return y}
  // Bến Sen (cầu tàu gỗ, x -9 ± .85, z .6 → 8.8): đứng trên mặt ván, không lọt xuống nước
  const PIER_TOP=.27,onPier=(x,z)=>Math.abs(x+9)<.95&&z>.5&&z<8.9;
  const groundHeight=(x,z)=>{if(Math.abs(x)<=1.8&&z>BRIDGE_ARCH[0]&&z<BRIDGE_ARCH[1])return bridgeHeight(z);const t=terrainHeight(x,z);if(onPier(x,z))return Math.max(PIER_TOP,t);const st=stairStepY(x,z);return st==null?t:Math.max(t,st)};const terrace=new THREE.Mesh(new THREE.CylinderGeometry(TERRACE_R,TERRACE_R+.05,.3,64),terraceMat);terrace.position.set(STATUE.x,.15,STATUE.z);shrine.add(terrace);const kerb=new THREE.Mesh(new THREE.CylinderGeometry(TERRACE_R+.2,TERRACE_R+.25,.12,64),terraceEdge);kerb.position.set(STATUE.x,.04,STATUE.z);shrine.add(kerb);
  // Round three-step dais for the statue.
  [[2.3,.18],[1.95,.18],[1.6,.18]].forEach(([r,h],k)=>{const d=new THREE.Mesh(new THREE.CylinderGeometry(r,r+.06,h,32),k%2?terraceEdge:terraceMat);d.position.set(STATUE.x,TERRACE_TOP+h/2+k*h,STATUE.z);shrine.add(d)});
  const DAIS_TOP=TERRACE_TOP+.54;
  // Wide pyramid roof that only shelters the statue.
  for(const x of [-1.9,1.9])for(const z of [STATUE.z-1.9,STATUE.z+1.9]){const post=new THREE.Mesh(new THREE.CylinderGeometry(.17,.2,5.2,10),wood);post.position.set(x,TERRACE_TOP+2.6,z);shrine.add(post);const foot=new THREE.Mesh(new THREE.CylinderGeometry(.3,.34,.22,10),terraceEdge);foot.position.set(x,TERRACE_TOP+.11,z);shrine.add(foot)}
  const beamY=TERRACE_TOP+5.2;sbox(4.2,.28,.32,eave,0,beamY,STATUE.z-1.9);sbox(4.2,.28,.32,eave,0,beamY,STATUE.z+1.9);sbox(.32,.28,4.2,eave,-1.9,beamY,STATUE.z);sbox(.32,.28,4.2,eave,1.9,beamY,STATUE.z);
  const eaveSlab=sbox(7.6,.14,7.6,eave,0,beamY+.22,STATUE.z);
  const roofCone=new THREE.Mesh(new THREE.ConeGeometry(6.3,2.3,4,1),tile);roofCone.rotation.y=Math.PI/4;roofCone.position.set(0,beamY+1.45,STATUE.z);shrine.add(roofCone);
  const finial=new THREE.Mesh(new THREE.SphereGeometry(.22,12,10),gold);finial.position.set(0,beamY+2.7,STATUE.z);shrine.add(finial);
  // 3.14: Seated Buddha in full lotus (kiết già), dhyana mudra: crossed shins with upturned soles, hands resting in the lap,
  // robe over the left shoulder with the right shoulder bare, curled hair and ushnisha, long earlobes, eyes lowered.
  const buddha=new THREE.Group();const skin=mat('#c9a35f',.55),robeGold=mat('#b88d45',.6),robeFold=mat('#a87d3b',.6),hairM=mat('#5e4a2e',.7),lineM=mat('#7a5a2e',.6);
  const lotusBase=new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.2,.28,24),gold);lotusBase.position.y=.14;buddha.add(lotusBase);
  for(let ring=0;ring<2;ring++)for(let k=0;k<12;k++){const a=k*Math.PI/6+ring*Math.PI/12,r=ring?.95:1.12;const pet=new THREE.Mesh(new THREE.SphereGeometry(.3,10,8),ring?robeGold:gold);pet.scale.set(.55,.42,1.1);pet.position.set(Math.cos(a)*r,.34+ring*.1,Math.sin(a)*r);pet.rotation.y=-a+Math.PI/2;pet.rotation.x=ring?-.5:-.25;buddha.add(pet)}
  const bAdd=(geo,m,x,y,z,sx=1,sy=1,sz=1)=>{const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);buddha.add(o);return o};
  const limb=(r,a,b,m)=>{const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),d=B.clone().sub(A),o=new THREE.Mesh(new THREE.CapsuleGeometry(r,Math.max(.01,d.length()),5,12),m);o.position.copy(A).add(B).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());buddha.add(o);return o};
  // lap and crossed legs
  bAdd(new THREE.SphereGeometry(1,24,14),robeGold,0,.6,.12,1.02,.27,.66);
  limb(.19,[-.82,.62,.12],[.36,.66,.46],robeGold);limb(.19,[.82,.66,.18],[-.34,.74,.4],robeFold);
  bAdd(new THREE.SphereGeometry(.22,14,10),robeGold,-.84,.6,.14);bAdd(new THREE.SphereGeometry(.22,14,10),robeFold,.84,.64,.18);
  for(const [x,z,s] of [[.44,.44,1],[-.42,.38,-1]]){const sole=bAdd(new THREE.SphereGeometry(.14,12,8),skin,x,.82,z,1.5,.5,.85);sole.rotation.z=s*.35;for(let t=0;t<5;t++)bAdd(new THREE.SphereGeometry(.032,6,5),skin,x+s*.2,.86+t*.012,z-.09+t*.045)}
  // robe hem pooling over the lotus
  bAdd(new THREE.CylinderGeometry(1.02,1.08,.12,28),robeFold,0,.46,.1,1,1,.68);
  // torso from a lathe profile, slightly flattened front to back
  const torsoG=new THREE.LatheGeometry([[0,.82],[.44,.84],[.42,1.05],[.46,1.35],[.53,1.62],[.6,1.84],[.5,1.98],[.2,2.07],[0,2.08]].map(([r,y])=>new THREE.Vector2(r,y)),24);
  bAdd(torsoG,robeGold,0,0,.02,1,1,.7);
  // bare right shoulder and chest, robe edge falling diagonally from the left shoulder
  bAdd(new THREE.SphereGeometry(.34,16,12),skin,.28,1.72,.06,1,.95,.72);bAdd(new THREE.SphereGeometry(.24,14,10),skin,.56,1.84,.0,1,.8,.85);
  limb(.06,[-.42,1.98,.3],[.4,1.1,.34],robeFold);limb(.05,[-.5,1.95,-.05],[-.55,1.2,-.2],robeFold);
  // arms: upper arms down the sides, forearms in toward the lap
  limb(.15,[-.6,1.82,.02],[-.66,1.22,.12],robeGold);limb(.14,[.6,1.82,.02],[.66,1.22,.12],skin);
  limb(.13,[-.66,1.22,.12],[-.22,.92,.48],robeGold);limb(.12,[.66,1.22,.12],[.22,.94,.5],skin);
  bAdd(new THREE.SphereGeometry(.15,14,10),robeFold,-.66,1.22,.12);bAdd(new THREE.SphereGeometry(.14,14,10),skin,.66,1.22,.12);
  // dhyana mudra: right hand resting on the left, palms up, thumb tips touching
  bAdd(new THREE.SphereGeometry(.2,14,10),skin,0,.9,.5,1.25,.32,.78);bAdd(new THREE.SphereGeometry(.19,14,10),skin,0,.95,.52,1.2,.3,.74);
  limb(.035,[-.13,.98,.6],[0,1.05,.6],skin);limb(.035,[.13,.98,.6],[0,1.05,.6],skin);
  // neck with the three beauty folds
  bAdd(new THREE.CylinderGeometry(.15,.18,.24,14),skin,0,2.14,0);for(const y of [2.08,2.14,2.2]){const f=bAdd(new THREE.TorusGeometry(.16,.008,4,20),lineM,0,y,0);f.rotation.x=Math.PI/2}
  // head
  const hy=2.48;bAdd(new THREE.SphereGeometry(.34,24,18),skin,0,hy,.02,1,1.14,1.02);
  bAdd(new THREE.SphereGeometry(.355,24,14,0,Math.PI*2,0,Math.PI*.45),hairM,0,hy+.02,-.01,1,1.12,1.04);
  bAdd(new THREE.SphereGeometry(.17,16,12),hairM,0,hy+.42,-.02,1,1.05,1);
  for(let ring=0;ring<4;ring++){const n=[14,12,9,5][ring],el=.25+ring*.22;for(let k=0;k<n;k++){const a=k/n*Math.PI*2+ring*.2;const r=.36*Math.sin(Math.PI/2-el)*1.02;bAdd(new THREE.SphereGeometry(.04,6,5),hairM,Math.sin(a)*r,hy+.02+.38*Math.cos(Math.PI/2-el)*1.1,Math.cos(a)*r*1.02)}}
  for(let k=0;k<7;k++){const a=k/7*Math.PI*2;bAdd(new THREE.SphereGeometry(.035,6,5),hairM,Math.sin(a)*.12,hy+.47,Math.cos(a)*.12-.02)}
  for(const s of [-1,1]){bAdd(new THREE.CapsuleGeometry(.05,.3,3,8),skin,s*.34,hy-.1,0);
    const lid=bAdd(new THREE.TorusGeometry(.065,.009,4,12,Math.PI),lineM,s*.12,hy+.02,.33);lid.rotation.z=Math.PI;
    const brow=bAdd(new THREE.TorusGeometry(.1,.008,4,14,Math.PI*.8),lineM,s*.12,hy+.06,.32);brow.rotation.z=Math.PI*.1}
  bAdd(new THREE.ConeGeometry(.035,.14,8),skin,0,hy-.06,.37).rotation.x=.2;bAdd(new THREE.SphereGeometry(.018,6,5),gold,0,hy+.1,.36);
  const mouth=bAdd(new THREE.TorusGeometry(.05,.008,4,10,Math.PI),lineM,0,hy-.16,.33);mouth.rotation.z=Math.PI;
  // halo behind the head and a soft aura behind the body
  const glow=c=>new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:.36,side:THREE.DoubleSide,depthWrite:false});
  bAdd(new THREE.RingGeometry(.55,.9,48),glow('#f0cf86'),0,hy+.04,-.36);bAdd(new THREE.RingGeometry(.92,.97,48),glow('#f4dca0'),0,hy+.04,-.37);
  const aura=bAdd(new THREE.RingGeometry(1.25,1.33,56),glow('#e9c77a'),0,1.45,-.42,1,1.25,1);
  buddha.scale.setScalar(1.2);buddha.position.set(STATUE.x,DAIS_TOP,STATUE.z);shrine.add(buddha);
  // Bodhi tree behind the shrine.
  const bodhiTree=new THREE.Group();{const bodhi=bodhiTree;bodhi.position.set(0,0,STATUE.z-11.7);const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.45,.75,5,10),wood);trunk.position.y=2.5;bodhi.add(trunk);const bodhiLeaf=mat('#3f6b4c');[[0,7,0,3.2],[-2.4,6.2,.6,2.4],[2.4,6.3,.4,2.5],[0,8.6,-.4,2.3],[-1.2,5.6,1.6,1.9],[1.4,5.7,1.5,1.9]].forEach(([x,y,z,r])=>{const c=new THREE.Mesh(new THREE.IcosahedronGeometry(r,1),bodhiLeaf);c.position.set(x,y,z);c.scale.y=.8;bodhi.add(c)});shrine.add(bodhi)}
  // Shared helpers for the sense houses: oriented footprint test, placement beside a pond, merged vertex-coloured parts.
  function rectHit(cx,cz,rot,W,D,x,z,pad){const dx=x-cx,dz=z-cz,c=Math.cos(rot),s=Math.sin(rot),lx=dx*c-dz*s,lz=dx*s+dz*c;return Math.abs(lx)<W/2+pad&&Math.abs(lz)<D/2+pad}
  function besidePond(lakeName,gap,D){const l=wishLakes.find(v=>v.name===lakeName),ux=l.x-HILL.x,uz=l.z-HILL.z,un=Math.hypot(ux,uz),d=POND_R+gap+D/2,x=l.x+ux/un*d,z=l.z+uz/un*d;return {x,z,rot:Math.atan2(l.x-x,l.z-z)}}
  const HP=(geo,c,x,y,z,o={})=>{const g=geo.clone();if(o.s)g.scale(...o.s);if(o.rx)g.rotateX(o.rx);if(o.rz)g.rotateZ(o.rz);if(o.ry)g.rotateY(o.ry);g.translate(x,y,z);return [g,c]};
  const GB=(w,h,d)=>new THREE.BoxGeometry(w,h,d),GC=(rt,rb,h,seg=8)=>new THREE.CylinderGeometry(rt,rb,h,seg),GK=(r,h,seg=4)=>new THREE.ConeGeometry(r,h,seg,1);
  const GL=(pts,seg=12)=>new THREE.LatheGeometry(pts.map(([a,b])=>new THREE.Vector2(a,b)),seg);
  const houseMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true});
  // Bảng màu chung cho mọi ngôi nhà trong rừng (chị dặn 26/11): mái xanh đậm đúng màu lá thông, tường và gạch nâu đúng màu thân thông
  // (lấy từ pineTemplates: lá '#2a5236', thân '#6e4632', cành '#5a3a2a'), khung gỗ sẫm hơn tường một tông. Không dùng màu tông sáng.
  const HOUSE_WALL='#6e4632',HOUSE_WALL_D='#5a3a2a',HOUSE_ROOF='#2a5236',HOUSE_ROOF_D='#213f2b',HOUSE_BRICK='#62402f',HOUSE_BRICK_L='#6f4b37',HOUSE_TRIM='#3e281c',HOUSE_TRIM_D='#2f1f16',HOUSE_DIM='#6e5232',HOUSE_DIM_W='#5e4630';
  // Mái dốc bốn phía (mái chồng diêm, mái hông): khối cụt chữ nhật, đáy (bx × bz) nửa cạnh, đỉnh (tx × tz), cao h; tx hoặc tz ≈ 0 thành đường nóc.
  function frustumGeo(bx,bz,tx,tz,h,cap=true){const B=[[-bx,0,-bz],[bx,0,-bz],[bx,0,bz],[-bx,0,bz]],T=[[-tx,h,-tz],[tx,h,-tz],[tx,h,tz],[-tx,h,tz]],v=[];
    const q=(a,b,c,d)=>v.push(...a,...b,...c,...a,...c,...d);for(let i=0;i<4;i++){const j=(i+1)%4;q(B[i],T[i],T[j],B[j])}
    if(cap){q(T[3],T[2],T[1],T[0]);}q(B[0],B[1],B[2],B[3]);const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.computeVertexNormals();return g}
  // Biển tên gỗ sẫm viền vàng gắn lên tường (chữ to, căn giữa).
  function plaqueMesh(text,w,h,pc=['#46321e','#c9a86b','#f6e6bc']){const cv=document.createElement('canvas');cv.width=1024;cv.height=Math.round(1024*h/w);const c=cv.getContext('2d');c.fillStyle=pc[0];c.fillRect(0,0,cv.width,cv.height);c.strokeStyle=pc[1];c.lineWidth=10;c.strokeRect(8,8,cv.width-16,cv.height-16);
    c.fillStyle=pc[2];c.textAlign='center';c.textBaseline='middle';let fs=Math.floor(cv.height*.56);c.font='bold '+fs+'px Georgia,serif';const tw=c.measureText(text).width;if(tw>cv.width*.88){fs=Math.floor(fs*cv.width*.88/tw);c.font='bold '+fs+'px Georgia,serif'}c.fillText(text,cv.width/2,cv.height/2+2);
    const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t}))}
  // 3.7/3.12: Nhà hoa lan, a large glasshouse beside Hồ Sắc, as wide as the pond (11 × 11 m), its door turned toward the pond.
  // Its door opens the Viverse scene "ORCHID hoa lan" full screen; the forest stops rendering while it is open.
  const HOUSE_GAP=9;
  const ORCHID={...besidePond('Sắc',HOUSE_GAP,2*POND_R),w:2*POND_R,d:2*POND_R,url:'https://www.viverse.com/YCAbhnT?full3d=&no-cookie=&control_bar=',title:'ORCHID hoa lan | Dong Lan | Redmoon'};
  const ORCHID_DOOR=[ORCHID.x+Math.sin(ORCHID.rot)*(ORCHID.d/2+HOUSE_GAP/2),ORCHID.z+Math.cos(ORCHID.rot)*(ORCHID.d/2+HOUSE_GAP/2)];
  // Bấm Nhà Sắc thì vào không gian bên trong nhà hoa lan (rooms3d.js); Viverse chỉ mở từ Cổng Viverse bên hông.
  const NHA_SAC={id:'nha_hoa_lan',name:'Nhà Sắc · hoa lan',short:'Nhà Sắc',icon:'🌸',x:ORCHID.x,z:ORCHID.z,rot:ORCHID.rot,door:ORCHID_DOOR,note:'House of Sight · sáu dòng lan · Thiền ngắm hoa'};
  // Cổng Viverse: dời ra bên hông Nhà hoa lan, phía lối vào chính (đứng ở cửa nhà nhìn ra Hồ Sắc thì ở bên phải), mặt cổng cùng hướng mặt nhà.
  const VIV={rot:ORCHID.rot,W:6.2,D:1.6};{const ex=-Math.cos(ORCHID.rot),ez=Math.sin(ORCHID.rot),fx=Math.sin(ORCHID.rot),fz=Math.cos(ORCHID.rot);VIV.x=ORCHID.x+ex*(ORCHID.w/2+5)+fx*3;VIV.z=ORCHID.z+ez*(ORCHID.w/2+5)+fz*3;VIV.door=[VIV.x+fx*2.4,VIV.z+fz*2.4]}
  // Tư Gia: bờ đông Hồ Sen, nhìn qua hồ sen và cầu vòm lên tượng Phật. Cùng một toạ độ cho mọi người, mỗi người thấy nhà của mình.
  /* rộng bằng nhà trị liệu (11 × 11 m); mặt nhà cách mép Hồ Sen 16 m, cách Nhà Vị 11 m */const TU_GIA={id:'tu_gia_me',name:'Tư Gia Rừng Yên',icon:'🏡',x:31+16+POND_R,z:.5,W:2*POND_R,D:2*POND_R,note:'Không gian riêng · bàn trà 6 chỗ, Kệ Lưu Hương 9 ô, Góc Gieo Hạt',rot:-Math.PI/2};
  TU_GIA.door=[TU_GIA.x+Math.sin(TU_GIA.rot)*(TU_GIA.D/2+1.4),TU_GIA.z+Math.cos(TU_GIA.rot)*(TU_GIA.D/2+1.4)];TU_GIA.garden=[TU_GIA.x-1,TU_GIA.z+TU_GIA.D/2+3.2];
  const TT_SPOT=[11,-110.5];/* Tịnh thất may y (bản đồ v3.6): phía Tây Nhà Niệm, phía Bắc Đồi Tượng Phật */
  // Nhà Văn Hóa (bản đồ v3.6): 16 × 11 m, phía Tây Nam cạnh Sân đón, cửa quay Bắc ra đường lát đá từ trục chính (z = 16).
  const VAN_HOA={id:'van_hoa',name:'Nhà Văn Hóa',icon:'🏛️',x:-28,z:28.5,W:16,D:11,rot:Math.PI,note:'Community Hall · 36 người · Ca Múa Nhạc, hòa tấu ngũ cung, thả đèn hoa'};
  VAN_HOA.door=[VAN_HOA.x,VAN_HOA.z-(VAN_HOA.D/2+1.9)];const VH_ROAD_Z=16,VH_ROAD_X1=-39;
  let pendingOrchid=false,orchidOpen=false;
  const orchidHouse=new THREE.Group();orchidHouse.position.set(ORCHID.x,terrainHeight(ORCHID.x,ORCHID.z),ORCHID.z);orchidHouse.rotation.y=ORCHID.rot;scene.add(orchidHouse);
  {const W=ORCHID.w,D=ORCHID.d,H=3.8,RISE=2.4,base=.25,solid=[],glassP=[],P=(...a)=>solid.push(HP(...a)),G=(...a)=>glassP.push(HP(...a)),iron=HOUSE_WALL_D,woodC=HOUSE_WALL;
    P(GB(W+.6,base,D+.6),HOUSE_BRICK,0,base/2,0);P(GB(2,.03,D),HOUSE_BRICK_L,0,base+.015,.2);
    for(let i=0;i<=4;i++)for(const z of [-D/2,D/2])P(GB(.1,H,.1),iron,-W/2+i*W/4,base+H/2,z);for(let i=1;i<4;i++)for(const x of [-W/2,W/2])P(GB(.1,H,.1),iron,x,base+H/2,-D/2+i*D/4);
    for(const z of [-D/2,D/2])P(GB(W,.1,.1),iron,0,base+H,z);for(const x of [-W/2,W/2])P(GB(.1,.1,D),iron,x,base+H,0);
    const slope=Math.hypot(W/2,RISE),ang=Math.atan2(RISE,W/2);for(let i=0;i<=4;i++)for(const s of [-1,1])P(GB(slope,.08,.08),iron,s*W/4,base+H+RISE/2,-D/2+i*D/4,{rz:-s*ang});P(GB(.12,.12,D+.2),iron,0,base+H+RISE,0);
    G(new THREE.PlaneGeometry(W,H),'#ffffff',0,base+H/2,-D/2);for(const s of [-1,1]){G(new THREE.PlaneGeometry(D,H),'#ffffff',s*W/2,base+H/2,0,{ry:Math.PI/2});G(new THREE.PlaneGeometry(W/2-1.1,H),'#ffffff',s*(W/4+.55),base+H/2,D/2)}
    G(new THREE.PlaneGeometry(2.2,H-2.7),'#ffffff',0,base+2.7+(H-2.7)/2,D/2);
    for(const s of [-1,1])G(new THREE.PlaneGeometry(slope,D+.2),HOUSE_ROOF,s*W/4,base+H+RISE/2,0,{rx:-Math.PI/2,rz:-s*ang});
    const gab=new THREE.Shape();gab.moveTo(-W/2,0);gab.lineTo(0,RISE);gab.lineTo(W/2,0);gab.lineTo(-W/2,0);for(const z of [-D/2,D/2])G(new THREE.ShapeGeometry(gab),'#ffffff',0,base+H,z);
    for(const s of [-1,1])P(GB(.16,2.7,.16),woodC,s*1.1,base+1.35,D/2+.03);P(GB(2.4,.18,.18),woodC,0,base+2.7,D/2+.03);
    // three long benches (two along the walls, one island in the middle) and hanging baskets along the ridge
    const benches=[[-W/2+.85,0,1.2,D-1.4],[W/2-.85,0,1.2,D-1.4],[0,-1.2,1.6,D/2]];
    for(const [bx,bz,bw,bd] of benches){P(GB(bw,.08,bd),'#6e5a43',bx,base+.85,bz);for(const sx of [-1,1])for(const sz of [-1,1])P(GB(.08,.85,.08),'#5a4836',bx+sx*(bw/2-.1),base+.42,bz+sz*(bd/2-.1))}
    for(let k=0;k<4;k++){const z=-D/2+1.6+k*(D-3.2)/3;P(GC(.04,.04,.7,4),iron,0,base+H+RISE-.5,z);P(GL([[0,0],[.25,.05],[.32,.25]],10),'#6b5238',0,base+H+RISE-1,z);P(new THREE.IcosahedronGeometry(.32,0),'#3f6b48',0,base+H+RISE-.85,z,{s:[1.2,.7,1.2]})}
    P(GB(1,.06,.16),woodC,1.8,base+2.95,D/2+.12);
    orchidHouse.add(new THREE.Mesh(mergeColored(solid),houseMat));
    orchidHouse.add(new THREE.Mesh(mergeColored(glassP),new THREE.MeshStandardMaterial({color:'#d8efe6',vertexColors:true,roughness:.1,metalness:.1,transparent:true,opacity:.2,depthWrite:false,side:THREE.DoubleSide})));
    orchidHouse.add(new THREE.Mesh(new THREE.PlaneGeometry(2.1,2.6),new THREE.MeshBasicMaterial({color:'#8a6a44',transparent:true,opacity:.14,depthWrite:false})).translateY(base+1.3).translateZ(D/2-.05));
    // potted orchids on the benches, instanced: pots, stems, and five blooms per spray in white, pink and violet
    const spots=[];for(const [bx,bz,bw,bd] of benches)for(let ix=0;ix<(bw>1.4?3:2);ix++)for(let iz=0;iz<Math.floor(bd/.62);iz++)spots.push([bx-bw/2+.3+ix*(bw-.6)/((bw>1.4?3:2)-1),bz-bd/2+.35+iz*.62]);
    const potM=new THREE.InstancedMesh(GC(.15,.11,.24,10),mat('#c99b72'),spots.length),stemM=new THREE.InstancedMesh(GC(.012,.015,.6,5),mat('#3c6b45'),spots.length),bloomM=new THREE.InstancedMesh(new THREE.SphereGeometry(.075,8,6),new THREE.MeshStandardMaterial({roughness:.5}),spots.length*5);
    const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),v=new THREE.Vector3(),sc=new THREE.Vector3(1,1,1),cols=['#f7f1f4','#e8a6c4','#a77cc4','#f3d3e2','#f0c6d8'].map(c=>new THREE.Color(c));
    spots.forEach(([x,z],i)=>{m4.compose(v.set(x,base+1.01,z),q,sc.set(1,1,1));potM.setMatrixAt(i,m4);m4.compose(v.set(x,base+1.42,z),q,sc);stemM.setMatrixAt(i,m4);const c=cols[i%cols.length],lean=(i%2?1:-1)*.05;
      for(let f=0;f<5;f++){m4.compose(v.set(x+lean*f,base+1.6+f*.075,z+.05*Math.sin(f+i)),q,sc.set(1.3,.7,1));bloomM.setMatrixAt(i*5+f,m4);bloomM.setColorAt(i*5+f,c)}});
    for(const m of [potM,stemM,bloomM]){m.instanceMatrix.needsUpdate=true;orchidHouse.add(m)}bloomM.instanceColor.needsUpdate=true;
    const cv=document.createElement('canvas');cv.width=512;cv.height=128;const cx=cv.getContext('2d');cx.fillStyle='#3a2b1f';cx.fillRect(0,0,512,128);cx.strokeStyle='#c8a96a';cx.lineWidth=6;cx.strokeRect(6,6,500,116);cx.fillStyle='#f4e2b9';cx.font='bold 58px sans-serif';cx.textAlign='center';cx.textBaseline='middle';cx.fillText('🌸 NHÀ SẮC',256,66);
    const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;const board=new THREE.Mesh(new THREE.PlaneGeometry(2.6,.65),new THREE.MeshBasicMaterial({map:tex,transparent:true}));board.position.set(0,base+3.25,D/2+.12);orchidHouse.add(board);
  }
  // Soft pulsing ring on the ground in front of the door.
  const orchidRing=new THREE.Mesh(new THREE.RingGeometry(.45,.6,40),new THREE.MeshBasicMaterial({color:'#f0cf86',transparent:true,opacity:.5,side:THREE.DoubleSide,depthWrite:false}));orchidRing.rotation.x=-Math.PI/2;orchidRing.position.set(VIV.door[0],terrainHeight(VIV.door[0],VIV.door[1])+.03,VIV.door[1]);scene.add(orchidRing);
  // 3.12: Kiến trúc giác quan rộng bằng đường kính hồ (11 × 11 m), mỗi nhà đặt ở bờ ngoài của hồ,
  // cửa quay ra mặt nước. Phần tĩnh của mỗi nhà gộp thành một khối tô màu theo đỉnh (một lần vẽ); chỉ chuông, khói,
  // hơi trà và bàn xoay là vật thể riêng để chuyển động. Bên trong sẽ mở sau (lớp 2 của khung thiết kế).
  const SENSE_HOUSES=[
    {id:'chuong_gio',lake:'Thanh',name:'Nhà Thanh',short:'Nhà Thanh',board:'NHÀ THANH',icon:'🎐',W:2*POND_R,D:2*POND_R,note:'House of Sound · lắng nghe chuông gió, chuông xoay và chiêng'},
    {id:'xong_huong',lake:'Hương',name:'Nhà Hương · Haromy',board:'NHÀ HƯƠNG · HAROMY',short:'Nhà Hương',icon:'🌿',W:2*POND_R,D:2*POND_R,note:'House of Aroma · Haromy, ngôi nhà của mùi thơm Hạnh phúc · 18 tinh dầu & thảo mộc · Lọ Ước, Túi thơm'},
    {id:'quan_tra',lake:'Vị',name:'Nhà Vị',short:'Nhà Vị',board:'NHÀ VỊ',icon:'🍵',W:2*POND_R,D:2*POND_R,note:'House of Taste · Ngũ Thiên Trà · pha trà 6 bước: Đun nước, Tráng ấm, Cho trà, Hãm trà, Rót trà, Mời trà nhận lời nhắn · chén trà cho cuộc trò chuyện một kèm một'},
    {id:'xuong_gom',lake:'Chạm',name:'Nhà Chạm',short:'Nhà Chạm',board:'NHÀ CHẠM',icon:'🏺',W:2*POND_R,D:2*POND_R,note:'House of Touch · Gốm Bàu Trúc · nặn gốm đi lùi quanh đôn, nung lộ thiên'},
    {id:'nha_niem',lake:'Niệm',name:'Nhà Niệm',short:'Nhà Niệm',icon:'🕯️',W:2*POND_R,D:2*POND_R,noBoard:true,note:'House of Mindfulness · rửa tay ở bồn đá rồi bước qua cửa vòm Trăng'}];
  for(const h of SENSE_HOUSES){Object.assign(h,besidePond(h.lake,HOUSE_GAP,h.D));h.r=Math.hypot(h.W,h.D)/2;h.door=[h.x+Math.sin(h.rot)*(h.D/2+HOUSE_GAP/2),h.z+Math.cos(h.rot)*(h.D/2+HOUSE_GAP/2)]}
  // The 1 m strip between a house front and its pond is walkable, so guests can stand at the door.
  const inFrontStrip=(x,z)=>[ORCHID,...SENSE_HOUSES].some(h=>{const W=h.W||h.w,D=h.D||h.d,dx=x-h.x,dz=z-h.z,c=Math.cos(h.rot),s=Math.sin(h.rot),lx=dx*c-dz*s,lz=dx*s+dz*c;return Math.abs(lx)<W/2-.3&&lz>D/2+.05&&lz<D/2+HOUSE_GAP+.4});
  const houseHit=(x,z,pad)=>SENSE_HOUSES.some(h=>rectHit(h.x,h.z,h.rot,h.W,h.D,x,z,pad))||rectHit(ORCHID.x,ORCHID.z,ORCHID.rot,ORCHID.w,ORCHID.d,x,z,pad);
  const houseAnim=[];
  function nameBoard(g,label,x,z){const cv=document.createElement('canvas');cv.width=512;cv.height=128;const cx=cv.getContext('2d');cx.fillStyle='#3a2b1f';cx.fillRect(0,0,512,128);cx.strokeStyle='#c8a96a';cx.lineWidth=6;cx.strokeRect(6,6,500,116);cx.fillStyle='#f4e2b9';cx.font='bold 50px sans-serif';const fs=Math.min(42,Math.floor(50*380/cx.measureText(label).width));cx.font='bold '+fs+'px sans-serif';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(label,256,66);
    const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;const b=new THREE.Mesh(new THREE.PlaneGeometry(2.4,.6),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide}));b.position.set(x,1.9,z);g.add(b);
    const posts=[];for(const s of [-1,1])posts.push(HP(GC(.06,.07,2.2,6),'#4e3a2a',x+s*1.05,1.1,z-.02));return posts}
  function smokeColumn(g,x,y,z,n,small){const m=new THREE.MeshBasicMaterial({color:small?'#efe9dc':'#d9d4c5',transparent:true,opacity:.22,depthWrite:false});for(let k=0;k<n;k++){const p=new THREE.Mesh(new THREE.SphereGeometry(small?.07+k*.02:.14+k*.04,8,6),m.clone());p.position.set(x,y,z);g.add(p);houseAnim.push({kind:'smoke',obj:p,x,y,z,k,small})}}
  // 3.41: Mẫu nhà chung (theo ảnh phối cảnh chị gửi): nhà một tầng mái ngói xanh rêu, tường kem, cột và khung gỗ, hiên đá có bậc,
  // cửa gỗ ô kính hai cánh mở hé thấy bên trong ấm, cửa sổ lưới sáng, đèn lồng treo, đèn đá ở bậc, lối đá tròn, oải hương,
  // cẩm tú cầu trắng, dương xỉ, đá. Phần tĩnh gộp thành 2 khối (một khối tô màu theo đỉnh + một khối phát sáng), không thêm đèn thật.
  const CT={roof:HOUSE_ROOF,roofD:HOUSE_ROOF_D,ridge:'#1b3424',wood:HOUSE_TRIM,woodD:HOUSE_TRIM_D,cream:HOUSE_WALL,stone:HOUSE_BRICK,stoneL:HOUSE_BRICK_L,glow:HOUSE_DIM,glowW:HOUSE_DIM_W};/* 26/11: mái lá thông, tường và gạch thân thông, ô cửa ấm trầm (không sáng) */
  function ctIcon(c,kind,x,y,s,col){c.save();c.translate(x,y);c.scale(s,s);c.strokeStyle=col;c.fillStyle=col;c.lineWidth=3.2/s*s/1;c.lineJoin='round';
    if(kind==='lotus'){const pet=(a,l,w)=>{c.save();c.rotate(a);c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(w,-l*.55,0,-l);c.quadraticCurveTo(-w,-l*.55,0,0);c.stroke();c.restore()};pet(0,40,13);pet(-.55,34,11);pet(.55,34,11);pet(-1.1,24,9);pet(1.1,24,9);c.beginPath();c.moveTo(-26,4);c.quadraticCurveTo(0,14,26,4);c.stroke()}
    else if(kind==='leaf'){c.beginPath();c.moveTo(0,22);c.quadraticCurveTo(24,-4,0,-34);c.quadraticCurveTo(-24,-4,0,22);c.stroke();c.beginPath();c.moveTo(0,26);c.lineTo(0,-26);c.stroke();for(const y of [-14,-2,10]){c.beginPath();c.moveTo(0,y);c.lineTo(9,y-8);c.moveTo(0,y);c.lineTo(-9,y-8);c.stroke()}}
    else if(kind==='pot'){c.beginPath();c.moveTo(-9,-30);c.lineTo(9,-30);c.quadraticCurveTo(8,-22,15,-16);c.quadraticCurveTo(30,0,16,22);c.lineTo(-16,22);c.quadraticCurveTo(-30,0,-15,-16);c.quadraticCurveTo(-8,-22,-9,-30);c.fill();c.fillStyle='#3a2b1f';c.beginPath();c.arc(0,0,6,0,Math.PI*2);c.fill()}
    c.restore()}
  function ctSign(title,sub,icon,w,h){const cv=document.createElement('canvas');cv.width=512;cv.height=Math.round(512*h/w);const c=cv.getContext('2d'),H=cv.height;
    const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#5a3e28');g.addColorStop(1,'#3e2a1a');c.fillStyle=g;c.fillRect(0,0,512,H);c.strokeStyle='#c9a46a';c.lineWidth=5;c.strokeRect(9,9,494,H-18);
    const ix=icon?H*.62:0;if(icon)ctIcon(c,icon,ix,H*.55,H/150,'#e9cf98');c.fillStyle='#f4e2b9';c.textAlign='center';c.textBaseline='middle';const cx=icon?(ix+H*.3+512)/2:256;
    let fs=Math.round(H*(sub?.34:.42));c.font='bold '+fs+'px serif';while(c.measureText(title).width>512-ix-H*.5&&fs>14){fs-=2;c.font='bold '+fs+'px serif'}c.fillText(title,cx,H*(sub?.4:.53));
    if(sub){c.font=Math.round(H*.17)+'px serif';c.fillStyle='#e2cfa6';c.fillText(sub,cx,H*.74)}
    const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}))}
  function ctBanner(icon){const cv=document.createElement('canvas');cv.width=96;cv.height=192;const c=cv.getContext('2d');c.fillStyle='#9c8a6c';c.fillRect(0,0,96,192);c.fillStyle='#8a785c';for(let i=0;i<5;i++)c.fillRect(8+i*20,0,8,10);c.strokeStyle='#6e5232';c.lineWidth=2;c.strokeRect(5,14,86,172);ctIcon(c,icon,48,112,.9,'#5a3e26');
    const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;return new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide})}
  const ctBannerGeo=new THREE.PlaneGeometry(.62,1.24);
  // o: {W,D,bw,bd,open,gable,sign:[title,sub,icon,where],banners,pergola,porch(P,G,ctx),pond:[x,z,r],plants}
  function cottage(g,o){const parts=[],glows=[],P=(...a)=>parts.push(HP(...a)),G=(...a)=>glows.push(HP(...a)),W=o.W,D=o.D,bw=o.bw||7,pb=.45,WH=2.75,top=pb+WH;
    const pz=D/2-1.15,zf=pz-2.05,zb=Math.max(-D/2+.6,zf-(o.bd||4.2)),bcz=(zf+zb)/2,bd=zf-zb;
    // nền đá + hiên + bậc
    P(GB(bw+1.5,pb,pz-zb+.6),CT.stone,0,pb/2,(pz+zb-.6)/2);P(GB(bw+1.6,.06,pz-zb+.7),CT.stoneL,0,pb+.03,(pz+zb-.6)/2);
    for(let i=0;i<3;i++){const h=pb*(3-i)/3;P(GB(2.7-i*.1,h,.34),i%2?CT.stone:CT.stoneL,0,h/2,pz+.17+i*.34)}
    for(let i=0;i<9;i++)P(GB(bw+1.3,.012,.02),HOUSE_TRIM,0,pb+.065,pz-.25-i*.24);/* ván hiên */
    // tường kem, cột, khung gỗ
    P(GB(bw,WH,.18),CT.cream,0,pb+WH/2,zb);for(const s of [-1,1])P(GB(.18,WH,bd),CT.cream,s*bw/2,pb+WH/2,bcz);
    const dw=o.open?bw-.4:1.7,dh=2.3;
    if(!o.open){for(const s of [-1,1])P(GB((bw-dw)/2,WH,.18),CT.cream,s*(dw/2+(bw-dw)/4),pb+WH/2,zf);P(GB(dw,WH-dh,.18),CT.cream,0,pb+dh+(WH-dh)/2,zf);
      P(GB(dw+.24,.14,.24),CT.woodD,0,pb+dh+.07,zf+.02);for(const s of [-1,1])P(GB(.12,dh,.24),CT.woodD,s*(dw/2+.06),pb+dh/2,zf+.02);
      // hai cánh cửa gỗ ô kính mở ra hiên
      const a=1.2,lw=dw/2;for(const s of [-1,1]){const hx=s*dw/2,dx=-s*Math.cos(a),dz=Math.sin(a),cx=hx+dx*lw/2,cz=zf+.08+dz*lw/2,ry=s>0?Math.PI+a:-a;
        P(GB(lw,dh-.04,.06),CT.wood,cx,pb+dh/2,cz,{ry});const ox=Math.sin(ry)*-.035,oz=Math.cos(ry)*-.035;G(GB(lw-.22,dh-.9,.02),HOUSE_DIM,cx-oz*0+ox*0,pb+1.32,cz,{ry});
        for(const k of [-1,0,1])P(GB(.03,dh-.9,.08),CT.woodD,cx+Math.cos(ry)*k*(lw-.22)/3*.5*2/2,pb+1.32,cz-Math.sin(ry)*k*(lw-.22)/3,{ry});for(const y of [.95,1.4,1.85])P(GB(lw-.22,.03,.08),CT.woodD,cx,pb+y,cz,{ry})}
      // bên trong ấm: vách sau phát sáng, sàn, bàn thấp, kệ đèn
      G(GB(dw+.6,dh+.2,.02),CT.glowW,0,pb+dh/2+.05,zf-1.9);P(GB(dw+.6,.02,1.9),'#5e3f2c',0,pb+.01,zf-.95);P(GB(1.1,.08,.6),CT.woodD,0,pb+.62,zf-1.1);for(const s of [-1,1])P(GB(.08,.58,.5),CT.woodD,s*.45,pb+.31,zf-1.1);
      for(const s of [-1,1]){P(GB(.55,1.5,.25),CT.woodD,s*.95,pb+.95,zf-1.75);for(const y of [.55,.95,1.35])P(GB(.42,.12,.04),'#6e4a30',s*.95,pb+y,zf-1.62)}
      // cửa sổ lưới sáng ấm hai bên
      for(const s of [-1,1]){const wx=s*(dw/2+(bw-dw)/4),wy=pb+1.5;G(GB(1.05,1,.02),CT.glow,wx,wy,zf+.1);P(GB(1.25,.1,.12),CT.woodD,wx,wy+.55,zf+.12);P(GB(1.25,.1,.12),CT.woodD,wx,wy-.55,zf+.12);for(const k of [-1,1])P(GB(.1,1.2,.12),CT.woodD,wx+k*.58,wy,zf+.12);
        for(const k of [-1,1]){P(GB(.03,1,.06),CT.woodD,wx+k*.18,wy,zf+.13);P(GB(1.05,.03,.06),CT.woodD,wx,wy+k*.17,zf+.13)}P(GB(.03,1,.06),CT.woodD,wx+.53*0,wy,zf+.13)}}
    else{/* mặt trước mở (Nhà Chạm): vách sau và hai bên bằng gỗ, sàn gỗ ấm */P(GB(bw-.2,.02,bd-.2),'#6a4630',0,pb+.07,bcz)}
    const posts=[[-bw/2-.45,pz-.2],[bw/2+.45,pz-.2],[-1.3,pz-.2],[1.3,pz-.2],[-bw/2-.45,zb-.1],[bw/2+.45,zb-.1]];if(o.open){posts.splice(2,2)}
    for(const [x,z] of posts)P(GB(.24,WH+.1,.24),CT.wood,x,pb+(WH+.1)/2,z);
    P(GB(bw+1.3,.22,.26),CT.woodD,0,top,pz-.2);P(GB(bw+1.3,.22,.26),CT.woodD,0,top,zb-.1);for(const s of [-1,1])P(GB(.26,.22,pz-zb),CT.woodD,s*(bw/2+.45),top,(pz+zb)/2-.05);
    for(const s of [-1,1])P(GB(.18,.18,pz-zf),CT.wood,s*1.3,top-.14,(pz+zf)/2);/* xà hiên */
    // mái ngói xanh rêu: tầng dưới chụp bốn mái, tầng trên đầu hồi nan gỗ (gable) hoặc chóp (hip)
    const rx=bw/2+1.25,rz=(pz-zb)/2+1.05,rc=(pz+zb)/2-.05,rh=1.15;P(GB(rx*2+.1,.12,rz*2+.1),CT.roofD,0,top+.17,rc);
    P(frustumGeo(rx,rz,rx-1.55,rz-1.45,rh),CT.roof,0,top+.2,rc);for(let i=1;i<5;i++){const u=i/5;P(GB((rx-1.55*u)*2+.02,.035,.04),CT.roofD,0,top+.2+rh*u,rc+(rz-1.45*u)+.01)}
    const ux=rx-1.55,uz=rz-1.45,y2=top+.2+rh;
    if(o.gable!==false){const gr=1.15,sl=Math.hypot(ux,gr),ang=Math.atan2(gr,ux);for(const s of [-1,1])P(GB(sl+.25,.14,uz*2+.5),CT.roof,s*ux/2,y2+gr/2+.04,rc,{rz:-s*ang});P(GB(.22,.2,uz*2+.6),CT.ridge,0,y2+gr+.1,rc);
      const tri=new THREE.Shape();tri.moveTo(-ux+.15,0);tri.lineTo(0,gr-.05);tri.lineTo(ux-.15,0);tri.lineTo(-ux+.15,0);for(const z of [rc+uz-.05,rc-uz+.05])P(new THREE.ShapeGeometry(tri),HOUSE_WALL_D,0,y2,z,{ry:z<rc?Math.PI:0});
      for(let k=-6;k<=6;k++){const x=k*(ux-.2)/6.5,hh=(gr-.1)*(1-Math.abs(x)/ux);if(hh>.08)P(GB(.07,hh,.06),CT.woodD,x,y2+hh/2,rc+uz-.02)}P(GB(ux*2,.1,.1),CT.woodD,0,y2+.04,rc+uz)}
    else{P(frustumGeo(ux,uz,.25,.2,1.3),CT.roof,0,y2,rc);P(GC(.12,.2,.38,8),CT.stoneL,0,y2+1.45,rc);P(new THREE.SphereGeometry(.12,8,6),CT.stoneL,0,y2+1.7,rc)}
    // 26/11: rừng thông không có đèn (chị dặn): bỏ đèn lồng treo ở cột và đèn đá hai bên bậc.
    const lant=()=>{},stoneLamp=()=>{};
    // lối đá tròn từ bậc ra ngoài
    for(let i=0;i<5;i++){const r=.38+((i*7)%3)*.05;P(GC(r,r+.02,.06,12),i%2?'#7d7362':'#71685a',Math.sin(i*1.9)*.35,.03,D/2+.25+i*.72)}
    // cây cỏ: oải hương, cẩm tú cầu trắng, dương xỉ, đá
    const lav=(x,z,n=7)=>{for(let k=0;k<n;k++){const a=k*2.4,r=.08+(k%3)*.1,xx=x+Math.cos(a)*r,zz=z+Math.sin(a)*r,h=.45+(k%3)*.1;P(GC(.008,.012,h,4),'#5f8a4a',xx,h/2,zz);P(GK(.045,.22,5),k%2?'#8b6cc0':'#9d80d2',xx,h+.08,zz)}};
    const hyd=(x,z,n=4)=>{for(let k=0;k<n;k++){const a=k*1.7,xx=x+Math.cos(a)*.28,zz=z+Math.sin(a)*.28;P(new THREE.IcosahedronGeometry(.2,0),'#4f7a3e',xx,.2,zz,{s:[1.3,.7,1.3]});P(new THREE.IcosahedronGeometry(.17,1),'#f4f1e6',xx,.48+(k%2)*.08,zz)}};
    const fern=(x,z)=>{for(let k=0;k<5;k++){const a=k*1.25;P(GK(.07,.6,4),'#5d9a45',x+Math.cos(a)*.18,.24,z+Math.sin(a)*.18,{rx:Math.sin(a)*.9,rz:-Math.cos(a)*.9})}};
    const rock=(x,z,s)=>P(new THREE.DodecahedronGeometry(s,0),'#a39c8c',x,s*.45,z,{s:[1.3,.75,1]});
    for(const s of [-1,1]){lav(s*2.4,pz+.6);lav(s*3.1,pz+.95,5);fern(s*(W/2-.7),pz+.7);rock(s*(W/2-1.4),D/2-.4,.32)}
    hyd(-W/2+1.2,pz-.2);hyd(W/2-1.2,pz-.2,3);if(o.plants)o.plants({lav,hyd,fern,rock,P,G});
    // biển gỗ, cờ vải, giàn gỗ
    if(o.sign){const [t,sub,ic,where]=o.sign;let sg;if(where==='post'){sg=ctSign(t,sub,ic,2.1,.62);sg.position.set(W/2-1.25,1.25,D/2-.55);for(const s of [-1,1])P(GB(.1,1.6,.1),CT.woodD,W/2-1.25+s*.98,.8,D/2-.58)}
      else{sg=ctSign(t,sub,ic,2.2,.6);sg.position.set(0,top-.42,pz+.03);P(GB(2.32,.7,.06),CT.woodD,0,top-.42,pz-.01);for(const s of [-.8,.8])P(GB(.03,.2,.03),'#2a2018',s,top-.03,pz)}g.add(sg)}
    if(o.pergola)for(const s of [-1,1]){const x=s*(bw/2+1.35);for(const z of [pz-.4,zf-1.4])P(GB(.16,2.6,.16),CT.wood,x,1.3,z);P(GB(.14,.14,pz-zf+1.6),CT.woodD,x,2.6,(pz+zf-1.8)/2);for(let k=0;k<4;k++)P(GB(.9,.08,.08),CT.woodD,x-s*.35,2.72,zf-1.2+k*((pz-zf+1)/3))}
    if(o.banners){const m=ctBanner(o.banners);const spots=o.pergola?[[-1,.35],[-1,-.45],[1,.35],[1,-.45]].map(([s,dz])=>[s*(bw/2+1.35),pz-.9+dz*1.6,Math.PI/2]):[[-bw/2-.45,pz+.0,0],[bw/2+.45,pz+.0,0]];
      for(const [x,z,ry] of spots){const b=new THREE.Mesh(ctBannerGeo,m);b.position.set(x+(ry?0:Math.sign(x)*-.0),o.pergola?1.85:pb+1.85,z+(ry?0:.16));b.rotation.y=ry;g.add(b)}}
    if(o.pond){const [x,z,r]=o.pond;P(GC(r+.18,r+.22,.14,20),CT.stone,x,.07,z);const w=new THREE.Mesh(new THREE.CircleGeometry(r,24),new THREE.MeshStandardMaterial({color:'#4f8288',roughness:.15,metalness:.2}));w.rotation.x=-Math.PI/2;w.position.set(x,.13,z);g.add(w);
      for(let k=0;k<5;k++){const a=k*1.3,rr=r*.55;P(GC(.2,.2,.015,10),'#5b9a4a',x+Math.cos(a)*rr,.14,z+Math.sin(a)*rr)}for(const [a,rr] of [[.6,.35],[2.9,.55]]){const fx=x+Math.cos(a)*r*rr,fz=z+Math.sin(a)*r*rr;for(let k=0;k<6;k++)P(GK(.05,.16,4),k%2?'#f2a8c0':'#f7c6d6',fx+Math.cos(k)*.05,.24,fz+Math.sin(k)*.05,{rx:Math.sin(k)*.5,rz:-Math.cos(k)*.5})}}
    if(o.porch)o.porch({P,G,pb,pz,zf,zb,bw,top,lant,lav,hyd,fern,rock,stoneLamp});
    g.add(new THREE.Mesh(mergeColored(parts),houseMat));if(glows.length)g.add(new THREE.Mesh(mergeColored(glows),new THREE.MeshBasicMaterial({vertexColors:true})));
    return {pb,pz,zf,zb,bw,top}}
  function buildSenseHouse(h){const g=new THREE.Group(),parts=[],W=h.W,D=h.D,P=(...a)=>parts.push(HP(...a));
    const stoneC=HOUSE_BRICK,dark=HOUSE_WALL_D,warm=HOUSE_WALL;
    if(h.id==='chuong_gio'){// large bamboo pavilion: thatched pyramid roof, split-bamboo back screen, wind chimes all round the eaves,
      // singing bowls on a low table, a hanging gong, and a half ring of cushions for sound meditation
      const base=.35,PH=3.7,top=base+PH,bam=HOUSE_WALL,node=HOUSE_WALL_D;
      P(GB(W+.4,base,D+.4),stoneC,0,base/2,0);for(let i=0;i<9;i++)P(GB(W-.2,.04,.92),i%2?'#6b5238':'#73583c',0,base+.02,-D/2+.55+i*.99);
      const posts=[];for(const x of [-W/2+.3,-W/6,W/6,W/2-.3])for(const z of [-D/2+.3,D/2-.3])posts.push([x,z]);for(const z of [-D/6,D/6])for(const x of [-W/2+.3,W/2-.3])posts.push([x,z]);
      for(const [x,z] of posts){P(GC(.13,.15,PH,7),bam,x,base+PH/2,z);for(const y of [1.1,2.2,3.2])P(GC(.155,.155,.06,7),node,x,base+y,z)}
      for(const z of [-D/2+.3,D/2-.3])P(GC(.1,.1,W-.4,6),bam,0,top,z,{rz:Math.PI/2});for(const x of [-W/2+.3,W/2-.3])P(GC(.1,.1,D-.4,6),bam,x,top,0,{rx:Math.PI/2});
      P(GK(W*.84,.3,4),HOUSE_ROOF_D,0,top+.15,0,{ry:Math.PI/4});P(GK(W*.8,3.4,4),HOUSE_ROOF,0,top+1.95,0,{ry:Math.PI/4});P(GC(.08,.16,.7,6),HOUSE_ROOF_D,0,top+3.9,0);
      for(let i=0;i<38;i++)P(GC(.06,.06,PH-.2,5),i%2?bam:node,-W/2+.5+i*((W-1)/37),base+(PH-.2)/2,-D/2+.32);
      for(const s of [-1,1])for(const y of [.6,1])P(GC(.05,.05,D-.8,5),bam,s*(W/2-.3),base+y,0,{rx:Math.PI/2});
      P(GB(2.6,.4,1.2),dark,0,base+.2,-1.8);[[-.85,.22],[0,.3],[.85,.25]].forEach(([x,r])=>P(GL([[0,0],[r*.6,.02],[r,.13],[r*1.05,.19]],14),'#b88d45',x,base+.4,-1.8));
      P(GB(.14,2.4,.14),dark,-3.6,base+1.2,-3.3);P(GB(.14,2.4,.14),dark,-1.8,base+1.2,-3.3);P(GB(2,.14,.14),dark,-2.7,base+2.4,-3.3);P(GC(.65,.65,.07,20),'#a8823e',-2.7,base+1.45,-3.3,{rx:Math.PI/2});P(GC(.18,.18,.09,12),'#7a5c2a',-2.7,base+1.45,-3.25,{rx:Math.PI/2});
      for(let k=0;k<7;k++){const a=-1.05+k*.35,x=Math.sin(a)*2.9,z=-1.8+Math.cos(a)*2.7;P(GC(.32,.34,.15,12),'#6e4a33',x,base+.08,z)}
      const metal=new THREE.MeshStandardMaterial({color:'#c2b38a',metalness:.6,roughness:.35}),chimeParts=[[GC(.16,.16,.04,10),'#6b4a32',0,0,0]];
      for(let k=0;k<6;k++){const a=k*1.047,len=.45+k*.1;chimeParts.push([GC(.022,.022,len,6),'#ffffff',Math.cos(a)*.11,-.06-len/2,Math.sin(a)*.11])}chimeParts.push([GC(.07,.07,.025,8),'#6b4a32',0,-.75,0]);
      const chimeGeo=mergeColored(chimeParts.map(([geo,c,x,y,z])=>HP(geo,c,x,y,z)));
      const spots=[];for(let i=0;i<5;i++)spots.push([-W/2+1+i*(W-2)/4,D/2+.35]);for(const s of [-1,1])for(const z of [-D/4,D/4])spots.push([s*(W/2+.35),z]);for(const x of [-W/4,W/4])spots.push([x,-D/2-.35]);
      spots.forEach(([x,z])=>{const c=new THREE.Mesh(chimeGeo,metal);c.position.set(x,top-.05,z);g.add(c);houseAnim.push({kind:'chime',obj:c,phase:x*1.7+z})});
    }else if(h.id==='xong_huong'){/* 3.41: mặt tiền mới theo ảnh phối cảnh Nhà Hương · Haromy */h.noBoard=true;
      cottage(g,{W,D,bw:7,bd:4.2,sign:['NHÀ HƯƠNG - HAROMY','','leaf','post'],banners:'leaf',pergola:true,porch:({P,pb,pz,lav})=>{
        for(const s of [-1,1]){const x=s*2.15,z=pz-.7;P(GL([[0,0],[.26,.02],[.36,.22],[.3,.42],[.32,.48]],12),'#7e6048',x,pb,z);P(GC(.29,.29,.03,12),'#5a4632',x,pb+.46,z);lav(x,z,9)}
        P(GL([[0,0],[.22,.02],[.34,.2],[.3,.4],[.16,.48],[.18,.52]],12),'#a8673e',3.0,pb,pz-.45);P(GC(.06,.06,.08,6),'#5a3a26',3.0,pb+.18,pz-.1);}});
      smokeColumn(g,3.0,.45+.65,D/2-1.15-.45,6,true);
    }else if(h.id==='quan_tra'){// raised open tea pavilion: two tea tables (one-to-one sessions), a back counter with tea jars, low railings, tea bushes
      const deck=.5,PH=3.3,top=deck+PH;
      P(GB(W,deck,D),warm,0,deck/2,0);for(let i=-5;i<=5;i++)P(GB(.04,.02,D),dark,i*.9,deck+.01,0);P(GB(2.6,.25,.7),stoneC,0,.125,D/2+.35);
      for(const x of [-W/2+.25,0,W/2-.25])for(const z of [-D/2+.25,D/2-.25]){if(x===0&&z>0)continue;/* 27/11: bỏ cột giữa mặt tiền, chừa lối lên bậc thềm */P(GC(.16,.18,PH,8),dark,x,deck+PH/2,z)}for(const x of [-W/2+.25,W/2-.25])P(GC(.16,.18,PH,8),dark,x,deck+PH/2,0);
      for(const s of [-1,1]){P(GB(.1,.1,D-.5),dark,s*(W/2-.25),deck+.7,0);for(let k=0;k<9;k++)P(GB(.06,.7,.06),dark,s*(W/2-.25),deck+.35,-D/2+.8+k*(D-1.6)/8)}
      P(GB(W-.5,.1,.1),dark,0,deck+.7,-D/2+.25);for(const s of [-1,1])P(GB(W/2-1.6,.1,.1),dark,s*(W/4+.65),deck+.7,D/2-.25);
      P(GB(W+.4,.2,D+.4),dark,0,top+.1,0);P(GK(W*.86,.3,4),HOUSE_ROOF_D,0,top+.3,0,{ry:Math.PI/4});P(GK(W*.82,2.9,4),HOUSE_ROOF,0,top+1.85,0,{ry:Math.PI/4});P(GC(.06,.14,.6,6),'#5e4630',0,top+3.5,0);
      P(GB(4.4,1,.7),dark,0,deck+.5,-D/2+.8);for(let k=0;k<6;k++)P(GL([[0,0],[.14,.02],[.17,.18],[.1,.32],[.11,.36]],10),['#5d4636','#8a6a48','#3f5f52'][k%3],-1.8+k*.72,deck+1,-D/2+.8);
      {/* 27/11: một bàn trà lớn 6 người khớp nội thất (2 trước, 2 sau, 2 đầu bàn), ấm giữa bàn, 6 chén */const tz=.5,TW=2.8,TD=1.4;
        P(GB(TW,.38,TD),'#3e2c20',0,deck+.19,tz);P(GB(TW+.08,.05,TD+.08),'#4b3526',0,deck+.4,tz);
        P(GC(.17,.19,.28,12),'#5d4636',0,deck+.56,tz);P(GC(.025,.04,.24,6),'#5d4636',.2,deck+.6,tz,{rz:-1});
        for(const [cx,cz] of [[-.75,-.35],[.75,-.35],[-.75,.35],[.75,.35],[-1.15,0],[1.15,0]])P(GC(.06,.05,.08,10),'#e8e0cc',cx,deck+.465,tz+cz);
        for(const [cx,cz] of [[-.65,-1.25],[.65,-1.25],[-.65,1.25],[.65,1.25],[-2.05,0],[2.05,0]])P(GC(.38,.4,.16,14),'#6e4a33',cx,deck+.08,tz+cz);
        smokeColumn(g,.05,deck+.8,tz,4,true)}
      for(let k=0;k<6;k++)P(new THREE.IcosahedronGeometry(.5,0),'#2f5a3a',-W/2-1.1,.35,-D/2+1+k*1.6,{s:[1,.7,1]});for(let k=0;k<6;k++)P(new THREE.IcosahedronGeometry(.5,0),'#34603e',W/2+1.1,.35,-D/2+1+k*1.6,{s:[1,.7,1]});
    }else if(h.id==='nha_niem'){// Nhà Niệm (bản vẽ ngoại thất v3.6): bệ đá 0,45 m, tường vôi, hai mảng lam gỗ dọc, cửa vòm Trăng ở giữa
      // nhìn thẳng vào Đèn Thở, 4 cột gỗ mặt tiền, bồn đá Gột bụi bên trái, chuông gió tre bên phải, mái bốn dốc xanh rêu mở giếng trời tròn.
      const pb=.45,WH=3.4,top=pb+WH,lime=HOUSE_WALL,timber=HOUSE_WALL_D,slat='#7a5a3e',roofC=HOUSE_ROOF,roofD=HOUSE_ROOF_D,wt=.26,fz=D/2-.3;
      P(GB(W+.9,.2,D+.9),'#4a3124',0,.1,0);P(GB(W+.4,pb,D+.4),HOUSE_BRICK,0,pb/2,0);P(GB(3,.2,.9),HOUSE_BRICK_L,0,.1,D/2+.62);/* bậc đá thấp trước cửa */
      // tường: sau và hai bên là khối đặc, mặt tiền là tấm có lỗ tròn
      P(GB(W-.6,WH,wt),lime,0,pb+WH/2,-D/2+.3+wt/2);for(const sx of [-1,1])P(GB(wt,WH,D-.6),lime,sx*(W/2-.3-wt/2),pb+WH/2,0);
      const MR=1.5,MY=1.64;{const sh=new THREE.Shape();sh.moveTo(-(W-.6)/2,0);sh.lineTo((W-.6)/2,0);sh.lineTo((W-.6)/2,WH);sh.lineTo(-(W-.6)/2,WH);sh.lineTo(-(W-.6)/2,0);
        const hole=new THREE.Path();hole.absarc(0,MY,MR,0,Math.PI*2,true);sh.holes.push(hole);const eg=new THREE.ExtrudeGeometry(sh,{depth:wt,bevelEnabled:false,curveSegments:36});P(eg,lime,0,pb,fz-wt)}
      P(new THREE.TorusGeometry(MR+.06,.12,8,44),'#24190f',0,pb+MY,fz+.03);P(new THREE.TorusGeometry(MR-.04,.025,4,44),'#a6824b',0,pb+MY,fz+.1);
      for(const y of [.95,1.85,2.75]){P(GB(W-.62,.03,.02),'#2c2218',0,pb+y,-D/2+.3-.01);for(const sx of [-1,1])P(GB(.02,.03,D-.62),'#2c2218',sx*(W/2-.3+.01),pb+y,0)}/* đường ván gỗ */
      P(GB(3.5,.16,wt+.3),'#2f2216',0,pb+.08,fz-wt/2);/* ngưỡng gỗ */
      P(GB(W-1.2,.04,D-1.2),'#5a452f',0,pb+.02,0);/* sàn gỗ trong nhà */
      // hai mảng lam gỗ dọc lọc nắng ở mặt tiền và giữa mỗi vách bên
      const louver=(cx,cz,ry,w)=>{const c=Math.cos(ry),sn=Math.sin(ry),at=(lx,lz)=>[cx+lx*c+lz*sn,cz-lx*sn+lz*c];{const [x,z]=at(0,0);P(GB(w,2.75,.05),'#2a2118',x,pb+1.68,z,{ry})}
        P(GB(w+.12,.1,.12),slat,...[at(0,.04)].map(([x,z])=>[x,pb+.3,z])[0],{ry});P(GB(w+.12,.1,.12),slat,...[at(0,.04)].map(([x,z])=>[x,pb+3.06,z])[0],{ry});
        for(let k=0;k<7;k++){const [x,z]=at(-w/2+.12+k*(w-.24)/6,.06);P(GB(.08,2.7,.1),slat,x,pb+1.68,z,{ry})}};
      louver(-3.4,fz+.04,0,2.4);louver(3.4,fz+.04,0,2.4);for(const sx of [-1,1])louver(sx*(W/2-.3+.04),0,sx*Math.PI/2,3.2);louver(0,-D/2+.3-.04,Math.PI,3.2);
      // 4 cột gỗ mặt tiền + 2 cột góc sau
      for(const x of [-(W/2-.25),-2.05,2.05,W/2-.25])P(GB(.36,WH,.36),timber,x,pb+WH/2,fz+.12);for(const x of [-(W/2-.25),W/2-.25])P(GB(.36,WH,.36),timber,x,pb+WH/2,-D/2+.35);
      // xà diềm mái, biển tên
      P(GB(W+.9,.38,D+.9),'#261c13',0,top+.19,0);
      // mái bốn dốc xanh rêu, đỉnh cụt mở giếng trời tròn (Oculus R 1,8 m) viền đồng
      {/* 3.41: mái ngói xanh rêu hai tầng như các nhà khác: tầng dưới bốn dốc có lằn ngói, tầng trên chóp bốn dốc nâng cao, đỉnh búp đá */const rc=roofC,rd=roofD,y1=top+.38,rx=W/2+1.15,h1=1.5,tx=W/2-1.9;
        P(frustumGeo(W/2+1.2,D/2+1.2,W/2+1.15,D/2+1.15,.12),rd,0,top+.3,0);P(frustumGeo(rx,rx,tx,tx,h1),rc,0,y1,0);for(let i=1;i<6;i++){const u=i/6,e=rx-(rx-tx)*u;for(const sg of [-1,1]){P(GB(e*2,.035,.04),rd,0,y1+h1*u,sg*(e+.01));P(GB(.04,.035,e*2),rd,sg*(e+.01),y1+h1*u,0)}}
        P(GB(tx*2-.2,.5,tx*2-.2),timber,0,y1+h1+.25,0);P(frustumGeo(tx+.35,tx+.35,.3,.3,2.1),rc,0,y1+h1+.5,0);for(let i=1;i<5;i++){const u=i/5,e=tx+.35-(tx+.05)*u;for(const sg of [-1,1]){P(GB(e*2,.035,.04),rd,0,y1+h1+.5+2.1*u,sg*(e+.01));P(GB(.04,.035,e*2),rd,sg*(e+.01),y1+h1+.5+2.1*u,0)}}
        P(GC(.14,.22,.4,8),HOUSE_BRICK_L,0,y1+h1+2.8,0);P(new THREE.SphereGeometry(.14,8,6),HOUSE_BRICK_L,0,y1+h1+3.08,0)}
      const ry0=top+.38+1.75;
      // bồn đá Gột bụi bên trái hiên, chuông gió tre treo ở diềm phải
      P(GB(.42,.62,.42),'#4d4a43',-3.6,.31,D/2+1.05);P(GC(.36,.28,.16,12),'#3e3c36',-3.6,.7,D/2+1.05);P(GC(.27,.27,.02,12),'#638e94',-3.6,.785,D/2+1.05);
      {const ch=new THREE.Group();ch.position.set(3.4,top-.02,fz+.45);const cp=[];cp.push(HP(GC(.015,.015,.3,4),'#8b6e46',0,-.15,0),HP(GB(.4,.04,.04),'#8b6e46',0,-.31,0));
        [[-.14,.62],[-.05,.8],[.05,.7],[.14,.55]].forEach(([x,l])=>cp.push(HP(GC(.025,.025,l,6),'#b89a5e',x,-.33-l/2,0)));ch.add(new THREE.Mesh(mergeColored(cp),houseMat));g.add(ch);houseAnim.push({kind:'chime',obj:ch,phase:1.3})}
      // ánh sáng ấm bên trong: vách sau phát sáng, mặt kính giếng trời, Đèn Thở thở theo nhịp 4-4
      {const cv=document.createElement('canvas');cv.width=cv.height=128;const c=cv.getContext('2d'),gr=c.createRadialGradient(64,70,4,64,70,70);gr.addColorStop(0,'#a8824e');gr.addColorStop(.48,'#6e4e2e');gr.addColorStop(1,'#2b2014');/* 26/11: vách trong ấm trầm, không sáng */c.fillStyle=gr;c.fillRect(0,0,128,128);
        const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;const back=new THREE.Mesh(new THREE.PlaneGeometry(W-1.2,WH-.1),new THREE.MeshBasicMaterial({map:t}));back.position.set(0,pb+WH/2,-D/2+.3+wt+.02);g.add(back);
        const glass=new THREE.Mesh(new THREE.CircleGeometry(1.92,40),new THREE.MeshBasicMaterial({color:'#f2e4c2',side:THREE.DoubleSide}));glass.rotation.x=-Math.PI/2;glass.position.y=ry0+.24;/* 3.41: mái mới che kín, bỏ kính giếng trời */
        const lamp=new THREE.Mesh(new THREE.SphereGeometry(.42,24,16),new THREE.MeshBasicMaterial({color:'#fff7d9',transparent:true,opacity:.9}));lamp.position.set(0,pb+1.15,-.6);g.add(lamp);
        const halo=new THREE.Mesh(new THREE.SphereGeometry(.75,24,16),new THREE.MeshBasicMaterial({color:'#f0cc7a',transparent:true,opacity:.25,depthWrite:false}));lamp.add(halo);
        P(GC(.06,.12,.75,8),'#2f2216',0,pb+.38,-.6);houseAnim.push({kind:'breath',obj:lamp,halo});
        const pl=plaqueMesh('NHÀ NIỆM',2.3,.48,['#231911','#a6824b','#ebd39d']);pl.position.set(0,top-.32,fz+.12);g.add(pl)}
    }else{/* 3.41: Nhà Chạm theo ảnh phối cảnh: nhà gỗ mở mặt trước, mái ngói xanh rêu bốn dốc có búp đá, kệ gốm ba tầng kín vách sau, hai bàn xoay có bình đang nặn, sáu bồ đoàn, bàn gỗ bên phải, kệ thấp bên trái, chum lớn; hồ sen nhỏ phía trước bên phải */h.noBoard=true;
      const clay='#c98a5a',clayD='#a8673e',cream='#efe3c8',jade='#8fb3a0',sage='#b9c49a';
      cottage(g,{W,D,bw:8.4,bd:4.6,open:true,gable:false,sign:['Nhà Chạm','Không gian làm gốm','pot'],banners:'lotus',pond:[W/2-1.5,D/2-.55,.85],plants:({lav,hyd})=>{lav(-W/2+.9,D/2-1.5,6)},porch:({P,G,pb,pz,zf,zb,bw,top})=>{
        const F=pb+.07,bz=zb+.45,pot=(x,y,z,s,c,k)=>P(GL(k%3===0?[[0,0],[.1*s,.01],[.15*s,.12*s],[.09*s,.24*s],[.1*s,.28*s]]:k%3===1?[[0,0],[.06*s,.01],[.15*s,.08*s],[.16*s,.12*s]]:[[0,0],[.09*s,.01],[.13*s,.16*s],[.07*s,.3*s],[.08*s,.34*s]],10),c,x,y,z);
        
        /* kệ gốm 3 tầng + tủ dưới */P(GB(bw-1.4,.75,.5),'#6e4a2e',0,F+.38,bz);for(let k=0;k<6;k++)P(GB(.02,.6,.02),'#4a3020',-bw/2+1.2+k*(bw-2.4)/5,F+.38,bz+.26);
        const cols=[cream,clay,jade,sage,clayD,cream];for(let r=0;r<3;r++){const y=F+1.05+r*.55;P(GB(bw-1.4,.05,.42),'#6e4a2e',0,y,bz);for(let k=0;k<13;k++){const x=-bw/2+1.0+k*(bw-2)/12.5;pot(x,y+.025,bz,.85+((k+r)%3)*.2,cols[(k*5+r*3)%6],k+r)}}
        for(const s of [-1,1])P(GB(.06,1.7,.42),'#6e4a2e',s*(bw/2-.7),F+1.6,bz);
        /* thảm cói, 2 bàn xoay có bình đang nặn, 6 bồ đoàn */P(GB(4.4,.02,2.8),'#d9c39a',-.4,F+.01,(zf+zb)/2+.6);
        for(const wx of [-1.4,.6]){const wz=(zf+zb)/2+.5;P(GC(.42,.46,.55,14),'#7a5232',wx,F+.28,wz);P(GC(.4,.4,.06,16),'#5a3a22',wx,F+.58,wz);P(GL([[0,0],[.12,.01],[.2,.16],[.12,.34],[.13,.4]],12),cream,wx,F+.61,wz);
          for(const a of [Math.PI*.5,Math.PI*1.15,Math.PI*1.85])P(GC(.27,.29,.12,14),'#ece2cc',wx+Math.sin(a)*.95,F+.06,wz+Math.cos(a)*.95)}
        /* bàn gỗ bên phải: ống bút, dụng cụ, bình hoa trắng */{const tx=bw/2-1.5,tz=(zf+zb)/2+.3;P(GB(1.5,.07,.8),'#7a5232',tx,F+.72,tz);for(const a of [-1,1])for(const b of [-1,1])P(GB(.07,.7,.07),'#5a3a22',tx+a*.65,F+.35,tz+b*.32);
          P(GL([[0,0],[.1,.01],[.13,.12],[.07,.2]],10),clay,tx+.4,F+.76,tz-.1);for(let k=0;k<7;k++)P(new THREE.IcosahedronGeometry(.05,0),'#fbf7ee',tx+.4+Math.cos(k)*.09,F+1.0+(k%3)*.05,tz-.1+Math.sin(k)*.09);P(GC(.05,.05,.12,8),cream,tx-.3,F+.81,tz-.15);for(const k of [-1,0,1])P(GC(.008,.008,.22,4),'#3a2a1a',tx-.3+k*.015,F+.92,tz-.15);P(GB(.4,.01,.28),'#f3ecd9',tx-.1,F+.76,tz+.15)}
        /* kệ thấp bên trái, chum lớn ở góc */{const lx=-bw/2+.55,lz=(zf+zb)/2+.2;P(GB(.6,.6,1.6),'#6e4a2e',lx,F+.3,lz);pot(lx,F+.6,lz-.5,1.4,cream,0);pot(lx,F+.6,lz+.1,1.2,sage,2);pot(lx,F+.6,lz+.6,1.3,clay,0);P(GL([[0,0],[.25,.02],[.4,.3],[.3,.62],[.22,.7],[.24,.75]],12),cream,-bw/2+.6,F,zf+.9)}
        /* dây leo hai bên kệ, đèn lồng treo trong nhà */for(const s of [-1,1])for(let k=0;k<9;k++)P(new THREE.IcosahedronGeometry(.09,0),k%2?'#6fa04a':'#86b85a',s*(bw/2-.75)+Math.sin(k*2.1)*.12,top-.2-k*.18,bz+.25);
        for(const s of [-1,1]){const x=s*(bw/2-1.4);P(GB(.02,.5,.02),'#2a2018',x,top-.25,(zf+zb)/2-1)}
        for(const s of [-1,1])P(GL([[0,0],[.3,.02],[.42,.3],[.3,.6],[.22,.66],[.24,.7]],12),s<0?clay:cream,s*(bw/2+.95),0,pz-.1);/* chum gốm hai bên hiên */
      }});
      for(let r=0;r<3;r++)for(let k=0;k<4-r;k++)P(GC(.13,.13,1.4,7),'#6b4a32',-W/2-1.2,.13+r*.24,-1.6+k*.27+r*.13,{rz:Math.PI/2});
      for(let k=0;k<6;k++)P(GL([[0,0],[.2,.02],[.28,.25],[.16,.5],[.18,.56]],10),[clay,clayD][k%2],-W/2-1.1+(k%3)*.6,0,1.4+Math.floor(k/3)*.6);
    }
    if(!h.noBoard)parts.push(...nameBoard(g,h.icon+' '+(h.board||h.name.toUpperCase()),W*.3+1.1,D/2+1.1));
    g.add(new THREE.Mesh(mergeColored(parts),houseMat));
    g.position.set(h.x,terrainHeight(h.x,h.z),h.z);g.rotation.y=h.rot;g.userData.house=h;scene.add(g);h.group=g;return g}
  SENSE_HOUSES.forEach(buildSenseHouse);
  function updateSenseHouses(t){FOUNTAIN_TEX.offset.y=t*.9;for(const a of houseAnim){if(a.kind==='chime'){a.obj.rotation.z=Math.sin(t*1.3+a.phase)*.12;a.obj.rotation.x=Math.sin(t*.9+a.phase*.7)*.08}
    else if(a.kind==='spin')a.obj.rotation.y=t*2.4;
    else if(a.kind==='breath'){const k=.5-.5*Math.cos(t*Math.PI/4);a.obj.scale.setScalar(.82+.3*k);a.obj.material.opacity=.5+.45*k;if(a.halo)a.halo.material.opacity=.12+.25*k}/* Đèn Thở: hít 4 giây, thở 4 giây */
    else{const u=((t*.35+a.k*.17)%1),rise=a.small?.7:2.2;a.obj.position.y=a.y+u*rise;a.obj.position.x=a.x+Math.sin(t+a.k)*.12*u;a.obj.material.opacity=(a.small?.22:.26)*(1-u);a.obj.scale.setScalar(1+u*1.5)}}}
  // Nhà chuông gió: a soft synthesized chime, started from the tap (iOS needs a user gesture to unlock audio).
  let chimeCtx=null;
  function unlockChime(){try{chimeCtx=chimeCtx||new (window.AudioContext||window.webkitAudioContext)();if(chimeCtx.state==='suspended')chimeCtx.resume()}catch(e){chimeCtx=null}}
  function playChime(){if(!chimeCtx)return;const now=chimeCtx.currentTime,notes=[1046.5,1174.7,1318.5,1568,1760,2093];for(let i=0;i<7;i++){const o=chimeCtx.createOscillator(),gn=chimeCtx.createGain(),t0=now+i*.18+Math.random()*.08;o.type='sine';o.frequency.value=notes[Math.floor(Math.random()*notes.length)];gn.gain.setValueAtTime(0,t0);gn.gain.linearRampToValueAtTime(.05,t0+.01);gn.gain.exponentialRampToValueAtTime(.0005,t0+2.6);o.connect(gn).connect(chimeCtx.destination);o.start(t0);o.stop(t0+2.7)}}
  let pendingHouse=null,arriveYaw=null;
  // Bấm nhà: đi đường gần nhất tới trước cửa rồi dừng, quay mặt vào cửa. Đang đứng trước cửa mà bấm nhà (cửa) thì mới vào không gian trong nhà.
  function arriveDoor(h){if(!ROOM_BUILDERS[h.id]){arriveHouse(h);return}if(h.id==='chuong_gio')playChime();document.getElementById('zenHint').textContent='🚪 Đã tới trước cửa '+h.name+' · bấm vào cửa để vào nhà'}
  function arriveHouse(h){if(h.id==='chuong_gio')playChime();document.getElementById('zenHint').textContent=h.icon+' '+h.name+' · '+h.note;setTimeout(()=>openRoom(h),350);}
  function goToHouse(h){if(bayMode||boatRide)return;unlockChime();if(Math.hypot(mePosition.x-h.door[0],mePosition.z-h.door[1])<1.6){walkYaw=h.rot+Math.PI;arriveHouse(h);return}
    if(navigateTo(...(nearestWalkable(...h.door,h.rot+Math.PI)||h.door))){pendingHouse=h;document.getElementById('zenHint').textContent=h.icon+' Đang đến '+h.name+'…'}}
  // 3.13: Đường Ngũ quan. A flagstone ring around the hill (r 30) from the foot plaza, with a spoke beside each sense pond
  // that curves round the pond toward its house; the last few metres to the door are on grass.
  const RING_R=30,BRANCHES=[];
  {const hillAng=(x,z)=>Math.atan2(x-HILL.x,z-HILL.z),onRing=a=>[HILL.x+Math.sin(a)*RING_R,HILL.z+Math.cos(a)*RING_R],delta=2*Math.asin((POND_R+2.2)/(2*38));
    const targets=[{lake:'Sắc',door:ORCHID_DOOR},...SENSE_HOUSES.map(h=>({lake:h.lake,door:h.door}))];
    for(const t of targets){const l=wishLakes.find(v=>v.name===t.lake),th=hillAng(l.x,l.z),sg=Math.sign(th)||1,phi=th-sg*delta,pts=[];
      for(let a=0;Math.abs(a)<Math.abs(phi);a+=sg*.08)pts.push(onRing(a));pts.push(onRing(phi));
      const out=[HILL.x+Math.sin(phi)*38,HILL.z+Math.cos(phi)*38];pts.push(out);
      const u=Math.atan2(t.door[0]-l.x,t.door[1]-l.z),a0=Math.atan2(out[0]-l.x,out[1]-l.z);let d=Math.atan2(Math.sin(u-a0),Math.cos(u-a0));const end=d,rr=Math.hypot(out[0]-l.x,out[1]-l.z);
      for(let k=1;k<=6;k++){const a=a0+end*k/6;pts.push([l.x+Math.sin(a)*rr,l.z+Math.cos(a)*rr])}
      BRANCHES.push(pts)}
    // Nhánh Tịnh thất: continue the ring from the last pond spoke on the east side round to the north-east, then a straight
    // spoke out toward the Tịnh thất door (it faces the hill, so the door lies on the same ray). Grass for the last metre or so.
    {const TT=TT_SPOT,th=hillAng(...TT);let from=0;for(const t of targets){const l=wishLakes.find(v=>v.name===t.lake),a=hillAng(l.x,l.z);if(Math.sign(a)===Math.sign(th))from=Math.max(from*Math.sign(th),Math.abs(a-Math.sign(a)*delta))*Math.sign(th)}
      const pts=[],sg=Math.sign(th);for(let a=from;Math.abs(a)<Math.abs(th);a+=sg*.08)pts.push(onRing(a));pts.push(onRing(th));
      const far=Math.hypot(TT[0]-HILL.x,TT[1]-HILL.z)-3-1.3-1.1;pts.push([HILL.x+Math.sin(th)*far,HILL.z+Math.cos(th)*far]);BRANCHES.push(pts)}}
  // Nhánh Tư Gia: đường lát đá từ mép Sân đón vòng bờ nam Hồ Sen sang bờ đông, tới trước cửa Tư Gia (mét cuối là cỏ).
  {const d=TU_GIA.door,ctl=[[GATHER.x+GATHER.r-.4,GATHER.z-1.2],[13,19.5],[23,16.5],[33,12.5],[40.5,7],[d[0]-1.6,d[1]+1.3]].map(([x,z])=>new THREE.Vector3(x,0,z));
    BRANCHES.push(new THREE.CatmullRomCurve3(ctl,false,'centripetal').getSpacedPoints(Math.ceil(new THREE.CatmullRomCurve3(ctl).getLength()/1.2)).map(v=>[v.x,v.z]))}
  // Đường lát đá Nhà Văn Hóa (bản đồ v3.6): từ trục chính rẽ Tây ở z = 16 qua trước mặt nhà, lối rẽ ngắn vào cửa Bắc.
  {const seg=(x0,z0,x1,z1)=>{const n=Math.max(10,Math.ceil(Math.hypot(x1-x0,z1-z0)/.8)),pts=[];for(let i=0;i<=n;i++)pts.push([x0+(x1-x0)*i/n,z0+(z1-z0)*i/n]);return pts};
    BRANCHES.push(seg(-2.1,VH_ROAD_Z,VH_ROAD_X1,VH_ROAD_Z));BRANCHES.push(seg(VAN_HOA.x,VH_ROAD_Z+.9,VAN_HOA.door[0],VAN_HOA.door[1]+.4))}
  /* Lưới tra nhanh đoạn đường nhánh: mọi chỗ gọi chỉ so khoảng cách dưới 3 m, nên chỉ cần xét các đoạn trong ô lưới đã nới 3 m (kết quả dưới 3 m giữ nguyên như cách tính cũ, còn lại trả về số ≥ 3 m) */
  const BR_R=3,BR_C=2;let brGrid=null,brN=-1;
  function branchGrid(){let n=0;for(const p of BRANCHES)n+=p.length;if(brGrid&&n===brN)return brGrid;brN=n;brGrid=new Map();
    for(const pts of BRANCHES)for(let i=0;i<pts.length-1;i++){const [ax,az]=pts[i],[bx,bz]=pts[i+1];const x0=Math.floor((Math.min(ax,bx)-BR_R)/BR_C),x1=Math.floor((Math.max(ax,bx)+BR_R)/BR_C),z0=Math.floor((Math.min(az,bz)-BR_R)/BR_C),z1=Math.floor((Math.max(az,bz)+BR_R)/BR_C);
      for(let gx=x0;gx<=x1;gx++)for(let gz=z0;gz<=z1;gz++){const k=gx*100003+gz;let c=brGrid.get(k);if(!c)brGrid.set(k,c=[]);c.push(ax,az,bx,bz)}}return brGrid}
  function branchDistance(x,z){const c=branchGrid().get(Math.floor(x/BR_C)*100003+Math.floor(z/BR_C));if(!c)return BR_R+10;let best=BR_R+10;for(let i=0;i<c.length;i+=4){const ax=c[i],az=c[i+1],vx=c[i+2]-ax,vz=c[i+3]-az,u=Math.max(0,Math.min(1,((x-ax)*vx+(z-az)*vz)/(vx*vx+vz*vz||1)));const d=Math.hypot(ax+vx*u-x,az+vz*u-z);if(d<best)best=d}return best}
  // Paved ground (main axis, plazas, stairs, Ngũ quan branches): walkers prefer it, grass costs more.
  function onPaved(x,z){return (Math.abs(x)<1.9&&z>-37&&z<36)||Math.hypot(x-GATHER.x,z-GATHER.z)<GATHER.r||Math.hypot(x-FOOT.x,z-FOOT.z)<FOOT.r||stairsDistance(x,z)<1.5||Math.hypot(x-HILL.x,z-HILL.z)<HILL.flat-.3||branchDistance(x,z)<1.3}
  // Footbridge across the channel between the two lotus lobes, on the main axis from the gate to the hill.
  // It rises in a tall arch over the water (about 2.6 m at the middle) so a boat can pass underneath.
  const flagPts=[],flagRand=seededRandom(77),NONBO_R=1.6,FOOT_IN=2.6,ZEN_SAN=[GATHER,FOOT],nonBo=[];/* FOOT_IN: bán kính sân sỏi chồng đá thiền (ZEN_SAN: các sân có chồng đá) */
  for(const pts of BRANCHES)for(let i=0;i<pts.length-1;i++){const [ax,az]=pts[i],[bx,bz]=pts[i+1],len=Math.hypot(bx-ax,bz-az),nx=-(bz-az)/len,nz=(bx-ax)/len;
    for(let t=.2;t<len;t+=.7){if(i===0&&t<FOOT.r-RING_R+30+.4&&Math.hypot(ax+(bx-ax)*t/len-FOOT.x,az+(bz-az)*t/len-FOOT.z)<FOOT.r)continue;for(let o=-.95;o<=.96;o+=.66){if(flagRand()<.2)continue;const w=.26+flagRand()*.12,x=ax+(bx-ax)*t/len+nx*(o+(flagRand()-.5)*.15),z=az+(bz-az)*t/len+nz*(o+(flagRand()-.5)*.15);if(Math.hypot(x-FOOT.x,z-FOOT.z)<FOOT.r)continue;flagPts.push([x,z,w,.24+flagRand()*.1,0])}}}
  {const flat=(z0,z1)=>{const d=new THREE.Mesh(new THREE.BoxGeometry(3.6,.15,z1-z0),stone);d.position.set(0,.18,(z0+z1)/2);scene.add(d)};flat(BRIDGE_ARCH[0]-1.2,BRIDGE_ARCH[0]);
   // Stone paths on the main axis (gate, gathering plaza, bridge, foot of the hill): irregular flagstones half sunk
   // into a strip of packed earth, with earth showing between them, so the path melts into the ground.
   const stonePath=(z0,z1)=>{for(let z=z0+.3;z<z1-.2;z+=.66){let x=-1.45+flagRand()*.2;while(x<1.3){const w=.32+flagRand()*.28;if(flagRand()>.2)flagPts.push([x+w,z+(flagRand()-.5)*.18,w,.26+flagRand()*.12,0]);x+=w*2+.08+flagRand()*.12}}};
   stonePath(FOOT.z+FOOT.r-.3,BRIDGE_ARCH[0]-1.2);stonePath(BRIDGE_ARCH[1]+1.2,GATHER.z-GATHER.r+.3);stonePath(GATHER.z+GATHER.r-.3,35);flat(BRIDGE_ARCH[1],BRIDGE_ARCH[1]+1.2);
   // Cầu vòm gỗ: mặt cầu ván gỗ xếp ngang theo đường vòng cung, hai dầm cong ôm dưới mặt cầu, lan can gỗ nâu cùng màu thân thông
   // (trụ vuông, đầu trụ phẳng), tay vịn cong theo vòm, chấn song chữ thập; mố đá có bậc, bốn cột đèn đá ở hai đầu cầu.
   // Cả cầu gộp thành một khối hình (một lần vẽ). Lòng vòm giữ trống cho thuyền chui qua.
   {const parts=[],P=(...a)=>parts.push(HP(...a)),span=BRIDGE_ARCH[1]-BRIDGE_ARCH[0],N=64,HW=1.75,red='#6e4632',redD='#5a3a2a',gold='#c8a96a',/* nâu cùng màu thân thông */plank=['#6d4d2f','#624a33','#684a31']/* cùng màu gỗ thuyền và Bến Sen, trầm hơn chút */,dark='#4e3424',stoneC='#7a7466';
    const Y=z=>bridgeHeight(z),zAt=k=>BRIDGE_ARCH[0]+span*k/N;
    for(let k=0;k<N;k++){const z0=zAt(k),z1=zAt(k+1),y0=Y(z0),y1=Y(z1),mz=(z0+z1)/2,my=(y0+y1)/2,len=Math.hypot(z1-z0,y1-y0),tilt=-Math.atan2(y1-y0,z1-z0);
      // ván mặt cầu (2 tấm mỗi đoạn, có khe nhỏ)
      for(const f of [.25,.75]){const zz=z0+(z1-z0)*f,yy=y0+(y1-y0)*f;P(GB(2*HW+.1,.1,len*.46),plank[(k*2+(f>.5?1:0))%3],0,yy+.05,zz,{rx:tilt})}
      // dầm cong hai bên và xà ngang dưới mặt cầu
      for(const x of [-HW+.15,HW-.15])P(GB(.22,.36,len+.03),dark,x,my-.2,mz,{rx:tilt});
      if(k%2===0)P(GB(2*HW-.1,.14,.16),dark,0,my-.28,mz,{rx:tilt});
      // lan can: tay vịn trên, thanh giữa, gờ dưới
      for(const x of [-HW,HW]){P(GB(.14,.12,len+.03),red,x,my+.92,mz,{rx:tilt});P(GB(.08,.07,len+.03),red,x,my+.48,mz,{rx:tilt});P(GB(.12,.1,len+.03),redD,x,my+.12,mz,{rx:tilt})}
    }
    // trụ lan can có mũ vàng, giữa các trụ là chấn song chữ thập
    const POST_STEP=4;for(let k=0;k<=N;k+=POST_STEP){const z=zAt(k),y=Y(z);for(const x of [-HW,HW]){P(GB(.17,1.08,.17),red,x,y+.54,z);P(GB(.21,.06,.21),redD,x,y+1.1,z)}
      if(k<N){const za=zAt(k),zb=zAt(Math.min(N,k+POST_STEP)),ya=Y(za),yb=Y(zb),mz=(za+zb)/2,my=(ya+yb)/2,L=Math.hypot(zb-za,yb-ya),t=-Math.atan2(yb-ya,zb-za),d=Math.hypot(L,.36);
        for(const x of [-HW,HW])for(const sg of [-1,1]){const g=GB(.05,.05,d);P(g,redD,x,my+.3,mz,{rx:t+sg*Math.atan2(.36,L)})}}}
    // mố đá hai đầu có bậc lên cầu: lát đá phiến cùng kiểu đường đi (đá đa giác dẹt, xám rêu, viền sẫm)
    {const fc=['#5c5a4f','#646155','#56544a','#6a665b','#5f6156'],edgeC='#4b4941',rnd=seededRandom(311),stone=new THREE.DodecahedronGeometry(1,0);
     const lay=(cx,cz,w,d,top)=>{for(let zz=cz-d/2+.22;zz<cz+d/2-.1;zz+=.46)for(let xx=cx-w/2+.24;xx<cx+w/2-.1;xx+=.5){const sw=.2+rnd()*.06,sd=.18+rnd()*.05;P(stone,fc[Math.floor(rnd()*fc.length)],xx+(rnd()-.5)*.08,top,zz+(rnd()-.5)*.06,{s:[sw,.05,sd],ry:rnd()*Math.PI})}};
     for(const [z,dir] of [[BRIDGE_ARCH[0],-1],[BRIDGE_ARCH[1],1]]){P(GB(4.2,.55,1.4),edgeC,0,.03,z+dir*.35);lay(0,z+dir*.35,4.1,1.3,.3);P(GB(4,.18,.6),edgeC,0,.36,z+dir*.95);lay(0,z+dir*.95,3.9,.55,.45)}}
    const bridgeMesh=new THREE.Mesh(mergeColored(parts),houseMat);scene.add(bridgeMesh);bridgePick=bridgeMesh;
    }}

  // Round stone plazas: Sân đón (where guests arrive) and Sân chân đồi (foot of the hill, where the stairs start).
  // Flagstones laid loosely over packed earth, a ring of larger dark stones at the edge.
  for(const p of [GATHER,FOOT]){for(let z=p.z-p.r;z<=p.z+p.r;z+=.7)for(let x=p.x-p.r;x<=p.x+p.r;x+=.7){const jx=x+(flagRand()-.5)*.24,jz=z+(flagRand()-.5)*.24;if(Math.hypot(jx-p.x,jz-p.z)>p.r-.45||Math.hypot(jx-p.x,jz-p.z)<(ZEN_SAN.includes(p)?FOOT_IN:NONBO_R+.25)||flagRand()<.24)continue;flagPts.push([jx,jz,.27+flagRand()*.08,.27+flagRand()*.08,0])}
    const n=Math.round(p.r*2*Math.PI/.85);for(let k=0;k<n;k++){const a=k/n*Math.PI*2;flagPts.push([p.x+Math.cos(a)*(p.r-.1),p.z+Math.sin(a)*(p.r-.1),.36+flagRand()*.1,.3+flagRand()*.08,1])}}
  {const geo=new THREE.DodecahedronGeometry(1,0),cols=['#5c5a4f','#646155','#56544a','#6a665b','#5f6156'].map(h=>new THREE.Color(h)),edge=new THREE.Color('#4b4941'),mesh=new THREE.InstancedMesh(geo,new THREE.MeshStandardMaterial({roughness:1,flatShading:true}),flagPts.length);
    const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),sc=new THREE.Vector3();
    flagPts.forEach(([x,z,w,d,rim],i)=>{e.set(0,flagRand()*Math.PI*2,0);q.setFromEuler(e);v.set(x,terrainHeight(x,z)+(rim?.03:.005),z);sc.set(w,rim?.13:.07,d);m4.compose(v,q,sc);mesh.setMatrixAt(i,m4);mesh.setColorAt(i,rim?edge:cols[Math.floor(flagRand()*cols.length)])});
    mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;scene.add(mesh)}
  // Đài phun nước nhỏ ba tầng (thay hòn non bộ) ở giữa hai sân nghỉ tròn: bồn tròn viền đá, trụ tiện, ba tầng chén nhỏ dần,
  // chóp nhọn; nước tràn qua mép từng tầng thành màn mỏng rơi xuống tầng dưới (vân nước chạy xuống, không thêm đèn).
  const FOUNTAIN_TEX=(()=>{const cv=document.createElement('canvas');cv.width=64;cv.height=128;const c=cv.getContext('2d');const r=seededRandom(91);
    for(let k=0;k<26;k++){const x=r()*64,w=.8+r()*1.8,y=r()*128,h=20+r()*70,g=c.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'rgba(235,248,250,0)');g.addColorStop(.5,'rgba(235,248,250,'+(.35+r()*.5)+')');g.addColorStop(1,'rgba(235,248,250,0)');c.fillStyle=g;c.fillRect(x,y,w,h);c.fillRect(x,y-128,w,h)}
    const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(6,1);return t})();
  const fountainWaterMat=new THREE.MeshBasicMaterial({map:FOUNTAIN_TEX,color:'#dcefF2',transparent:true,opacity:.7,depthWrite:false,side:THREE.DoubleSide});
  const fountainPoolMat=new THREE.MeshStandardMaterial({color:'#4f8288',metalness:.25,roughness:.18,transparent:true,opacity:.92});
  /* 26/11: hai sân có chồng đá theo mẫu chị gửi. Sân chân đồi: "Thiền Đá Cân Bằng", năm viên cuội xếp thẳng cân đối, rêu mặt trên, cuội nhỏ quanh chân.
     Sân đón (chị gọi là Sân chào, ở cổng làng): "Chồng Đá Tĩnh Tâm" theo mẫu chị gửi: phiến đá dựng cao nhọn đầu, mặt sần có vệt rêu,
     tựa bên cạnh là chồng năm viên cuội tròn dẹt màu be ấm nhỏ dần lên trên (viên đáy rất to, có rêu); dương xỉ, hoa tím bông dài, cúc trắng, ụ rêu
     (chị dặn không vẽ đèn ở hai sân). Nền là đá lát xám sẫm xếp vòng đồng tâm (không cát), viền rêu. Màu đá xám ấm, be ấm, rêu xanh trầm hợp rừng thông.
     Nhẹ máy: đá, cây gộp thành 1 khối tô màu theo đỉnh + 1 đĩa nền (1 texture canvas 256 px) + viền rêu. */
  for(const p of ZEN_SAN){const g=new THREE.Group(),y0=terrainHeight(p.x,p.z);g.position.set(p.x,y0,p.z);
    const parts=[],MOSS=new THREE.Color('#58702f'),MOSS_D=new THREE.Color('#435a27'),tc=new THREE.Color();
    // tô màu theo đỉnh: rêu bám mặt trên (pháp tuyến hướng lên) loang theo nhiễu, đá có vân sáng tối nhẹ
    const add=(geo,base,moss=0,k=0,arr=parts)=>{const q=geo.index?geo.toNonIndexed():geo;q.computeVertexNormals();const P=q.attributes.position,N=q.attributes.normal,col=new Float32Array(P.count*3),cb=new THREE.Color(base);
      for(let i=0;i<P.count;i++){const x=P.getX(i),y=P.getY(i),z=P.getZ(i),n=Math.sin(x*4.1+k)*Math.cos(z*3.7+k*1.7)+.4*Math.sin(y*2.6+x*2.2+k),m=moss*(N.getY(i)*1.4+n*.35-.6);
        tc.copy(cb).multiplyScalar(1+.07*Math.sin(x*23+y*17+z*13));if(m>0)tc.lerp(n>0?MOSS:MOSS_D,Math.min(1,m*2.6));col[i*3]=tc.r;col[i*3+1]=tc.g;col[i*3+2]=tc.b}
      q.setAttribute('color',new THREE.BufferAttribute(col,3));arr.push(q);return q};
    const merge=list=>{let n=0;for(const q of list)n+=q.attributes.position.count;const pos=new Float32Array(n*3),nor=new Float32Array(n*3),col=new Float32Array(n*3);let o=0;
      for(const q of list){pos.set(q.attributes.position.array,o*3);nor.set(q.attributes.normal.array,o*3);col.set(q.attributes.color.array,o*3);o+=q.attributes.position.count}
      const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.BufferAttribute(pos,3));out.setAttribute('normal',new THREE.BufferAttribute(nor,3));out.setAttribute('color',new THREE.BufferAttribute(col,3));return out};
    // viên đá cuội: khối cầu bóp dẹt, mép hơi gồ ghề
    const peb=(w,h,d,seed,det=2)=>{const geo=new THREE.IcosahedronGeometry(1,det),P=geo.attributes.position;const r=seededRandom(seed),k1=r()*6,k2=r()*6;
      for(let i=0;i<P.count;i++){const x=P.getX(i),y=P.getY(i),z=P.getZ(i),n=1+.06*Math.sin(x*2.6+k1)*Math.cos(z*2.3+k2)+.03*Math.sin(y*4+k1);P.setXYZ(i,x*w*n,(y>0?y*h:y*h*.8)*n,z*d*n)}return geo};
    const T=(geo,x,y,z,rx=0,ry=0,rz=0)=>{if(rx)geo.rotateX(rx);if(ry)geo.rotateY(ry);if(rz)geo.rotateZ(rz);geo.translate(x,y,z);return geo};
    const ST='#a39a88',ST2='#ada490',ST3='#857f73',STB='#b5a98f',MONO='#9c968a';
    if(p===GATHER){
    // phiến đá dựng: cao, nhọn đầu, mặt sần, nghiêng nhẹ; một vệt rêu chảy dọc mặt trước
    {const geo=new THREE.IcosahedronGeometry(1,3),P=geo.attributes.position,r=seededRandom(401),k1=r()*6,k2=r()*6;
      for(let i=0;i<P.count;i++){const x=P.getX(i),y=P.getY(i),z=P.getZ(i),u=(y+1)/2,tap=1-.82*Math.pow(u,1.6),n=1+.09*Math.sin(x*5+k1)*Math.cos(y*6+k2)+.05*Math.sin(z*7+y*9);
        P.setXYZ(i,x*.66*tap*n+(u*u)*.14,y*1.15*n,z*.42*tap*n)}
      const q=add(T(geo,-.34,1.05,-.14,0,.25,.06),MONO,.18,9),Pq=q.attributes.position,N=q.attributes.normal,C=q.attributes.color;
      for(let i=0;i<Pq.count;i++){const x=Pq.getX(i),y=Pq.getY(i),z=Pq.getZ(i),w=Math.abs(x+.44+.12*Math.sin(y*3.2)-(y-1)*.1);if(N.getZ(i)>.1&&y>.35&&y<1.8&&w<.13+.05*Math.sin(y*11)){const t=y%.3<.15?MOSS:MOSS_D;C.setXYZ(i,t.r,t.g,t.b)}}}
    // chồng năm viên cuội tròn dẹt màu be ấm tựa vào phiến đá, viên đáy rất to, nhỏ dần lên trên
    [[.82,.44,.66,.42,.44,.15,0,1.2],[.6,.22,.48,.46,1.0,.1,-.06,.3],[.5,.2,.4,.4,1.33,.08,.05,0],[.36,.14,.3,.4,1.6,.06,-.04,0],[.46,.17,.36,.28,1.84,.04,.07,0],[.21,.15,.19,.22,2.1,.02,0,0]]
      .forEach(([w,h,d,x,y,z,rz,m],k)=>add(T(peb(w,h,d,411+k*7),x,y,z,0,k*.9,rz),k%2?STB:ST2,m*.7,20+k));
    }else{
    // Thiền Đá Cân Bằng: năm viên cuội tròn dẹt xếp thẳng, cân đối, viên đáy rất to, mặt trên phủ rêu; đá cuội nhỏ quanh chân
    [[.95,.55,.82,.52,1.3],[.64,.2,.54,1.17,.9],[.4,.14,.34,1.44,0],[.5,.15,.42,1.66,.8],[.31,.18,.27,1.92,0]]
      .forEach(([w,h,d,y,m],k)=>add(T(peb(w,h,d,431+k*7),(k%2?.015:-.012),y,0,0,k*1.1,k%2?.03:-.02),k%2?STB:ST2,m,30+k));
    for(let k=0;k<9;k++){const a=k/9*Math.PI*2+.3,r=.95+(k%3)*.08,w=.09+(k%4)*.025;add(T(peb(w,w*.6,w*.85,461+k,1),Math.cos(a)*r,w*.3,Math.sin(a)*r*.85,0,a),k%2?ST3:ST,.2,k)}}
    // dương xỉ: mỗi khóm 7 lá nhọn xoè ra
    const fern=(x,z,s)=>{for(let k=0;k<7;k++){const a=k*.9+x,geo=new THREE.ConeGeometry(.06*s,.6*s,4,1);geo.translate(0,.3*s,0);geo.rotateX(.85);geo.rotateY(a);geo.translate(x,0,z);add(geo,k%2?'#4c7f37':'#5a8f41')}};
    // hoa tím dạng bông dài (kiểu oải hương, lupin) và cúc trắng nhuỵ vàng
    const spike=(x,z,n,pink)=>{for(let k=0;k<n;k++){const a=k*2.4,r=.05+(k%3)*.07,h=.38+(k%3)*.1,xx=x+Math.cos(a)*r,zz=z+Math.sin(a)*r;add(T(new THREE.CylinderGeometry(.008,.012,h,4),xx,h/2,zz),'#4f7a3e');add(T(new THREE.ConeGeometry(.045,.22,5),xx,h+.08,zz),pink&&k%2?'#d98aa6':k%2?'#7d62b0':'#9278c4')}};
    const daisy=(x,z,n)=>{add(T(new THREE.IcosahedronGeometry(.13,0).scale(1.3,.55,1.3),x,.07,z),'#4d7d3a');for(let k=0;k<n;k++){const a=k*2.2,r=.06+(k%2)*.07,h=.18+(k%3)*.05,xx=x+Math.cos(a)*r,zz=z+Math.sin(a)*r;add(T(new THREE.CylinderGeometry(.06,.06,.012,7),xx,h,zz),'#e9e5d8');add(T(new THREE.CylinderGeometry(.022,.022,.02,6),xx,h+.012,zz),'#d9a93a')}};
    const mound=(x,z,s)=>add(T(new THREE.IcosahedronGeometry(1,1).scale(.24*s,.13*s,.21*s),x,.03,z),'#4d6a2c',.3,x);
    for(const [x,z,s] of (p===GATHER?[[.0,.45,1.2],[1.25,-.3,1.1],[-1.0,.55,1],[-1.15,-.75,1.1],[1.4,.85,.9]]:[[1.25,-.3,1],[-1.15,-.75,1],[-1.2,.3,.8],[1.3,.4,.8]]))fern(x,z,s);
    for(const [x,z,n] of [[-.95,.95,7],[1.3,.75,7],[-1.45,-.25,5]])spike(x,z,n,p===FOOT);
    for(const [x,z,n] of [[-.55,1.05,5],[.95,1.05,5],[1.6,-.6,4]])daisy(x,z,n);
    for(const [x,z,s] of (p===GATHER?[[-.2,1.2,1],[1.15,1.35,.9],[-1.3,1.45,.8],[.4,-1.1,.9]]:[[-.55,1.15,1.1],[.6,1.15,1.1],[-1.3,1.45,.8],[1.4,-1.2,.9]]))mound(x,z,s);
    for(const [x,z,s,sd] of [[-2.2,-.6,.26,351],[2.25,-.3,.24,353]])add(T(peb(s*1.3,s*.75,s,sd,1),x,s*.3,z,0,sd),ST3,1.2,sd);
    const stoneMesh=new THREE.Mesh(merge(parts),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.92,flatShading:true}));g.add(stoneMesh);
    // nền đá xám sẫm (không phải cát): các vòng đá lát đồng tâm, mỗi vòng chia viên, mạch tối, viền rêu
    {const cv=document.createElement('canvas');cv.width=cv.height=256;const c=cv.getContext('2d');c.fillStyle='#2c2b28';c.fillRect(0,0,256,256);const r=seededRandom(78);
      for(let R=36,ring=0;R<128;R+=11,ring++){const n=Math.max(8,Math.round(2*Math.PI*R/16)),off=r()*6;for(let k=0;k<n;k++){const a0=off+k/n*Math.PI*2+.03,a1=off+(k+1)/n*Math.PI*2-.03,v=60+Math.floor(r()*18);
        c.fillStyle='rgb('+v+','+v+','+(v-3)+')';c.beginPath();c.arc(128,128,R+9.5,a0,a1);c.arc(128,128,R+1.5,a1,a0,true);c.closePath();c.fill()}}
      c.fillStyle='#46443f';c.beginPath();c.arc(128,128,36,0,7);c.fill();
      const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;const gr=new THREE.Mesh(new THREE.CircleGeometry(2.3,40),new THREE.MeshStandardMaterial({map:t,roughness:.95}));gr.rotation.x=-Math.PI/2;gr.position.y=.03;g.add(gr);
      const rim=new THREE.Mesh(new THREE.RingGeometry(2.28,2.55,40),new THREE.MeshStandardMaterial({color:'#3f5527',roughness:1}));rim.rotation.x=-Math.PI/2;rim.position.y=.025;g.add(rim)}
    /* chị dặn không vẽ đèn ở hai sân này: không đèn đá, không đèn thật */
    scene.add(g);nonBo.push(g)}
  // Zig-zag stone stairs up the south face of the hill (no lamps along the paths).
  {const slabMat=mat('#6c6758'),edgeMat=mat('#5a5749');for(let i=0;i<STAIRS.length-1;i++){const [ax,az]=STAIRS[i],[bx,bz]=STAIRS[i+1],len=Math.hypot(bx-ax,bz-az),yaw=Math.atan2(bx-ax,bz-az);
      for(let t=0;t<=len;t+=.62){const x=ax+(bx-ax)*t/len,z=az+(bz-az)*t/len,slab=new THREE.Mesh(new THREE.BoxGeometry(2.8,.16,.56),slabMat);slab.position.set(x,terrainHeight(x,z)+.06,z);slab.rotation.y=yaw;scene.add(slab)}}
    }
  // Cổng Yên: a plain wooden gate at the south end of the main axis.
  const yenGate=new THREE.Group();{const g=yenGate;g.position.set(0,0,34.2);const post=mat('#5b3d2a'),beam=mat('#6b4a32');for(const x of [-2.4,2.4]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.2,.24,4.4,10),post);p.position.set(x,2.2,0);g.add(p);const foot=new THREE.Mesh(new THREE.CylinderGeometry(.34,.38,.3,10),stone);foot.position.set(x,.15,0);g.add(foot)}
    const top=new THREE.Mesh(new THREE.BoxGeometry(6.4,.32,.5),beam);top.position.y=4.5;g.add(top);const tie=new THREE.Mesh(new THREE.BoxGeometry(5.2,.2,.3),beam);tie.position.y=3.7;g.add(tie);
    const roofG=new THREE.Mesh(new THREE.BoxGeometry(7,.14,1.1),mat('#4b3a31'));roofG.position.y=4.74;g.add(roofG);scene.add(g)}
  // Simple ritual altar within sanctuary; all offerings are local visual feedback for now.
  const altar=new THREE.Group();altar.position.set(0,TERRACE_TOP+.08,STATUE.z+2.7);shrine.add(altar);
  const altarBase=new THREE.Mesh(new THREE.CylinderGeometry(.62,.7,.22,24),mat('#6b4a32'));altar.add(altarBase);
  const offerings=[];const seenOfferings=new Set();
  window.addEventListener('anyen-offering',e=>{const kind=e.detail?.kind;if(!['incense','flower','candle'].includes(kind))return;
    const offeringId=String(e.detail?.offeringId||'');if(offeringId){if(seenOfferings.has(offeringId))return;seenOfferings.add(offeringId);if(seenOfferings.size>200)seenOfferings.delete(seenOfferings.values().next().value)}
    const count=offerings.length;const x=(count%5-2)*.30,z=Math.floor(count/5)*.28;
    const obj=new THREE.Group();obj.position.set(x,.22,z);altar.add(obj);
    if(kind==='incense'){
      const pot=new THREE.Mesh(new THREE.CylinderGeometry(.13,.17,.18,16),mat('#8e7153'));obj.add(pot);
      const stick=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.62,8),mat('#a87a4b'));stick.position.y=.36;obj.add(stick);
      const smokeMat=new THREE.MeshBasicMaterial({color:'#d9d4c5',transparent:true,opacity:.28,depthWrite:false});
      for(let j=0;j<5;j++){const puff=new THREE.Mesh(new THREE.SphereGeometry(.075+j*.018,9,7),smokeMat.clone());puff.position.set(Math.sin(j*.8)*.045,.72+j*.18,0);obj.add(puff);(window.anyenSmokePuffs ||= []).push({mesh:puff,phase:j*.7+count});}
    }else if(kind==='flower'){
      const leaf=new THREE.Mesh(new THREE.CylinderGeometry(.19,.19,.04,14),mat('#558d69'));obj.add(leaf);
      for(let j=0;j<9;j++){const a=j*Math.PI*2/9,p=new THREE.Mesh(new THREE.SphereGeometry(.11,9,8),mat(j%2?'#f5c6d5':'#e79fb8'));p.scale.set(.65,1.4,.5);p.position.set(Math.cos(a)*.12,.14,Math.sin(a)*.12);p.rotation.y=-a;obj.add(p)}
      const center=new THREE.Mesh(new THREE.SphereGeometry(.065,10,8),mat('#f2d28c'));center.position.y=.18;obj.add(center);
    }else{
      // Đèn dầu đất nung dạng chén, tương ứng hình nghi thức bình an.
      const clay=mat('#ad4f34'),rimMat=mat('#d77b52'),oilMat=new THREE.MeshStandardMaterial({color:'#6d3928',metalness:.12,roughness:.42,side:THREE.DoubleSide});
      const foot=new THREE.Mesh(new THREE.CylinderGeometry(.105,.13,.06,24),clay);foot.position.y=.035;obj.add(foot);
      const bowl=new THREE.Mesh(new THREE.CylinderGeometry(.20,.115,.14,32,1,true),clay);bowl.position.y=.13;obj.add(bowl);
      const lip=new THREE.Mesh(new THREE.TorusGeometry(.19,.025,8,32),rimMat);lip.rotation.x=Math.PI/2;lip.position.y=.205;obj.add(lip);
      const oil=new THREE.Mesh(new THREE.CircleGeometry(.168,32),oilMat);oil.rotation.x=-Math.PI/2;oil.position.y=.192;obj.add(oil);
      const wick=new THREE.Mesh(new THREE.CylinderGeometry(.009,.009,.07,8),mat('#33221b'));wick.position.set(.09,.225,0);obj.add(wick);
      const flame=new THREE.Mesh(new THREE.ConeGeometry(.046,.15,14),new THREE.MeshBasicMaterial({color:'#ffba55'}));flame.position.set(.09,.33,0);obj.add(flame);(window.anyenFlames ||= []).push({mesh:flame,phase:count});
    }
    offerings.push(obj);
    document.getElementById('zenHint').textContent=kind==='flower'?'🪷 Đã dâng hoa sen':kind==='incense'?'🪔 Đã dâng hương':'🕯️ Đã dâng nến';
  });
  const leaf=mat('#47745c'),pink=mat('#e5a9aa'),petal=mat('#edc6b4');
  // Hồ Sen lotus: floating notched pads, raised bowl-shaped leaves on stems, open flowers with layered pointed petals
  // around a yellow seed pod, and a few closed buds. Kept clear of the bridge.
  const lotusLeaf=mat('#3f7a4c'),lotusLeafPale=mat('#5f9a5c'),lotusStem=mat('#5c8a4a'),petalOuter=mat('#ef9fb9'),petalMid=mat('#f3abc2'),petalInner=mat('#f7bfcf'),seedPod=mat('#e2cf62'),budMat=mat('#e98aaa');
  const padGeo=new THREE.CircleGeometry(.5,20,.18,Math.PI*2-.36),bowlGeo=new THREE.LatheGeometry([new THREE.Vector2(0,0),new THREE.Vector2(.25,.05),new THREE.Vector2(.5,.15),new THREE.Vector2(.62,.24)],18),petalGeo=new THREE.SphereGeometry(.5,10,8);
  // cánh mỏng, màu nhạt dần từ mũi cánh (hồng) xuống chân cánh (trắng hồng): mỗi lớp một hình có tô màu theo chiều dài cánh
  const petalGradMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.85,side:THREE.DoubleSide,emissive:'#ff6fa6',emissiveIntensity:.16});
  function petalGrad(tipHex,baseHex){const g=new THREE.SphereGeometry(.5,12,10),P=g.attributes.position,c=new Float32Array(P.count*3),a=new THREE.Color(baseHex),b=new THREE.Color(tipHex),t=new THREE.Color();
    for(let i=0;i<P.count;i++){const u=Math.min(1,Math.max(0,P.getY(i)+.5)),k=u*u*(3-2*u);t.copy(a).lerp(b,Math.pow(k,1.3));c[i*3]=t.r;c[i*3+1]=t.g;c[i*3+2]=t.b}
    g.setAttribute('color',new THREE.BufferAttribute(c,3));return g}
  const petalGeoOuter=petalGrad('#ff6fa8','#fff0f5'),petalGeoMid=petalGrad('#ff82b4','#fff4f8'),petalGeoInner=petalGrad('#ff9cc4','#fffafb');
  function lotusPetal(group,angle,tilt,len,wid,geo,y){const pivot=new THREE.Group();pivot.position.y=y;pivot.rotation.y=angle;const tip=new THREE.Group();tip.rotation.x=tilt;const p=new THREE.Mesh(geo,petalGradMat);p.scale.set(wid,len,wid*.16);p.position.y=len*.5;tip.add(p);pivot.add(tip);group.add(pivot);}
  function lotusFlower(h){const g=new THREE.Group();const stem=new THREE.Mesh(new THREE.CylinderGeometry(.025,.03,h,6),lotusStem);stem.position.y=h/2;g.add(stem);const head=new THREE.Group();head.position.y=h;g.add(head);
    // cánh tròn, xếp 3 lớp so le: ngoài xoè rộng, giữa nghiêng vừa, trong khép ôm gương sen
    for(let k=0;k<8;k++)lotusPetal(head,k*Math.PI*2/8,1.05,.36,.27,petalGeoOuter,0);
    for(let k=0;k<8;k++)lotusPetal(head,(k+.5)*Math.PI*2/8,.7,.33,.25,petalGeoMid,.025);
    for(let k=0;k<6;k++)lotusPetal(head,k*Math.PI*2/6+.2,.38,.27,.21,petalGeoInner,.05);
    const pod=new THREE.Mesh(new THREE.CylinderGeometry(.09,.065,.09,12),seedPod);pod.position.y=.1;head.add(pod);return g;}
  function lotusBud(h){const g=new THREE.Group();const stem=new THREE.Mesh(new THREE.CylinderGeometry(.022,.026,h,6),lotusStem);stem.position.y=h/2;g.add(stem);const bud=new THREE.Mesh(new THREE.SphereGeometry(.13,10,8),budMat);bud.scale.set(1,1.8,1);bud.position.y=h+.14;g.add(bud);const cap=new THREE.Mesh(new THREE.ConeGeometry(.09,.16,10),budMat);cap.position.y=h+.42;g.add(cap);return g;}
  function lotusPad(r){const pad=new THREE.Mesh(padGeo,Math.random()<.5?lotusLeaf:lotusLeafPale);pad.rotation.x=-Math.PI/2;pad.rotation.z=Math.random()*Math.PI*2;pad.scale.setScalar(r);return pad;}
  function raisedLeaf(h){const g=new THREE.Group();const stem=new THREE.Mesh(new THREE.CylinderGeometry(.022,.028,h,6),lotusStem);stem.position.y=h/2;g.add(stem);const leaf=new THREE.Mesh(bowlGeo,lotusLeaf);leaf.position.y=h;leaf.rotation.set((Math.random()-.5)*.4,0,(Math.random()-.5)*.4);g.add(leaf);return g;}
  // Tuyến thuyền ngắm cảnh: vòng số 8 nhỏ (khoảng 130 m, 60 giây) đi giữa hai cánh hồ sen, chui gầm cầu vòm ở giữa lạch hai lần.
  const BEN_SEN={x:-9,z0:.6,z1:8.8,w:1.7};
  const BOAT_LOOP=(()=>{const pts=[[0,-4],[6,-7],[12,-10.5],[19,-11.5],[25.5,-8],[26.5,-1.5],[22,3],[15,3.5],[8,.5],[0,-4],[-8,-8.5],[-15,-11.5],[-22,-11],[-26.5,-6],[-25.5,0],[-19,3.2],[-14,1.4],[-10.5,-1.3],[-6.5,-2]].map(([x,z])=>new THREE.Vector3(x,0,z));
    return new THREE.CatmullRomCurve3(pts,true,'centripetal').getSpacedPoints(300).map(v=>[v.x,v.z])})();
  function loopDistance(x,z){let best=Infinity;for(let i=0;i<BOAT_LOOP.length;i++){const [ax,az]=BOAT_LOOP[i],[bx,bz]=BOAT_LOOP[(i+1)%BOAT_LOOP.length],vx=bx-ax,vz=bz-az,u=Math.max(0,Math.min(1,((x-ax)*vx+(z-az)*vz)/(vx*vx+vz*vz||1)));best=Math.min(best,Math.hypot(ax+vx*u-x,az+vz*u-z))}return best}
  const flowers=[];
  const lotusRand=(()=>{let a=0x5e17;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}})();
  for(let i=0,tries=0;i<120&&tries<6000;tries++){const x=(lotusRand()*2-1)*32,z=-4+(lotusRand()*2-1)*12;
    if(lakeSDF(x,z)>-1.4||Math.abs(x)<3.2||loopDistance(x,z)<2.1||Math.hypot(x-BEN_SEN.x,z-3.5)<4.2)continue;/* inside a lobe, clear of the bridge channel and the boat lane */
    if(flowers.some(f=>Math.hypot(f.position.x-x,f.position.z-z)<2.05))continue;i++;const a=lotusRand()*6.28;
    const clump=new THREE.Group();clump.position.set(x,-.03,z);clump.rotation.y=a;clump.userData.y0=-.03;
    for(let k=0;k<3;k++){const pad=lotusPad(.7+Math.random()*.6);pad.position.set((Math.random()-.5)*1.4,0,(Math.random()-.5)*1.4);clump.add(pad)}
    if(i%2===0){const leaf=raisedLeaf(.45+Math.random()*.4);leaf.position.set(.45,0,-.3);clump.add(leaf)}
    if(i%3!==2){const fl=lotusFlower(.35+Math.random()*.35);fl.position.set(-.2,0,.15);clump.add(fl)}else{const bud=lotusBud(.4+Math.random()*.3);bud.position.set(-.1,0,.1);clump.add(bud)}
    scene.add(clump);flowers.push(clump)}
  // 3.15: Ba thuyền ngắm cảnh trên hồ sen. Thuyền neo ở Bến Sen (cầu gỗ bờ nam, phía tây cầu vòm). Chạm thuyền để lên;
  // thuyền tự đi một vòng hình số 8 qua hai cánh hồ, chui gầm cầu vòm hai lần, rồi về đúng chỗ neo. Mỗi thuyền một người;
  // thuyền đang có người thì người khác thấy thuyền đi trên hồ và chờ chiếc khác.
  const BOAT_SPEED=2.25,BOAT_STEP_MS=900;/* one loop (about 135 m from the pier and back) in about 60 s */
  function makeBoat(){const g=new THREE.Group(),hullMat=mat('#6d4d2f'),trim=mat('#684a31');
   const outline=(k)=>{const sh=new THREE.Shape();sh.moveTo(-1.35*k,0);sh.quadraticCurveTo(-1.05*k,-.62*k,-.6*k,-.64*k);sh.lineTo(.6*k,-.64*k);sh.quadraticCurveTo(1.05*k,-.62*k,1.35*k,0);sh.quadraticCurveTo(1.05*k,.62*k,.6*k,.64*k);sh.lineTo(-.6*k,.64*k);sh.quadraticCurveTo(-1.05*k,.62*k,-1.35*k,0);return sh};
   const wall=outline(1);wall.holes.push(outline(.88));
   const hullWall=new THREE.Mesh(new THREE.ExtrudeGeometry(wall,{depth:.36,bevelEnabled:false,curveSegments:10}),hullMat);hullWall.rotation.x=-Math.PI/2;g.add(hullWall);
   const floor=new THREE.Mesh(new THREE.ExtrudeGeometry(outline(.92),{depth:.1,bevelEnabled:false,curveSegments:10}),mat('#624a33'));floor.rotation.x=-Math.PI/2;floor.position.y=.02;g.add(floor);
   const rim=new THREE.Mesh(new THREE.ExtrudeGeometry((()=>{const r=outline(1.03);r.holes.push(outline(.9));return r})(),{depth:.05,bevelEnabled:false,curveSegments:10}),trim);rim.rotation.x=-Math.PI/2;rim.position.y=.36;g.add(rim);
   const bench=new THREE.Mesh(new THREE.BoxGeometry(.3,.05,1.12),trim);bench.position.set(-.55,.3,0);g.add(bench);
   return {group:g};}
  // Bến Sen: a wooden pier from the south shore into the west lobe; three moorings, two on its west side, one on the east.
  const BOAT_SLOTS=[{x:-10.75,z:4.7,land:[-9.4,4.7]},{x:-10.75,z:1.9,land:[-9.4,1.9]},{x:-7.25,z:3.2,land:[-8.6,3.2]}];
  {const deckM=mat('#684a31'),postM=mat('#5a3a2a'),len=BEN_SEN.z1-BEN_SEN.z0;
    const deck=new THREE.Mesh(new THREE.BoxGeometry(BEN_SEN.w,.14,len),deckM);deck.position.set(BEN_SEN.x,.18,(BEN_SEN.z0+BEN_SEN.z1)/2);scene.add(deck);
    for(let z=BEN_SEN.z0+.25;z<BEN_SEN.z1;z+=.45){const plank=new THREE.Mesh(new THREE.BoxGeometry(BEN_SEN.w+.04,.02,.05),mat('#624a33'));plank.position.set(BEN_SEN.x,.26,z);scene.add(plank)}
    for(let z=BEN_SEN.z0+.2;z<BEN_SEN.z1-1.5;z+=1.5)for(const s of [-1,1]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.08,.09,1.4,6),postM);p.position.set(BEN_SEN.x+s*(BEN_SEN.w/2+.05),-.2,z);scene.add(p)}
    for(const s of BOAT_SLOTS){const bol=new THREE.Mesh(new THREE.CylinderGeometry(.09,.11,.5,8),postM);bol.position.set(s.land[0]+(s.x<BEN_SEN.x?-.6:.6),.4,s.z);scene.add(bol)}
    const cv=document.createElement('canvas');cv.width=512;cv.height=128;const cx=cv.getContext('2d');cx.fillStyle='#3a2b1f';cx.fillRect(0,0,512,128);cx.strokeStyle='#c8a96a';cx.lineWidth=6;cx.strokeRect(6,6,500,116);cx.fillStyle='#f4e2b9';cx.font='bold 54px sans-serif';cx.textAlign='center';cx.textBaseline='middle';cx.fillText('🚣 BẾN SEN',256,66);
    const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;const board=new THREE.Mesh(new THREE.PlaneGeometry(1.8,.45),new THREE.MeshBasicMaterial({map:tex,transparent:true,side:THREE.DoubleSide}));board.position.set(BEN_SEN.x,1.6,BEN_SEN.z1-.3);scene.add(board);
    for(const s of [-1,1]){const p=new THREE.Mesh(new THREE.CylinderGeometry(.05,.06,1.6,6),postM);p.position.set(BEN_SEN.x+s*.8,.8,BEN_SEN.z1-.32);scene.add(p)}}
  const boats=BOAT_SLOTS.map((s,i)=>{const b={...makeBoat(),i,slot:s,busy:false};b.group.position.set(s.x,.02,s.z);b.group.rotation.y=Math.PI-Math.PI/2;b.group.traverse(o=>o.userData.boatIndex=i);scene.add(b.group);return b});
  let boatRide=null,pendingBoat=null;
  const onBoat=()=>!!boatRide&&(boatRide.phase==='row'||boatRide.phase==='pause');
  function boatRoute(b){const s=b.slot,n=BOAT_LOOP.length;let k=0,best=1e9;BOAT_LOOP.forEach(([x,z],i)=>{const d=Math.hypot(x-s.x,z-s.z);if(d<best){best=d;k=i}});const pts=[];for(let j=1;j<=n;j++)pts.push(BOAT_LOOP[(k+j)%n]);pts.push([s.x,s.z]);return pts}
  const boatHud=document.createElement('div');boatHud.id='boatHud';boatHud.hidden=true;
  boatHud.innerHTML='<span id="boatHudLabel">🚣 Dạo hồ sen</span><button type="button" data-boat="pause">⏸ Dừng ngắm</button><button type="button" data-boat="home">⏹ Về bến</button>';document.body.appendChild(boatHud);
  function refreshBoatHud(){const r=boatRide;boatHud.hidden=!onBoat();if(!r)return;const done=Math.round(100*(r.travelled||0)/(r.total||1));
    boatHud.querySelector('#boatHudLabel').textContent='🚣 Thuyền Sen '+(r.b.i+1)+' · '+(r.home?'đang về bến':r.phase==='pause'?'đang dừng ngắm':'dạo hồ '+done+'%');
    boatHud.querySelector('[data-boat="pause"]').textContent=r.phase==='pause'?'▶ Đi tiếp':'⏸ Dừng ngắm';boatHud.querySelector('[data-boat="pause"]').hidden=!!r.home;}
  boatHud.addEventListener('click',e=>{const a=e.target.closest('[data-boat]')?.dataset.boat,r=boatRide;if(!a||!r||!onBoat())return;
    if(a==='pause'){r.phase=r.phase==='pause'?'row':'pause';document.getElementById('zenHint').textContent=r.phase==='pause'?'⏸ Thuyền đang dừng · Vuốt để nhìn quanh':'🚣 Thuyền đi tiếp…'}
    else if(a==='home'){r.home=true;r.phase='row';document.getElementById('zenHint').textContent='🚣 Thuyền đang về Bến Sen…'}refreshBoatHud()});
  function boardBoat(b=pendingBoat){pendingBoat=null;if(!b)return;if(b.busy){document.getElementById('zenHint').textContent='🚣 Thuyền vừa có người lên, mời bạn chọn chiếc khác';return;}
    walkRoute.length=0;pendingSeat=null;const route=boatRoute(b);let total=0,px=b.slot.x,pz=b.slot.z;for(const [x,z] of route){total+=Math.hypot(x-px,z-pz);px=x;pz=z}
    boatRide={b,phase:'board',start:performance.now(),x0:mePosition.x,z0:mePosition.z,heading:Math.PI,path:route,total,travelled:0,heading0:Math.PI,home:false}}
  function tapBoat(i){const b=boats[i];if(boatRide||!b)return;
    if(b.busy){document.getElementById('zenHint').textContent='🚣 Thuyền đang có người đi dạo, mời bạn chọn chiếc khác';return;}
    if(meActivity==='sit'){document.getElementById('realtimeSit')?.click();setTimeout(()=>tapBoat(i),60);return;}
    if(meActivity==='walk')document.getElementById('realtimeWalk')?.click();
    const [lx,lz]=b.slot.land;if(Math.hypot(mePosition.x-lx,mePosition.z-lz)<1.3){pendingBoat=b;boardBoat();return;}
    if(navigateTo(lx,lz)){pendingBoat=b;document.getElementById('zenHint').textContent='🚣 Đang ra Bến Sen…';}}
  function boatTap(){if(!boatRide)return false;document.getElementById('zenHint').textContent=boatRide.home?'🚣 Thuyền đang về Bến Sen…':'🚣 Thuyền đang dạo hồ · Dùng nút Dừng ngắm hoặc Về bến';return true;}
  let lastBoatFrame=0;
  function updateBoatRide(now){
    const r=boatRide,dt=Math.min(.25,(now-(lastBoatFrame||now))/1000);lastBoatFrame=now;walkRoute.length=0;const g=r.b.group;
    if(r.phase==='board'){const u=Math.min(1,(now-r.start)/BOAT_STEP_MS),e=u*u*(3-2*u);mePosition.set(r.x0+(g.position.x-r.x0)*e,0,r.z0+(g.position.z-r.z0)*e);if(u>=1){r.phase='row';viewYaw=r.heading;r.heading0=r.heading;document.getElementById('zenHint').textContent='🚣 Thuyền rời Bến Sen, dạo một vòng hồ sen…';refreshBoatHud()}}
    else if(r.phase==='row'){
      // Give way: another boat close ahead (or meeting us under the bridge) and we pause until it has passed.
      {const fx=Math.sin(r.heading),fz=Math.cos(r.heading);let wait=false;for(const p of onlineAvatars.values()){if(!p.boat||!p.boat.group.visible)continue;const q=p.boat.group.position,ox=q.x-g.position.x,oz=q.z-g.position.z,d=Math.hypot(ox,oz);if(d>4.5||d<.01)continue;const ahead=(ox*fx+oz*fz)/d;if(ahead>.35&&!(ahead<.8&&r.b.i<p.boatIndex)){wait=true;break}}
        if(wait!==!!r.yielding){r.yielding=wait;document.getElementById('zenHint').textContent=wait?'🚣 Thuyền chờ một chút để thuyền khác đi qua…':'🚣 Thuyền đi tiếp…'}if(wait){mePosition.set(g.position.x,0,g.position.z);g.position.y=.02+Math.sin(now/700)*.025;return}}
      const hPrev=r.heading;let left=(r.home?BOAT_SPEED*2:BOAT_SPEED)*dt;/* Về bến: finish the loop four times faster, still on the water */
      while(left>0&&r.path.length){const [tx,tz]=r.path[0],dx=tx-g.position.x,dz=tz-g.position.z,d=Math.hypot(dx,dz);
        if(d<=left){g.position.x=tx;g.position.z=tz;left-=d;r.travelled+=d;r.path.shift();continue}
        g.position.x+=dx/d*left;g.position.z+=dz/d*left;r.travelled+=left;left=0;const want=Math.atan2(dx,dz);let dh=want-r.heading;dh=Math.atan2(Math.sin(dh),Math.cos(dh));r.heading+=dh*Math.min(1,dt*4)}
      viewYaw+=r.heading-hPrev;r.heading0+=r.heading-hPrev;/* the view turns with the boat */
      mePosition.set(g.position.x,0,g.position.z);if(!r.path.length){r.phase='dock';r.start=now}
      if(Math.round(now/500)!==r.hudTick){r.hudTick=Math.round(now/500);refreshBoatHud()}}
    else if(r.phase==='pause'){mePosition.set(g.position.x,0,g.position.z)}
    else if(r.phase==='dock'){let dh=Math.PI-r.heading;dh=Math.atan2(Math.sin(dh),Math.cos(dh));r.heading+=dh*Math.min(1,dt*3);if(Math.abs(dh)<.05||now-r.start>1500){r.phase='ashore';r.start=now;boatHud.hidden=true}}
    else if(r.phase==='ashore'){const u=Math.min(1,(now-r.start)/BOAT_STEP_MS),e=u*u*(3-2*u),[lx,lz]=r.b.slot.land;mePosition.set(g.position.x+(lx-g.position.x)*e,0,g.position.z+(lz-g.position.z)*e);
      if(u>=1){g.position.set(r.b.slot.x,.02,r.b.slot.z);r.heading=Math.PI;g.rotation.set(0,Math.PI/2,0);boatRide=null;mePosition.set(lx,0,lz);viewYaw=walkYaw=0;boatHud.hidden=true;window.dispatchEvent(new CustomEvent('anyen-position',{detail:{x:lx,z:lz}}));document.getElementById('zenHint').textContent='Đã về Bến Sen · Chạm thuyền để dạo thêm vòng nữa';return}}
    g.rotation.y=(r.heading||0)-Math.PI/2;g.position.y=.02+Math.sin(now/700)*.025;g.rotation.z=Math.sin(now/900)*.02;
  }
  // 3.8: Rừng thông kiểu Đà Lạt. Thân cao thẳng màu nâu đỏ, tán xếp thành nhiều tầng mỏng ở phần ngọn,
  // cây cao thấp xen nhau; dưới gốc là thảm lá thông, ngoài trảng là thảm cỏ xanh lốm đốm vàng, điểm vài cụm hoa dại nhỏ và khóm dã quỳ.
  // Mỗi loại cây/hoa/đá là một InstancedMesh (một lần vẽ), nên vài trăm cây vẫn nhẹ cho điện thoại.
  // Rừng sinh từ một hạt giống cố định: mọi khách nhìn thấy cùng một khu rừng.
  const treeSpots=[],TREE_CLEAR=1.0,TREE_CELL=4,treeGrid=new Map();
  const treeCellKey=(cx,cz)=>cx*1000+cz;
  /* mỗi cây có bán kính chặn riêng (t[2]): thân + tán thấp ngang đầu người + thân người, để không đi xuyên cây */
  function treeBlocked(x,z){const cx=Math.floor(x/TREE_CELL),cz=Math.floor(z/TREE_CELL);for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const a=treeGrid.get(treeCellKey(cx+i,cz+j));if(a)for(const t of a)if(Math.hypot(x-t[0],z-t[1])<(t[2]||TREE_CLEAR))return t}return null}
  function pushOutOfTrees(x,z){const t=treeBlocked(x,z);if(!t)return [x,z];const R=(t[2]||TREE_CLEAR)+.02,d=Math.hypot(x-t[0],z-t[1]);return d>1e-3?[t[0]+(x-t[0])*R/d,t[1]+(z-t[1])*R/d]:[t[0]+R,t[1]]}
  const FOREST_DEFAULT={seed:1121,inner:340,outer:460,inner_gap:3.8,outer_gap:2.3,flower_patches:150,daquy:70,rocks:70};
  let forestKey=JSON.stringify(FOREST_DEFAULT);const forestMeshes=[],forestTrees=[];
  function seededRandom(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  // Merge simple parts into one geometry with per-vertex colours, so a whole tree is a single draw.
  function mergeColored(parts){let n=0;const geos=parts.map(([g,c])=>{const q=g.index?g.toNonIndexed():g;n+=q.attributes.position.count;return [q,c]});
    const pos=new Float32Array(n*3),nor=new Float32Array(n*3),col=new Float32Array(n*3);let o=0;
    for(const [g,c] of geos){const k=g.attributes.position.count;pos.set(g.attributes.position.array,o*3);if(!g.attributes.normal)g.computeVertexNormals();nor.set(g.attributes.normal.array,o*3);const cc=new THREE.Color(c);for(let i=0;i<k;i++){col[(o+i)*3]=cc.r;col[(o+i)*3+1]=cc.g;col[(o+i)*3+2]=cc.b}o+=k}
    const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.BufferAttribute(pos,3));out.setAttribute('normal',new THREE.BufferAttribute(nor,3));out.setAttribute('color',new THREE.BufferAttribute(col,3));return out}
  const part=(geo,x,y,z,sx=1,sy=1,sz=1,ry=0,rz=0)=>{const g=geo.clone();g.scale(sx,sy,sz);if(rz)g.rotateZ(rz);if(ry)g.rotateY(ry);g.translate(x,y,z);return g};
  // Tree templates, built at a nominal height and scaled per instance.
  function pineTemplates(){
    const bark='#6e4632',barkDark='#5a3a2a',needle=['#2f5a3c','#3a6a45','#2a5236','#45734a'];
    const blob=new THREE.IcosahedronGeometry(1,0),cyl=(rt,rb,h)=>new THREE.CylinderGeometry(rt,rb,h,7,1),cone=(r,h)=>new THREE.ConeGeometry(r,h,7,1);
    // Tall Pinus kesiya: long bare trunk, a few short dead branch stubs, crown of flat tiers in the top third.
    const tall=(H,tiers,stubs)=>mergeColored([[part(cyl(.13,.42,H),0,H/2,0),bark],
      ...stubs.map(([y,a])=>[part(cyl(.03,.06,1.3),Math.sin(a)*.55,y,Math.cos(a)*.55,1,1,1,a,1.25),barkDark]),
      ...tiers.map(([x,y,z,sx,sy,sz],i)=>[part(blob,x,y,z,sx,sy,sz,i*.9),needle[i%4]])]);
    return {
      tallA:{h:17,geo:tall(17,[[0,16.7,0,1.4,.8,1.4],[.9,15.5,.4,2.1,.7,1.8],[-1.1,14.6,-.3,2.2,.62,1.9],[.5,13.5,-1,1.9,.58,1.7],[-.5,12.5,1,1.8,.55,1.6],[1.3,11.8,.2,1.3,.5,1.2]],[[6,0],[7.5,2.2],[9,4.1],[10.4,1.1]])},
      tallB:{h:15,geo:tall(15,[[.3,14.7,0,1.3,.8,1.3],[-.9,13.7,.5,2.3,.62,1.8],[1.1,12.9,-.4,2.1,.6,1.9],[-.3,11.8,-.9,1.8,.55,1.6],[.8,11,.9,1.4,.5,1.3]],[[5,1],[6.8,3.3],[8.6,5.2]])},
      mid:{h:10,geo:mergeColored([[part(cyl(.09,.26,10),0,5,0),bark],[part(cone(2.2,3),0,6.1,0),needle[1]],[part(cone(1.8,2.7),0,7.6,0,1,1,1,.4),needle[0]],[part(cone(1.25,2.3),0,8.9,0,1,1,1,.9),needle[3]],[part(cone(.6,1.6),0,10.1,0),needle[1]]])},
      young:{h:4.6,geo:mergeColored([[part(cyl(.05,.11,2),0,1,0),bark],[part(cone(1.25,2.1),0,2,0),needle[3]],[part(cone(.9,1.8),0,3.1,0,1,1,1,.5),needle[1]],[part(cone(.5,1.2),0,4.05,0),needle[0]]])}
    };}
  const forestMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true});
  // Pines that block the view are moved into a small see-through "ghost" copy of their kind and fade there,
  // with a per-instance alpha (gAlpha); they move back when the view is clear. Nothing is removed.
  const GHOST_CAP=72,ghostMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,flatShading:true,transparent:true,depthWrite:false});
  ghostMat.onBeforeCompile=sh=>{sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nattribute float gAlpha;\nvarying float vGAlpha;').replace('#include <begin_vertex>','#include <begin_vertex>\nvGAlpha=gAlpha;');
    sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying float vGAlpha;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vGAlpha;')};
  function makeGhost(geo){const g=geo.clone();g.setAttribute('gAlpha',new THREE.InstancedBufferAttribute(new Float32Array(GHOST_CAP).fill(1),1));const m=new THREE.InstancedMesh(g,ghostMat,GHOST_CAP);m.setColorAt(0,new THREE.Color(1,1,1));m.count=0;m.frustumCulled=false;m.userData.slots=[];return m}
  const grassMat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide});
  // Open ground that must stay clear of trees: water, paths, plazas, hilltop, stairs, ponds, buildings, piers.
  function forestClear(x,z,pad){
    if(Math.hypot(x-TT_SPOT[0],z-TT_SPOT[1])<9+pad)return true;
    if(rectHit(VAN_HOA.x,VAN_HOA.z,VAN_HOA.rot,VAN_HOA.W+5,VAN_HOA.D+5,x,z,pad)||(Math.abs(z-VH_ROAD_Z)<2.6+pad&&x>VH_ROAD_X1-2&&x<0)||(Math.abs(x-VAN_HOA.x)<2.6+pad&&z>VH_ROAD_Z&&z<VAN_HOA.z))return true;/* Nhà Văn Hóa và đường lát đá */
    if(Math.hypot(x-VIV.x,z-VIV.z)<7+pad||Math.hypot(x-TU_GIA.x,z-TU_GIA.z-1.5)<13+pad)return true;/* Cổng Viverse, Tư Gia + Góc Gieo Hạt */
    if(lakeSDF(x,z)<2.4+pad)return true;
    if(Math.abs(x)<4.6+pad&&z>-37&&z<40)return true;
    if(Math.hypot(x-GATHER.x,z-GATHER.z)<11+pad||Math.hypot(x-FOOT.x,z-FOOT.z)<9+pad)return true;
    if(Math.abs(x)<20&&z>11&&z<33)return true;/* the arrival meadow */
    const hr=Math.hypot(x-HILL.x,z-HILL.z);if(hr<HILL.flat+2.5)return true;if(hr<HILL.foot&&z>HILL.z&&Math.abs(x)<15)return true;/* keep the statue visible from the gate */
    if(stairsDistance(x,z)<3.2+pad)return true;
    if(branchDistance(x,z)<2.8+pad)return true;
    if(BRANCHES.some(b=>{const c=b[b.length-8];return Math.hypot(x-c[0],z-c[1])<9+pad}))return true;/* flower gardens at the junctions */
    if(wishLakes.some(l=>!l.lotus&&Math.hypot(x-l.x,z-l.z)<POND_R+4.5+pad))return true;
    if(houseHit(x,z,3.5+pad)||inFrontStrip(x,z))return true;
    if(WILLOW_SPOTS.some(w=>Math.hypot(x-w.x,z-w.z)<5+pad))return true;
    if(SENSE_HOUSES.some(h=>h.id==='xuong_gom'&&rectHit(h.x,h.z,h.rot,h.W+14,h.D+2,x,z,3+pad)))return true;/* firing yard, straw and woodpile beside the workshop */
    if(Math.abs(x-BEN_SEN.x)<4+pad&&z>BEN_SEN.z0-2&&z<BEN_SEN.z1+4+pad)return true;
    return false;}
  const inWalkArea=(x,z)=>Math.abs(x)<72&&z<36&&z>-124;
  function buildForest(p){
    for(const m of forestMeshes){scene.remove(m);m.geometry.dispose()}forestMeshes.length=0;forestTrees.length=0;treeSpots.length=0;treeGrid.clear();
    const rnd=seededRandom(p.seed||1),T=pineTemplates(),kinds=Object.keys(T),list={tallA:[],tallB:[],mid:[],young:[]};
    const placedTrees=[],near=new Map(),nearKey=(x,z)=>treeCellKey(Math.floor(x/TREE_CELL),Math.floor(z/TREE_CELL));
    const tooClose=(x,z,gap)=>{const cx=Math.floor(x/TREE_CELL),cz=Math.floor(z/TREE_CELL);for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const a=near.get(treeCellKey(cx+i,cz+j));if(a)for(const t of a)if(Math.hypot(x-t[0],z-t[1])<gap)return true}return false};
    const addTree=(x,z,kind,h)=>{const t=[x,z,kind,h];placedTrees.push(t);const k=nearKey(x,z);if(!near.has(k))near.set(k,[]);near.get(k).push(t);list[kind].push(t)};
    // Inner forest: open stands of tall pines, a few young ones near clearings. Outer belt: denser, all sizes.
    for(let n=0,tries=0;n<p.inner&&tries<p.inner*60;tries++){const x=(rnd()*2-1)*70,z=-122+rnd()*156;if(forestClear(x,z,0)||tooClose(x,z,p.inner_gap))continue;
      const r=rnd(),kind=r<.1?'tallA':r<.19?'tallB':r<.72?'mid':'young';/* ít cây cao hơn: rừng thoáng, nhiều thông vừa và non */const t=T[kind];addTree(x,z,kind,t.h*(kind==='young'?.6+rnd()*.6:.78+rnd()*.42));n++}
    for(let n=0,tries=0;n<p.outer&&tries<p.outer*60;tries++){const x=(rnd()*2-1)*104,z=-153+rnd()*216;if(inWalkArea(x,z)&&!(Math.abs(x)>66||z>31||z<-118))continue;if(forestClear(x,z,0)||tooClose(x,z,p.outer_gap))continue;
      const r=rnd(),kind=r<.14?'tallA':r<.25?'tallB':r<.72?'mid':'young';const t=T[kind];addTree(x,z,kind,t.h*(kind==='young'?.6+rnd()*.6:.75+rnd()*.45));n++}
    const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),sc=new THREE.Vector3(),c=new THREE.Color();
    for(const kind of kinds){const arr=list[kind];if(!arr.length)continue;const mesh=new THREE.InstancedMesh(T[kind].geo,forestMat,arr.length);
      arr.forEach((t,i)=>{const [x,z,,h]=t,s=h/T[kind].h,w=s*(.85+rnd()*.3);e.set((rnd()-.5)*.05,rnd()*Math.PI*2,(rnd()-.5)*.05);q.setFromEuler(e);v.set(x,terrainHeight(x,z)-.08,z);sc.set(w,s,w);m4.compose(v,q,sc);mesh.setMatrixAt(i,m4);
        c.setHSL(.0,0,.86+rnd()*.24);c.offsetHSL((rnd()-.5)*.025,0,0);mesh.setColorAt(i,c);
        if(Math.abs(x)<76&&z<40&&z>-128){/* cả cây sát mép khu đi dạo cũng chặn */if(inWalkArea(x,z))treeSpots.push([x,z]);const k=nearKey(x,z);if(!treeGrid.has(k))treeGrid.set(k,[]);/* thân gốc .42·w (cây cao), .26·w (vừa); thông non có tán thấp 1.25·w ngang đầu; cộng .45 thân người */treeGrid.get(k).push([x,z,kind==='young'?1.25*w+.45:kind==='mid'?Math.max(.26*w+.55,.95):.42*w+.55])}
        forestTrees.push({x,z,mesh,index:i,matrix:m4.clone(),alpha:1,slot:-1})});
      mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.frustumCulled=false;scene.add(mesh);forestMeshes.push(mesh);
      const ghost=makeGhost(T[kind].geo);scene.add(ghost);forestMeshes.push(ghost);mesh.userData.ghost=ghost}
    paintGround(placedTrees,rnd);
    try{if(typeof mePosition!=='undefined'&&!bayMode&&treeBlocked(mePosition.x,mePosition.z)){const [px,pz]=pushOutOfTrees(mePosition.x,mePosition.z);mePosition.x=px;mePosition.z=pz}}catch(e){}
    window.__forestCount=()=>({tall:list.tallA.length+list.tallB.length,mid:list.mid.length,young:list.young.length,walkTall:placedTrees.filter(t=>inWalkArea(t[0],t[1])&&t[2].startsWith('tall')).length,walkAll:placedTrees.filter(t=>inWalkArea(t[0],t[1])).length,all:placedTrees.map(t=>[+t[0].toFixed(2),+t[1].toFixed(2),t[2],+t[3].toFixed(2)])});
    // Hoa dại nhỏ: thỉnh thoảng một cụm vài bông, mỗi cụm một hai màu; ba dáng hoa (cúc năm cánh, chuông nhỏ, chùm sao).
    {const pet=new THREE.SphereGeometry(.034,5,3),stemG=new THREE.CylinderGeometry(.006,.008,.14,3),eyeG=new THREE.SphereGeometry(.02,5,3),bellG=new THREE.ConeGeometry(.04,.07,6,1,true),W='#ffffff',D='#5a4320',S='#3d5a2a';
      const shapes=[
        mergeColored([[part(stemG,0,.07,0),S],...[0,1,2,3,4].map(k=>[part(pet,Math.cos(k*1.257)*.042,.145,Math.sin(k*1.257)*.042,1,.35,1),W]),[part(eyeG,0,.152,0,1,.6,1),D]]),
        mergeColored([[part(stemG,0,.084,0,1,1.2,1),S],[part(bellG,0,.165,0,1,1,1,0,Math.PI),W],[part(stemG,.03,.07,.01,1,.9,1,0,-.4),S],[part(bellG,.06,.13,.02,.8,.8,.8,0,Math.PI),W]]),
        mergeColored([[part(stemG,0,.06,0),S],[part(pet,0,.13,0),W],[part(pet,.045,.11,.02,.9,.9,.9),W],[part(pet,-.03,.115,-.035,.85,.85,.85),W],[part(pet,-.01,.1,.045,.8,.8,.8),W]])];
      const palette=['#f6f3ea','#f7dc5e','#f3a6c4','#b08ae0','#8db6ee','#ec7f5c','#e6b3f0','#fff2a8','#f08aa0'].map(h=>new THREE.Color(h)),byShape=shapes.map(()=>[]);
      const flowerOk=(x,z)=>lakeSDF(x,z)>.8&&!(Math.abs(x)<2.3&&z>-37&&z<36)&&Math.hypot(x-GATHER.x,z-GATHER.z)>GATHER.r+.4&&Math.hypot(x-FOOT.x,z-FOOT.z)>FOOT.r+.4&&Math.hypot(x-HILL.x,z-HILL.z)>8.7&&stairsDistance(x,z)>1.7
        &&!wishLakes.some(l=>!l.lotus&&Math.hypot(x-l.x,z-l.z)<POND_R+.45)&&!houseHit(x,z,1.2)&&branchDistance(x,z)>1.4&&!treeBlocked(x,z)&&Math.abs(x)<72&&z<36&&z>-124;
      for(let patch=0,tries=0;patch<p.flower_patches&&tries<p.flower_patches*40;tries++){const cx=(rnd()*2-1)*70,cz=-122+rnd()*156;if(!flowerOk(cx,cz))continue;patch++;
        const shape=Math.floor(rnd()*shapes.length),c1=palette[Math.floor(rnd()*palette.length)],c2=rnd()<.5?c1:palette[Math.floor(rnd()*palette.length)],n=3+Math.floor(rnd()*8);
        for(let k=0;k<n;k++){const a=rnd()*Math.PI*2,r=Math.sqrt(rnd())*1.1,x=cx+Math.cos(a)*r,z=cz+Math.sin(a)*r;if(flowerOk(x,z))byShape[shape].push([x,z,rnd()<.7?c1:c2])}}
      byShape.forEach((pts,si)=>{if(!pts.length)return;const mesh=new THREE.InstancedMesh(shapes[si],grassMat,pts.length);
        pts.forEach(([x,z,col],i)=>{const sz=.8+rnd()*.6;e.set((rnd()-.5)*.2,rnd()*Math.PI*2,(rnd()-.5)*.2);q.setFromEuler(e);v.set(x,terrainHeight(x,z)-.01,z);sc.set(sz,sz*(.8+rnd()*.5),sz);m4.compose(v,q,sc);mesh.setMatrixAt(i,m4);mesh.setColorAt(i,col)});
        mesh.instanceMatrix.needsUpdate=true;mesh.instanceColor.needsUpdate=true;mesh.frustumCulled=false;scene.add(mesh);forestMeshes.push(mesh)})}
    // Dã quỳ (wild sunflowers, Đà Lạt in November): leafy bushes topped with yellow flowers, along clearings and the main axis.
    {const leafG=new THREE.IcosahedronGeometry(.36,0),stemG=new THREE.CylinderGeometry(.02,.025,.5,4),head=new THREE.CylinderGeometry(.15,.11,.05,9),eye=new THREE.CylinderGeometry(.055,.055,.07,6);
      const parts=[[part(leafG,0,.3,0,1.3,.9,1.2),'#2f5a3a'],[part(leafG,.28,.48,.12,1,.85,1,1),'#3a6842'],[part(leafG,-.25,.52,-.1,.9,.8,.9,2),'#34613d']];
      [[0,1.05,0],[.32,.98,.22],[-.3,.94,.16],[.12,.9,-.33],[-.18,1.12,-.2],[.4,.86,-.12],[-.38,.84,-.2]].forEach(([x,y,z],k)=>{parts.push([part(stemG,x*.7,y-.25,z*.7),'#4f7a3a']);parts.push([part(head,x,y,z,1,1,1,k,(k%3-1)*.25),'#f4c21f']);parts.push([part(eye,x,y+.025,z,1,1,1,0,(k%3-1)*.25),'#8a5a1e'])});
      const geo=mergeColored(parts),pts=[];
      for(let tries=0;pts.length<p.daquy&&tries<p.daquy*120;tries++){const x=(rnd()*2-1)*71,z=-123+rnd()*158,lk=lakeSDF(x,z),ax=Math.abs(x);
        const edge=(ax>18.6&&ax<21.6&&z>11&&z<33)||(ax>5.2&&ax<7.6&&((z>4&&z<17)||(z>-36&&z<-13)))||(lk>2.6&&lk<4&&z>-4);
        if(!edge||ax<4.8||treeBlocked(x,z)||houseHit(x,z,2)||branchDistance(x,z)<1.8||Math.hypot(x-GATHER.x,z-GATHER.z)<GATHER.r+3||Math.hypot(x-FOOT.x,z-FOOT.z)<FOOT.r+2)continue;
        if(pts.some(([px,pz])=>Math.hypot(px-x,pz-z)<2.2)||Math.hypot(x-BEN_SEN.x,z-BEN_SEN.z1)<4)continue;pts.push([x,z])}
      const mesh=new THREE.InstancedMesh(geo,forestMat,Math.max(1,pts.length));
      pts.forEach(([x,z],i)=>{const s=.6+rnd()*.35;e.set(0,rnd()*Math.PI*2,0);q.setFromEuler(e);v.set(x,terrainHeight(x,z),z);sc.set(s,s*(.9+rnd()*.4),s);m4.compose(v,q,sc);mesh.setMatrixAt(i,m4)});mesh.count=pts.length;
      mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;scene.add(mesh);forestMeshes.push(mesh)}
    // Mossy rocks under the pines and along the shore.
    {const geo=mergeColored([[part(new THREE.DodecahedronGeometry(.6,0),0,.18,0,1.3,.6,1),'#6c7066'],[part(new THREE.DodecahedronGeometry(.45,0),.1,.38,.05,1.1,.35,.9),'#4b6648']]),pts=[];
      for(let tries=0;pts.length<p.rocks&&tries<p.rocks*60;tries++){const x=(rnd()*2-1)*71,z=-124+rnd()*160,lk=lakeSDF(x,z);
        if(!(lk>.6&&lk<2.2)&&rnd()<.6)continue;if(forestClear(x,z,-2.4)&&!(lk>.6&&lk<2.2))continue;if(Math.abs(x)<2.6&&z>-37&&z<36)continue;if(stairsDistance(x,z)<2||Math.hypot(x-HILL.x,z-HILL.z)<HILL.flat||treeBlocked(x,z))continue;
        if(wishLakes.some(l=>!l.lotus&&Math.hypot(x-l.x,z-l.z)<POND_R+1)||houseHit(x,z,2)||branchDistance(x,z)<1.8||Math.hypot(x-GATHER.x,z-GATHER.z)<GATHER.r+.8||Math.hypot(x-FOOT.x,z-FOOT.z)<FOOT.r+.8)continue;if(Math.hypot(x-BEN_SEN.x,z-BEN_SEN.z1)<3)continue;pts.push([x,z])}
      const mesh=new THREE.InstancedMesh(geo,forestMat,Math.max(1,pts.length));
      pts.forEach(([x,z],i)=>{const s=.5+rnd()*1.1;e.set(0,rnd()*Math.PI*2,0);q.setFromEuler(e);v.set(x,terrainHeight(x,z)-.05,z);sc.set(s,s*(.7+rnd()*.5),s);m4.compose(v,q,sc);mesh.setMatrixAt(i,m4)});mesh.count=pts.length;
      mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;scene.add(mesh);forestMeshes.push(mesh)}
  }
  // Ground colours: mottled grass with dry patches, a needle carpet under every pine, earth along the main axis,
  // darker wet soil at the shore, muddy lake bed, darker forest floor on the outer slopes.
  function paintGround(trees,rnd){
    const hash=(i,j)=>{const h=Math.sin(i*127.1+j*311.7)*43758.5453;return h-Math.floor(h)};
    const vnoise=(x,z)=>{const i=Math.floor(x),j=Math.floor(z),fx=x-i,fz=z-j,ux=fx*fx*(3-2*fx),uz=fz*fz*(3-2*fz);const a=hash(i,j),b=hash(i+1,j),c2=hash(i,j+1),d=hash(i+1,j+1);return a+(b-a)*ux+(c2-a)*uz+(a-b-c2+d)*ux*uz};
    const fbm=(x,z)=>.6*vnoise(x,z)+.3*vnoise(x*2.1+7,z*2.1+3)+.1*vnoise(x*4.3+1,z*4.3+9);
    const C=h=>new THREE.Color(h),grassA=C('#1f4637'),grassB=C('#2d5a43'),dry=C('#4d5f3f'),needles=C('#463b29'),earth=C('#4b4535'),wet=C('#1b3d33'),bed=C('#1a302c'),floor=C('#183629'),moss=C('#2a5240');
    const grid=new Map();for(const t of trees){const k=treeCellKey(Math.floor(t[0]/TREE_CELL),Math.floor(t[1]/TREE_CELL));if(!grid.has(k))grid.set(k,[]);grid.get(k).push(t)}
    const nearestTree=(x,z)=>{let best=99;const cx=Math.floor(x/TREE_CELL),cz=Math.floor(z/TREE_CELL);for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const a=grid.get(treeCellKey(cx+i,cz+j));if(a)for(const t of a){const d=Math.hypot(x-t[0],z-t[1])/(t[3]>8?1:.6);if(d<best)best=d}}return best};
    const pos=ground.geometry.attributes.position,col=ground.geometry.attributes.color,out=new THREE.Color();
    for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),lk=lakeSDF(x,z);
      if(lk<0){out.copy(bed)}else{
        const n=fbm(x*.06,z*.06),n2=fbm(x*.17+11,z*.17+5);out.copy(grassA).lerp(grassB,n);out.lerp(dry,smoothstep(.62,.82,n2)*.55);
        const rim=Math.max((Math.abs(x)-70)/14,(z-37)/12,(-z-125)/10);if(rim>0)out.lerp(floor,smoothstep(0,.6,rim));
        const hr=Math.hypot(x-HILL.x,z-HILL.z);if(hr<HILL.foot&&hr>HILL.flat)out.lerp(moss,.35);
        out.lerp(needles,smoothstep(3.4,.7,nearestTree(x,z))*.8);
        out.lerp(earth,Math.max(z>-37&&z<36?smoothstep(2.6,1.5,Math.abs(x)):0,smoothstep(2.4,1.2,stairsDistance(x,z))*(hr<HILL.foot?1:0),smoothstep(GATHER.r+1,GATHER.r-.6,Math.hypot(x-GATHER.x,z-GATHER.z)),smoothstep(FOOT.r+1,FOOT.r-.6,Math.hypot(x-FOOT.x,z-FOOT.z)),smoothstep(2.1,1,branchDistance(x,z)))*.85);
        out.lerp(wet,smoothstep(1.6,0,lk)*.7);}
      col.setXYZ(i,out.r,out.g,out.b)}
    col.needsUpdate=true;}
  // 3.35: Vòng đá cuội viền bờ hồ sen hai cánh, cùng kiểu viền sáu hồ giác quan (đá tròn dẹt, năm sắc xám be). Đi dọc mép nước của hai cánh
  // và hai bờ lạch giữa, chừa chỗ cầu vòm và Bến Sen. Một InstancedMesh cho cả vòng (một lần vẽ), nhẹ máy.
  {const pts=[],STEP=.66,OUT=.18,skip=(x,z)=>Math.abs(x)<2.4||(Math.abs(x-BEN_SEN.x)<1.25&&z>0);
    const keep=(x,z,a)=>{if(Math.abs(lakeSDF(x,z))>.03||skip(x,z))return;const ox=x+Math.cos(a)*OUT,oz=z+Math.sin(a)*OUT;if(lakeSDF(ox,oz)<OUT*.6)return;pts.push([ox,oz,a])};
    for(const [cx,rx,rz] of LOTUS_LAKE.lobes){let t=0;while(t<Math.PI*2){const x=cx+rx*Math.cos(t),z=LOTUS_LAKE.z+rz*Math.sin(t);keep(x,z,Math.atan2(Math.sin(t)/rz,Math.cos(t)/rx));t+=STEP/Math.hypot(rx*Math.sin(t),rz*Math.cos(t))}}
    for(const s of [-1,1])for(let x=-LOTUS_LAKE.channel[0]+STEP/2;x<LOTUS_LAKE.channel[0];x+=STEP)keep(x,LOTUS_LAKE.z+s*LOTUS_LAKE.channel[1],s*Math.PI/2);
    const cols=['#77766a','#898779','#9b9787','#6d7069','#a6a08e'].map(c=>new THREE.Color(c)),m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),sc=new THREE.Vector3();
    const rim=new THREE.InstancedMesh(pondStoneGeo,pondStoneMat,pts.length);
    pts.forEach(([x,z,a],i)=>{const s=.27+(i%4)*.028;e.set(.04*(i%3),a+(i%2)*.3,.06*(i%4));q.setFromEuler(e);v.set(x,Math.max(terrainHeight(x,z),-.05)+.09,z);sc.set(s*1.05,.14+(i%3)*.02,s*.82);
      rim.setMatrixAt(i,m4.compose(v,q,sc));rim.setColorAt(i,cols[(i*7)%5])});
    rim.instanceMatrix.needsUpdate=true;rim.instanceColor.needsUpdate=true;scene.add(rim)}
  // 3.16: Viền cỏ thấp quanh hồ sen, điểm xuyết hoa nhỏ. Hai cây liễu rũ bên bờ đã bỏ (26/11/2026); chỗ cũ vẫn để trống, không mọc thêm thông.
  const WILLOW_SPOTS=[{x:12.5,z:10.6},{x:-35,z:5}];
  {const rnd=seededRandom(5150),tufts=[],blooms=[];
    const shoreOk=(x,z)=>{const lk=lakeSDF(x,z);if(lk<.15||lk>2.3)return false;if(Math.abs(x)<2.3&&z>BRIDGE_ARCH[0]-3&&z<BRIDGE_ARCH[1]+4)return false;if(Math.abs(x)<2.2)return false;if(Math.abs(x-BEN_SEN.x)<1.6&&z>4&&z<BEN_SEN.z1+1)return false;return true};
    for(let tries=0;tufts.length<2600&&tries<40000;tries++){const x=(rnd()*2-1)*36,z=-21+rnd()*34;if(!shoreOk(x,z))continue;const lk=lakeSDF(x,z);if(rnd()>1.15-lk*.4)continue;tufts.push([x,z,lk])}
    for(let tries=0;blooms.length<380&&tries<40000;tries++){const x=(rnd()*2-1)*36,z=-21+rnd()*34;if(!shoreOk(x,z)||lakeSDF(x,z)<.35)continue;blooms.push([x,z])}
    const blade=(a,h,c)=>{const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute([-.035,0,0,.035,0,0,.05,h,.03],3));g.computeVertexNormals();return [part(g,0,0,0,1,1,1,a),c]};
    const tuftGeo=mergeColored([blade(0,.26,'#2f5a3a'),blade(1.3,.2,'#3a6842'),blade(2.5,.3,'#34613d'),blade(3.6,.18,'#2b5234'),blade(4.8,.24,'#3a6842')]);
    const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),sc=new THREE.Vector3(),c=new THREE.Color();
    const tm=new THREE.InstancedMesh(tuftGeo,grassMat,tufts.length);
    tufts.forEach(([x,z,lk],i)=>{const s=.7+rnd()*.7;e.set(0,rnd()*Math.PI*2,0);q.setFromEuler(e);v.set(x,Math.max(terrainHeight(x,z),-.05)-.01,z);sc.set(s,s*(lk<.8?1.25:1),s);m4.compose(v,q,sc);tm.setMatrixAt(i,m4);c.setRGB(.85+rnd()*.3,.9+rnd()*.25,.85+rnd()*.2);tm.setColorAt(i,c)});
    tm.instanceMatrix.needsUpdate=true;tm.instanceColor.needsUpdate=true;tm.frustumCulled=false;scene.add(tm);
    const stem=new THREE.CylinderGeometry(.005,.006,.13,3),dot=new THREE.SphereGeometry(.026,5,3),bloomGeo=mergeColored([[part(stem,0,.065,0),'#3d5a2a'],[part(dot,0,.14,0,1,.55,1),'#ffffff'],[part(dot,.03,.125,.02,.8,.5,.8),'#ffffff'],[part(dot,-.025,.12,-.02,.75,.5,.75),'#ffffff']]);
    const cols=['#f6f3ea','#f7dc5e','#f3a6c4','#b9a0e6','#9cc4f0','#fff2a8'].map(h=>new THREE.Color(h)),bm=new THREE.InstancedMesh(bloomGeo,grassMat,blooms.length);
    blooms.forEach(([x,z],i)=>{const s=.8+rnd()*.5;e.set(0,rnd()*Math.PI*2,0);q.setFromEuler(e);v.set(x,terrainHeight(x,z)-.01,z);sc.set(s,s,s);m4.compose(v,q,sc);bm.setMatrixAt(i,m4);bm.setColorAt(i,cols[Math.floor(rnd()*cols.length)])});
    bm.instanceMatrix.needsUpdate=true;bm.instanceColor.needsUpdate=true;bm.frustumCulled=false;scene.add(bm);
    }
  /* Rừng thông (cây + bản đồ data/world-pine_forest.json) chỉ dựng khi vào Rừng Yên; vào thẳng Vịnh Yên thì không tải */
  let forestBuilt=false,forestWant=FOREST_DEFAULT,forestMapLoader=null;
  function ensureForest(){if(forestBuilt)return;forestBuilt=true;buildForest(forestWant);if(forestMapLoader)forestMapLoader()}
  /* Trang lite: không dựng rừng (cây, cỏ, bản đồ) */if(!window.anyenPendingBay&&!window.anyenLite)ensureForest();
  window.addEventListener('anyen-3d-enter',()=>{if(!window.anyenPendingBay&&!window.anyenLite)ensureForest()});
  // Obstacles between the camera and the avatar fade to see-through (never removed): pines via their ghost copies,
  // buildings and large props via their own materials.
  const hiddenMatrix=new THREE.Matrix4().makeScale(0,0,0),tmpColor=new THREE.Color(),tmpMatrix=new THREE.Matrix4(),FADE_MIN=.2;
  function ghostAdd(t){const g=t.mesh.userData.ghost;if(!g||g.count>=GHOST_CAP)return false;const s=g.count++;g.userData.slots[s]=t;t.slot=s;t.alpha=1;
    g.setMatrixAt(s,t.matrix);t.mesh.getColorAt(t.index,tmpColor);g.setColorAt(s,tmpColor);g.geometry.attributes.gAlpha.array[s]=1;
    g.instanceMatrix.needsUpdate=true;g.instanceColor.needsUpdate=true;g.geometry.attributes.gAlpha.needsUpdate=true;t.mesh.setMatrixAt(t.index,hiddenMatrix);t.mesh.instanceMatrix.needsUpdate=true;return true}
  function ghostRemove(t){const g=t.mesh.userData.ghost,s=t.slot,last=g.count-1,ga=g.geometry.attributes.gAlpha;
    if(s!==last){const o=g.userData.slots[last];g.getMatrixAt(last,tmpMatrix);g.setMatrixAt(s,tmpMatrix);g.getColorAt(last,tmpColor);g.setColorAt(s,tmpColor);ga.array[s]=ga.array[last];g.userData.slots[s]=o;o.slot=s}
    g.count=last;g.userData.slots.length=last;t.slot=-1;t.alpha=1;t.mesh.setMatrixAt(t.index,t.matrix);t.mesh.instanceMatrix.needsUpdate=true;g.instanceMatrix.needsUpdate=true;g.instanceColor.needsUpdate=true;ga.needsUpdate=true}
  const fadeables=[];
  function addFadeable(obj,x,z,r){const mats=[];obj.traverse(o=>{if(o.isMesh&&o.material&&!Array.isArray(o.material)){o.material=o.material.clone();mats.push({m:o.material,op:o.material.opacity,tr:o.material.transparent,dw:o.material.depthWrite})}});fadeables.push({x,z,r,mats,alpha:1})}
  function fadeBlockingTrees(cam,target,dt){const ax=cam.x,az=cam.z,bx=target.x,bz=target.z,vx=bx-ax,vz=bz-az,len2=vx*vx+vz*vz||1,k=Math.min(1,dt*7);
    const blocks=(x,z,r)=>{const u=((x-ax)*vx+(z-az)*vz)/len2;return u>0&&u<1&&Math.hypot(ax+vx*u-x,az+vz*u-z)<r};
    const W=22+Math.sqrt(len2);for(const t of forestTrees){const far=(Math.abs(t.x-bx)>W||Math.abs(t.z-bz)>W)&&(Math.abs(t.x-ax)>9||Math.abs(t.z-az)>9);if(far&&t.slot<0)continue;const want=!far&&(blocks(t.x,t.z,1.7+Math.min(camZoom,2)*.8)||Math.hypot(t.x-ax,t.z-az)<3+Math.min(camZoom,1.5)*4)?FADE_MIN:1;
      if(t.slot<0){if(want===1||!ghostAdd(t))continue}
      t.alpha+=(want-t.alpha)*k;if(want===1&&t.alpha>.97){ghostRemove(t);continue}
      const ga=t.mesh.userData.ghost.geometry.attributes.gAlpha;ga.array[t.slot]=t.alpha;ga.needsUpdate=true}
    // Buildings fade only when they stand between the camera and the avatar, not when the avatar faces them.
    const uAvatar=Math.max(.05,1-5/Math.sqrt(len2)),blocksAvatar=(x,z,r)=>{const u=((x-ax)*vx+(z-az)*vz)/len2;return u>0&&u<uAvatar&&Math.hypot(ax+vx*u-x,az+vz*u-z)<r};
    for(const f of fadeables){const want=blocksAvatar(f.x,f.z,f.r)?.25:1;if(f.alpha===want)continue;f.alpha+=(want-f.alpha)*k;if(Math.abs(f.alpha-want)<.02)f.alpha=want;
      const on=f.alpha<1;for(const e of f.mats){if(e.m.transparent!==(on||e.tr)){e.m.transparent=on||e.tr;e.m.needsUpdate=true}e.m.opacity=e.op*f.alpha;e.m.depthWrite=on?false:e.dw}}}
  addFadeable(orchidHouse,ORCHID.x,ORCHID.z,Math.hypot(ORCHID.w,ORCHID.d)/2*.85);for(const h of SENSE_HOUSES)addFadeable(h.group,h.x,h.z,h.r*.85);addFadeable(yenGate,0,34.2,4.2);addFadeable(bodhiTree,STATUE.x,STATUE.z-11.7,3.2);
  // Waypoint navigation: smooth guided movement between five destinations.
  const destinations={
    gate:{pos:[0,4.5,42],look:[0,4,0]},
    garden:{pos:[-15,3.6,24],look:[-6,1.5,8]},
    lotus:{pos:[10,3.8,16],look:[0,.4,-4]},
    meditation:{pos:[-6,HILL.top+4.2,STATUE.z+13.8],look:[0,HILL.top+1.6,STATUE.z+2.8]},
    sanctuary:{pos:[0,HILL.top+4,STATUE.z+11.3],look:[0,HILL.top+2.6,STATUE.z]}
  };

  // 4 vòng tròn chuyển cảnh trên cột vàng đã bỏ (26/11/2026); chuyển khu bằng các nút chọn khu.
  let currentLook=new THREE.Vector3(0,3,-13),targetLook=currentLook.clone();
  const targetPosition=new THREE.Vector3(...destinations.gate.pos);
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
  let dragging3d=false,moved=false,lastX=0,lastY=0,downX=0,downY=0,lookOffset=0;

  // Camera zoom: pinch with two fingers, mouse wheel, or the ＋/－ buttons. Remembered on this device.
  let camZoom=1,camZoomS=null;try{const z=Number(localStorage.getItem('yen_cam_zoom'));if(z>=.45&&z<=3)camZoom=z}catch(e){}
  // Camera height, like dragging the scene: swipe down to raise the camera (see more from above), swipe up to lower it toward eye level.
  let camLift=1;try{const v=Number(localStorage.getItem('yen_cam_lift'));if(v>=.35&&v<=2.6)camLift=v}catch(e){}
  camZoomS=camZoom;
  const setCamLift=v=>{camLift=Math.max(.35,Math.min(2.6,v));try{localStorage.setItem('yen_cam_lift',String(camLift))}catch(e){}};
  const setZoom=z=>{camZoom=Math.max(.45,Math.min(3,z));try{localStorage.setItem('yen_cam_zoom',String(camZoom))}catch(e){}};
  renderer.domElement.addEventListener('wheel',e=>{if(!document.body.classList.contains('immersive'))return;e.preventDefault();
    // chuột (dòng/trang) và bàn di (pixel) đổi về cùng một thang; mỗi nấc tối đa ±18% để không giật
    const dy=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1),f=Math.exp(Math.max(-.18,Math.min(.18,dy*(e.ctrlKey?.006:.0012))));if(bayMode){bayZoomBy(f);return}setZoom(camZoom*f)},{passive:false});
  // Hai ngón: chỉ zoom (không xoay, không nâng camera); mỗi lần chạm thêm/bớt ngón thì lấy mốc lại nên không bị giật.
  {let pinch0=0,ang0=0,g2=null;const dist=t=>Math.max(10,Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY)),ang=t=>Math.atan2(t[1].clientY-t[0].clientY,t[1].clientX-t[0].clientX);
    const anchor=e=>{pinch0=e.touches.length===2?dist(e.touches):0;if(e.touches.length===2){ang0=ang(e.touches);g2={mode:null,s:0,a:0}}else g2=null;if(e.touches.length>1)moved=true};
    renderer.domElement.addEventListener('touchstart',anchor,{passive:true});
    /* hai ngón: chụm/mở để zoom, hoặc đặt hai ngón rồi xoay để camera quay vòng quanh nhân vật; mỗi lần chạm chỉ chọn một kiểu */
    renderer.domElement.addEventListener('touchmove',e=>{if(e.touches.length!==2||!pinch0||!g2)return;const d=dist(e.touches),f=Math.max(.8,Math.min(1.25,pinch0/d)),a=ang(e.touches);let da=a-ang0;da=Math.atan2(Math.sin(da),Math.cos(da));pinch0=d;ang0=a;moved=true;
      if(!g2.mode){g2.s+=Math.log(f);g2.a+=da;if(Math.abs(g2.a)>.14)g2.mode='rot';else if(Math.abs(g2.s)>.08)g2.mode='zoom';else return}
      if(g2.mode==='rot'){if(typeof viewYaw==='number')viewYaw-=da;return}
      if(bayMode)bayZoomBy(f);else setZoom(camZoom*f)},{passive:true});
    renderer.domElement.addEventListener('touchend',anchor,{passive:true});renderer.domElement.addEventListener('touchcancel',anchor,{passive:true})}
  {const box=document.createElement('div');box.id='camZoomBox';box.innerHTML='<button type="button" data-z="in" aria-label="Phóng to">＋</button><button type="button" data-z="out" aria-label="Thu nhỏ, nhìn toàn cảnh">－</button>';document.body.appendChild(box);
    box.addEventListener('click',e=>{const b=e.target.closest('[data-z]');if(!b)return;const f=b.dataset.z==='in'?.8:1.25;if(bayMode)bayZoomBy(f,false,true);else setZoom(camZoom*f)})}
  renderer.domElement.addEventListener('pointerdown',e=>{dragging3d=true;moved=false;lastX=downX=e.clientX;lastY=downY=e.clientY;renderer.domElement.setPointerCapture(e.pointerId)});
  renderer.domElement.addEventListener('pointermove',e=>{if(!dragging3d)return;let dx=e.clientX-lastX,dy=e.clientY-lastY;if(Math.hypot(e.clientX-downX,e.clientY-downY)>12)moved=true;lookOffset=Math.max(-1.2,Math.min(1.2,lookOffset+dx*.003));lastX=e.clientX;lastY=e.clientY});
  renderer.domElement.addEventListener('pointercancel',()=>{dragging3d=false;});
  function handleSceneTap(e){
    if(!document.body.classList.contains('immersive'))return;
    const rect=renderer.domElement.getBoundingClientRect();pointer.x=(e.clientX-rect.left)/rect.width*2-1;pointer.y=-(e.clientY-rect.top)/rect.height*2+1;
    raycaster.setFromCamera(pointer,camera);if(bayMode){if(document.body.classList.contains('bay-clean')){document.body.classList.remove('bay-clean');return}bayTap(raycaster);return;}{const o=raycaster.ray.origin,d=raycaster.ray.direction,gh=raycaster.intersectObject(ground,false)[0],tMax=gh?gh.distance:200;let hit=null;for(let t=0;t<tMax;t+=.08){const x=o.x+d.x*t,z=o.z+d.z*t;if(Math.abs(x)>1.95||z<=BRIDGE_ARCH[0]||z>=BRIDGE_ARCH[1])continue;const y=o.y+d.y*t,h=bridgeHeight(z);if(y<=h+(Math.abs(x)>1.55?1.15:.2)&&y>=h-.5){hit=[x,z];break}/* mặt cầu, hoặc lan can hai bên */}
      if(hit){navigateTo(Math.max(-1.2,Math.min(1.2,hit[0])),Math.max(BRIDGE_ARCH[0]+.3,Math.min(BRIDGE_ARCH[1]-.3,hit[1])));return}}/* bấm trúng cầu: đi lên cầu tới đúng chỗ đó */
    const guestHits=raycaster.intersectObjects([...onlineAvatars.values()].map(v=>v.group),true);
    if(guestHits.length){window.dispatchEvent(new Event('anyen-greet'));document.getElementById('zenHint').textContent='🙏 Đã gửi lời chào bình an';return;}
    if(boatRide){if(!boatTap())document.getElementById('zenHint').textContent='🚣 Chờ một chút nhé';return;}
    {const bh=raycaster.intersectObjects(boats.filter(b=>b.group.visible).map(b=>b.group),true);if(bh.length){tapBoat(bh[0].object.userData.boatIndex);return;}}
    const peerBoats=[...onlineAvatars.values()].filter(p=>p.boat&&p.boat.group.visible).map(p=>p.boat.group);if(peerBoats.length&&raycaster.intersectObjects(peerBoats,true).length){document.getElementById('zenHint').textContent='🚣 Thuyền đang có người dạo hồ, mời bạn chọn chiếc khác ở Bến Sen';return;}
    {const fh=raycaster.intersectObjects(FLOWER_GARDENS.flatMap(g=>[g.sign,g.mesh].filter(Boolean)),false);if(fh.length){goToGarden(fh[0].object.userData.garden);return;}}
    if(window.__archTap&&window.__archTap(raycaster))return;
    if(window.__vivGroup&&raycaster.intersectObjects([window.__vivGroup],true).length){goToOrchid();return;}
    if(window.__homeGroup&&raycaster.intersectObjects([window.__homeGroup],true).length){goHome(false);return;}
    if(raycaster.intersectObjects([orchidRing],true).length){goToOrchid();return;}
    if(raycaster.intersectObjects([orchidHouse],true).length){goToHouse(NHA_SAC);return;}
    {const hh=raycaster.intersectObjects([...SENSE_HOUSES.map(h=>h.group),TINH_THAT.group,VAN_HOA.group].filter(Boolean),true);if(hh.length){let o=hh[0].object;while(o&&!o.userData.house)o=o.parent;if(o){goToHouse(o.userData.house);return;}}}
    // Tap any part of a mat (zabuton, zafu or thảm sen petals) to walk there and sit.
    const cushionHits=raycaster.intersectObjects(cushions.map(v=>v.group),true);
    if(cushionHits.length){let obj=cushionHits[0].object;while(obj.parent&&!cushions.some(c=>c.group===obj))obj=obj.parent;const seat=cushions.find(c=>c.group===obj);if(seat){tapSeat(seat);}return;}
    
    const groundHits=raycaster.intersectObject(ground,false);
    if(groundHits.length){const q=groundHits[0].point;if(Math.abs(q.x)<72&&q.z>-124&&q.z<36){navigateTo(q.x,q.z);}}

  }
  let lastTap=null,dtIn=false;const dblZoom=()=>{if(bayMode){bayZoomBy(dtIn?1/.7:.7);dtIn=!dtIn}else{setZoom(camZoom>.85?.6:1);setCamLift(1)}};
  renderer.domElement.addEventListener('pointerup',e=>{dragging3d=false;if(moved)return;const nt=performance.now();if(lastTap&&nt-lastTap.t<330&&Math.hypot(e.clientX-lastTap.x,e.clientY-lastTap.y)<28){lastTap=null;dblZoom()}else lastTap={t:nt,x:e.clientX,y:e.clientY};handleSceneTap(e);});
  // Desktop clicks may land on transparent overlays rather than the WebGL canvas.
  document.addEventListener('click',e=>{if(!document.body.classList.contains('immersive')||e.detail===0)return;if(e.target===renderer.domElement||e.target.closest('button,a,input,select,textarea,label,nav,aside,[role=dialog],#zenToolbar,#zenPanelClose,#zenUnifiedMenu,#zenItemSheet,#zenBagSheet,#zenWishSheet,#zenJournalSheet,#zenJournalOpen,#zenRitualPanel,#zenGestures,#realtimeBox,#resonancePanel,#bayHUD,#bayMap,#baySheet,#profileModal,#anyenWishPanel,#anyenWishQuoteToast,#toast,.profile-bar,.social-demo,.walk-panel,.zone-nav,.zone-help,.zone-action,.immersive-top'))return;handleSceneTap(e);},true);
  window.addEventListener('yen-zone',e=>{let dest=destinations[e.detail];if(!dest)return;targetPosition.set(...dest.pos);targetLook.set(...dest.look);lookOffset=0;if(document.body.classList.contains('immersive')&&zoneWalkPoints[e.detail]){if(meActivity==='sit')document.getElementById('realtimeSit')?.click();if(meActivity==='walk')document.getElementById('realtimeWalk')?.click();navigateTo(...zoneWalkPoints[e.detail]);}});
  $('#left').addEventListener('click',()=>{lookOffset-=.2});$('#right').addEventListener('click',()=>{lookOffset+=.2});
  document.addEventListener('keydown',e=>{if(!document.body.classList.contains('immersive'))return;const keys=['gate','garden','lotus','meditation','sanctuary'];if(e.key==='PageUp'||e.key==='PageDown'){let i=keys.indexOf(activeZone);selectZone(keys[(i+(e.key==='PageUp'?1:4))%5]);e.preventDefault()}});
  window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
  document.querySelector('#sceneMode').textContent='Không gian 3D · Hành trình tương tác';document.body.classList.add('yen-3d-ready');
  // Free-walk demo: first-person camera on navigable ground; lake and temple are bounded.
  // Tốc độ đi bộ chung (m/giây): Rừng Yên, Đảo Yên dùng cùng một giá trị
  const WALK_SPEED=3.2;let walkDt=0;/* thời gian thật giữa hai khung hình cho việc đi bộ: máy chậm (ít khung hình) vẫn đi đúng tốc độ */
  let walking=false,walkYaw=Math.PI,viewYaw=Math.PI,walkPitch=0,tapTarget=null;const walkRoute=[];const walkingKeys=new Set();
  const onlineAvatars=new Map();
  // Local avatar is a separate scene object, never confused with remote peers.
  const me=new THREE.Group();const meTorso=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.8,4,8),mat('#687b48'));meTorso.position.y=1.05;me.add(meTorso);
  const meHead=new THREE.Mesh(new THREE.SphereGeometry(.25,12,10),mat('#e7c9a8'));meHead.position.y=1.85;me.add(meHead);
  const meCanvas=document.createElement('canvas');meCanvas.width=512;meCanvas.height=112;const meCtx=meCanvas.getContext('2d');const meTexture=new THREE.CanvasTexture(meCanvas);
  const meTag=new THREE.Sprite(new THREE.SpriteMaterial({map:meTexture,transparent:true,depthTest:false}));meTag.position.set(0,2.17,0);meTag.scale.set(1.7,.37,1);me.add(meTag);scene.add(me);
  function outfitParts(group,torso){
    const sash=new THREE.Mesh(new THREE.TorusGeometry(.36,.045,6,18),mat('#e8d5ad'));sash.rotation.x=Math.PI/2;sash.position.y=.83;group.add(sash);
    const robe=new THREE.Mesh(new THREE.CylinderGeometry(.34,.51,.82,12),mat('#687b48'));robe.position.y=.57;group.add(robe);
    const vest=new THREE.Mesh(new THREE.BoxGeometry(.72,.7,.44),mat('#d4c8ad'));vest.position.y=1.12;group.add(vest);
    // Seated meditation: legs folded in a round ring, with the robe draping out over them into a round base. Only shown while sitting.
    const lap=new THREE.Group();lap.visible=false;const legMat=mat('#687b48');
    const drape=new THREE.Mesh(new THREE.SphereGeometry(.5,28,12,0,Math.PI*2,0,Math.PI/2),legMat);drape.scale.set(1.04,.8,1.04);drape.position.set(0,-.205,.06);lap.add(drape);
    const legs=new THREE.Mesh(new THREE.TorusGeometry(.34,.11,10,28),legMat);legs.rotation.x=Math.PI/2;legs.scale.set(1,1,.75);legs.position.set(0,-.13,.1);lap.add(legs);
    const feet=new THREE.Mesh(new THREE.SphereGeometry(.1,10,8),mat('#e7c9a8'));feet.scale.set(1.5,.5,.8);feet.position.set(0,.12,.27);lap.add(feet);
    group.add(lap);
    return {sash,robe,vest,lap,legMat};
  }
  function dressAvatar(parts,torso,color,style,sitting){
    const safe=/^#[0-9a-f]{6}$/i.test(color||'')?color:'#687b48';torso.material.color.set(safe);
    const mode=['robe','linen','casual'].includes(style)?style:'robe';
    parts.robe.visible=!sitting;parts.sash.visible=true;parts.vest.visible=mode==='linen';
    // Top and bottom share the chosen colour; every style keeps the light tan sash.
    parts.robe.material.color.set(safe);parts.vest.material.color.set(safe);parts.sash.material.color.set('#e4c37b');
    
    torso.scale.x=mode==='linen'?.91:1;
    const slim=mode==='robe'?1:mode==='linen'?.86:.76;parts.robe.scale.set((sitting?.86:1)*slim,sitting?.5:1,(sitting?.86:1)*slim);parts.robe.position.y=sitting?.12:.57;
    parts.sash.position.y=sitting?.27:.83;parts.vest.position.y=sitting?.56:1.12;parts.vest.scale.y=sitting?.62:1;
    if(parts.lap){parts.lap.visible=!!sitting;parts.legMat.color.set(safe);}
    
  }
  const meOutfit=outfitParts(me,meTorso);let myStyle='linen',myColor='#687b48';
  let meActivity='idle', mePosition=new THREE.Vector3(0,0,24), thirdPerson=true;const spawnSlots=[[-8,24],[-4,27],[0,20.4],[4,27],[8,24],[-12,20],[12,20],[-16,17],[16,17]];const spawnIndex=(crypto.getRandomValues(new Uint32Array(1))[0])%spawnSlots.length;mePosition.set(spawnSlots[spawnIndex][0]+(Math.random()-.5)*1.2,0,spawnSlots[spawnIndex][1]+(Math.random()-.5)*1.2);
  // Navigation around the lotus pond and temple: visibility graph, shortest valid route.
  const zoneWalkPoints={gate:[0,30],garden:[-12,17],lotus:[6,11],meditation:[0,STATUE.z+7.2],sanctuary:[0,STATUE.z+4.2]};
  const routeGuides=[[-17,-19],[-17,-10],[-17,4],[-17,13],[17,-19],[17,-10],[17,4],[17,13],[-11,-22],[11,-22],[-23,0],[23,0],[0,24],[0,14],[0,9],[0,3],[0,-3],[0,-9],[0,-12],[0,-15],[0,-18],[0,-20.5],[-6,-19],[6,-19]];
 for(const l of wishLakes){if(l.lotus)continue;for(let k=0;k<12;k++){const a=k*Math.PI/6;routeGuides.push([l.x+Math.cos(a)*4.65,l.z+Math.sin(a)*4.65]);}}
 for(let k=0;k<24;k++){const a=k*Math.PI/12;routeGuides.push([Math.cos(a)*12.8,-4+Math.sin(a)*12.8]);}
  function walkable(x,z){if(bayMode)return false;
    if(Math.abs(x)>=72||z>=36||z<=-124)return false;
    if(inFrontStrip(x,z))return !wishLakes.some(l=>!l.lotus&&Math.hypot(x-l.x,z-l.z)<POND_R+.6)&&!treeBlocked(x,z);
    // Hồ sen: only the bridge crosses the water.
    if(Math.abs(x-BEN_SEN.x)<BEN_SEN.w/2-.15&&z>BEN_SEN.z0+.3&&z<BEN_SEN.z1)return true;/* Bến Sen pier */
    if(lakeSDF(x,z)<.8)return Math.abs(x)<=1.7&&z>=BRIDGE_ARCH[0]-1.4&&z<=BRIDGE_ARCH[1]+1.4;
    if(Math.abs(x)>1.7&&Math.abs(x)<2.25&&bridgeHeight(z)>.45)return false;/* lan can cầu: chỉ lên cầu ở hai đầu */
    if(wishLakes.some(l=>!l.lotus&&Math.hypot(x-l.x,z-l.z)<POND_R+.6))return false;
    if(houseHit(x,z,.25))return false;
    if(window.__ttHit&&window.__ttHit(x,z))return false;
    if(window.__homeHit&&window.__homeHit(x,z))return false;
    if(window.__vhHit&&window.__vhHit(x,z))return false;
    if(window.__gomHit&&window.__gomHit(x,z))return false;
    if(Math.hypot(x-GATHER.x,z-GATHER.z)<(ZEN_SAN.includes(GATHER)?FOOT_IN-.15:NONBO_R+.35)||Math.hypot(x-FOOT.x,z-FOOT.z)<(ZEN_SAN.includes(FOOT)?FOOT_IN-.15:NONBO_R+.35))return false;
    // Hilltop: the whole flat top is open except the statue's dais and the altar; the slope only along the stairs.
    const hr=Math.hypot(x-STATUE.x,z-STATUE.z);
    if(hr<HILL.flat-.3)return !(hr<2.5||Math.hypot(x-STATUE.x,z-STATUE.z-2.7)<.7);
    if(hr<HILL.foot-1&&stairsDistance(x,z)>1.8)return false;
    return !treeBlocked(x,z);}
  function clearWalk(a,b){for(let i=0;i<=Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.35);i++){const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.35)),t=i/n;if(!walkable(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t))return false;}return true;}
  // A* grid pathfinding. Unlike the old sparse visibility graph, this can route
  // around the central lotus pond and reach all five peripheral ponds.
  // Reliable, bounded A* grid routing, with a binary heap for mobile.
  function findWalkPath(tx,tz){
    const step=1.25,minX=-71,minZ=-123,nx=115,nz=127,N=nx*nz;
    const pos=i=>[minX+(i%nx)*step,minZ+Math.floor(i/nx)*step];
    const cell=(x,z)=>Math.max(0,Math.min(nx-1,Math.round((x-minX)/step)))+nx*Math.max(0,Math.min(nz-1,Math.round((z-minZ)/step)));
    function nearest(x,z){const c=cell(x,z),cx=c%nx,cz=Math.floor(c/nx);for(let r=0;r<=9;r++){let best=-1,dist=Infinity;for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){if(Math.max(Math.abs(dx),Math.abs(dz))!==r)continue;const xx=cx+dx,zz=cz+dz;if(xx<0||zz<0||xx>=nx||zz>=nz)continue;const i=xx+zz*nx,p=pos(i);if(!walkable(...p))continue;const d=Math.hypot(p[0]-x,p[1]-z);if(d<dist){dist=d;best=i}}if(best>=0)return best}return -1}
    if(!findWalkPath.paved||findWalkPath.paved.length!==N){const pv=new Uint8Array(N);for(let i=0;i<N;i++)pv[i]=onPaved(...pos(i))?1:0;findWalkPath.paved=pv}const paved=findWalkPath.paved,GRASS=3;
    const source=nearest(mePosition.x,mePosition.z),target=nearest(tx,tz);if(source<0||target<0)return null;
    const g=new Float64Array(N).fill(Infinity),prev=new Int32Array(N).fill(-1),closed=new Uint8Array(N),heap=[];
    function push(id,score){const v={id,score};heap.push(v);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].score<=score)break;heap[i]=heap[p];i=p}heap[i]=v}
    function pop(){const top=heap[0],last=heap.pop();if(heap.length){let i=0;while(true){let c=i*2+1;if(c>=heap.length)break;if(c+1<heap.length&&heap[c+1].score<heap[c].score)c++;if(heap[c].score>=last.score)break;heap[i]=heap[c];i=c}heap[i]=last}return top}
    g[source]=0;push(source,0);const goal=pos(target);let n=0;
    while(heap.length&&n++<N*8){const u=pop().id;if(closed[u])continue;if(u===target){const raw=[];for(let i=u;i!==source&&i>=0;i=prev[i])raw.push(pos(i));raw.reverse();const off=[0];for(const q of raw)off.push(off[off.length-1]+(onPaved(...q)?0:step));
      const grassOn=(a,b)=>{const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.5));let g2=0;for(let i=1;i<=n;i++)if(!onPaved(a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n))g2+=Math.hypot(b[0]-a[0],b[1]-a[1])/n;return g2};
      const result=[];let anchor=[mePosition.x,mePosition.z],ai=0,k=0;while(k<raw.length){let j=k;while(j+1<raw.length&&clearWalk(anchor,raw[j+1])&&grassOn(anchor,raw[j+1])<=off[j+2]-off[ai]+.8)j++;result.push(raw[j]);anchor=raw[j];ai=j+1;k=j+1}if(clearWalk(anchor,[tx,tz]))result.push([tx,tz]);return result}
      closed[u]=1;const ux=u%nx,uz=Math.floor(u/nx),p=pos(u);for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const xx=ux+dx,zz=uz+dz;if(xx<0||zz<0||xx>=nx||zz>=nz)continue;const v=xx+zz*nx;if(closed[v])continue;const q=pos(v);if(!walkable(...q)||!clearWalk(p,q))continue;const score=g[u]+Math.hypot(dx,dz)*((paved[u]&&paved[v])?1:GRASS);if(score>=g[v])continue;g[v]=score;prev[v]=u;push(v,score+Math.hypot(q[0]-goal[0],q[1]-goal[1])/step)}}
    return null;
  }
  function clearPendingActions(){pendingSeat=null;pendingBoat=false;pendingOrchid=false;pendingHouse=null;arriveYaw=null;pendingGarden=null;pendingOffer=false;pendingKathina=null}
  function navigateTo(x,z){if(window.anyenLite&&!roomOpen){document.getElementById('zenHint').textContent='🍃 Trang lite không đi lại · Thoát để chọn hoạt động khác';return false;}if(bayMode){document.getElementById('zenHint').textContent='⛵ Vịnh Yên · Vuốt để xoay nhìn quanh 360°';return false;}if(boatRide){document.getElementById('zenHint').textContent='🚣 Đợi thuyền cập bến rồi hãy đi bộ nhé';return false;}pendingSeat=null;pendingBoat=false;pendingOrchid=false;pendingHouse=null;arriveYaw=null;pendingGarden=null;pendingOffer=false;pendingKathina=null;
    // Destination selection overrides meditation states, including async realtime updates.
    meActivity='idle';walkGoal=null;tapTarget=null;
    window.dispatchEvent(new CustomEvent('anyen-activity',{detail:{activity:'idle'}}));
    if(!walkable(x,z)){document.getElementById('zenHint').textContent='Không thể đứng trong hồ. Hãy chọn bờ hồ.';return false;}
    let path=findWalkPath(x,z);
    // Some spawn positions are off the grid by a fraction; re-anchor at the nearest safe path point.
    if(!path){const anchors=[[0,16],[0,19],[0,23],[-14,17],[14,17],[0,-20],[0,-28],[-12,-30],[12,-30],[0,STATUE.z+7]];
      const saved=mePosition.clone();for(const [ax,az] of anchors.sort((a,b)=>Math.hypot(a[0]-saved.x,a[1]-saved.z)-Math.hypot(b[0]-saved.x,b[1]-saved.z))){if(!walkable(ax,az))continue;mePosition.set(ax,0,az);path=findWalkPath(x,z);if(path){mePosition.copy(saved);if(clearWalk([saved.x,saved.z],[ax,az]))path.unshift([ax,az]);else{mePosition.set(ax,0,az);}break;}mePosition.copy(saved);}}
    if(!path){document.getElementById('zenHint').textContent='Chưa tìm được lối đi đến bờ hồ.';return false;}
    walkRoute.length=0;walkRoute.push(...path);tapTarget=null;walkDetourFor=null;
    document.getElementById('zenHint').textContent='🚶 Đang di chuyển đến điểm bạn chọn…';return true;
  }

  function paintMe(){let p={};try{p=JSON.parse(localStorage.getItem('yenGuestProfile17')||'{}')}catch{};myStyle=p.style||'linen';myColor=p.color||'#687b48';dressAvatar(meOutfit,meTorso,myColor,myStyle,meActivity==='sit');meCtx.clearRect(0,0,512,112);meCtx.fillStyle='#f4e2b9';meCtx.font='bold 36px sans-serif';meCtx.textAlign='center';meCtx.textBaseline='middle';meCtx.fillText(String(p.name||'Khách Yên').slice(0,24),256,57,470);meTexture.needsUpdate=true;}
  // Tọa cụ ưu tiên Chánh điện; mở rộng theo vòng ngoài khi đầy.
  const cushions=[];
  // Two kinds of seat: the inner rings use the brown zabuton (square mat) with a round zafu on its outer half;
  // the outer rings use lotus cushions (round green base with soft pink petals). userData says where a guest sits.
  const cushionMats={base:mat('#4f7a52'),pink:mat('#e59a86'),peach:mat('#f2b884'),cloth:mat('#6e4a33'),edge:mat('#8a6243'),zafu:mat('#c38a3e'),zafuTop:mat('#d9a456')};
  function buildCushion(kind){const group=new THREE.Group();let base;
    if(kind==='zabuton'){const cloth=new THREE.Mesh(new THREE.BoxGeometry(1.05,.06,1.05),cushionMats.cloth);cloth.position.y=.03;group.add(cloth);const trim=new THREE.Mesh(new THREE.BoxGeometry(1.12,.03,1.12),cushionMats.edge);trim.position.y=.015;group.add(trim);
      base=new THREE.Mesh(new THREE.CylinderGeometry(.36,.4,.18,20),cushionMats.zafu);base.position.set(0,.15,.12);group.add(base);const top=new THREE.Mesh(new THREE.CylinderGeometry(.3,.36,.03,20),cushionMats.zafuTop);top.position.set(0,.255,.12);group.add(top);
      group.userData.sitTop=.27;group.userData.sitBack=.12;}
    else{// Thảm sen: flat octagonal green base with four big puffy petals, peach over pink, like a four-petal lotus.
      base=new THREE.Mesh(new THREE.CylinderGeometry(.56,.58,.06,8),cushionMats.base);base.position.y=.03;group.add(base);
      for(let p=0;p<8;p++){const big=p%2===0,a=p*Math.PI/4+Math.PI/8;const m=new THREE.Mesh(new THREE.SphereGeometry(.2,9,6),big?cushionMats.peach:cushionMats.pink);m.scale.set(big?.95:.8,big?.6:.5,big?1.6:1.3);m.position.set(Math.cos(a)*(big?.24:.2),big?.13:.1,Math.sin(a)*(big?.24:.2));m.rotation.y=-a+Math.PI/2;group.add(m);}
      group.userData.sitTop=.21;group.userData.sitBack=0;}
    group.userData.base=base;return group;}
  const seatLocations=[];
  // Four concentric rings of lotus cushions around the statue: 6/8/11/22 mats, each turned toward the statue.
  // Every ring is offset by half a step, so the corridor straight in front (bridge to altar) stays open.
  const SEAT_RINGS=[3.2,4.3,5.45,6.7],SEAT_COUNTS=[6,8,11,22];
  SEAT_RINGS.forEach((r,ring)=>{const n=SEAT_COUNTS[ring];for(let k=0;k<n;k++){const a=(k+.5)*Math.PI*2/n;seatLocations.push([STATUE.x+Math.sin(a)*r,STATUE.z+Math.cos(a)*r,true,a,ring])}});
  // Overflow seats outside only when the sanctuary is full.
  seatLocations.forEach(([x,z,inner,a=0,ring=0],i)=>{
    if(!walkable(x,z))return;
    // Inner two rings: brown zabuton with zafu. Outer rings: pink lotus cushions.
    const group=buildCushion(ring<2?'zabuton':'lotus');group.position.set(x,HILL.top+TERRACE_TOP,z);group.rotation.y=a;const base=group.userData.base;
    scene.add(group);cushions.push({x,z,mesh:base,inner,group});
  });
  let previousActivity='idle',pendingSeat=null,occupiedPositions=[];
  function seatDistance(s){return Math.hypot(s.x-mePosition.x,s.z-mePosition.z)}
  function seatAvailable(s){return !occupiedPositions.some(p=>Math.hypot(p.x-s.x,p.z-s.z)<.8 || (Number.isFinite(p.seatX)&&Math.hypot(p.seatX-s.x,p.seatZ-s.z)<.7));}
  const statueDistance=s=>Math.round(Math.hypot(s.x-STATUE.x,s.z-STATUE.z)*10)/10;/* rounded so mats on the same ring tie */
  // Nearest free mat to the Buddha; ties go to the mat closer to the guest.
  function chooseSeat(){return cushions.filter(seatAvailable).sort((a,b)=>statueDistance(a)-statueDistance(b)||seatDistance(a)-seatDistance(b))[0]||null;}
  // A tapped mat: only free mats can be chosen. If already sitting elsewhere, stand up and move to it.
  function tapSeat(seat){
    const hint=document.getElementById('zenHint');
    if(meActivity==='sit'&&Math.hypot(seat.x-mePosition.x,seat.z-mePosition.z)<.8){hint.textContent='🧘 Bạn đang ngồi trên tọa cụ này';return;}
    if(!seatAvailable(seat)){hint.textContent='Tọa cụ này đã có người ngồi, hãy chọn tọa cụ trống khác.';return;}
    if(meActivity==='sit'){document.getElementById('realtimeSit')?.click();setTimeout(()=>requestSeat(seat,true),60);return;}
    requestSeat(seat,true);
  }
  function requestSeat(seat,picked){
    if(!seat||!seatAvailable(seat))seat=chooseSeat();
    if(!seat){document.getElementById('zenHint').textContent='Các tọa cụ đã kín, vui lòng chờ một chút.';return;}
    if(meActivity==='walk')document.getElementById('realtimeWalk')?.click();
    if(meActivity==='sit')return;
    if(seatDistance(seat)<.35){mePosition.set(seat.x,0,seat.z);document.getElementById('realtimeSit')?.click();return;}
    if(navigateTo(seat.x,seat.z)){pendingSeat=seat;window.dispatchEvent(new CustomEvent('anyen-seat-intent',{detail:{x:seat.x,z:seat.z}}));document.getElementById('zenHint').textContent=picked?'Đang đến tọa cụ bạn chọn…':seat.inner?'Đang đến tọa cụ trước tượng Phật…':'Chánh điện đã kín, đang đến tọa cụ ngoài sân…';}
  }
  function sitNaturally(){
    // Không dịch chuyển tức thời: chỉ ngồi sau khi đến đúng tọa cụ.
    window.dispatchEvent(new CustomEvent('anyen-position',{detail:{x:mePosition.x,z:mePosition.z}}));
  }
  // While sitting, the same button reads "Ra ngoài": stand up and walk off the terrace to the bridge.
  const MEDITATION_EXIT=[0,-17.2];
  function updateSitButton(){const b=document.querySelector('#zenToolbar [data-zen="sit"]');if(!b)return;const sitting=meActivity==='sit';const label=sitting?'Ra ngoài':'Toạ thiền';b.innerHTML=(sitting?'🚶':'🧘')+'<small>'+label+'</small>';b.setAttribute('aria-label',sitting?'Đứng lên và ra khỏi khu thiền':'Toạ thiền');b.title=label;}
  window.addEventListener('anyen-activity',()=>setTimeout(updateSitButton,0));
  window.addEventListener('anyen-request-sit',()=>{if(bayMode){document.getElementById('realtimeSit')?.click();return;}if(meActivity==='sit'){document.getElementById('realtimeSit')?.click();setTimeout(()=>{if(meActivity==='sit')return;if(navigateTo(...MEDITATION_EXIT))document.getElementById('zenHint').textContent='🚶 Đang rời khu thiền…';},60);return;}requestSeat(chooseSeat());});
  // Sitting avatars rest on the seat (zafu top or lotus centre, from the cushion's userData) and face the statue.
  function seatOnCushion(group,seat){const a=seat.group.rotation.y,{sitTop,sitBack}=seat.group.userData;group.position.set(seat.x+Math.sin(a)*sitBack,seat.group.position.y+sitTop,seat.z+Math.cos(a)*sitBack);group.rotation.y=a+Math.PI;group.userData.yaw=a+Math.PI;}
  function poseAvatar(torso,head,tag,sitting){
    // Seated keeps the standing body width; only the height folds, so the figure doesn't look heavier.
    torso.scale.set(1,sitting?.6:1,1);
    torso.position.y=sitting?.42:1.05;
    head.position.y=sitting?1.06:1.85;
    tag.position.y=sitting?1.44:2.17;
  }
  const roomPalettes={'Sảnh chung':'#092d27','Phòng Sen · 10 người':'#263d36','Phòng Trúc · 20 người':'#183e30','Phòng Riêng':'#342e3e'};

  /* ---- Dữ liệu thế giới dùng chung · Rừng thông ----
     Nằm trong tệp tĩnh data/world-pine_forest.json cùng trang web. Cảnh luôn dựng sẵn từ giá trị gốc ở trên;
     tệp chỉ ghi đè khi tải được, nên thiếu tệp hoặc mất mạng thì cảnh vẫn như cũ. */
  const WORLD_ID='pine_forest';
  let appliedSky='173c35';
  function applyWorld(w,source){
    if(!w||!w.map)return false;
    const m=w.map;
    if(!bayMode){
      if(scene.background&&scene.background.getHexString&&scene.background.getHexString()===appliedSky){scene.background=new THREE.Color(m.sky_color);appliedSky=scene.background.getHexString()}
      if(scene.fog&&scene.fog.density!==undefined){scene.fog.color.set(m.fog_color);scene.fog.density=Number(m.fog_density)}
    }
    hemiLight.color.set(m.hemi_sky);hemiLight.groundColor.set(m.hemi_ground);hemiLight.intensity=Number(m.hemi_intensity);
    sun.color.set(m.sun_color);sun.intensity=Number(m.sun_intensity);if(Array.isArray(m.sun_position))sun.position.set(...m.sun_position);
    for(const n of w.nature||[]){if(n.kind==='pine_forest'){const key=JSON.stringify(n.params);if(key!==forestKey){forestKey=key;forestWant=n.params;if(forestBuilt)buildForest(n.params)}}}
    for(const r of w.rooms||[])if(r.name&&r.palette_color)roomPalettes[r.name]=r.palette_color;
    for(const pr of w.props||[]){if(pr.kind!=='wish_lake')continue;const l=wishLakes.find(v=>v.name===pr.name);if(!l)continue;
      l.x=Number(pr.x);l.z=Number(pr.z);if(pr.params?.color)l.color=pr.params.color;if(pr.params?.theme)l.theme=pr.params.theme;
      const g=lakeVisuals.get(l.name);if(g)g.position.set(l.x,.035,l.z);/* 3.32: mặt nước sáu hồ dùng chung màu xanh ngọc của bản thiết kế */if(l.redrawLabel)l.redrawLabel()}
    window.anyenWorld={id:WORLD_ID,source,map:m,rooms:w.rooms||[],buildings:w.buildings||[],props:w.props||[],npcs:w.npcs||[]};
    window.dispatchEvent(new CustomEvent('anyen-world-loaded',{detail:{id:WORLD_ID,source}}));
    return true;
  }
  let forestMapP=null;forestMapLoader=()=>forestMapP||(forestMapP=(async()=>{try{const r=await fetch('data/world-'+WORLD_ID+'.json',{cache:'no-cache'});if(!r.ok)throw Error('HTTP '+r.status);const data=await r.json();if(!data||!data.map)throw Error('no map');applyWorld(data,'file')}catch(e){window.anyenWorldError=String(e&&e.message||e)}})());if(forestBuilt)forestMapLoader();
  window.addEventListener('anyen-room-scene',e=>{const r=e.detail?.room||'Sảnh chung';scene.background=new THREE.Color(roomPalettes[r]||roomPalettes['Sảnh chung']);document.body.dataset.yenRoom=r==='Phòng Riêng'?'private':r.includes('Sen')?'lotus':r.includes('Trúc')?'bamboo':'lobby';});
  paintMe();window.addEventListener('yen-profile',paintMe);
  // Small turning preview of the guest's avatar on the profile/welcome screen.
  let preview=null;
  window.addEventListener('anyen-avatar-preview',e=>{const d=e.detail||{};const canvasEl=document.getElementById('avatarPreview');if(!canvasEl)return;
    if(!d.open){if(preview)preview.running=false;return;}
    if(!preview){try{const W=272,H=170;const r=new THREE.WebGLRenderer({canvas:canvasEl,antialias:true,alpha:true});r.setPixelRatio(Math.min(devicePixelRatio||1,2));r.setSize(W,H,false);r.outputColorSpace=THREE.SRGBColorSpace;const sc=new THREE.Scene();sc.add(new THREE.HemisphereLight('#f6dfaf','#1b4234',2.4));const sun=new THREE.DirectionalLight('#f5c78c',2);sun.position.set(2,4,3);sc.add(sun);const cam=new THREE.PerspectiveCamera(30,W/H,.1,30);cam.position.set(0,1.75,6.4);cam.lookAt(0,.78,0);
      // Two figures side by side: standing on the left, seated in meditation on a mat and zafu on the right.
      const figure=(sitting,x)=>{const g=new THREE.Group();const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.8,4,8),mat('#687b48'));g.add(torso);const head=new THREE.Mesh(new THREE.SphereGeometry(.25,16,12),mat('#e7c9a8'));g.add(head);poseAvatar(torso,head,new THREE.Object3D(),sitting);const outfit=outfitParts(g,torso);const holder=new THREE.Group();holder.position.x=x;holder.add(g);sc.add(holder);return {holder,g,torso,outfit,sitting}};
      const stand=figure(false,-.95),sit=figure(true,.95);
      const pad=new THREE.Mesh(new THREE.CylinderGeometry(.62,.66,.08,32),mat('#3e6a5b'));pad.position.set(-.95,-.04,0);sc.add(pad);
      const seat=buildCushion('zabuton');seat.rotation.y=Math.PI;
      sit.g.position.set(0,seat.userData.sitTop,-seat.userData.sitBack);sit.holder.add(seat);seat.position.x=0;
      preview={r,sc,cam,figures:[stand,sit],running:false}}catch(err){console.warn('Avatar preview unavailable',err);return}}
    const p=d.profile||{};for(const f of preview.figures)dressAvatar(f.outfit,f.torso,p.color,p.style,f.sitting);
    if(!preview.running){preview.running=true;const t0=performance.now();const spin=()=>{if(!preview.running)return;const a=Math.sin((performance.now()-t0)/1400)*.75;for(const f of preview.figures)f.holder.rotation.y=a;preview.r.render(preview.sc,preview.cam);requestAnimationFrame(spin)};spin()}});
  window.addEventListener('anyen-activity',e=>{previousActivity=meActivity;meActivity=e.detail?.activity||'idle';if(meActivity==='sit'&&previousActivity!=='sit'){tapTarget=null;walkRoute.length=0;sitNaturally();}if(meActivity==='walk'){pendingSeat=null;window.dispatchEvent(new CustomEvent('anyen-seat-intent',{detail:{clear:true}}));tapTarget=null;walkRoute.length=0;walkGoal=null;}});
  let walkGoal=null,walkSeed=Math.random()*Math.PI*2,walkCount=0;window.addEventListener('anyen-walk-step',()=>{if(meActivity!=='walk')return;if(!walkGoal){const a=walkSeed+(walkCount++*.87);const r=5+(walkCount%4)*1.3;walkGoal=[Math.sin(a)*r,21+Math.cos(a)*r];}});

  window.addEventListener('anyen-peers',e=>{
    const all=e.detail||{},incoming={};for(const [id,p] of Object.entries(all))if(p&&(!p.sp||p.sp==='forest'))incoming[id]=p;occupiedPositions=Object.values(incoming).filter(p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z));
    for(const [id,entry] of Object.entries(incoming)){
      if(!entry||!Number.isFinite(entry.x)||!Number.isFinite(entry.z))continue;
      let mesh=onlineAvatars.get(id);
      if(!mesh){const group=new THREE.Group();const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.8,4,8),mat('#687b48'));torso.position.y=1.05;group.add(torso);const head=new THREE.Mesh(new THREE.SphereGeometry(.25,12,10),mat('#e7c9a8'));head.position.y=1.85;group.add(head);const tagCanvas=document.createElement('canvas');tagCanvas.width=512;tagCanvas.height=112;const tagCtx=tagCanvas.getContext('2d');const tagTex=new THREE.CanvasTexture(tagCanvas);const tag=new THREE.Sprite(new THREE.SpriteMaterial({map:tagTex,transparent:true,depthTest:false}));tag.position.set(0,2.17,0);tag.scale.set(1.7,.37,1);group.add(tag);scene.add(group);mesh={group,torso,head,tag,tagCtx,tagTex,outfit:outfitParts(group,torso),lastName:''};onlineAvatars.set(id,mesh)}
      dressAvatar(mesh.outfit,mesh.torso,entry.color,entry.style,entry.activity==='sit');
      const label=String(entry.name||'Khách Yên').slice(0,24);if(mesh.lastName!==label){const c=mesh.tagCtx;c.clearRect(0,0,512,112);c.font='bold 36px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillStyle='#f4e2b9';c.fillText(label,256,57,470);mesh.tagTex.needsUpdate=true;mesh.lastName=label;}
      const sitting=entry.activity==='sit';poseAvatar(mesh.torso,mesh.head,mesh.tag,sitting);dressAvatar(mesh.outfit,mesh.torso,entry.color,entry.style,sitting);
      const peerSeat=sitting?cushions.find(c=>Math.hypot(c.x-entry.x,c.z-entry.z)<.8):null;const peerBoat=!!entry.boat;const [px,pz]=peerBoat?[entry.x,entry.z]:pushOutOfTrees(Math.max(-72,Math.min(72,entry.x)),Math.max(-124,Math.min(36,entry.z)));mesh.group.position.set(px,peerBoat?.35:groundHeight(px,pz),pz);
      // Guests rowing on Hồ Sen get a boat under them, pointed the way they are moving.
      if(peerBoat){if(!mesh.boat){mesh.boat=makeBoat();scene.add(mesh.boat.group);}const mx=px-(mesh.lastX??px),mz=pz-(mesh.lastZ??pz);if(Math.hypot(mx,mz)>.02)mesh.heading=Math.atan2(mx,mz);const h=mesh.heading??0;mesh.boat.group.visible=true;mesh.boatTarget=[px,pz];mesh.boatIndex=Number(entry.boat)-1;if(!mesh.boatShown){mesh.boat.group.position.set(px,.02,pz);mesh.boatShown=true}mesh.group.position.x=mesh.boat.group.position.x;mesh.group.position.z=mesh.boat.group.position.z;mesh.boat.group.rotation.y=h-Math.PI/2;mesh.group.userData.yaw=h;poseAvatar(mesh.torso,mesh.head,mesh.tag,true);dressAvatar(mesh.outfit,mesh.torso,entry.color,entry.style,true);}
      else if(mesh.boat){mesh.boat.group.visible=false;mesh.boatShown=false;mesh.boatTarget=null}
      {const kc=entry.k;if(kc&&!mesh.kRobe){mesh.kRobe=robeTray(kc,.9);mesh.kRobe.position.y=2.12;mesh.group.add(mesh.kRobe)}else if(!kc&&mesh.kRobe){mesh.group.remove(mesh.kRobe);mesh.kRobe=null}}mesh.lastX=px;mesh.lastZ=pz;if(!peerBoat)mesh.group.userData.yaw=0;if(peerSeat)seatOnCushion(mesh.group,peerSeat);mesh.baseY=mesh.group.position.y;
    }
    for(const [id,obj] of onlineAvatars){if(!incoming[id]){scene.remove(obj.group);if(obj.boat)scene.remove(obj.boat.group);onlineAvatars.delete(id)}}
    // Three boats: a boat a guest is riding is hidden at the pier here (their own boat is drawn under them) and cannot be boarded.
    {const taken=new Set(Object.values(incoming).filter(p=>p&&p.boat).map(p=>Number(p.boat)-1));
     for(const b of boats){b.busy=taken.has(b.i);const mine=boatRide&&boatRide.b===b;if(b.busy&&mine&&boatRide.phase==='board'){boatRide=null;document.getElementById('zenHint').textContent='🚣 Thuyền vừa có người lên, mời bạn chọn chiếc khác';}b.group.visible=!b.busy||(boatRide&&boatRide.b===b)}}
  });
  window.setInterval(()=>{if(document.body.classList.contains('immersive')&&!bayMode)window.dispatchEvent(new CustomEvent('anyen-position',{detail:{x:mePosition.x,z:mePosition.z,boat:onBoat()?boatRide.b.i+1:0,k:kat.robe?kat.color:0,kr:kat.phase==='round'?kat.r0:0,kf:(kat.phase==='follow'||kat.phase==='join')?kat.leader:'',kj:kat.kj||0}}))},180);
  // (The two placeholder guests shown while offline were removed: they stood inside pine trees and looked like stray people.)
  const gestureNames={hello:'Xin chào',handshake:'Bắt tay',namaste:'Chắp tay chào',jump:'Nhảy lên',spin:'Xoay một vòng'};
  let gesture=null;
  window.addEventListener('anyen-gesture',e=>{const kind=e.detail?.kind;if(!gestureNames[kind])return;gesture={kind,start:performance.now()};document.getElementById('zenHint').textContent=gestureNames[kind]+' 🙏';window.dispatchEvent(new CustomEvent('anyen-greet',{detail:{gesture:kind}}));});
  window.addEventListener('anyen-remote-gesture',e=>{
    const id=e.detail?.id,kind=e.detail?.kind,peer=onlineAvatars.get(id);
    if(!peer||!gestureNames[kind])return;
    peer.gesture={kind,start:performance.now()};
    document.getElementById('zenHint').textContent=(e.detail?.name||'Một người bạn')+' · '+gestureNames[kind];
  });
  const walkButtons=document.querySelectorAll('[data-walk]');walkButtons.forEach(b=>{let key=b.dataset.walk;b.addEventListener('pointerdown',e=>{e.preventDefault();if(key==='stop'){walkingKeys.clear();cancelAutoWalk();return}cancelAutoWalk();walkingKeys.add(key);b.setPointerCapture(e.pointerId)});for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>walkingKeys.delete(key))});
  document.addEventListener('keydown',e=>{if(!document.body.classList.contains('immersive')||['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName))return;const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k))cancelAutoWalk();if('wasd'.includes(k)&&k.length===1){walkingKeys.add(({w:'forward',s:'back',a:'turnleft',d:'turnright'})[k]);e.preventDefault()}if(k==='arrowup'){walkingKeys.add('forward');e.preventDefault()}if(k==='arrowdown'){walkingKeys.add('back');e.preventDefault()}if(k==='arrowleft'){walkingKeys.add('turnleft');e.preventDefault()}if(k==='arrowright'){walkingKeys.add('turnright');e.preventDefault()}});
  document.addEventListener('keyup',e=>{const k=e.key.toLowerCase();const map={w:'forward',s:'back',a:'turnleft',d:'turnright',arrowup:'forward',arrowdown:'back',arrowleft:'turnleft',arrowright:'turnright'};if(map[k])walkingKeys.delete(map[k])});
  function releaseControls(){walkingKeys.clear();dragging3d=false;moved=false;swipeId=null;}
  window.addEventListener('blur',releaseControls);window.addEventListener('anyen-3d-exit',releaseControls);document.addEventListener('visibilitychange',()=>{if(document.hidden)releaseControls()});
  // Pressing a movement key takes over from any automatic route (tapped ground, a mat, a lake or the boat).
  function cancelAutoWalk(){if(!walkRoute.length&&!pendingSeat&&!pendingBoat&&!wishDestination&&!pendingOrchid&&!pendingHouse&&!pendingGarden&&!pendingOffer&&!pendingKathina)return;const hadSeat=!!pendingSeat;walkRoute.length=0;clearPendingActions();wishDestination=null;tapTarget=null;if(hadSeat)window.dispatchEvent(new CustomEvent('anyen-seat-intent',{detail:{clear:true}}));}
  document.querySelector('#walkReset').onclick=()=>{walking=false;walkingKeys.clear();selectZone('gate')};
  document.querySelector('#sendGreeting').onclick=()=>{window.dispatchEvent(new Event('anyen-greet'));document.querySelector('#greetingStatus').textContent='🙏 Đã gửi lời chào tới khách trong cùng phòng (nếu đang kết nối).'};
  // Vuốt một ngón: xoay / nâng camera. Khi có từ hai ngón trở lên (đang zoom) thì không xoay; nhấc bớt ngón thì lấy mốc mới.
  const swipePts=new Map();
  // Khóa trục: mỗi lần vuốt chỉ xoay (ngang) hoặc chỉ nâng/hạ (dọc) theo hướng vuốt ban đầu, để vuốt chéo trên điện thoại không làm camera lắc.
  let swipeAxis=null,swipeAcc=[0,0];
  let swipeV=0,swipeT=0,inV=0,inRun=false;const inertiaGo=v=>{inV=v;if(inRun)return;inRun=true;let tl=performance.now();const f=()=>{const n=performance.now(),dt=Math.min(.05,(n-tl)/1000);tl=n;viewYaw+=inV*dt;inV*=Math.exp(-dt*3.2);if(Math.abs(inV)>.03&&!swipePts.size)requestAnimationFrame(f);else inRun=false};requestAnimationFrame(f)};
  renderer.domElement.addEventListener('pointerdown',e=>{inV=0;swipePts.set(e.pointerId,[e.clientX,e.clientY]);swipeAxis=null;swipeAcc=[0,0];if(swipePts.size>1)moved=true});
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(ev,e=>{if(ev==='pointerup'&&swipeAxis==='x'&&swipePts.size===1&&performance.now()-swipeT<90&&Math.abs(swipeV)>.3)inertiaGo(swipeV);swipePts.delete(e.pointerId);swipeAxis=null;swipeAcc=[0,0];if(!swipePts.size)dragging3d=false});
  renderer.domElement.addEventListener('pointermove',e=>{const last=swipePts.get(e.pointerId);if(!last)return;let dx=e.clientX-last[0],dy=e.clientY-last[1];last[0]=e.clientX;last[1]=e.clientY;
    if(!dragging3d||swipePts.size!==1||!document.body.classList.contains('immersive'))return;
    if(!swipeAxis){swipeAcc[0]+=dx;swipeAcc[1]+=dy;const ax=Math.abs(swipeAcc[0]),ay=Math.abs(swipeAcc[1]);if(Math.max(ax,ay)<8)return;swipeAxis=ax>=ay*.8?'x':'y';dx=swipeAcc[0];dy=swipeAcc[1]}
    if(swipeAxis==='x')dy=0;else dx=0;
    // A full-width swipe turns the view about 200°; turning only moves the camera, not the avatar.
    {const dy0=dx/Math.max(320,innerWidth)*3.5,n0=performance.now();if(swipeAxis==='x'){swipeV=-dy0/Math.max(8,n0-swipeT)*1000;swipeT=n0}}viewYaw-=dx/Math.max(320,innerWidth)*3.5;if(bayMode)walkPitch=Math.max(-.35,Math.min(.35,walkPitch-dy*.002));else setCamLift(camLift+dy/Math.max(320,innerHeight)*2.4)});
  window.addEventListener('yen-zone',()=>{walking=false;walkingKeys.clear()});
  
  // ===== VỊNH HẠ LONG: du thuyền dạo vịnh theo bản đồ thật =====
  // Dữ liệu dùng chung (đảo, bờ, danh thắng, luồng tàu, phòng, NPC) nằm trong tệp tĩnh data/world-halong_bay.json.
  // Cảnh đặt rất xa làng (z=20000) nên không lẫn với làng. Chạm mặt nước hoặc dùng Bản đồ để chọn nơi đến:
  // tàu tự tìm đường vòng qua các đảo. Vuốt trái/phải chỉ xoay góc nhìn, không đổi hướng tàu.
  // ===== VỊNH YÊN · nạp lười: phần dựng vịnh nằm ở js/bay3d.js, chỉ tải khi vào vịnh (hoặc lúc rảnh sau khi rừng đã chạy).
  // Biến dùng chung với rừng khai báo ở đây; hàm của vịnh được gán lại khi tệp tải xong.
  let BAY_OUTFIT_KEY,BAY_OUTFIT_SEEN,SEE,bayAt,bayAvatar,bayBaseStyle,bayBuilt,bayCam,bayData,bayFarZoom,bayGroup,bayHUD,bayIsland,bayLift,bayLiftObjs,bayLiftPull,bayLiftT,bayLiftWant,bayLoading,bayLook,bayMapBox,bayMult,bayOutfit,bayOutfitOpen,bayOutfitSaved,bayPause,bayPhoto,baySheet,bayShip,bayStash,bayTmp,bayTour,bayView,bayZoom,bayZoomBack,bayZoomOver,closeSheet,lathe,navFree,shortName,bayCaption,bayDress,bayTap,bayZoomBy,buildBay,closeBayOutfit,closePhoto,dropPause,endTour,goLandmark,goTuDao,islandBoardNow,loadBayData,openBayMap,openBayOutfit,pauseShip,pines,refreshBayHud,resumeShip,sailToStop,setDestination,startTour,stopBaySound,tdGroundY,tuDaoTap,updateBay,viewPoint;
  let bayModuleReady=false,bayModuleP=null;
  function __bayExport(o){bayCaption=o.bayCaption;bayDress=o.bayDress;bayTap=o.bayTap;bayZoomBy=o.bayZoomBy;buildBay=o.buildBay;closeBayOutfit=o.closeBayOutfit;closePhoto=o.closePhoto;dropPause=o.dropPause;endTour=o.endTour;goLandmark=o.goLandmark;goTuDao=o.goTuDao;islandBoardNow=o.islandBoardNow;loadBayData=o.loadBayData;openBayMap=o.openBayMap;openBayOutfit=o.openBayOutfit;pauseShip=o.pauseShip;pines=o.pines;refreshBayHud=o.refreshBayHud;resumeShip=o.resumeShip;sailToStop=o.sailToStop;setDestination=o.setDestination;startTour=o.startTour;stopBaySound=o.stopBaySound;tdGroundY=o.tdGroundY;tuDaoTap=o.tuDaoTap;updateBay=o.updateBay;viewPoint=o.viewPoint;bayModuleReady=true}
  // Lưu bản đồ Vịnh Yên trên máy người dùng (Cache Storage): chỉ tải từ mạng lần đầu, các lần sau đọc từ máy.
  // Khóa theo đường dẫn kèm ?v=; khi đổi số ?v= (có bản mới) thì tải một lần nữa và xoá bản cũ.
  const BAY_CACHE='anyen-vinh-yen';
  async function cachedText(url){const full=new URL(url,document.baseURI).href;let c=null;
    try{if(window.caches)c=await caches.open(BAY_CACHE)}catch(e){}
    if(c){try{const hit=await c.match(full);if(hit)return await hit.text()}catch(e){}}
    const r=await fetch(full);if(!r.ok)throw Error('HTTP '+r.status);const t=await r.text();
    if(c){try{const base=full.split('?')[0];for(const k of await c.keys())if(k.url.split('?')[0]===base&&k.url!==full)await c.delete(k);
      await c.put(full,new Response(t,{headers:{'Content-Type':r.headers.get('Content-Type')||'text/plain'}}))}catch(e){}}
    return t}
  window.anyenCachedText=cachedText;
  /* Trang lite: tải trước song song phần cần cho nơi vừa chọn (xếp sò/đá: mã vịnh + dữ liệu; vào nhà: mã phòng) trong lúc dựng 3D */
  if(window.anyenLite){if(window.anyenPendingBay||window.__liteWant==='bay'){loadBayModule().catch(()=>{});cachedText('data/world-halong_bay.json?v=1f1c8525').catch(()=>{})}}
  function loadBayModule(){if(bayModuleP)return bayModuleP;bayModuleP=cachedText('js/bay3d.js?v=aea6911c').then(code=>{eval(code+'\n//# sourceURL=bay3d.js');if(!bayModuleReady)throw Error('bay module')}).catch(e=>{bayModuleP=null;throw e});return bayModuleP}
  window.anyenLoadBay=loadBayModule;
  {const pre=()=>{if(!bayModuleP&&!window.anyenLite)loadBayModule().catch(()=>{});/* lite: không tải sẵn Vịnh Yên */if(!roomsP)loadRoomsModule().catch(()=>{})};const idle=window.requestIdleCallback||(f=>setTimeout(f,1));
   const later=()=>setTimeout(()=>idle(pre,{timeout:8000}),6000);if(document.body.classList.contains('immersive'))later();else window.addEventListener('anyen-3d-enter',later,{once:true});
   const preB=()=>{if(!bayModuleP)loadBayModule().catch(()=>{})};for(const id of ['enterBay','zenBayGo'])document.getElementById(id)?.addEventListener('pointerenter',preB,{once:true});document.getElementById('enterBay')?.addEventListener('touchstart',preB,{once:true,passive:true})}
  // Chỉ một cảnh chạy: khi vào vịnh, mọi vật của rừng thông được ẩn và ngừng cập nhật; rời vịnh thì hiện lại.
  function setVillageActive(on){for(const o of scene.children){if(o===bayGroup||o===me||o.isLight)continue;if(!on){if(!('_vis' in o.userData))o.userData._vis=o.visible;o.visible=false}else if('_vis' in o.userData){o.visible=o.userData._vis;delete o.userData._vis}}}
  // Lưu trạng thái từng cảnh trên máy để quay lại đúng chỗ (kể cả sau khi tải lại trang).
  window.addEventListener('anyen-save-now',()=>{if(bayMode)saveBayState();else if(document.body.classList.contains('immersive'))saveForestState()});
  function saveForestState(){/* bản full và lite dùng chung vị trí cuối: lite chỉ ghi khi đang ở cảnh tượng Phật hoặc trước cửa nhà vừa vào */try{localStorage.setItem('yen_forest_state',JSON.stringify({x:mePosition.x,z:mePosition.z,yaw:viewYaw,t:Date.now()}));if(!window.anyenLite&&!roomOpen)anyenLastPlace({kind:'forest'})}catch(e){}}
  function anyenLastPlace(o){try{o.t=Date.now();localStorage.setItem('yen_last_place',JSON.stringify(o))}catch(e){}}window.anyenLastPlace=anyenLastPlace;
  function saveBayState(){if(!bayBuilt)return;/* lite chỉ vào Đảo Yên: tàu đậu ở cầu tàu đảo, bản full vào vịnh sẽ gặp tàu ở đó */if(!window.anyenLite)anyenLastPlace({kind:'bay'});const S=bayShip;const st={x:S.x,z:S.z,heading:S.heading,fast:S.fast,mult:bayMult(),t:Date.now()};
    const T=bayTour||bayPause?.tour,D=S.dest||bayPause?.dest;
    if(D&&!T)st.dest={x:D.x,z:D.z,label:D.label,bow:!!D.bow};
    if(T)st.tour={id:T.tour.id,stops:T.stops.map(s=>s.landmark),idx:T.idx};
    try{localStorage.setItem('yen_bay_state',JSON.stringify(st))}catch(e){}}
  function restoreBayState(){if(window.anyenLite)return false;let st=null;try{st=JSON.parse(localStorage.getItem('yen_bay_state')||'null')}catch(e){}if(!st||!Number.isFinite(st.x)||!navFree(st.x,st.z))return false;
    bayShip.x=st.x;bayShip.z=st.z;bayShip.heading=st.heading||0;bayShip.mult=(st.mult>1||st.fast)?5:1;bayShip.fast=bayShip.mult>1;bayShip.trail.length=0;bayShip.speed=0;bayShip.path=[];bayShip.dest=null;
    if(st.tour){const t=bayData.props.find(p=>p.kind==='tour'&&p.id===st.tour.id),stops=t&&(t.params?.stops||[]).filter(s=>st.tour.stops.includes(s.landmark));if(stops?.length){bayTour={tour:t,stops,idx:Math.min(st.tour.idx||0,stops.length-1),dwellUntil:0};sailToStop();bayCaption('🧭 Tiếp tục tour · '+shortName(t.name),4500)}}
    else if(st.dest)setDestination(st.dest.x,st.dest.z,st.dest.label,false,st.dest.bow?{bow:true}:null);
    return true}
  window.addEventListener('anyen-3d-exit',()=>{if(!bayMode)saveForestState()});
  // Không gian đang ở: 'forest' | 'bay' | 'room:<id>' | 'out'. Người ở không gian khác thì không hiện hình ở đây (chỉ giữ vị trí, trạng thái).
  const setSpace=s=>window.dispatchEvent(new CustomEvent('anyen-space',{detail:{space:s}}));
  window.addEventListener('anyen-3d-enter',()=>setSpace(window.anyenPendingBay?'bay':'forest'));window.addEventListener('anyen-3d-exit',()=>setSpace('out'));
  window.addEventListener('anyen-3d-enter',()=>{if(window.anyenPendingBay)return;let st=null;try{st=JSON.parse(localStorage.getItem('yen_forest_state')||'null')}catch(e){}
    if(st&&Number.isFinite(st.x)&&walkable(st.x,st.z)){walkRoute.length=0;tapTarget=null;mePosition.set(st.x,0,st.z);walking=true;walkYaw=viewYaw=Number(st.yaw)||Math.PI;document.getElementById('zenHint').textContent='Quay lại chỗ bạn dừng lần trước'}});
  {let st=null;try{st=JSON.parse(localStorage.getItem('yen_forest_state')||'null')}catch(e){}if(st&&Number.isFinite(st.x)&&walkable(st.x,st.z))mePosition.set(st.x,0,st.z)}// nạp vị trí rừng ngay khi mở trang
  setInterval(()=>{if(!document.body.classList.contains('immersive'))return;if(bayMode)saveBayState();else saveForestState()},3000);
  // Nhà hoa lan: walk to the door, then open the Viverse scene over the forest.
  const orchidBox=document.createElement('div');orchidBox.id='orchidPortal';orchidBox.setAttribute('role','dialog');orchidBox.setAttribute('aria-label','Nhà Sắc · hoa lan');orchidBox.hidden=true;
  orchidBox.innerHTML='<div class="orchid-top"><span>🌸 Nhà Sắc · ORCHID hoa lan</span><button type="button" id="orchidBack">← Trở về Rừng Yên</button></div><div class="orchid-frame"></div>';
  document.body.appendChild(orchidBox);
  function goToOrchid(){if(bayMode||boatRide)return;if(Math.hypot(mePosition.x-VIV.door[0],mePosition.z-VIV.door[1])<1.6){openOrchid();return;}
    if(navigateTo(...(nearestWalkable(...VIV.door,VIV.rot+Math.PI)||VIV.door))){pendingOrchid=true;document.getElementById('zenHint').textContent='🌀 Đang đến Cổng Viverse…';}}
  function openOrchid(){if(orchidOpen||bayMode)return;if(typeof activityBusy==='function'&&activityBusy()){askFinish(()=>openOrchid());return}orchidOpen=true;walkRoute.length=0;walkingKeys.clear();
    // sang Viverse: lưu vị trí, trạng thái ở rừng; người khác không còn thấy mình trên bản đồ rừng
    saveForestState();window.dispatchEvent(new CustomEvent('anyen-space',{detail:{space:'viverse'}}));
    window.dispatchEvent(new CustomEvent('langyen-audio-stop',{detail:{except:null}}));
    const f=document.createElement('iframe');f.src=ORCHID.url;f.title=ORCHID.title;f.allow='clipboard-write; fullscreen; autoplay; xr-spatial-tracking; gyroscope; accelerometer';f.allowFullscreen=true;
    orchidBox.querySelector('.orchid-frame').replaceChildren(f);orchidBox.hidden=false;document.body.classList.add('orchid-open');}
  function closeOrchid(){if(!orchidOpen)return;orchidOpen=false;orchidBox.hidden=true;orchidBox.querySelector('.orchid-frame').replaceChildren();document.body.classList.remove('orchid-open');
    // Step out of the door facing Hồ Sắc.
    // ra khỏi cổng: đứng trước cổng; có người đứng đó thì sang chỗ trống gần nhất
    {const x0=VIV.door[0]+Math.sin(VIV.rot)*.4,z0=VIV.door[1]+Math.cos(VIV.rot)*.4,p=nearestWalkable(x0,z0,VIV.rot)||[x0,z0];mePosition.set(p[0],0,p[1])}walkYaw=VIV.rot;lastWalkFrame=performance.now();
    if(document.body.classList.contains('immersive')&&!bayMode)window.dispatchEvent(new CustomEvent('anyen-space',{detail:{space:'forest'}}));
    window.dispatchEvent(new CustomEvent('anyen-position',{detail:{x:mePosition.x,z:mePosition.z}}));
    document.getElementById('zenHint').textContent='Đã trở về Rừng Yên · Chạm Cổng Viverse để vào lại';}
  document.getElementById('orchidBack').addEventListener('click',closeOrchid);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&orchidOpen)closeOrchid()});
  window.addEventListener('anyen-3d-exit',()=>closeOrchid());
  // 3.9: Bản đồ Rừng Yên và điểm đến nhanh. Chạm bản đồ để đi bộ tới; mỗi điểm có 🚶 Đi bộ và ✨ Đến ngay.
  const forestMapBox=document.createElement('section');forestMapBox.id='forestMap';forestMapBox.setAttribute('role','dialog');forestMapBox.setAttribute('aria-label','Bản đồ Rừng Yên');
  forestMapBox.innerHTML='<div class="fm-head"><strong>🗺 Bản đồ Rừng Yên</strong><button type="button" data-fm="close">✕ Đóng</button></div><div class="fm-body"><canvas id="forestMapCanvas" width="480" height="545" aria-label="Bản đồ, chạm để đi bộ tới"></canvas><div class="fm-list"><div class="fm-note">Chạm vào bản đồ để đi bộ tới chỗ đó, hoặc chọn điểm đến:</div><div id="forestMapList"></div></div></div>';
  document.body.appendChild(forestMapBox);
  const forestMapOpen=document.createElement('button');forestMapOpen.type='button';forestMapOpen.id='forestMapOpen';forestMapOpen.textContent='🗺 Bản đồ';document.body.appendChild(forestMapOpen);
  const FM={x0:-74,x1:74,z0:-128,z1:40,w:480,h:545},fmCanvas=forestMapBox.querySelector('#forestMapCanvas'),fmCtx=fmCanvas.getContext('2d');
  const fmX=x=>(x-FM.x0)/(FM.x1-FM.x0)*FM.w,fmY=z=>(z-FM.z0)/(FM.z1-FM.z0)*FM.h,fmS=m=>m/(FM.x1-FM.x0)*FM.w;
  function lakeApproach(l){const dx=FOOT.x-l.x,dz=FOOT.z-l.z,d=Math.hypot(dx,dz)||1,px=l.x+dx/d*(POND_R+1.6),pz=l.z+dz/d*(POND_R+1.6);return [px,pz,Math.atan2(l.x-px,l.z-pz)]}
  function quickPlaces(){const out=[['🏡','Tư Gia Rừng Yên',TU_GIA.door[0],TU_GIA.door[1],TU_GIA.rot+Math.PI,'tu_gia'],['⛩','Cổng Yên',0,31,Math.PI],['🌿','Sân đón',0,20.5,Math.PI],['🪷','Hồ sen · bờ nam',8,11.5,Math.PI],
      ['🚣','Bến Sen · thuyền ngắm cảnh',BEN_SEN.x,BEN_SEN.z1+1.2,Math.PI],['🌉','Cầu vòm',0,BRIDGE_ARCH[1]+1.8,Math.PI],
      ['🪨','Sân chân đồi',0,FOOT.z+4.5,Math.PI],['🪜','Bậc đá lên đồi',STAIRS[STAIRS.length-1][0],STAIRS[STAIRS.length-1][1]+.5,Math.PI],['🙏','Tượng Phật trên đồi',STATUE.x,STATUE.z+7.2,Math.PI],
      ['🌀','Cổng Viverse · ORCHID hoa lan',VIV.door[0],VIV.door[1],VIV.rot+Math.PI,'orchid'],['🌸','Nhà Sắc · hoa lan',ORCHID_DOOR[0],ORCHID_DOOR[1],ORCHID.rot+Math.PI,'nha_hoa_lan'],...SENSE_HOUSES.map(h=>[h.icon,h.name,h.door[0],h.door[1],h.rot+Math.PI,h.id]),['🟧','Nhà May Y',TINH_THAT.door[0],TINH_THAT.door[1],TINH_THAT.rot+Math.PI,'tinh_that'],[VAN_HOA.icon,VAN_HOA.name,VAN_HOA.door[0],VAN_HOA.door[1],VAN_HOA.rot+Math.PI,'van_hoa'],...FLOWER_GARDENS.map((g,i)=>[FLOWER_KINDS[g.kind].icon,g.pier?'Hái sen ở Bến Sen':FLOWER_KINDS[g.kind].garden,g.x,g.pier?g.z-.6:g.z,null,'garden:'+i])];
    for(const l of wishLakes){if(l.lotus)continue;const [x,z,yaw]=lakeApproach(l);out.push(['💧','Hồ '+l.name+' · '+l.theme,x,z,yaw])}
    return out}
  // A free spot: walkable and at least 1.2 m from any other guest, so arrivals never land on top of someone.
  const GUEST_AVOID=1.3;let walkWaitStart=0,walkDetourFor=null;
  function guestDist(x,z){let m=1e9;for(const p of onlineAvatars.values()){const g=p.group;if(g&&g.visible){const d=Math.hypot(g.position.x-x,g.position.z-z);if(d<m)m=d}}return m}
  // Bước đi có hợp lệ với người khác không: không bước vào sát người (dưới 0,75), nhưng luôn cho bước ra xa nếu đang lỡ đứng sát
  const guestStepOk=(ox,oz,nx,nz)=>{const dn=guestDist(nx,nz);return dn>=.75||dn>guestDist(ox,oz)+1e-4};
  // Chỗ trống gần nhất (đi được, cách mọi người ≥ 1)
  function freeSpotNear(x,z){for(let r=.9;r<=3.3;r+=.3)for(let k=0;k<12;k++){const a=k/12*Math.PI*2+r,qx=x+Math.sin(a)*r,qz=z+Math.cos(a)*r;if(walkable(qx,qz)&&guestDist(qx,qz)>=1)return[qx,qz]}return null}
  let unstackT=0;
  function guestNear(x,z,r){for(const p of onlineAvatars.values()){const g=p.group;if(g&&g.visible&&Math.hypot(g.position.x-x,g.position.z-z)<r)return true}return false}
  function nearestWalkable(x,z,yaw){const ok=(a,b)=>walkable(a,b)&&!guestNear(a,b,GUEST_AVOID);if(ok(x,z))return [x,z];
    // Side-by-side first: free spots to the left and right of the arrival point, in a row facing the same way.
    if(yaw!=null){const rx=Math.cos(yaw),rz=-Math.sin(yaw);for(let k=1;k<=4;k++)for(const s of [1,-1]){const q=[x+rx*s*k*GUEST_AVOID,z+rz*s*k*GUEST_AVOID];if(ok(...q))return q}}
    for(let r=GUEST_AVOID;r<=6;r+=.65)for(let k=0;k<16;k++){const a=k*Math.PI/8,q=[x+Math.cos(a)*r,z+Math.sin(a)*r];if(ok(...q))return q}return walkable(x,z)?[x,z]:null}
  function standUpForTravel(){if(meActivity==='sit')document.getElementById('realtimeSit')?.click();if(meActivity==='walk')document.getElementById('realtimeWalk')?.click()}
  function teleportTo(x,z,yaw){if(bayMode||boatRide)return false;const p=nearestWalkable(x,z,yaw);if(!p)return false;standUpForTravel();
    walkRoute.length=0;clearPendingActions();wishDestination=null;walkingKeys.clear();tapTarget=null;
    mePosition.set(p[0],0,p[1]);if(yaw!=null){viewYaw=walkYaw=yaw}lookOffset=0;window.dispatchEvent(new CustomEvent('anyen-position',{detail:{x:p[0],z:p[1]}}));return true}
  function walkToPlace(x,z,kind,yaw){if(String(kind).startsWith('garden:')){standUpForTravel();goToGarden(FLOWER_GARDENS[Number(kind.slice(7))]);return true}if(kind==='orchid'){standUpForTravel();goToOrchid();return true}if(kind==='tu_gia'){standUpForTravel();goHome(false);return true}{const h=[NHA_SAC,...SENSE_HOUSES,TINH_THAT,VAN_HOA].find(v=>v.id===kind);if(h){standUpForTravel();goToHouse(h);return true}}const p=nearestWalkable(x,z,yaw);if(!p)return false;standUpForTravel();const ok=navigateTo(...p);if(ok&&yaw!=null)arriveYaw=yaw;return ok}
  function drawForestMap(){const c=fmCtx;c.clearRect(0,0,FM.w,FM.h);c.fillStyle='#163428';c.fillRect(0,0,FM.w,FM.h);
    c.fillStyle='#24503e';c.beginPath();c.roundRect(fmX(-72),fmY(-124),fmS(144),fmY(36)-fmY(-124),18);c.fill();
    // hill: foot, slope, flat top with the stone terrace
    c.fillStyle='#2c5c45';c.beginPath();c.arc(fmX(HILL.x),fmY(HILL.z),fmS(HILL.foot),0,7);c.fill();c.fillStyle='#35694e';c.beginPath();c.arc(fmX(HILL.x),fmY(HILL.z),fmS(HILL.flat+4),0,7);c.fill();
    c.fillStyle='#b9ad8a';c.beginPath();c.arc(fmX(STATUE.x),fmY(STATUE.z),fmS(8.4),0,7);c.fill();
    // pines
    c.fillStyle='rgba(28,58,36,.85)';for(const t of forestTrees){if(t.x<FM.x0||t.x>FM.x1||t.z<FM.z0||t.z>FM.z1)continue;c.beginPath();c.arc(fmX(t.x),fmY(t.z),1.9,0,7);c.fill()}
    // lotus lake: two lobes and the channel
    c.fillStyle='#3f8088';for(const [cx,rx,rz] of LOTUS_LAKE.lobes){c.beginPath();c.ellipse(fmX(cx),fmY(LOTUS_LAKE.z),fmS(rx),fmS(rz),0,0,7);c.fill()}
    c.fillRect(fmX(-LOTUS_LAKE.channel[0]),fmY(LOTUS_LAKE.z-LOTUS_LAKE.channel[1]),fmS(LOTUS_LAKE.channel[0]*2),fmS(LOTUS_LAKE.channel[1]*2));
    c.fillStyle='#e99ab6';for(const f of flowers){c.beginPath();c.arc(fmX(f.position.x),fmY(f.position.z),1.6,0,7);c.fill()}
    // main axis, plazas, stairs, bridge, gate, piers
    c.strokeStyle='#8a8068';c.lineCap='round';c.lineWidth=fmS(3.2);c.beginPath();c.moveTo(fmX(0),fmY(35));c.lineTo(fmX(0),fmY(FOOT.z));c.stroke();
    for(const pts of BRANCHES){c.lineWidth=fmS(2.2);c.beginPath();pts.forEach(([x,z],i)=>i?c.lineTo(fmX(x),fmY(z)):c.moveTo(fmX(x),fmY(z)));c.stroke()}
    c.lineWidth=fmS(2.8);c.beginPath();STAIRS.forEach(([x,z],i)=>i?c.lineTo(fmX(x),fmY(z)):c.moveTo(fmX(x),fmY(z)));c.stroke();
    c.fillStyle='#8a8068';for(const p of [GATHER,FOOT]){c.beginPath();c.arc(fmX(p.x),fmY(p.z),fmS(p.r),0,7);c.fill()}c.fillStyle='#3f7f86';for(const p of [GATHER,FOOT]){c.beginPath();c.arc(fmX(p.x),fmY(p.z),fmS(NONBO_R),0,7);c.fill()}
    c.fillStyle='#8a6a48';c.fillRect(fmX(-1.8),fmY(BRIDGE_ARCH[0]),fmS(3.6),fmY(BRIDGE_ARCH[1])-fmY(BRIDGE_ARCH[0]));
    c.fillRect(fmX(BEN_SEN.x-BEN_SEN.w/2),fmY(BEN_SEN.z0),fmS(BEN_SEN.w),fmS(BEN_SEN.z1-BEN_SEN.z0));c.save();c.strokeStyle='rgba(240,220,170,.35)';c.setLineDash([3,4]);c.lineWidth=1.2;c.beginPath();BOAT_LOOP.forEach(([x,z],i)=>i?c.lineTo(fmX(x),fmY(z)):c.moveTo(fmX(x),fmY(z)));c.closePath();c.stroke();c.restore();c.fillStyle='#7a5634';for(const b of boats){const q=b.group.position;c.beginPath();c.ellipse(fmX(q.x),fmY(q.z),5,2.5,-(b===boatRide?.b?boatRide.heading:Math.PI)+Math.PI/2,0,7);c.fill()}c.fillStyle='#8a6a48';
    c.fillStyle='#6b4a32';c.fillRect(fmX(-3.4),fmY(34.2)-3,fmS(6.8),6);
    // sense ponds and the orchid house
    for(const l of wishLakes){if(l.lotus)continue;c.fillStyle='#c1a676';c.beginPath();c.arc(fmX(l.x),fmY(l.z),fmS(POND_R+.35),0,7);c.fill();c.fillStyle=l.color;c.beginPath();c.arc(fmX(l.x),fmY(l.z),fmS(POND_R),0,7);c.fill()}
    c.save();c.translate(fmX(ORCHID.x),fmY(ORCHID.z));c.rotate(-ORCHID.rot);c.fillStyle='#f0b8d0';c.fillRect(-fmS(ORCHID.w/2),-fmS(ORCHID.d/2),fmS(ORCHID.w),fmS(ORCHID.d));c.restore();
    for(const g of FLOWER_GARDENS){c.fillStyle={hong:'#e01b3c',cam_tu_cau:'#2e9bff',nhai:'#ff6e38',cuc:'#ffd000',lan:'#7b4bff',sen:'#ffffff'}[g.kind];c.beginPath();c.arc(fmX(g.x),fmY(g.z),g.pier?3:5,0,7);c.fill()}
    for(const h of SENSE_HOUSES){c.save();c.translate(fmX(h.x),fmY(h.z));c.rotate(-h.rot);c.fillStyle='#e0b07a';c.fillRect(-fmS(h.W/2),-fmS(h.D/2),fmS(h.W),fmS(h.D));c.restore()}
    {const h=VAN_HOA;c.save();c.translate(fmX(h.x),fmY(h.z));c.rotate(-h.rot);c.fillStyle='#d9c39a';c.fillRect(-fmS(h.W/2),-fmS(h.D/2),fmS(h.W),fmS(h.D));c.restore()}
    {const h=TINH_THAT;c.save();c.translate(fmX(h.x),fmY(h.z));c.rotate(-h.rot);c.fillStyle='#c98a1c';c.fillRect(-fmS(h.W/2),-fmS(h.D/2),fmS(h.W),fmS(h.D));c.restore()}
    {const h=TU_GIA;c.save();c.translate(fmX(h.x),fmY(h.z));c.rotate(-h.rot);c.fillStyle='#e7b97a';c.fillRect(-fmS(h.W/2),-fmS(h.D/2),fmS(h.W),fmS(h.D));c.restore();c.fillStyle='#7fbf5a';c.beginPath();c.arc(fmX(h.garden[0]),fmY(h.garden[1]),fmS(1.6),0,7);c.fill();c.font='16px sans-serif';c.textAlign='center';c.fillText('🏡',fmX(h.x),fmY(h.z)-fmS(5));c.fillText('🌀',fmX(VIV.x),fmY(VIV.z)-fmS(4));c.fillStyle='#9a7fd0';c.beginPath();c.arc(fmX(VIV.x),fmY(VIV.z),fmS(2.2),0,7);c.fill()}
    c.fillStyle='#e8c46a';c.beginPath();c.arc(fmX(STATUE.x),fmY(STATUE.z),fmS(1.6),0,7);c.fill();
    // labels
    c.font='600 13px system-ui,sans-serif';c.textAlign='center';c.lineWidth=3;c.strokeStyle='rgba(8,30,24,.85)';c.fillStyle='#f6ead0';
    const label=(t,x,z,dy=0)=>{const half=c.measureText(t).width/2+4,lx=Math.max(half,Math.min(FM.w-half,fmX(x)));c.strokeText(t,lx,fmY(z)+dy);c.fillText(t,lx,fmY(z)+dy)};
    label('Tượng Phật',STATUE.x,STATUE.z,-26);label('Hồ sen',-18,LOTUS_LAKE.z,4);label('Hồ sen',18,LOTUS_LAKE.z,4);label('Sân chân đồi',FOOT.x+14,FOOT.z,4);label('Sân đón',GATHER.x+11,GATHER.z,4);label('Cổng Yên',0,34.2,18);label('Nhà Sắc',ORCHID.x,ORCHID.z,fmS(ORCHID.d/2)+14);for(const h of SENSE_HOUSES)label(h.short||h.name,h.x,h.z,fmS(h.D/2)+14);label(TINH_THAT.name,TINH_THAT.x,TINH_THAT.z,fmS(TINH_THAT.D/2)+14);label(VAN_HOA.name,VAN_HOA.x,VAN_HOA.z,fmS(VAN_HOA.D/2)+14);
    for(const l of wishLakes)if(!l.lotus)label('Hồ '+l.name,l.x,l.z,4);
    // other guests, then you (gold, with a heading arrow)
    c.fillStyle='#f4f1e6';for(const p of onlineAvatars.values()){const g=p.group;if(!g||!g.visible)continue;c.beginPath();c.arc(fmX(g.position.x),fmY(g.position.z),4,0,7);c.fill()}
    const mx=fmX(mePosition.x),my=fmY(mePosition.z),hx=Math.sin(viewYaw),hz=Math.cos(viewYaw);
    c.fillStyle='#f2c75c';c.strokeStyle='#3a2a10';c.lineWidth=2;c.beginPath();c.moveTo(mx+hx*14,my+hz*14);c.lineTo(mx-hz*7-hx*4,my+hx*7-hz*4);c.lineTo(mx+hz*7-hx*4,my-hx*7-hz*4);c.closePath();c.fill();c.stroke();
    c.beginPath();c.arc(mx,my,6,0,7);c.fill();c.stroke();}
  let fmTimer=0;
  function renderForestPlaces(){const list=forestMapBox.querySelector('#forestMapList');list.innerHTML='';quickPlaces().forEach(([icon,name,,,,kind],i)=>{const row=document.createElement('div');row.className='fm-item';
      row.innerHTML='<span>'+icon+' '+name+'</span><button type="button" data-fm-walk="'+i+'" aria-label="Đi bộ tới '+name+'">🚶 Đi bộ</button><button type="button" data-fm-tp="'+i+'" aria-label="Đến ngay '+name+'">✨ Đến ngay</button>';list.appendChild(row)})}
  function openForestMap(){if(window.anyenLite||bayMode||!document.body.classList.contains('immersive'))return;document.body.className=document.body.className.replace(/\bzen-sheet-\S+/g,'').trim();
    renderForestPlaces();drawForestMap();forestMapBox.classList.add('open');document.body.classList.add('forest-map-open');clearInterval(fmTimer);fmTimer=setInterval(drawForestMap,400)}
  function closeForestMap(){forestMapBox.classList.remove('open');document.body.classList.remove('forest-map-open');clearInterval(fmTimer);fmTimer=0}
  forestMapOpen.addEventListener('click',openForestMap);
  document.addEventListener('click',e=>{if(e.target.closest('[data-zen-action="forestmap"]'))openForestMap();if(e.target.closest('[data-zen-action="kathina"]')){document.body.className=document.body.className.replace(/\bzen-sheet-\S+/g,'').trim();window.dispatchEvent(new Event('anyen-kathina'))}if(e.target.closest('[data-zen-action="offerflowers"]')){document.body.className=document.body.className.replace(/\bzen-sheet-\S+/g,'').trim();openOfferGuide()}});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&forestMapBox.classList.contains('open'))closeForestMap()});
  window.addEventListener('anyen-3d-exit',closeForestMap);window.addEventListener('anyen-3d-exit',()=>{boatHud.hidden=true});
  forestMapBox.addEventListener('click',e=>{if(e.target.closest('[data-fm="close"]')){closeForestMap();return}
    const w=e.target.closest('[data-fm-walk]'),t=e.target.closest('[data-fm-tp]');if(!w&&!t)return;const pl=quickPlaces()[Number((w||t).dataset[w?'fmWalk':'fmTp'])];if(!pl)return;const [,name,x,z,yaw,kind]=pl;
    const ok=w?walkToPlace(x,z,kind,yaw):teleportTo(x,z,yaw);closeForestMap();
    document.getElementById('zenHint').textContent=ok?(w?'🚶 Đang đi bộ tới '+name+'…':'✨ Đã đến '+name):'Chưa tới được '+name+' lúc này';});
  fmCanvas.addEventListener('click',e=>{const r=fmCanvas.getBoundingClientRect(),x=FM.x0+(e.clientX-r.left)/r.width*(FM.x1-FM.x0),z=FM.z0+(e.clientY-r.top)/r.height*(FM.z1-FM.z0);
    /* tapping a house on the map walks to its door */
    if(rectHit(ORCHID.x,ORCHID.z,ORCHID.rot,ORCHID.w,ORCHID.d,x,z,1)){standUpForTravel();goToHouse(NHA_SAC);closeForestMap();return}{const h=[...SENSE_HOUSES,VAN_HOA].find(v=>rectHit(v.x,v.z,v.rot,v.W,v.D,x,z,1));if(h){standUpForTravel();goToHouse(h);closeForestMap();return}}
    const ok=walkToPlace(x,z);if(ok)closeForestMap();else document.getElementById('zenHint').textContent='Chỗ này chưa đi tới được, hãy chạm gần lối đi hơn';});
  // 3.17: Vườn hoa ở năm ngã rẽ đường Ngũ quan và nghi thức dâng hoa.
  // Hái hoa ở sáu vườn quanh các hồ Lục Căn (sen trắng ở luống cạnh Hồ Niệm), tối đa 9 bông; bấm Xong để xem trước bó hoa, tự sắp xếp, ưng ý thì mang lên đồi
  // đặt trước tượng Phật. Bệ có 9 chỗ; bó mới nhất thay bó cũ nhất. Hoa lưu trên Supabase nên mọi khách đều thấy và hoa không tự mất.
  const FLOWER_KINDS={
    hong:{name:'Hoa Hồng Đỏ Ruby',icon:'🌹',garden:'Vườn hồng đỏ'},
    cam_tu_cau:{name:'Cẩm Tú Cầu Lam',icon:'💠',garden:'Vườn cẩm tú cầu'},
    nhai:{name:'Huệ Cam Đào',icon:'🧡',garden:'Vườn huệ cam đào'},
    cuc:{name:'Hoa Cúc Vàng',icon:'🌼',garden:'Vườn cúc vàng'},
    lan:{name:'Oải Hương Tím',icon:'🪻',garden:'Vườn oải hương'},
    sen:{name:'Sen Hồng',icon:'🪷',garden:'Luống sen hồng'}};
  const BOUQUET_MAX=9,OFFER_SLOTS=9;
  // Quy hoạch v3.3 · kho 69/9: 9 món trưng bày = 6 món được chọn (mang về túi) nhiều nhất + 3 món mới nhất còn lại.
  // Trả về theo thứ tự mới → cũ. Khi chưa ai chọn món nào, kết quả chính là 9 món mới nhất.
  const STORE_FETCH=69;function pickNine(rows){const seq=r=>Number(r.seq)||0,bySeq=[...rows].sort((a,b)=>seq(b)-seq(a)),byPick=[...rows].sort((a,b)=>(Number(b.picks)||0)-(Number(a.picks)||0)||seq(b)-seq(a));
    const top=byPick.slice(0,6),ids=new Set(top.map(r=>String(r.id)));return [...top,...bySeq.filter(r=>!ids.has(String(r.id))).slice(0,3)].sort((a,b)=>seq(b)-seq(a))}
  window.__pickNine=pickNine;
  // One merged, vertex-coloured stem per kind (about 0.6 m tall), shared by the gardens (instanced) and the bouquets.
  const flowerGeos={};
  // 3.31: Sáu hoa dâng Phật vẽ lại theo bộ mẫu three.js "Làng Yên – 6 flower assets" và ảnh tham khảo kèm theo: khối low-poly
  // mặt phẳng (flat shading), cánh hoa là khối bầu dục dẹt tô chuyển màu từ gốc ra đầu cánh, màu tươi rực như bản mẫu.
  // Khác bản mẫu: cánh nghiêng theo trục riêng của từng cánh (bản mẫu nghiêng theo trục X chung nên hoa bị lệch một phía),
  // cẩm tú cầu xoay từng cụm hoa nhỏ theo mặt cầu, oải hương xếp nụ quanh bông thay vì một mặt phẳng.
  // Hai mức chi tiết: 'lo' cho vườn hoa (hàng trăm cây, InstancedMesh, mỗi cây vài trăm tam giác), 'hi' cho bó hoa.
  const FL={C:h=>new THREE.Color(h),tmp:new THREE.Color(),up:new THREE.Vector3(0,1,0)};
  function flBuilder(){const parts=[];return {
    solid(g,c,{x=0,y=0,z=0}={}){g.translate(x,y,z);const q=g.index?g.toNonIndexed():g;if(c!=null){const cc=FL.C(c),cl=[];for(let i=0;i<q.attributes.position.count;i++)cl.push(cc.r,cc.g,cc.b);q.setAttribute('color',new THREE.Float32BufferAttribute(cl,3))}if(!q.attributes.normal)q.computeVertexNormals();parts.push(q)},
    geo(){let n=0;for(const q of parts)n+=q.attributes.position.count;const P=new Float32Array(n*3),N=new Float32Array(n*3),K=new Float32Array(n*3);let o=0;for(const q of parts){const k=q.attributes.position.count;P.set(q.attributes.position.array,o*3);N.set(q.attributes.normal.array,o*3);K.set(q.attributes.color.array,o*3);o+=k}
      const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P,3));g.setAttribute('normal',new THREE.BufferAttribute(N,3));g.setAttribute('color',new THREE.BufferAttribute(K,3));return g}}}
  // flat-shaded part: face normals, one colour or the gradient already on the geometry
  function flFlat(B,g,c=null,m=null){if(m)g.applyMatrix4(m);if(g.index){g.computeVertexNormals();B.solid(g.toNonIndexed(),c);return}g.deleteAttribute('normal');g.computeVertexNormals();B.solid(g,c)}/* 3.40: bóng mượt (smooth) cho vẻ mềm mại kiểu Soft Minimal Luxury */
  // petal-local frame: the petal grows along +z from its base at the origin; tilt < 0 lifts the tip, ang turns it around the flower axis
  const flM=(ang=0,tilt=0,r=0,y=0)=>new THREE.Matrix4().makeRotationY(ang).multiply(new THREE.Matrix4().makeTranslation(0,y,r)).multiply(new THREE.Matrix4().makeRotationX(tilt));
  function flPetal({L,W,T=.03,seg=[6,4],base,tip,br=1,bend=0}){const g=new THREE.SphereGeometry(1,seg[0],seg[1]);g.scale(W,T,L);g.translate(0,0,L);
    const P=g.attributes.position,c=new Float32Array(P.count*3),a=FL.C(base),b=FL.C(tip),t=FL.tmp;
    for(let i=0;i<P.count;i++){const u=Math.min(1,Math.max(0,P.getZ(i)/(2*L)));if(bend)P.setY(i,P.getY(i)+bend*u*u*L);t.copy(a).lerp(b,u*u*(3-2*u));c[i*3]=t.r*br;c[i*3+1]=t.g*br;c[i*3+2]=t.b*br}
    g.setAttribute('color',new THREE.BufferAttribute(c,3));return g}
  const FLOWER_BUILD={
    sen(B,hi){// Sen hồng: ba lớp cánh bầu to, gốc trắng ngà chuyển hồng đậm ở đầu cánh, ôm gương sen vàng có hạt
      const seg=hi?[10,6]:[6,4];
      for(let k=0;k<8;k++)flFlat(B,flPetal({L:.2,W:.105,T:.03,seg,base:'#fff3f7',tip:'#f9559a',bend:.45}),null,flM(k*Math.PI/4,-.55,.05));
      if(hi)for(let k=0;k<8;k++)flFlat(B,flPetal({L:.17,W:.095,T:.028,seg,base:'#fff6f9',tip:'#ff6fab',bend:.38}),null,flM((k+.5)*Math.PI/4,-.9,.045,.012));
      for(let k=0;k<6;k++)flFlat(B,flPetal({L:.13,W:.08,T:.026,seg,base:'#fffaf6',tip:'#ff9cc4',bend:.25}),null,flM(k*Math.PI/3+.25,-1.25,.04,.024));
      flFlat(B,new THREE.CylinderGeometry(.075,.052,.075,hi?18:8),'#ffd21f',new THREE.Matrix4().makeTranslation(0,.065,0));
      if(hi)for(let k=0;k<9;k++){const d=new THREE.SphereGeometry(.011,6,4).scale(1,.4,1);const r=k?(k<7?.04:.06):0,a=k*Math.PI/3+(k>6?.5:0);flFlat(B,d,'#d99a0a',new THREE.Matrix4().makeTranslation(Math.cos(a)*r*(k>6?.8:1),.103,Math.sin(a)*r*(k>6?.8:1)))}},
    hong(B,hi){// Hồng đỏ: nụ lõi khép xoắn, bốn vòng cánh tròn mở dần, mép cánh sáng hơn; đài xanh bên dưới
      const seg=hi?[9,6]:[5,3];
      flFlat(B,new THREE.SphereGeometry(.055,hi?10:5,hi?8:3).scale(1,1.3,1),'#b00d26',new THREE.Matrix4().makeTranslation(0,.075,0));
      const rings=hi?[[4,-1.45,.022,.08,.085,'#c00f2a','#e81d3c'],[5,-1.2,.035,.095,.1,'#c8102e','#f02844'],[6,-.9,.05,.115,.12,'#d4112f','#ff3a55'],[7,-.55,.065,.13,.135,'#e0142f','#ff5470']]:[[4,-1.15,.04,.1,.1,'#c8102e','#ff2a4a'],[6,-.65,.07,.13,.13,'#e0142f','#ff5470']];
      rings.forEach(([n,tilt,r,L,W,c0,c1],ri)=>{for(let k=0;k<n;k++)flFlat(B,flPetal({L,W,T:.02,seg,base:c0,tip:c1,bend:.32}),null,flM(k*Math.PI*2/n+ri*.55,tilt,r,.01+ri*.005))});
      for(let k=0;k<5;k++)flFlat(B,flPetal({L:.07,W:.024,T:.01,seg:[5,3],base:'#3d8a2a',tip:'#5aa83a'}),null,flM(k*Math.PI*2/5+.3,.45,.03,-.01))},
    cuc(B,hi){// Cúc vàng: cánh bầu rộng hai vòng, nhuỵ cam tròn phồng có hạt nhỏ
      const seg=hi?[8,5]:[5,3],rings=hi?[[12,-.12,.055,.13,.06,'#ffc400','#ffe034'],[12,-.42,.05,.115,.055,'#ffb800','#ffd62a']]:[[10,-.2,.055,.13,.065,'#ffc400','#ffe034']];
      rings.forEach(([n,tilt,r,L,W,c0,c1],ri)=>{for(let k=0;k<n;k++)flFlat(B,flPetal({L,W,T:.02,seg,base:c0,tip:c1,bend:.2}),null,flM(k*Math.PI*2/n+ri*Math.PI/n,tilt,r,ri*.012))});
      const dome=new THREE.SphereGeometry(.058,hi?14:7,hi?8:3,0,Math.PI*2,0,Math.PI/2);dome.scale(1,.7,1);flFlat(B,dome,'#ff7a00',new THREE.Matrix4().makeTranslation(0,.02,0));
      if(hi)for(let k=0;k<22;k++){const a=k*2.39996,r=.052*Math.sqrt((k+.5)/22),y=.02+.04*Math.sqrt(Math.max(0,1-(r/.058)**2));flFlat(B,new THREE.SphereGeometry(.007,5,3),k%3?'#ff5a00':'#ff9a1a',new THREE.Matrix4().makeTranslation(Math.cos(a)*r,y,Math.sin(a)*r))}},
    cam_tu_cau(B,hi){// Cẩm tú cầu lam: khối cầu kết từ các cụm hoa nhỏ bốn cánh, mỗi cụm quay theo mặt cầu, nhụy chấm vàng nhạt
      const cols=['#2a6bff','#3f86ff','#2f72f5','#5b9bff','#2160ee','#6aaaff'],N=hi?42:14,R0=.16,rnd=seededRandom(331),L=hi?.042:.052,seg=hi?[5,3]:[4,2],q=new THREE.Quaternion(),m=new THREE.Matrix4(),p=new THREE.Vector3();
      flFlat(B,new THREE.IcosahedronGeometry(R0*.9,hi?1:0),'#1d4fd0',new THREE.Matrix4().makeTranslation(0,R0*.25,0));
      for(let i=0;i<N;i++){const yy=1-(i+.5)/N*1.35,r=Math.sqrt(Math.max(0,1-yy*yy)),a=i*2.39996;p.set(Math.cos(a)*r,yy,Math.sin(a)*r).normalize();q.setFromUnitVectors(FL.up,p);
        const c=cols[(i*5)%cols.length],rot=rnd()*Math.PI,base=new THREE.Matrix4().compose(p.clone().multiplyScalar(R0).add(new THREE.Vector3(0,R0*.25,0)),q,new THREE.Vector3(1,1,1));
        for(let k=0;k<4;k++)flFlat(B,flPetal({L,W:L*.8,T:.008,seg,base:FL.C(c).lerp(FL.C('#ffffff'),.2).getHex(),tip:c,bend:-.1}),null,base.clone().multiply(flM(rot+k*Math.PI/2,-.12,.004)));
        if(hi)flFlat(B,new THREE.SphereGeometry(.007,4,2),'#fff27a',base.clone().multiply(m.makeTranslation(0,.008,0)))}},
    nhai(B,hi){// Huệ tây cam: sáu cánh vươn lên rồi uốn ra ngoài, họng vàng, đốm cam sẫm, nhị dài đầu nâu cam
      const seg=hi?[6,4]:[4,3];
      for(let k=0;k<6;k++){const a=k*Math.PI/3+(k%2?.08:0),lt=k%2===0;
        if(hi){const L1=.07,t1=-1.2,m1=flM(a,t1,.015);flFlat(B,flPetal({L:L1,W:.05,T:.016,seg,base:'#ffd23a',tip:lt?'#ffa51f':'#ff8a10'}),null,m1);
          const m2=m1.clone().multiply(new THREE.Matrix4().makeTranslation(0,0,L1*1.85)).multiply(new THREE.Matrix4().makeRotationX(.95+(lt?.12:0)));
          flFlat(B,flPetal({L:.09,W:.058,T:.016,seg,base:lt?'#ffa51f':'#ff8a10',tip:'#ff5a00',bend:-.25}),null,m2);
          for(let d=0;d<3;d++)flFlat(B,new THREE.SphereGeometry(.006,4,2),'#b5360a',m2.clone().multiply(new THREE.Matrix4().makeTranslation((d-1)*.012,.017,.03+d%2*.025)))}
        else flFlat(B,flPetal({L:.13,W:.055,T:.016,seg,base:'#ffd23a',tip:lt?'#ff7a10':'#ff5a00',bend:-.35}),null,flM(a,-.75,.015))}
      const ns=hi?6:3;for(let k=0;k<ns;k++){const a=k*Math.PI*2/ns+.4,len=.16,f=new THREE.CylinderGeometry(.003,.004,len,3);f.translate(0,len/2,0);const mm=new THREE.Matrix4().makeRotationY(a).multiply(new THREE.Matrix4().makeRotationX(.38));flFlat(B,f,'#ffe066',mm);
        flFlat(B,new THREE.SphereGeometry(.011,hi?5:4,2).scale(.7,.6,1.6),'#a8400f',mm.clone().multiply(new THREE.Matrix4().makeTranslation(0,len,0)))}},
    lan(B,hi){// Oải hương tím: vài bông nhọn, nụ mọc thành vòng quanh trục, nhỏ dần lên ngọn và nhạt màu dần; lá mảnh ở gốc
      const spikes=hi?[[-.1,.02,.22,1.05],[-.05,-.03,.1,1.2],[0,0,0,1.38],[.05,.03,-.1,1.22],[.1,-.02,-.22,1.08]]:[[-.06,0,.16,1.12],[0,0,0,1.38],[.06,0,-.16,1.15]];
      const lv=hi?11:6,per=hi?4:3,bud=new THREE.SphereGeometry(1,hi?5:4,hi?3:2);
      spikes.forEach(([bx,bz,lean,h],si)=>{const sm=new THREE.Matrix4().makeTranslation(bx,0,bz).multiply(new THREE.Matrix4().makeRotationZ(lean));
        const st=new THREE.CylinderGeometry(.006,.01,h,hi?5:3);st.translate(0,h/2,0);flFlat(B,st,'#4f8a2c',sm);
        for(let j=0;j<lv;j++){const t=j/(lv-1),y=h*(.6+.38*t),s=(1-.45*t)*(hi?1:1.4),col=FL.C('#7a2cf0').lerp(FL.C('#b07aff'),t).getHex();
          for(let k=0;k<per;k++){const a=k*Math.PI*2/per+j*1.1+si,g=bud.clone();g.scale(.026*s,.04*s,.026*s);g.rotateX(-.5);g.rotateY(a);
            flFlat(B,g,(j+k+si)%3?col:'#a35cff',sm.clone().multiply(new THREE.Matrix4().makeTranslation(Math.sin(a)*.026*s,y,Math.cos(a)*.026*s)))}}});
      for(const [a,l] of (hi?[[.6,.34],[2.1,.3],[3.6,.36],[5.0,.3]]:[[.6,.34],[3.6,.36]]))flFlat(B,flPetal({L:l*.5,W:.018,T:.008,seg:[4,2],base:'#3f7a28',tip:'#78a936',bend:-.2}),null,flM(a,-1.15,.01))}};
  const HEAD_Y={hong:.53,cam_tu_cau:.5,nhai:.52,cuc:.47,lan:.48,sen:.55};
  // Scale each model into the old flower's frame: heads sit at HEAD_Y on a thin stem; huệ and oải hương are whole plants.
  const FLOWER_FIT={sen:{d:.22,y:.55},hong:{d:.16,y:.53},cam_tu_cau:{d:.21,y:.5},cuc:{d:.21,y:.47},nhai:{d:.23,y:.52},lan:{h:.5}};/* 3.40: đầu hoa to hơn, cân với thân như ảnh mẫu */
  function flowerGeo(kind,lod='lo'){const key=kind+':'+lod;if(flowerGeos[key])return flowerGeos[key];const hi=lod==='hi',ground=lod==='ground';/* ground: cuống ngắn, hoa sát đất (luống sen hồng bên Hồ Niệm, 27/11/2026) */let g;{const B=flBuilder();(FLOWER_BUILD[kind]||FLOWER_BUILD.sen)(B,hi);g=B.geo()}if(kind==='nhai')g.rotateZ(.24);/* đầu huệ nghiêng 14° */g.computeBoundingBox();const bb=g.boundingBox,f0=FLOWER_FIT[kind]||FLOWER_FIT.sen,f=ground&&!f0.h?{...f0,y:.18}:f0,sz=bb.getSize(new THREE.Vector3()),c=bb.getCenter(new THREE.Vector3());
    if(f.h){const s=f.h/sz.y;g.translate(-c.x,-bb.min.y,-c.z);g.scale(s,s,s);return flowerGeos[key]=g}
    const s=f.d/Math.max(sz.x,sz.z);g.translate(-c.x,-c.y,-c.z);g.scale(s,s,s);g.translate(0,f.y,0);
    const stemTop=f.y-sz.y*s*.35,P=[],S='#4f8a2c';P.push([part(new THREE.CylinderGeometry(.008,.011,stemTop,6),0,stemTop/2,0),S]);
    const B2=flBuilder();B2.solid(g,null);B2.solid(mergeColored(P),null);
    /* lá bầu dục to, mặt phẳng, xanh tươi như bản mẫu */for(const [y0,a,c] of [[.17,.3,'#3f8f2c'],[.27,2.9,'#5fae3a']]){const y=ground?y0*.3:y0;const lf=flPetal({L:.075,W:.04,T:.008,seg:[12,6],base:'#3f8f2c',tip:c,bend:.25});flFlat(B2,lf,null,new THREE.Matrix4().makeTranslation(0,y,0).multiply(flM(a,-.35,.004)))}
    return flowerGeos[key]=B2.geo()}

  /* xem trước 6 loại hoa (kiểm thử / ảnh giới thiệu): hàng trên nhìn trước, hàng dưới nhìn từ trên */
  window.__flowerSheet=(W=1500,H=520)=>{const cv=document.createElement('canvas');cv.width=W;cv.height=H;const r=new THREE.WebGLRenderer({canvas:cv,antialias:true,preserveDrawingBuffer:true});r.setPixelRatio(1);r.setSize(W,H,false);r.setClearColor('#f7efe3');r.toneMapping=THREE.ACESFilmicToneMapping;
    const sc=new THREE.Scene();sc.add(new THREE.HemisphereLight('#ffffff','#c9b89a',1.6));const dl=new THREE.DirectionalLight('#fff4e0',2.4);dl.position.set(2,4,5);sc.add(dl);
    const ks=['sen','hong','cuc','cam_tu_cau','nhai','lan'],ms=ks.map((k,i)=>{const m=new THREE.Mesh(flowerGeo(k,'hi'),flowerMat);m.position.set((i-2.5)*.44,0,0);sc.add(m);return m});
    const cam=new THREE.OrthographicCamera(-1.4,1.4,1.4*H/W,-1.4*H/W,.1,20);const shot=(el,cy)=>{cam.position.set(0,cy+Math.sin(el)*4,Math.cos(el)*4);cam.lookAt(0,cy,0);cam.updateProjectionMatrix();r.render(sc,cam);const c2=document.createElement('canvas');c2.width=W;c2.height=H;c2.getContext('2d').drawImage(cv,0,0);return c2};
    const a=shot(.3,.3),b=shot(1.45,.45),out=document.createElement('canvas');out.width=W;out.height=H*2;const x=out.getContext('2d');x.drawImage(a,0,0);x.drawImage(b,0,H);const url=out.toDataURL('image/jpeg',.9);r.dispose();return url};
  // Bouquet: the stems arranged by the chosen layout, slot 0 is the centre/top; paper wrap and a ribbon at the waist.
  const BOUQUET_LAYOUTS={tron:'🔵 Tròn',thap:'🔺 Tháp',quat:'🪭 Quạt'};
  const flowerMatLo=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.55});/* vườn hoa: hàng trăm cây, vật liệu nhẹ cho điện thoại */
  const flowerMat=new THREE.MeshPhysicalMaterial({vertexColors:true,roughness:.5,clearcoat:.35,clearcoatRoughness:.4,sheen:.4,sheenColor:new THREE.Color('#ffffff')});/* cánh mềm, hơi bóng */
  // Bó hoa theo ba kiểu tham khảo: Tròn (bó tay gói giấy kraft, hoa xếp thành vòm), Tháp (giỏ nan, hoa xếp hình tháp nhọn),
  // Quạt (hộp gỗ, hoa xòe rộng). Đầu hoa đặt lên một khung hình định sẵn, cuống gom vào trong giấy / giỏ / hộp;
  // khe trống giữa các bông được lấp bằng chùm hoa nhỏ hồng nhạt và lá xanh.
  const fillerGeo=(()=>{const P=[],dot=new THREE.SphereGeometry(.016,5,3);P.push([part(new THREE.CylinderGeometry(.004,.005,.12,3),0,.06,0),'#5e7f4a']);
    [[0,.125,0],[.02,.115,.012],[-.018,.118,-.01],[.008,.108,-.02],[-.01,.104,.02],[.024,.1,-.006]].forEach(([x,y,z],k)=>P.push([part(dot,x,y,z),k%2?'#f6c9d6':'#fbe0e8']));return mergeColored(P)})();
  const leafGeo=mergeColored([[part(new THREE.SphereGeometry(.05,6,4),0,.09,0,.42,1.9,.14),'#4f7f45'],[part(new THREE.CylinderGeometry(.004,.005,.06,3),0,.02,0),'#4f7f45']]);
  function headFrame(n,layout){const pts=[];
    if(layout==='thap'){const rows=[[1,0,.78],[3,.085,.66],[5,.15,.52],[6,.2,.39]];let left=n;for(const [cap,r,y] of rows){const m=Math.min(cap,left);for(let k=0;k<m;k++){const a=k/m*Math.PI*2+(r?.4:0);pts.push([Math.sin(a)*r,y,Math.cos(a)*r])}left-=m;if(!left)break}}
    else if(layout==='quat'){const rows=n<=4?[n]:n<=7?[n-3,3]:[5,n-5];rows.forEach((m,ri)=>{for(let k=0;k<m;k++){const a=m===1?0:(-1+2*k/(m-1))*(ri?.75:1.1);const R=ri?.17:.3;pts.push([Math.sin(a)*R,.19+Math.cos(a)*R*.85+(ri?.02:0),ri?.06:-.02])}})}
    else{if(n===1)pts.push([0,.41,0]);else{pts.push([0,.47,0]);const m=n-1,inner=Math.min(m,5);for(let k=0;k<inner;k++){const a=k/inner*Math.PI*2;pts.push([Math.sin(a)*.13,.42,Math.cos(a)*.13])}for(let k=0;k<m-inner;k++){const a=(k+.5)/(m-inner)*Math.PI*2;pts.push([Math.sin(a)*.25,.36,Math.cos(a)*.25])}}}
    return pts}
  const BQ_BASE={tron:[0,.02,0],thap:[0,.05,0],quat:[0,.02,0]},BQ_WRAP=.75;
  // Stems must stay inside the wrap or the box: the part of each stem below its head is trimmed where it would show outside
  // (below the paper sleeve or through the side of the cone for Tròn, under the box for Quạt).
  function bqOutside(layout,p){if(layout==='quat')return p.y<.004;if(layout!=='tron')return false;const sc=BQ_WRAP,yl=p.y/sc,r=Math.hypot(p.x,p.z)/sc;
    if(yl<-.035)return true;if(yl>.255)return false;const cone=yl<.03?.055:yl<.16?.055+(.2-.055)*(yl-.03)/.13:.2,coll=yl>=.15?.19+(.3-.19)*(yl-.15)/.1:0;return r>Math.max(cone,coll)-.006}
  function bqPullIn(layout,p){if(layout==='quat'){p.y=Math.max(p.y,.006);return}const sc=BQ_WRAP;p.y=Math.max(p.y,-.03*sc);const yl=p.y/sc;if(yl>.255)return;
    const cone=yl<.03?.055:yl<.16?.055+(.2-.055)*(yl-.03)/.13:.2,coll=yl>=.15?.19+(.3-.19)*(yl-.15)/.1:0,R=(Math.max(cone,coll)-.01)*sc,r=Math.hypot(p.x,p.z);if(r>R){p.x*=R/r;p.z*=R/r}}
  function trimStems(g,layout,flowers){if(layout==='thap')return;let fi=0;const v=new THREE.Vector3(),inv=new THREE.Matrix4();
    for(const m of [...g.children]){if(!m.isMesh)continue;const geo=m.geometry,cutY=geo===fillerGeo?.07:geo===leafGeo?.05:(()=>{const k=flowers[fi++],h=HEAD_Y[k]||.5;return k==='lan'?h-.12:h-.09})();
      m.updateMatrix();const src=geo.index?geo.toNonIndexed():geo,P=src.attributes.position,keep=[];
      for(let i=0;i<P.count;i+=3){let drop=false;for(let q=0;q<3&&!drop;q++){if(P.getY(i+q)>=cutY)continue;v.fromBufferAttribute(P,i+q).applyMatrix4(m.matrix);if(bqOutside(layout,v))drop=true}if(!drop)keep.push(i)}
      if(keep.length*3===P.count)continue;const out=new THREE.BufferGeometry();for(const name of Object.keys(src.attributes)){const a=src.attributes[name],n=a.itemSize,arr=new Float32Array(keep.length*3*n);keep.forEach((i,t)=>{for(let q=0;q<3*n;q++)arr[t*3*n+q]=a.array[i*n+q]});out.setAttribute(name,new THREE.BufferAttribute(arr,n))}m.geometry=out}}
  function placeStem(g,geo,mat_,head,headY,base,s){const P=new THREE.Vector3(...head),B=new THREE.Vector3(...base),d=P.clone().sub(B).normalize(),m=new THREE.Mesh(geo,mat_);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d);m.scale.setScalar(s);m.position.copy(P).addScaledVector(d,-headY*s);g.add(m);return m}
  const bqMats={kraftOut:new THREE.MeshStandardMaterial({color:'#c9a77a',roughness:.95,side:THREE.FrontSide}),paperIn:new THREE.MeshStandardMaterial({color:'#f2ede2',roughness:.9,side:THREE.BackSide}),kraft:new THREE.MeshStandardMaterial({color:'#c9a77a',roughness:.95,side:THREE.DoubleSide}),paper:new THREE.MeshStandardMaterial({color:'#f2ede2',roughness:.9,side:THREE.DoubleSide}),ribbon:new THREE.MeshStandardMaterial({color:'#f4efe6',roughness:.6,side:THREE.DoubleSide}),
    slat:new THREE.MeshStandardMaterial({color:'#c69a5e',roughness:.9}),slatDark:new THREE.MeshStandardMaterial({color:'#8f6a3c',roughness:.9}),bark:new THREE.MeshStandardMaterial({color:'#6a4a32',roughness:1,flatShading:true}),twine:new THREE.MeshStandardMaterial({color:'#b89a6a',roughness:1})};
  // Oải hương ưu tiên vào giữa bó, xen kẽ với hoa khác: lavender takes every other slot of the inner positions (not the very centre).
  function arrangeLavender(flowers,layout){const n=flowers.length,lav=flowers.filter(f=>f==='lan'),rest=flowers.filter(f=>f!=='lan');if(!lav.length||lav.length===n)return flowers.slice();
    const hs=headFrame(n,layout),order=hs.map((h,i)=>i).filter(i=>i>0).sort((a,b)=>Math.hypot(hs[a][0],hs[a][2])-Math.hypot(hs[b][0],hs[b][2])),pick=[];
    for(let k=0;k<order.length&&pick.length<lav.length;k+=2)pick.push(order[k]);for(let k=1;k<order.length&&pick.length<lav.length;k+=2)pick.push(order[k]);
    const out=new Array(n);pick.forEach(i=>out[i]='lan');let r=0;for(let i=0;i<n;i++)if(!out[i])out[i]=rest[r++];return out}
  function buildBouquet(flowers,layout){if(!BOUQUET_LAYOUTS[layout])layout='tron';flowers=arrangeLavender(flowers,layout);let g=new THREE.Group();const base=BQ_BASE[layout],heads=headFrame(flowers.length,layout),s=layout==='tron'?.95:1;
    let seed=7;for(const f of flowers)seed=(seed*31+f.length*17+f.charCodeAt(0))|0;const rnd=seededRandom(seed+layout.length*101);
    heads.forEach((h,k)=>placeStem(g,flowerGeo(flowers[k],'hi'),flowerMat,h,HEAD_Y[flowers[k]]||.5,base,s));
    // fillers: pink sprays and leaves in the gaps around and between the heads
    const fill=[],leaves=[];heads.forEach(([x,y,z],k)=>{const n=layout==='quat'?2:2;for(let j=0;j<n;j++){const a=rnd()*Math.PI*2,r=.07+rnd()*.05;fill.push([x+Math.sin(a)*r,y-.02-rnd()*.05,z+Math.cos(a)*r])}});
    const rim=layout==='tron'?[.2,.3]:layout==='thap'?[.2,.27]:[.24,.1];for(let k=0;k<9;k++){const a=k/9*Math.PI*2+rnd()*.3;leaves.push([Math.sin(a)*rim[0]*(layout==='quat'?1.3:1),rim[1]+rnd()*.05,Math.cos(a)*rim[0]*(layout==='quat'?.5:1)]);fill.push([Math.sin(a+.35)*rim[0]*.9*(layout==='quat'?1.3:1),rim[1]+.06+rnd()*.05,Math.cos(a+.35)*rim[0]*.9*(layout==='quat'?.5:1)])}
    for(const p of fill)placeStem(g,fillerGeo,flowerMat,p,.125,base,1);
    for(const p of leaves)placeStem(g,leafGeo,flowerMat,p,.17,base,1);
    trimStems(g,layout,flowers);
    if(layout==='tron'){// kraft wrap with white inner paper, flared edges and a tied ribbon (built at full size, shown at half)
      const wrapG=g;g=new THREE.Group();g.scale.setScalar(BQ_WRAP);wrapG.add(g);
      const outer=new THREE.Mesh(new THREE.CylinderGeometry(.2,.055,.13,12,1,true),bqMats.kraft);outer.position.y=.095;g.add(outer);
      const inner=new THREE.Mesh(new THREE.CylinderGeometry(.19,.05,.12,12,1,true),bqMats.paper);inner.position.y=.11;inner.rotation.y=.3;g.add(inner);
      const upN=(geo,inside)=>{const n=geo.attributes.normal,P=geo.attributes.position;for(let i=0;i<n.count;i++){const x=P.getX(i),z=P.getZ(i),r=Math.hypot(x,z)||1;inside?n.setXYZ(i,x/r*.45,-.9,z/r*.45):n.setXYZ(i,x/r*.55,.85,z/r*.55)}return geo};/* inside faces are drawn as back faces, whose normal three.js flips, so they get a downward normal that turns upward */const collar=new THREE.Mesh(upN(new THREE.CylinderGeometry(.3,.19,.1,18,1,true)),bqMats.kraftOut);collar.position.y=.2;g.add(collar);const collarIn=new THREE.Mesh(upN(new THREE.CylinderGeometry(.295,.185,.1,18,1,true),true),bqMats.paperIn);collarIn.position.y=.2;collarIn.rotation.y=.2;g.add(collarIn);
      const sleeve=new THREE.Mesh(new THREE.CylinderGeometry(.055,.05,.08,10),bqMats.kraft);sleeve.position.y=.0;g.add(sleeve);
      const band=new THREE.Mesh(new THREE.TorusGeometry(.058,.008,6,18),bqMats.ribbon);band.rotation.x=Math.PI/2;band.position.y=.05;g.add(band);
      for(const s2 of [-1,1]){const loop=new THREE.Mesh(new THREE.TorusGeometry(.03,.006,5,12),bqMats.ribbon);loop.position.set(s2*.035,.06,.065);loop.rotation.y=s2*.6;g.add(loop);const tail=new THREE.Mesh(new THREE.PlaneGeometry(.02,.16),bqMats.ribbon);tail.position.set(s2*.02,-.03,.066);tail.rotation.z=s2*.15;g.add(tail)}
      g=wrapG;}
    else if(layout==='thap'){// woven slat basket
      const body=new THREE.Mesh(new THREE.CylinderGeometry(.19,.15,.24,16),bqMats.slat);body.position.y=.12;g.add(body);
      for(let k=0;k<16;k++){const a=k/16*Math.PI*2,sl=new THREE.Mesh(new THREE.BoxGeometry(.008,.245,.012),bqMats.slatDark);sl.position.set(Math.sin(a)*.172,.12,Math.cos(a)*.172);sl.rotation.y=a;sl.rotation.x=Math.cos(a)*.08;sl.rotation.z=-Math.sin(a)*.08;g.add(sl)}
      for(const y of [.03,.21]){const hoop=new THREE.Mesh(new THREE.TorusGeometry(y>.1?.188:.155,.009,5,24),bqMats.slatDark);hoop.rotation.x=Math.PI/2;hoop.position.y=y;g.add(hoop)}}
    else{// rough wooden box with a twine tie
      const box=new THREE.Mesh(new THREE.BoxGeometry(.4,.11,.18),bqMats.bark);box.position.y=.055;g.add(box);
      for(let k=0;k<6;k++){const r=new THREE.Mesh(new THREE.BoxGeometry(.012,.11,.01),bqMats.slatDark);r.position.set(-.17+k*.068,.055,.091);g.add(r)}
      const tw=new THREE.Mesh(new THREE.TorusGeometry(.012,.003,4,8),bqMats.twine);tw.position.set(.05,.08,.095);g.add(tw);for(const x of [.045,.06]){const t=new THREE.Mesh(new THREE.CylinderGeometry(.002,.002,.1,3),bqMats.twine);t.position.set(x,.03,.095);g.add(t)}}
    return g}

  // 3.33: Mỗi hồ Lục Căn có một luống hoa dài, mảnh, ôm theo một cung quanh miệng hồ (theo tranh "6 hồ"): dải đất xanh thấp
  // nằm sát vòng đá, hoa mọc dày dọc dải, hai tảng đá ở hai đầu. Cung được dò quanh bờ để tránh lối đi, nhà, gốc và tán cây,
  // ưu tiên phía ngã rẽ cũ trên vòng đường Ngũ quan. Vị trí sáu hồ giữ nguyên.
  const BED_IN=POND_R+.45,BED_OUT=POND_R+1.65,BED_ARC=1.9;/* dải rộng 1.2 m, dài khoảng 12 m theo bờ */
  const canopyNear=(x,z,r)=>{const cx=Math.floor(x/TREE_CELL),cz=Math.floor(z/TREE_CELL);for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++){const a=treeGrid.get(treeCellKey(cx+i,cz+j));if(a)for(const t of a)if(Math.hypot(x-t[0],z-t[1])<r)return true}return false};
  const FLOWER_GARDENS=[{kind:'hong',lake:'Sắc'},{kind:'cam_tu_cau',lake:'Thanh'},{kind:'lan',lake:'Hương'},{kind:'cuc',lake:'Vị'},{kind:'nhai',lake:'Chạm'},{kind:'sen',lake:'Niệm'}].map((g,i)=>{const pts=BRANCHES[i],c=pts[pts.length-8],l=wishLakes.find(v=>v.name===g.lake);
    const bedFree=(x,z)=>!(onPaved(x,z)||branchDistance(x,z)<1.2||stairsDistance(x,z)<1.8||wishLakes.some(w=>!w.lotus&&Math.hypot(x-w.x,z-w.z)<POND_R+.4)||houseHit(x,z,.6)||treeBlocked(x,z));
    const th0=Math.atan2(c[1]-l.z,c[0]-l.x);let best=null;
    for(let k=0;k<72;k++){const th=k/72*Math.PI*2;let ok=0,n=0;for(let a=-BED_ARC/2;a<=BED_ARC/2;a+=.08)for(let r=BED_IN+.1;r<=BED_OUT;r+=.35){const x=l.x+Math.cos(th+a)*r,z=l.z+Math.sin(th+a)*r;n++;if(bedFree(x,z)&&!canopyNear(x,z,2.4))ok++}
      const dth=Math.abs(Math.atan2(Math.sin(th-th0),Math.cos(th-th0))),score=ok/n-.2*dth/Math.PI;if(!best||score>best.score)best={score,th}}
    const th=best.th,rm=(BED_IN+BED_OUT)/2,R=BED_OUT+.8;/* đứng hái ở mép ngoài, giữa cung */
    return {...g,lx:l.x,lz:l.z,th,bx:l.x+Math.cos(th)*rm,bz:l.z+Math.sin(th)*rm,x:l.x+Math.cos(th)*R,z:l.z+Math.sin(th)*R,free:bedFree}});
  {const rnd=seededRandom(9090),m4=new THREE.Matrix4(),q=new THREE.Quaternion(),e=new THREE.Euler(),v=new THREE.Vector3(),sc=new THREE.Vector3(),rockGeo=new THREE.DodecahedronGeometry(1,0),rockM=new THREE.MeshStandardMaterial({color:'#8d8a7d',roughness:.95,flatShading:true}),moundM=mat('#315c35');
    for(const gd of FLOWER_GARDENS){
      if(!gd.pier){const pts=[],N=gd.kind==='lan'?96:84;for(let tries=0;pts.length<N&&tries<5000;tries++){const a=gd.th+(rnd()-.5)*BED_ARC*(.96),r=BED_IN+.15+rnd()*(BED_OUT-BED_IN-.3),x=gd.lx+Math.cos(a)*r,z=gd.lz+Math.sin(a)*r;
          if(!gd.free(x,z))continue;if(pts.some(([px,pz])=>Math.hypot(px-x,pz-z)<.32))continue;pts.push([x,z])}
        // dải đất trồng hoa: hình vành khuyên cắt cung, đùn thấp, mép vát; toạ độ theo tâm hồ
        const sh=new THREE.Shape(),S=24,a0=gd.th-BED_ARC/2;for(let k=0;k<=S;k++){const a=a0+k/S*BED_ARC;sh[k?'lineTo':'moveTo'](Math.cos(a)*BED_OUT,-Math.sin(a)*BED_OUT)}for(let k=S;k>=0;k--){const a=a0+k/S*BED_ARC;sh.lineTo(Math.cos(a)*BED_IN,-Math.sin(a)*BED_IN)}
        const mg=new THREE.ExtrudeGeometry(sh,{depth:.12,bevelEnabled:true,bevelThickness:.06,bevelSize:.14,bevelSegments:1,curveSegments:4});mg.rotateX(-Math.PI/2);
        const mound=new THREE.Mesh(mg,moundM);mound.position.set(gd.lx,terrainHeight(gd.bx,gd.bz)-.03,gd.lz);mound.userData.garden=gd;scene.add(mound);
        const mesh=new THREE.InstancedMesh(flowerGeo(gd.kind,gd.kind==='sen'?'ground':'lo'),flowerMatLo,Math.max(1,pts.length));pts.forEach(([x,z],i)=>{const s=1.7+rnd()*.6;e.set((rnd()-.5)*.25,rnd()*Math.PI*2,(rnd()-.5)*.25);q.setFromEuler(e);v.set(x,terrainHeight(x,z)+.12,z);sc.set(s,s,s);m4.compose(v,q,sc);mesh.setMatrixAt(i,m4)});
        mesh.count=pts.length;mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;mesh.userData.garden=gd;scene.add(mesh);gd.mesh=mesh;
        // lá xanh thấp dưới chân hoa
        const nb=Math.ceil(pts.length/2),bush=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.2,0),new THREE.MeshStandardMaterial({color:'#3d7a3a',roughness:.9,flatShading:true}),Math.max(1,nb));for(let i=0;i<nb;i++){const [x,z]=pts[i*2];e.set(0,rnd()*6,0);q.setFromEuler(e);v.set(x+(rnd()-.5)*.2,terrainHeight(x,z)+.2,z+(rnd()-.5)*.2);sc.set(1.4,.55,1.4);m4.compose(v,q,sc);bush.setMatrixAt(i,m4)}bush.count=nb;bush.instanceMatrix.needsUpdate=true;bush.userData.garden=gd;scene.add(bush);
        // hai tảng đá tròn ở hai đầu cung, như trong tranh
        const rocks=new THREE.InstancedMesh(rockGeo,rockM,2);[[-1,.55],[1,.42]].forEach(([sd,s],i)=>{const a=gd.th+sd*(BED_ARC/2+.06),r=(BED_IN+BED_OUT)/2+.1,x=gd.lx+Math.cos(a)*r,z=gd.lz+Math.sin(a)*r;e.set(rnd()*.3,rnd()*6,0);q.setFromEuler(e);v.set(x,terrainHeight(x,z)+s*.35,z);sc.set(s*1.2,s*.8,s);m4.compose(v,q,sc);rocks.setMatrixAt(i,m4)});rocks.instanceMatrix.needsUpdate=true;scene.add(rocks);
        }
      // a floating flower sign above each garden: tap it to go and pick
      const cv=document.createElement('canvas');cv.width=256;cv.height=256;const cx=cv.getContext('2d');cx.fillStyle='rgba(11,45,40,.82)';cx.beginPath();cx.arc(128,128,112,0,7);cx.fill();cx.strokeStyle='#c8a96a';cx.lineWidth=8;cx.stroke();cx.font='120px serif';cx.textAlign='center';cx.textBaseline='middle';cx.fillText(FLOWER_KINDS[gd.kind].icon,128,138);
      const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;const sp=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));sp.scale.set(1.1,1.1,1);const sx=gd.pier?gd.x:gd.bx,sz=gd.pier?gd.z:gd.bz;sp.position.set(sx,terrainHeight(sx,sz)+2.6,sz);sp.userData.garden=gd;scene.add(sp);gd.sign=sp}}
  // ---- basket, picking, arranging, carrying, offering
  let bouquetYaw=0,bqSpin=true,flowerBasket=[],bouquetLayout='tron',carriedBouquet=null,pendingGarden=null,pendingOffer=false,swapPick=-1;
  const flowerUi=document.createElement('div');flowerUi.innerHTML=`
    <section id="flowerSheet" role="dialog" aria-label="Hái hoa" hidden><div class="fl-head"><strong id="flowerSheetTitle"></strong><button type="button" data-fl="close">✕ Đóng</button></div>
      <p class="fl-note" id="flowerSheetNote"></p><div class="fl-row"><button type="button" class="fl-main" data-fl="pick">＋ Hái 1 bông</button><span id="flowerCount"></span></div>
      <div class="fl-chips" id="flowerChips"></div><div class="og-list" id="flowerOthers" hidden></div><div class="fl-row"><button type="button" data-fl="others">🌸 Hoa khác</button><button type="button" data-fl="done" class="fl-gold">✓ Xong · bó hoa</button></div></section>
    <section id="bouquetBox" role="dialog" aria-label="Bó hoa" hidden><div class="fl-head"><strong>💐 Sắp xếp bó hoa</strong><button type="button" data-fl="later">✕ Để sau</button></div>
      <div class="fl-body"><canvas id="bouquetCanvas" width="320" height="320"></canvas><div class="fl-side">
        <div class="fl-note">Kiểu bó</div><div class="fl-row" id="bouquetLayouts"></div>
        <div class="fl-note">Chạm hai bông để đổi chỗ cho nhau (bông đầu tiên ở giữa / trên cùng). Chạm ✕ để bỏ bớt.</div><div class="fl-chips" id="bouquetChips"></div>
        <div class="fl-row"><button type="button" data-fl="more">🌸 Hoa khác</button><button type="button" data-fl="redo">🔁 Chọn lại</button></div>
        <button type="button" class="fl-gold" data-fl="ok">✅ Ưng ý · mang đi dâng</button></div></div></section>
    <button type="button" id="flowerPill" hidden></button>`;
  document.body.appendChild(flowerUi);
  const flSheet=document.getElementById('flowerSheet'),bqBox=document.getElementById('bouquetBox'),flPill=document.getElementById('flowerPill'),hint=t=>{document.getElementById('zenHint').textContent=t};
  function refreshFlowerPill(){if(carriedBouquet){flPill.hidden=false;flPill.textContent='💐 Mang bó hoa · '+(Math.hypot(mePosition.x-STATUE.x,mePosition.z-STATUE.z)<9?'Dâng hoa':'Đi dâng hoa');}else if(flowerBasket.length){flPill.hidden=false;flPill.textContent='🧺 Giỏ hoa '+flowerBasket.length+'/'+BOUQUET_MAX+' · Bó hoa';}else flPill.hidden=true}
  function chipsHtml(list,removable,sel){return list.map((k,i)=>'<button type="button" class="fl-chip'+(i===sel?' sel':'')+'" data-i="'+i+'" aria-label="'+FLOWER_KINDS[k].name+'">'+FLOWER_KINDS[k].icon+(removable?'<span data-x="'+i+'">✕</span>':'')+'</button>').join('')||'<span class="fl-note">Giỏ còn trống</span>'}
  let sheetGarden=null;
  function openGardenSheet(gd){sheetGarden=gd;document.getElementById('flowerOthers').hidden=true;flSheet.querySelector('[data-fl="others"]').textContent='🌸 Hoa khác';const k=FLOWER_KINDS[gd.kind];document.getElementById('flowerSheetTitle').textContent=k.icon+' '+k.garden;
    document.getElementById('flowerSheetNote').textContent=gd.pier?'Hái sen ở Bến Sen để thêm vào bó hoa dâng Phật.':'Hái '+k.name.toLowerCase()+' để thêm vào bó hoa dâng Phật. Có thể hái ở nhiều vườn.';renderGardenSheet();flSheet.hidden=false;document.body.classList.add('flower-open')}
  function renderGardenSheet(){document.getElementById('flowerCount').textContent='Giỏ: '+flowerBasket.length+'/'+BOUQUET_MAX;
    document.getElementById('flowerOthers').innerHTML=FLOWER_GARDENS.map((g,i)=>g===sheetGarden?'':'<div class="og-g"><span>'+FLOWER_KINDS[g.kind].icon+' '+(g.pier?'Hoa sen · Bến Sen':FLOWER_KINDS[g.kind].garden)+'</span><button type="button" data-og-walk="'+i+'">🚶 Đi bộ</button><button type="button" data-og-tp="'+i+'">✨ Đến ngay</button></div>').join('');document.getElementById('flowerChips').innerHTML=chipsHtml(flowerBasket,true);
    flSheet.querySelector('[data-fl="pick"]').disabled=flowerBasket.length>=BOUQUET_MAX||!!carriedBouquet;flSheet.querySelector('[data-fl="done"]').disabled=!flowerBasket.length;refreshFlowerPill()}
  function closeFlowerUi(){flSheet.hidden=true;bqBox.hidden=true;document.body.classList.remove('flower-open');stopPreview()}
  flSheet.addEventListener('click',e=>{const ow=e.target.closest('[data-og-walk]'),ot=e.target.closest('[data-og-tp]');if(ow||ot){const gd=FLOWER_GARDENS[Number((ow||ot).dataset[ow?'ogWalk':'ogTp'])];closeFlowerUi();if(ow){standUpForTravel();goToGarden(gd)}else if(teleportTo(gd.x,gd.pier?gd.z-.6:gd.z,null))setTimeout(()=>openGardenSheet(gd),250);return}const x=e.target.closest('[data-x]');if(x){flowerBasket.splice(Number(x.dataset.x),1);renderGardenSheet();return}const a=e.target.closest('[data-fl]')?.dataset.fl;if(!a)return;
    if(a==='others'){const o=document.getElementById('flowerOthers');o.hidden=!o.hidden;e.target.closest('[data-fl]').textContent=o.hidden?'🌸 Hoa khác':'▴ Ẩn hoa khác';return}
    if(a==='close')closeFlowerUi();else if(a==='pick'&&sheetGarden&&flowerBasket.length<BOUQUET_MAX&&!carriedBouquet){flowerBasket.push(sheetGarden.kind);renderGardenSheet();if(flowerBasket.length>=BOUQUET_MAX)hint('🧺 Giỏ đã đủ 9 bông · Bấm Xong để bó hoa')}
    else if(a==='done'&&flowerBasket.length)openBouquet()});
  // Preview: a small separate renderer that spins the bouquet slowly.
  let pv=null;
  function startPreview(){const cv=document.getElementById('bouquetCanvas');if(!pv){const r=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});r.setPixelRatio(Math.min(2,devicePixelRatio||1));r.setSize(320,320,false);r.outputColorSpace=THREE.SRGBColorSpace;
      const sc=new THREE.Scene();sc.add(new THREE.HemisphereLight('#fff4dc','#2d4a3a',2.4));const d=new THREE.DirectionalLight('#ffe6c0',1.6);d.position.set(1,2,1.5);sc.add(d);const cam=new THREE.PerspectiveCamera(32,1,.01,10);cam.position.set(0,.55,1.55);cam.lookAt(0,.32,0);pv={r,sc,cam,holder:new THREE.Group(),run:false};sc.add(pv.holder)}
    pv.holder.clear();pv.holder.add(buildBouquet(flowerBasket,bouquetLayout));
    if(!pv.drag){pv.drag=true;let d=null;/* drag sideways to turn the bouquet; it stops spinning and keeps the angle you leave it at */
      cv.style.touchAction='none';cv.style.cursor='grab';
      cv.addEventListener('pointerdown',e=>{d={x:e.clientX,y:bouquetYaw};bqSpin=false;cv.setPointerCapture(e.pointerId);cv.style.cursor='grabbing';refreshYawUi()});
      cv.addEventListener('pointermove',e=>{if(!d)return;bouquetYaw=d.y+(e.clientX-d.x)*.012});
      const up=()=>{if(d){d=null;cv.style.cursor='grab'}};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up)}
    if(!pv.run){pv.run=true;let last=performance.now();const spin=()=>{if(!pv||!pv.run)return;const now=performance.now();if(bqSpin)bouquetYaw+=(now-last)/1000*.6;last=now;pv.holder.rotation.y=bouquetYaw;pv.r.render(pv.sc,pv.cam);requestAnimationFrame(spin)};spin()}}
  function refreshYawUi(){const b=document.getElementById('bqYawRow');if(b)b.innerHTML='<button type="button" class="fl-chip wide'+(bqSpin?' sel':'')+'" data-yaw="spin">⟳ Xoay 360°</button><button type="button" class="fl-chip wide'+(!bqSpin?' sel':'')+'" data-yaw="keep">📌 Giữ góc này</button><span class="fl-note" style="margin:0;flex-basis:100%">Kéo ngang bó hoa để xoay, chọn góc đẹp nhất; khi dâng, mặt này quay ra trước.</span>'}
  function stopPreview(){if(pv)pv.run=false}
  function renderBouquet(){document.getElementById('bouquetLayouts').innerHTML=Object.entries(BOUQUET_LAYOUTS).map(([k,l])=>'<button type="button" class="fl-chip wide'+(k===bouquetLayout?' sel':'')+'" data-layout="'+k+'">'+l+'</button>').join('');
    document.getElementById('bouquetChips').innerHTML=chipsHtml(flowerBasket,true,swapPick);if(!document.getElementById('bqYawRow')){const r=document.createElement('div');r.id='bqYawRow';r.className='fl-row';r.style.cssText='flex-wrap:wrap;gap:6px;align-items:center;margin:6px 0';const col=document.getElementById('bouquetLayouts').parentElement;col.insertBefore(r,col.firstChild)}refreshYawUi();bqBox.querySelector('[data-fl="ok"]').disabled=!flowerBasket.length;bqBox.querySelector('[data-fl="more"]').disabled=flowerBasket.length>=BOUQUET_MAX;startPreview();refreshFlowerPill()}
  function openBouquet(){flSheet.hidden=true;swapPick=-1;bqSpin=true;bqBox.hidden=false;document.body.classList.add('flower-open');renderBouquet()}
  bqBox.addEventListener('click',e=>{const x=e.target.closest('[data-x]');if(x){flowerBasket.splice(Number(x.dataset.x),1);swapPick=-1;if(!flowerBasket.length){closeFlowerUi();refreshFlowerPill();hint('Giỏ hoa đã trống · Ghé các vườn hoa để hái lại');return}renderBouquet();return}
    const yw=e.target.closest('[data-yaw]');if(yw){bqSpin=yw.dataset.yaw==='spin';refreshYawUi();return}
    const ly=e.target.closest('[data-layout]');if(ly){bouquetLayout=ly.dataset.layout;renderBouquet();return}
    const c=e.target.closest('.fl-chip[data-i]');if(c){const i=Number(c.dataset.i);if(swapPick<0)swapPick=i;else{if(swapPick!==i){const t=flowerBasket[swapPick];flowerBasket[swapPick]=flowerBasket[i];flowerBasket[i]=t}swapPick=-1}renderBouquet();return}
    const a=e.target.closest('[data-fl]')?.dataset.fl;if(!a)return;
    if(a==='later'||a==='more'){closeFlowerUi();refreshFlowerPill();if(a==='more')openOfferGuide()}
    else if(a==='redo'){flowerBasket=[];closeFlowerUi();refreshFlowerPill();hint('🔁 Đã bỏ giỏ hoa · Ghé các vườn hoa để chọn lại')}
    else if(a==='ok'&&flowerBasket.length){const yw=((bouquetYaw%(Math.PI*2))+Math.PI*2)%(Math.PI*2);carriedBouquet={flowers:flowerBasket.slice(),layout:bouquetLayout,yaw:yw};flowerBasket=[];closeFlowerUi();attachCarried();refreshFlowerPill();hint('💐 Bó hoa đã xong · Mang lên đồi dâng tượng Phật')}});
  // carried bouquet in the avatar's hands
  let carriedMesh=null;
  function attachCarried(){if(carriedMesh){me.remove(carriedMesh);carriedMesh=null}if(!carriedBouquet)return;carriedMesh=buildBouquet(carriedBouquet.flowers,carriedBouquet.layout);carriedMesh.scale.setScalar(.6);carriedMesh.position.set(0,.8,.38);carriedMesh.rotation.set(.35,carriedBouquet.yaw||0,0,'XYZ');me.add(carriedMesh)}
  // offering slots on the dais steps in front of the statue: centre on the upper step, then alternating left/right on the lower step
  const offerSlotPos=k=>{if(k===0)return {x:STATUE.x,z:STATUE.z+1.78,y:TERRACE_TOP+.36,a:0};const a=[0,18,-18,38,-38,58,-58,78,-78][k]*Math.PI/180;return {x:STATUE.x+Math.sin(a)*2.13,z:STATUE.z+Math.cos(a)*2.13,y:TERRACE_TOP+.18,a}};
  const OFFER_STAND=[STATUE.x,STATUE.z+4.1];
  const offeredShown=new Map();
  function showOfferings(rows,full){const keep=new Set(rows.map(r=>String(r.id)));if(full)for(const [k,o] of offeredShown)if(!keep.has(k)&&!String(k).startsWith('local-')){shrine.remove(o.g);offeredShown.delete(k)}
    for(const r of rows){const key=String(r.id);if(offeredShown.has(key))continue;const used=new Set([...offeredShown.values()].map(o=>o.slot)),pref=(((Number(r.seq)-1)%OFFER_SLOTS)+OFFER_SLOTS)%OFFER_SLOTS;let slot=pref;if(used.has(pref)){for(let k=0;k<OFFER_SLOTS;k++)if(!used.has(k)){slot=k;break}}/* chỗ trống gần nhất; bệ đầy thì thay bó ở chỗ của mình */const p=offerSlotPos(slot);
      for(const [k,o] of offeredShown)if(o.slot===slot){shrine.remove(o.g);offeredShown.delete(k)}
      let g=buildBouquet((r.flowers||[]).filter(f=>FLOWER_KINDS[f]).slice(0,BOUQUET_MAX),BOUQUET_LAYOUTS[r.layout]?r.layout:'tron');g.scale.setScalar(1.3);g.position.set(p.x,p.y,p.z);g.rotation.set(-.22*Math.cos(p.a),p.a,.22*Math.sin(p.a));{const inner=g;const wrap=new THREE.Group();wrap.position.copy(inner.position);wrap.rotation.copy(inner.rotation);inner.position.set(0,0,0);inner.rotation.set(0,(Number(r.yaw)||0)*Math.PI/180,0);wrap.add(inner);wrap.scale.copy(inner.scale);inner.scale.setScalar(1);g=wrap}shrine.add(g);offeredShown.set(key,{g,slot})}
    }
  // Supabase: 9 bó trên bệ theo quy tắc kho 69/9 (6 được chọn nhiều nhất + 3 mới nhất). If the database is not reachable the offering still shows on this device.
  const flowerDb=(()=>{const c=window.ANYEN_CONFIG||{};try{return window.supabase&&/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(c.supabaseUrl||'')?window.supabase.createClient(c.supabaseUrl,c.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,storageKey:'anyen-flowers'}}):null}catch(e){return null}})();
  let localSeq=1;
  async function loadOfferings(){if(!flowerDb)return;try{const q=c=>flowerDb.from('anyen_flower_offerings').select(c).order('seq',{ascending:false}).limit(STORE_FETCH);let {data,error}=await q('id,seq,flowers,layout,yaw,name,picks');if(error)({data,error}=await q('id,seq,flowers,layout,yaw,name'));if(error)({data,error}=await q('id,seq,flowers,layout,name'));if(!error&&data){for(const [k,o] of offeredShown)if(String(k).startsWith('local-')){shrine.remove(o.g);offeredShown.delete(k)}showOfferings(pickNine(data).reverse(),true)}}catch(e){}}
  async function offerBouquet(){const b=carriedBouquet;if(!b)return;carriedBouquet=null;window.__bagTake&&window.__bagTake('flowers',{flowers:b.flowers,layout:b.layout},true);attachCarried();refreshFlowerPill();walkYaw=Math.PI;lookOffset=0;
    window.dispatchEvent(new CustomEvent('anyen-gesture',{detail:{kind:'namaste'}}));hint('🙏 Đã dâng hoa lên Đức Phật · Nguyện an lành');
    let name='Khách Yên';try{name=String(JSON.parse(localStorage.getItem('yenGuestProfile17')||'{}').name||name).slice(0,24)}catch(e){}
    let saved=false;if(flowerDb){try{const yawDeg=Math.round((b.yaw||0)*180/Math.PI)%360;let {error}=await flowerDb.from('anyen_flower_offerings').insert({flowers:b.flowers,layout:b.layout,yaw:yawDeg,name});if(error)({error}=await flowerDb.from('anyen_flower_offerings').insert({flowers:b.flowers,layout:b.layout,name}));saved=!error}catch(e){}}
    if(saved)loadOfferings();else{const next=[...offeredShown.values()].length;showOfferings([{id:'local-'+Date.now(),seq:localSeq++,flowers:b.flowers,layout:b.layout,yaw:Math.round((b.yaw||0)*180/Math.PI)}]);hint('🙏 Đã dâng hoa · (chưa lưu được lên máy chủ, chỉ hiện trên máy này)')}}
  function goOffer(){if(!carriedBouquet||bayMode||boatRide)return;if(Math.hypot(mePosition.x-OFFER_STAND[0],mePosition.z-OFFER_STAND[1])<1.8){offerBouquet();return}const p=nearestWalkable(...OFFER_STAND,Math.PI)||OFFER_STAND;if(navigateTo(...p)){pendingOffer=true;hint('💐 Đang mang bó hoa lên đồi…')}}
  function goToGarden(gd){if(bayMode||boatRide)return;const stand=gd.pier?[gd.x,gd.z-.6]:[gd.x,gd.z];if(Math.hypot(mePosition.x-stand[0],mePosition.z-stand[1])<3.2){openGardenSheet(gd);return}const p=nearestWalkable(...stand)||stand;if(navigateTo(...p)){pendingGarden=gd;hint(FLOWER_KINDS[gd.kind].icon+' Đang đến '+FLOWER_KINDS[gd.kind].garden+'…')}}
  flPill.addEventListener('click',()=>{if(carriedBouquet)goOffer();else if(flowerBasket.length)openBouquet()});
  window.addEventListener('anyen-3d-exit',closeFlowerUi);
  setInterval(()=>{if(document.body.classList.contains('immersive')&&!bayMode&&!document.hidden)loadOfferings();refreshFlowerPill()},12000);
  window.addEventListener('anyen-3d-enter',()=>setTimeout(loadOfferings,800));loadOfferings();
  // Nghi thức "Dâng hoa tượng Phật": a guide that starts the flower offering and shows where you are in it.
  const offerGuide=document.createElement('section');offerGuide.id='offerGuide';offerGuide.setAttribute('role','dialog');offerGuide.setAttribute('aria-label','Nghi thức dâng hoa');offerGuide.hidden=true;document.body.appendChild(offerGuide);
  function renderOfferGuide(){const step=carriedBouquet?3:flowerBasket.length?2:1,mark=n=>n<step?'✓':n===step?'●':'○';
    const gardens=FLOWER_GARDENS.map((g,i)=>{const k=FLOWER_KINDS[g.kind];return '<div class="og-g"><span>'+k.icon+' '+(g.pier?'Hoa sen · Bến Sen':k.name+' · Hồ '+(g.lake||''))+'</span><button type="button" data-og-walk="'+i+'">🚶 Đi bộ</button><button type="button" data-og-tp="'+i+'">✨ Đến ngay</button></div>'}).join('');
    offerGuide.innerHTML='<div class="fl-head"><strong>💐 Nghi thức dâng hoa tượng Phật</strong><button type="button" data-og="close">✕ Đóng</button></div>'
      +'<p class="fl-note">Đi qua các vườn hoa, hái tối đa 9 bông, bó lại theo ý mình rồi mang lên đồi dâng Đức Phật. Hoa dâng được giữ trên bệ cho mọi người cùng thấy.</p>'
      +'<ol class="og-steps"><li class="'+(step===1?'on':'')+'"><b>'+mark(1)+'</b> Hái hoa ở sáu vườn quanh các hồ'+(flowerBasket.length?' · giỏ '+flowerBasket.length+'/'+BOUQUET_MAX:'')+'</li><li class="'+(step===2?'on':'')+'"><b>'+mark(2)+'</b> Bấm Xong, xem trước và sắp xếp bó hoa</li><li class="'+(step===3?'on':'')+'"><b>'+mark(3)+'</b> Mang bó hoa lên đồi, dâng trước tượng Phật</li></ol>'
      +(step===3?'<div class="fl-row"><button type="button" class="fl-gold" data-og="offer">🙏 Đi dâng hoa</button></div>':'<div class="og-list">'+gardens+'</div>'+(step===2?'<div class="fl-row"><button type="button" class="fl-gold" data-og="arrange">💐 Xong · bó hoa ('+flowerBasket.length+' bông)</button></div>':''))}
  function openOfferGuide(){if(bayMode||!document.body.classList.contains('immersive'))return;closeFlowerUi();renderOfferGuide();offerGuide.hidden=false;document.body.classList.add('flower-open')}
  function closeOfferGuide(){offerGuide.hidden=true;if(flSheet.hidden&&bqBox.hidden)document.body.classList.remove('flower-open')}
  offerGuide.addEventListener('click',e=>{const w=e.target.closest('[data-og-walk]'),t=e.target.closest('[data-og-tp]'),a=e.target.closest('[data-og]')?.dataset.og;
    if(w){closeOfferGuide();standUpForTravel();goToGarden(FLOWER_GARDENS[Number(w.dataset.ogWalk)]);return}
    if(t){const gd=FLOWER_GARDENS[Number(t.dataset.ogTp)];closeOfferGuide();if(teleportTo(gd.x,gd.pier?gd.z-.6:gd.z,null))setTimeout(()=>openGardenSheet(gd),250);return}
    if(a==='close')closeOfferGuide();else if(a==='arrange'){closeOfferGuide();openBouquet()}else if(a==='offer'){closeOfferGuide();goOffer()}});
  window.addEventListener('anyen-flower-ritual',openOfferGuide);window.addEventListener('anyen-3d-exit',closeOfferGuide);
  // 3.18: Không gian bên trong bốn nhà giác quan. Mỗi nhà mở một gian phòng 3D riêng (rừng tạm dừng vẽ) với một hoạt động:
  // Nhà chuông gió: chạm chuông xoay, chiêng, chuông gió, và buổi thiền âm thanh 3 phút.
  // Haromy (nhà xông hương): 18 mùi, nhỏ tinh dầu hoặc đốt thảo mộc, thở cùng hương, Lọ Ước / Túi thơm vào Túi An Yên.
  // Nhà Vị (Ngũ Thiên Trà): pha trà từng bước rồi mời trà, nhận một lời nhắn.
  // Nhà gốm: nặn gốm Chăm đi lùi quanh đôn (không bàn xoay), chuốt, khắc hoa văn, phơi, rồi nung lộ thiên ngoài bãi.
  let roomOpen=false,room=null;
  const roomBox=document.createElement('section');roomBox.id='roomBox';roomBox.setAttribute('role','dialog');roomBox.hidden=true;
  roomBox.innerHTML='<div class="rm-top"><strong id="roomTitle"></strong><button type="button" data-rm="back">🚪 Ra cửa</button></div><div class="rm-stage"><canvas id="roomCanvas"></canvas><div class="rm-hint" id="roomHint"></div><div class="rm-breath" id="roomBreath" hidden><div class="rm-orb"></div><span></span></div><button type="button" class="rm-ui-tog" id="roomUiTog" aria-expanded="false" aria-label="Hiện nút đi lại và bảng thông tin"><svg viewBox="0 0 48 16" aria-hidden="true"><path d="M4 13L24 3L44 13" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div><div class="rm-panel" id="roomPanel"></div>';
  document.body.appendChild(roomBox);
  const rmCanvas=roomBox.querySelector('#roomCanvas'),rmPanel=roomBox.querySelector('#roomPanel'),rmHint=t=>{roomBox.querySelector('#roomHint').textContent=t};
  // Trong nhà: mặc định ẩn nút đi lại, lời hướng dẫn và bảng thông tin để xem 3D toàn màn hình; nút mũi tên ^ (chạm hoặc vuốt lên/xuống) để hiện/ẩn.
  const rmTog=roomBox.querySelector('#roomUiTog');
  function setRoomUi(show){roomBox.classList.toggle('rm-ui-off',!show);rmTog.setAttribute('aria-expanded',show?'true':'false');rmTog.setAttribute('aria-label',show?'Ẩn nút đi lại và bảng thông tin':'Hiện nút đi lại và bảng thông tin');requestAnimationFrame(()=>{if(room&&room.resize)room.resize()})}
  {let y0=null;rmTog.addEventListener('pointerdown',e=>{e.stopPropagation();y0=e.clientY;try{rmTog.setPointerCapture(e.pointerId)}catch(_){}});
    rmTog.addEventListener('pointerup',e=>{e.stopPropagation();if(y0==null)return;const dy=e.clientY-y0;y0=null;const off=roomBox.classList.contains('rm-ui-off');setRoomUi(dy<-18?true:dy>18?false:off)});
    rmTog.addEventListener('pointercancel',()=>{y0=null});rmTog.addEventListener('click',e=>{e.stopPropagation();if(e.detail===0)setRoomUi(roomBox.classList.contains('rm-ui-off'))})}
  // ---- sound: a small synth on the shared audio context (unlocked by the tap that opened the room)
  function audio(){unlockChime();return chimeCtx}
  function strike(freq,dur=6,gain=.12,partials=[[1,1],[2.76,.35],[5.4,.12]]){const ac=audio();if(!ac)return;const t0=ac.currentTime;
    for(const [m,a] of partials){const o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.value=freq*m;o.detune.value=(Math.random()-.5)*6;g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(gain*a,t0+.015);g.gain.exponentialRampToValueAtTime(.0003,t0+dur/Math.sqrt(m));o.connect(g).connect(ac.destination);o.start(t0);o.stop(t0+dur)}}
  // ---- shared room: wooden floor, three walls, warm light, slow orbit by dragging
  let roomRenderer=null;
  // Các hàm dựng phòng nằm ở js/rooms3d.js, tải khi mở phòng đầu tiên (hoặc lúc rảnh).
  let roomNhaSac,roomChuongGio,roomXongHuong,roomQuanTra,roomTuGia,roomTinhThat,roomXuongGom,roomNhaNiem,roomNhaVanHoa,roomDaoYen,roomDaoThien,roomsReady=false,roomsP=null;
  function __roomsExport(o){roomNhaSac=o.roomNhaSac;roomChuongGio=o.roomChuongGio;roomXongHuong=o.roomXongHuong;roomQuanTra=o.roomQuanTra;roomTuGia=o.roomTuGia;roomTinhThat=o.roomTinhThat;roomXuongGom=o.roomXuongGom;roomNhaNiem=o.roomNhaNiem;roomNhaVanHoa=o.roomNhaVanHoa;roomDaoYen=o.roomDaoYen;roomDaoThien=o.roomDaoThien;roomsReady=true}
  function loadRoomsModule(){if(roomsP)return roomsP;roomsP=fetch('js/rooms3d.js?v=08e9a32d').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.text()}).then(code=>{eval(code);if(!roomsReady)throw Error('rooms module')}).catch(e=>{roomsP=null;throw e});return roomsP}
  window.anyenLoadRooms=loadRoomsModule;
  /* Link thẳng từ AnSense (index.html?vao=nha-niem …): đặt người trước cửa nhà rồi mở không gian bên trong. */
  /* Trang lite: mở thẳng bên trong nhà (không đi qua cửa, không đổi vị trí ngoài rừng); toạ thiền: đặt ngay lên tọa cụ trước tượng Phật */
  window.anyenLiteHouse=id=>{if(bayMode||boatRide||roomOpen)return false;const h=[...SENSE_HOUSES,VAN_HOA,NHA_SAC,TU_GIA,TU_DAO_HOUSE,TU_DAO_THIEN].find(x=>x&&x.id===id);if(!h||!ROOM_BUILDERS[h.id])return false;if(h.id==='chuong_gio')playChime();if(h.door&&h.id!==(TU_DAO_HOUSE&&TU_DAO_HOUSE.id)&&h.id!==(TU_DAO_THIEN&&TU_DAO_THIEN.id)){/* vị trí cuối: đứng trước cửa nhà, bản full vào rừng sẽ ở đó */const fd=(h.D||(h.id==='nha_hoa_lan'?ORCHID.d:0))/2,dx=Math.sin(h.rot),dz=Math.cos(h.rot);let p=null;for(let k=0;k<=8&&!p;k++){const d=fd+1+k*.25;if(walkable(h.x+dx*d,h.z+dz*d))p=[h.x+dx*d,h.z+dz*d]}p=p||nearestWalkable(...h.door,h.rot);if(p){mePosition.set(p[0],0,p[1]);viewYaw=h.rot+EXIT_CAM_SIDE;saveForestState()}}Promise.resolve(openRoom(h)).then(()=>{const bk=roomBox.querySelector('[data-rm="back"]');if(bk&&roomOpen){bk.textContent='🏠 Trang chính';bk.setAttribute('aria-label','Về trang chính Làng Yên Lite')}});return true};
  window.__anyenMem=()=>({main:{...renderer.info.memory,calls:renderer.info.render.calls},room:roomRenderer?{...roomRenderer.info.memory}:null,sceneObjs:(()=>{let n=0;scene.traverse(()=>n++);return n})(),roomOpen,bayMode});/* đo bộ nhớ khi kiểm thử */
  window.anyenLiteSit=()=>{if(bayMode||roomOpen)return false;const s=chooseSeat();if(!s)return false;walkRoute.length=0;pendingSeat=null;mePosition.set(s.x,0,s.z);requestSeat(s,true);return true};
  window.anyenOpenHouse=id=>{if(bayMode||boatRide||roomOpen)return false;const h=[...SENSE_HOUSES,VAN_HOA,TINH_THAT,NHA_SAC].find(x=>x&&x.id===id);if(!h||!h.door)return false;walkRoute.length=0;pendingSeat=null;mePosition.set(h.door[0],0,h.door[1]);walkYaw=h.rot+Math.PI;arriveHouse(h);return true};
  function makeRoom(wall,floor,opt){const bare=!!(opt&&opt.bare);const r=roomRenderer||(roomRenderer=new THREE.WebGLRenderer({canvas:rmCanvas,antialias:true}));r.setPixelRatio(Math.min(2,devicePixelRatio||1));r.outputColorSpace=THREE.SRGBColorSpace;r.toneMapping=THREE.ACESFilmicToneMapping;
    const sc=new THREE.Scene();sc.background=new THREE.Color('#1d2a24');const hemi=new THREE.HemisphereLight('#fff1d6','#3a2c20',1.6);sc.add(hemi);const key=new THREE.DirectionalLight('#ffd9a8',1.8);key.position.set(2,4,3);sc.add(key);if(!bare){const lamp=new THREE.PointLight('#ffcf8a',6,9,1.6);lamp.position.set(0,2.6,.5);sc.add(lamp)}
    if(!bare){const fl=new THREE.Mesh(new THREE.BoxGeometry(8,.1,7),mat(floor));fl.position.y=-.05;sc.add(fl);for(let i=-3;i<=3;i++){const s=new THREE.Mesh(new THREE.BoxGeometry(.02,.002,7),mat('#3a2a1e'));s.position.set(i*1.1,.001,0);sc.add(s)}
    const back=new THREE.Mesh(new THREE.BoxGeometry(8,4,.12),mat(wall));back.position.set(0,2,-3.5);sc.add(back);for(const sx of [-4,4]){const w=new THREE.Mesh(new THREE.BoxGeometry(.12,4,7),mat(wall));w.position.set(sx,2,0);sc.add(w)}
    const beam=new THREE.Mesh(new THREE.BoxGeometry(8,.2,.2),mat('#4e3a2a'));beam.position.set(0,3.5,-3.3);sc.add(beam)
    /* 26/11: phòng kín bốn phía: thêm vách trước có ô cửa và trần, để khi vào nhà chỉ thấy bên trong, không còn khoảng trống nhìn ra ngoài */
    for(const sx of [-1,1]){const w=new THREE.Mesh(new THREE.BoxGeometry(3.3,4,.12),mat(wall));w.position.set(sx*2.35,2,3.5);sc.add(w)}
    {const w=new THREE.Mesh(new THREE.BoxGeometry(1.4,1.5,.12),mat(wall));w.position.set(0,3.25,3.5);sc.add(w);const fr=mat('#4e3a2a');for(const sx of [-1,1]){const p=new THREE.Mesh(new THREE.BoxGeometry(.1,2.5,.18),fr);p.position.set(sx*.72,1.25,3.5);sc.add(p)}const lt=new THREE.Mesh(new THREE.BoxGeometry(1.54,.12,.18),fr);lt.position.set(0,2.5,3.5);sc.add(lt);
      const dr=new THREE.Mesh(new THREE.BoxGeometry(1.34,2.44,.04),mat('#6a4c34'));dr.position.set(0,1.22,3.53);sc.add(dr)}
    if(!(opt&&opt.glassRoof)){const ce=new THREE.Mesh(new THREE.BoxGeometry(8,.1,7.1),mat(wall));ce.position.set(0,4.05,0);sc.add(ce);for(let i=-3;i<=3;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(.14,.16,7.1),mat('#4e3a2a'));b.position.set(i*1.15,3.93,0);sc.add(b)}}}
    const cam=new THREE.PerspectiveCamera(50,1,.05,40);const st={r,sc,cam,yaw:0,pitch:.18,dist:4.6,target:new THREE.Vector3(0,.9,0),tick:[],picks:[],run:true,hemi,key,yawC:0,minD:2.6,maxD:6.5};
    // Một ngón kéo để nhìn quanh; hai ngón chụm/mở để lại gần / lùi xa (không xoay khi đang zoom).
    let drag=null;const pts=new Map(),pd=()=>{const [a,c]=[...pts.values()];return Math.max(10,Math.hypot(a.x-c.x,a.y-c.y))};let pinch0=0;
    rmCanvas.onpointerdown=e=>{pts.set(e.pointerId,{x:e.clientX,y:e.clientY});try{rmCanvas.setPointerCapture(e.pointerId)}catch(_){}if(pts.size===1)drag={moved:false};else{if(drag)drag.moved=true;pinch0=pts.size===2?pd():0}};
    rmCanvas.onpointermove=e=>{const p=pts.get(e.pointerId);if(!p)return;const dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
      if(pts.size===2&&pinch0){const d=pd();st.dist=Math.max(st.minD,Math.min(st.maxD,st.dist*Math.max(.8,Math.min(1.25,pinch0/d))));pinch0=d;return}
      if(!drag||pts.size!==1)return;if(Math.abs(dx)+Math.abs(dy)>2)drag.mv=(drag.mv||0)+Math.abs(dx)+Math.abs(dy);if(drag.mv>8)drag.moved=true;st.yaw=Math.max(st.yawC-.9,Math.min(st.yawC+.9,st.yaw-dx*.006));st.pitch=Math.max(.02,Math.min(.6,st.pitch+dy*.004))};
    rmCanvas.onpointerup=e=>{if(!pts.delete(e.pointerId))return;pinch0=pts.size===2?pd():0;if(pts.size)return;const d=drag;drag=null;if(!d||d.moved)return;const rc=rmCanvas.getBoundingClientRect(),p=new THREE.Vector2((e.clientX-rc.left)/rc.width*2-1,-(e.clientY-rc.top)/rc.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(p,cam);
      /* phòng tự xử lý chạm (Nhà Sắc · Tìm năm sắc) */if(st.tapAny&&st.tapAny(ray))return;
      const hit=ray.intersectObjects(st.picks.map(x=>x.obj),true)[0];if(!hit)return;let o=hit.object;while(o&&!st.picks.some(x=>x.obj===o))o=o.parent;const pk=st.picks.find(x=>x.obj===o);if(pk)pk.fn()};
    rmCanvas.onpointercancel=e=>{pts.delete(e.pointerId);pinch0=0;if(!pts.size)drag=null};rmCanvas.onwheel=e=>{e.preventDefault();const dy=e.deltaY*(e.deltaMode===1?16:1);st.dist=Math.max(st.minD,Math.min(st.maxD,st.dist*Math.exp(Math.max(-.18,Math.min(.18,dy*(e.ctrlKey?.005:.001))))))};
    const resize=()=>{const w=rmCanvas.clientWidth||600,h=rmCanvas.clientHeight||400;r.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix()};resize();st.resize=resize;
    const t0=performance.now();let tl=t0;const loop=()=>{if(!st.run)return;const nw=performance.now(),dt=(nw-tl)/1000;tl=nw;const t=(nw-t0)/1000;for(const f of st.tick)f(t);if(st.walk){st.walk.update(dt);/* phòng có góc máy dựng sẵn (Nhà Văn Hóa: sân khấu, vòm đèn, tường): giữ góc đó tới khi người chơi bước đi */if(st.camOv){if(st.walk.dest||st.walk.keys.size)st.camOv=false;else{cam.position.set(st.target.x+Math.sin(st.yaw)*Math.cos(st.pitch)*st.dist,st.target.y+Math.sin(st.pitch)*st.dist+.4,st.target.z+Math.cos(st.yaw)*Math.cos(st.pitch)*st.dist);cam.lookAt(st.target)}}}else{cam.position.set(st.target.x+Math.sin(st.yaw)*Math.cos(st.pitch)*st.dist,st.target.y+Math.sin(st.pitch)*st.dist+.4,st.target.z+Math.cos(st.yaw)*Math.cos(st.pitch)*st.dist);cam.lookAt(st.target)}r.render(sc,cam);requestAnimationFrame(loop)};requestAnimationFrame(loop);
    return st}
  // ---- Đi lại trong phòng: nhân vật của bạn bước đi, camera luôn ở sau lưng (trễ mượt như ngoài rừng) và tự lùi đủ xa để thấy cả phòng.
  /* 26/11: camera luôn ở trong bốn vách (chw, chd: nửa bề ngang, nửa bề sâu trong lòng nhà; cap: dưới trần), không lùi ra ngoài cửa */
  const ROOM_WALK={default:{hw:3.5,hd:3.1,cx:0,cz:0,start:[0,.8],cap:3.4,chw:3.7,chd:3.25,maxD:11,fov:66},
    nha_niem:{R:4.5,fov:62,hw:4.3,hd:4.3,cx:0,cz:0,start:[0,3.2],cap:5.4,front:0,maxD:11},
    tu_gia_me:{hw:3.55,hd:3.2,cx:0,cz:0,start:[0,1.25],cap:2.6,chw:3.7,chd:3.3,maxD:8.5,fov:70},tu_dao_me:{hw:3.55,hd:3.2,cx:0,cz:0,start:[0,1.25],cap:2.6,chw:3.7,chd:3.3,maxD:8.5,fov:70},
    dao_yen_thien:{hw:3.55,hd:3.2,cx:0,cz:0,start:[0,.3],cap:2.9,chw:3.7,chd:3.35,maxD:8.5,fov:70},
    dao_yen_nha:{hw:5.75,hd:3.75,cx:0,cz:0,start:[0,1.3],cap:3.0,chw:5.7,chd:3.7,maxD:9.5,fov:70},
    /* 27/11: Nhà Vị: camera cao và lệch phải để thấy bàn trà, không bị nhân vật che */
    quan_tra:{hw:3.5,hd:3.1,cx:0,cz:0,start:[.9,1.7],cap:3.4,chw:3.7,chd:3.25,maxD:11,fov:66,teaCam:{look:[0,.36,-.1],back:1.9,side:1.3,h:2.9}},
    van_hoa:{hw:7.3,hd:4.9,cx:0,cz:.3,zmin:-2.3,start:[2.3,4.4],cap:6.2,front:0,maxD:11,fov:74,capAt:z=>4.6+Math.max(0,5.4-Math.abs(z))/5.4*2.2-.4}};
  function enableWalk(st,id){const cfg=Object.assign({},ROOM_WALK.default,ROOM_WALK[id]||{}),cam=st.cam,sc=st.sc;if(ROOM_WALK[id]&&ROOM_WALK[id].chd==null){delete cfg.chw;delete cfg.chd}/* nhà tự đặt khung camera riêng (Nhà Niệm, Nhà Văn Hóa) thì không lấy khung mặc định */
    const g=new THREE.Group(),torso=new THREE.Mesh(new THREE.CapsuleGeometry(.34,.8,4,8),mat('#687b48'));torso.position.y=1.05;g.add(torso);
    const head=new THREE.Mesh(new THREE.SphereGeometry(.25,12,10),mat('#e7c9a8'));head.position.y=1.85;g.add(head);
    const parts=outfitParts(g,torso),BW=roomFromIsland&&window.__bayWear,sw=BW?BW.make(g,head):null;/* vào nhà từ Đảo Yên: giữ nguyên bộ đồ đang mặc ngoài đảo */
    const dress=on=>{if(BW){const o={...BW.outfit(),acc:[]}/* 26/11: vào Nhà Thiền, nhà chính trên Đảo Yên thì bỏ nón, kính, khăn; ra cửa về đảo mặc lại (bộ đồ ngoài đảo không đổi) */;dressAvatar(parts,torso,o.color,BW.base(),on);BW.wear(sw,parts,torso,o,on,true)}else dressAvatar(parts,torso,myColor,myStyle,on)};dress(false);g.scale.setScalar(.8);sc.add(g);
    const W={x:cfg.start[0],z:cfg.start[1],a:Math.PI,cy:0,dest:null,keys:new Set(),zf:1,yo:0,yoT:0,yv:0,pl:0,stride:0,fov:50,lt:null};
    W.cy=W.cy0=W.a+Math.PI;
    const clampP=()=>{if(cfg.R){const d=Math.hypot(W.x-cfg.cx,W.z-cfg.cz);if(d>cfg.R){W.x=cfg.cx+(W.x-cfg.cx)/d*cfg.R;W.z=cfg.cz+(W.z-cfg.cz)/d*cfg.R}}
      W.x=Math.max(cfg.cx-cfg.hw+.4,Math.min(cfg.cx+cfg.hw-.4,W.x));W.z=Math.max(cfg.zmin!=null?cfg.zmin:cfg.cz-cfg.hd+.4,Math.min(cfg.cz+cfg.hd-.4,W.z))};
    const blk=(x,z)=>(st.blocks||[]).some(b=>x>b[0]-.22&&x<b[2]+.22&&z>b[1]-.22&&z<b[3]+.22);/* đồ vật trong phòng: đi vòng, không xuyên qua */
    /* 3.40: tìm đường vòng qua đồ vật (lưới 0,25 m, BFS 8 hướng, rút gọn theo tầm nhìn thẳng) để tới ghế/đệm không bị kẹt */
    const losOK=(x0,z0,x1,z1)=>{const n=Math.ceil(Math.hypot(x1-x0,z1-z0)/.1);for(let i=1;i<=n;i++){const t=i/n;if(blk(x0+(x1-x0)*t,z0+(z1-z0)*t))return false}return true};
    const plan=(tx,tz)=>{if(losOK(W.x,W.z,tx,tz))return [{x:tx,z:tz}];const S=.25,x0=cfg.cx-cfg.hw+.4,z0=(cfg.zmin!=null?cfg.zmin:cfg.cz-cfg.hd+.4),nx=Math.max(1,Math.floor((cfg.cx+cfg.hw-.4-x0)/S)+1),nz=Math.max(1,Math.floor((cfg.cz+cfg.hd-.4-z0)/S)+1);
      const ix=x=>Math.max(0,Math.min(nx-1,Math.round((x-x0)/S))),iz=z=>Math.max(0,Math.min(nz-1,Math.round((z-z0)/S))),free=(i,j)=>!blk(x0+i*S,z0+j*S);
      const si=ix(W.x),sj=iz(W.z),ti=ix(tx),tj=iz(tz),prev=new Int32Array(nx*nz).fill(-2),q=[si+sj*nx];prev[q[0]]=-1;let found=false;
      for(let h=0;h<q.length&&!found;h++){const c=q[h],i=c%nx,j=(c-i)/nx;for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const a=i+di,b=j+dj;if(a<0||b<0||a>=nx||b>=nz)continue;const k=a+b*nx;if(prev[k]!==-2)continue;if(!(a===ti&&b===tj)&&!free(a,b))continue;if(di&&dj&&(!free(i+di,j)||!free(i,j+dj)))continue;prev[k]=c;if(a===ti&&b===tj){found=true;break}q.push(k)}}
      if(!found)return [{x:tx,z:tz}];const pts=[];for(let c=ti+tj*nx;c!==-1&&prev[c]!==-1;c=prev[c]){const i=c%nx;pts.unshift({x:x0+i*S,z:z0+(c-i)/nx*S})}pts[pts.length-1]={x:tx,z:tz};
      const out=[];let cx=W.x,cz=W.z,k=0;while(k<pts.length){let m=pts.length-1;while(m>k&&!losOK(cx,cz,pts[m].x,pts[m].z))m--;out.push(pts[m]);cx=pts[m].x;cz=pts[m].z;k=m+1}return out};
    const setDest=(x,z)=>{const r=plan(x,z);W.dest=r.shift();W.route=r};
    const sa=d=>{d=(d+Math.PI)%(Math.PI*2);if(d<0)d+=Math.PI*2;return d-Math.PI};
    const key=e=>{if(!roomOpen||!room||room!==st)return;const t=document.activeElement&&document.activeElement.tagName;if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT')return;const k={w:'f',arrowup:'f',s:'b',arrowdown:'b',a:'l',arrowleft:'l',d:'r',arrowright:'r'}[e.key.toLowerCase()];if(!k)return;e.preventDefault();if(e.type==='keydown'){W.keys.add(k);W.dest=null}else W.keys.delete(k)};
    document.addEventListener('keydown',key);document.addEventListener('keyup',key);
    // nút đi cho điện thoại
    const pad=document.createElement('div');pad.className='rm-walkpad';pad.style.cssText='position:absolute;left:10px;bottom:10px;display:grid;grid-template-columns:repeat(3,44px);grid-template-rows:repeat(2,44px);gap:6px;z-index:5;touch-action:none;user-select:none';
    /* 27/11: trong mọi nhà bỏ nút mũi tên (chạm sàn để đi, máy tính vẫn dùng W A S D) */if(false)for(const [k,lab,gc,gr] of [['f','▲',2,1],['l','◀',1,2],['b','▼',2,2],['r','▶',3,2]]){const b=document.createElement('button');b.type='button';b.textContent=lab;b.setAttribute('aria-label',{f:'Đi tới',b:'Lùi',l:'Quay trái',r:'Quay phải'}[k]);b.style.cssText='grid-column:'+gc+';grid-row:'+gr+';border-radius:12px;border:1px solid rgba(255,255,255,.35);background:rgba(20,16,12,.55);color:#f4e2b9;font-size:18px;touch-action:none';
      const dn=e=>{e.preventDefault();e.stopPropagation();W.keys.add(k);W.dest=null;try{b.setPointerCapture(e.pointerId)}catch(_){}},up=e=>{e.stopPropagation();W.keys.delete(k)};b.addEventListener('pointerdown',dn);b.addEventListener('pointerup',up);b.addEventListener('pointercancel',up);b.addEventListener('lostpointercapture',up);b.addEventListener('contextmenu',e=>e.preventDefault());pad.appendChild(b)}
    // ngồi xuống / đứng lên tại chỗ; chạm sàn hay bấm nút đi thì tự đứng lên rồi đi
    const sitB=document.createElement('button');sitB.type='button';sitB.style.cssText='grid-column:4;grid-row:1 / span 2;border-radius:12px;border:1px solid #c8a96a;background:rgba(20,16,12,.6);color:#f4e2b9;font-size:13px;line-height:1.2;width:58px;touch-action:none';pad.style.gridTemplateColumns='repeat(3,44px) 58px';
    /* 27/11: chỉ ngồi khi chạm vào ghế, bồ đoàn; lúc đang ngồi mới hiện một nút Đứng lên nhỏ gọn bên trái */pad.style.gridTemplateColumns='auto';pad.style.gridTemplateRows='auto';sitB.style.cssText='border-radius:18px;border:1px solid #c8a96a;background:rgba(20,16,12,.6);color:#f4e2b9;font-size:13px;line-height:1;padding:8px 12px;white-space:nowrap;touch-action:none';sitB.hidden=true;
    const setSit=on=>{if(!on&&W.seat){W.x=W.seat.ax;W.z=W.seat.az;W.seat=null;W.seatY=0}/* đứng lên khỏi ghế: bước ra phía trước ghế */W.sit=on;torso.scale.set(1,on?.6:1,1);torso.position.y=on?.42:1.05;head.position.y=on?1.06:1.85;dress(on);sitB.innerHTML='🚶 Đứng lên';sitB.hidden=!on;if(on){W.dest=null;W.keys.clear()}};
    sitB.addEventListener('pointerdown',e=>e.stopPropagation());sitB.addEventListener('click',e=>{e.stopPropagation();if(W.sit)setSit(false)});sitB.innerHTML='🚶 Đứng lên';pad.appendChild(sitB);W.setSit=setSit;W.goSeat=S=>{if(W.sit)setSit(false);W.seat=S;W.keys.clear();const sv=[W.x,W.z];W.x=S.ax;W.z=S.az;clampP();S.tx=W.x;S.tz=W.z;W.x=sv[0];W.z=sv[1];setDest(S.tx,S.tz)};/* 27/11: điểm bước tới ghế nằm ngoài khung đi lại thì kéo vào trong, để luôn tới được */
    const stage=rmCanvas.parentNode;stage.style.position=stage.style.position||'relative';stage.appendChild(pad);
    // chạm: vật tương tác thì mở, sàn thì bước tới; kéo một ngón để xoay nhìn quanh; chụm/lăn để zoom
    // Cùng quy tắc với Rừng Yên và Vịnh Yên: vuốt ngang xoay góc nhìn (có quán tính), vuốt dọc nâng/hạ camera, hai ngón chụm/mở để zoom, chạm đúp để zoom gần/xa.
    const pts=new Map(),pd=()=>{const [a,c]=[...pts.values()];return Math.max(10,Math.hypot(a.x-c.x,a.y-c.y))};let pinch0=0,drag=null,swV=0,swT=0;const ZF=[.55,1.7];
    const zoomBy=f=>{if(st.camOv){st.dist=Math.max(st.minD,Math.min(st.maxD,st.dist*f));return}W.zf=Math.max(ZF[0],Math.min(ZF[1],W.zf*f))};
    rmCanvas.onpointerdown=e=>{W.yv=0;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});try{rmCanvas.setPointerCapture(e.pointerId)}catch(_){}if(pts.size===1)drag={ax:0,ay:0,axis:null,mv:0};else{if(drag)drag.mv=99;pinch0=pts.size===2?pd():0}};
    rmCanvas.onpointermove=e=>{const p=pts.get(e.pointerId);if(!p)return;let dx=e.clientX-p.x,dy=e.clientY-p.y;p.x=e.clientX;p.y=e.clientY;
      if(pts.size===2&&pinch0){const d=pd(),[pa,pc]=[...pts.values()],a=Math.atan2(pc.y-pa.y,pc.x-pa.x);if(W.ga==null){W.ga=a;W.g2={mode:null,s:0,a:0}}let da=a-W.ga;da=Math.atan2(Math.sin(da),Math.cos(da));W.ga=a;const f=Math.max(.8,Math.min(1.25,pinch0/d));pinch0=d;const G=W.g2;
        if(!G.mode){G.s+=Math.log(f);G.a+=da;if(Math.abs(G.a)>.14)G.mode='rot';else if(Math.abs(G.s)>.08)G.mode='zoom';else return}if(G.mode==='rot'){W.yo-=da;W.yoT=performance.now()}else zoomBy(f);return}/* hai ngón xoay: camera quay vòng quanh nhân vật */
      if(!drag||pts.size!==1)return;
      if(!drag.axis){drag.ax+=dx;drag.ay+=dy;const ax=Math.abs(drag.ax),ay=Math.abs(drag.ay);if(Math.max(ax,ay)<8)return;drag.axis=ax>=ay*.8?'x':'y';drag.mv=99;dx=drag.ax;dy=drag.ay}
      if(st.camOv){if(drag.axis==='x')st.yaw=Math.max(st.yawC-.9,Math.min(st.yawC+.9,st.yaw-dx*.006));else st.pitch=Math.max(-.3,Math.min(.6,st.pitch+dy*.004));return}/* đang ở góc máy dựng sẵn: kéo để nhìn quanh góc đó */
      if(drag.axis==='x'){const dyaw=dx/Math.max(320,innerWidth)*3.5,n=performance.now();W.yo-=dyaw;W.yv=-dyaw/Math.max(8,n-swT)*1000;swT=n;W.yoT=n}
      else{W.pl=Math.max(-.4,Math.min(.35,W.pl+dy/Math.max(320,innerHeight)*1.6));W.yoT=performance.now()}};
    const endP=e=>{if(!pts.delete(e.pointerId))return;W.ga=null;pinch0=pts.size===2?pd():0;if(pts.size)return;const d=drag;drag=null;return d};
    rmCanvas.onpointerup=e=>{const d=endP(e);if(!d)return;if(d.axis==='x'&&performance.now()-swT<90&&Math.abs(W.yv)>.3){W.inert=true}else W.yv=0;if(d.mv>8)return;
      const nt=performance.now();if(W.lt&&nt-W.lt.t<330&&Math.hypot(e.clientX-W.lt.x,e.clientY-W.lt.y)<28){W.lt=null;W.zf=W.zf>.85?.65:1;W.yo=0;W.pl=0;return}W.lt={t:nt,x:e.clientX,y:e.clientY};
      const rc=rmCanvas.getBoundingClientRect(),p=new THREE.Vector2((e.clientX-rc.left)/rc.width*2-1,-(e.clientY-rc.top)/rc.height*2+1),ray=new THREE.Raycaster();ray.setFromCamera(p,cam);
      if(st.tapAny&&st.tapAny(ray))return;
      const hit=ray.intersectObjects(st.picks.map(x=>x.obj),true)[0];if(hit){let o=hit.object;while(o&&!st.picks.some(x=>x.obj===o))o=o.parent;const pk=st.picks.find(x=>x.obj===o);if(pk){pk.fn();return}}
      const o=ray.ray.origin,dr=ray.ray.direction;if(dr.y<-.01){const s=-o.y/dr.y;W.dest={x:o.x+dr.x*s,z:o.z+dr.z*s};const sv=[W.x,W.z];W.x=W.dest.x;W.z=W.dest.z;clampP();const tx=W.x,tz=W.z;W.x=sv[0];W.z=sv[1];setDest(tx,tz)}};
    rmCanvas.onpointercancel=e=>{endP(e)};
    rmCanvas.onwheel=e=>{e.preventDefault();const dy=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?innerHeight:1);zoomBy(Math.exp(Math.max(-.18,Math.min(.18,dy*(e.ctrlKey?.006:.0012)))))};
    W.update=dt=>{dt=Math.min(.05,dt);let mv=0;if(W.sit&&(W.dest||W.keys.size))W.setSit(false);
      if(W.keys.has('l'))W.a+=1.9*dt;if(W.keys.has('r'))W.a-=1.9*dt;if(W.keys.has('f'))mv=1;if(W.keys.has('b'))mv=-.6;
      if(W.dest){const dx=W.dest.x-W.x,dz=W.dest.z-W.z,dist=Math.hypot(dx,dz);if(dist<.12)W.dest=W.route&&W.route.length?W.route.shift():null;else{const df=sa(Math.atan2(dx,dz)-W.a),mx=2.6*dt;W.a+=Math.max(-mx,Math.min(mx,df));if(Math.abs(df)<.9)mv=Math.min(1,dist*1.5)}}
      if(mv){const sp=2.1*mv*dt,ox=W.x,oz=W.z;W.x+=Math.sin(W.a)*sp;W.z+=Math.cos(W.a)*sp;clampP();if(blk(W.x,W.z)&&!blk(ox,oz)){let ok=false;if(!W.side){const tx=W.dest?W.dest.x:ox+Math.sin(W.a),tz=W.dest?W.dest.z:oz+Math.cos(W.a),f=(d)=>{let x=ox,z=oz,n=0;for(;n<40;n++){const nx=x+Math.sin(W.a+d)*.15,nz=z+Math.cos(W.a+d)*.15;if(blk(nx,nz))break;x=nx;z=nz;const bx=x+Math.sin(W.a)*.3,bz=z+Math.cos(W.a)*.3;if(!blk(bx,bz))break}return n+Math.hypot(tx-x,tz-z)};W.side=f(1.5)<=f(-1.5)?1:-1}/* chọn phía vòng ngắn hơn */
        for(const d of [.5,1,1.5,2]){const a2=W.a+d*W.side;W.x=ox+Math.sin(a2)*sp;W.z=oz+Math.cos(a2)*sp;clampP();if(!blk(W.x,W.z)){ok=true;W.sideT=.35;break}}/* gặp đồ vật: lách men theo mép để đi vòng */if(!ok){W.x=ox;W.z=oz;const s0=W.stuck||0;W.stuck=s0+dt;if(s0<.5&&W.stuck>=.5)W.side=-W.side;if(W.stuck>1.5&&W.dest&&!W.keys.size){W.dest=null;W.stuck=0}}else W.stuck=0}else if(W.side&&(W.sideT-=dt)<0)W.side=0;W.stride+=Math.abs(mv)*dt*7}
      if(W.seat&&!W.sit){const S=W.seat,d=Math.hypot(W.x-(S.tx!=null?S.tx:S.ax),W.z-(S.tz!=null?S.tz:S.az)),ds=Math.hypot(W.x-S.x,W.z-S.z);if(d<.45||ds<.75||(!W.dest&&ds<1.3)){/* 27/11: đã tới sát ghế (kể cả bị vướng dừng lại gần đó) thì ngồi luôn, chạm ghế là chắc chắn ngồi được */W.dest=null;W.x=S.x;W.z=S.z;W.a=S.a;W.seatY=S.y;W.setSit(true)}else if(!W.dest)W.seat=null}
      g.position.set(W.x,0,W.z);g.rotation.y=W.a;g.position.y=(W.sit?W.seatY||0:0)+(mv?Math.abs(Math.sin(W.stride))*.04:0);
      // camera: không tự xoay theo nhân vật, chỉ dời theo; chỉ vuốt mới xoay góc nhìn
      if(W.inert){W.yo+=W.yv*dt;W.yv*=Math.exp(-dt*3.2);if(Math.abs(W.yv)<.03)W.inert=false}W.cy=W.cy0+W.yo;
      const asp=cam.aspect||1.6,fov=Math.max(cfg.fov||0,asp<1?Math.min(70,50/Math.sqrt(asp)):50);if(Math.abs(cam.fov-fov)>.01||W.fov!==fov){cam.fov=fov;W.fov=fov;cam.updateProjectionMatrix()}
      const vh=fov*Math.PI/360,hh=Math.atan(Math.tan(vh)*asp),ex=(cfg.R||cfg.hw)*.95,ez=(cfg.R||cfg.hd)*1.2;
      let D=Math.max(ex/Math.tan(hh),ez/Math.tan(vh));D=Math.max(3.2,Math.min(cfg.maxD,D))*W.zf;let p=Math.max(.15,Math.min(1.25,.85+W.pl));const ty=.8;if(D*Math.sin(p)+ty>cfg.cap)p=Math.max(.2,Math.asin(Math.max(0,cfg.cap-ty)/D));
      // nhìn thẳng vào nhân vật: giữa màn hình theo chiều ngang, trên đường 1/3 dưới
      const lx=W.x,lz=W.z;
      let px=lx+Math.sin(W.cy)*Math.cos(p)*D,pz=lz+Math.cos(W.cy)*Math.cos(p)*D,py=ty+Math.sin(p)*D;
      {const cw=cfg.chw||cfg.hw-.3;px=Math.max(cfg.cx-cw,Math.min(cfg.cx+cw,px));pz=Math.max(cfg.cz-(cfg.chd||cfg.hd-.3),Math.min(cfg.cz+(cfg.chd||cfg.hd+(cfg.front||0)),pz));/* camera bị vách chặn, đứng gần nhân vật hơn: hạ thấp theo, để vẫn nhìn ngang vào phòng thay vì chúi xuống sàn */if(cfg.chd){const hz=Math.hypot(px-lx,pz-lz);py=Math.min(py,asp<1?ty+1.3+hz*.75:ty+.75+hz*.5)}/* điện thoại dọc: góc cao hơn một chút để thấy rộng hơn */}py=Math.min(py,cfg.capAt?cfg.capAt(pz):cfg.cap);
      if(cfg.R){const d=Math.hypot(px-cfg.cx,pz-cfg.cz);if(d>cfg.R+.8){px=cfg.cx+(px-cfg.cx)/d*(cfg.R+.8);pz=cfg.cz+(pz-cfg.cz)/d*(cfg.R+.8)}}
      if(cfg.teaCam){/* Nhà Vị: camera sau lưng chếch phải và cao; ngồi thì nhìn thẳng vào bàn trà */const T=cfg.teaCam,bk=T.back*(W.sit?(asp>1?.85:1):1.3)*W.zf,sd=T.side*W.zf,cy=W.sit?W.a+Math.PI+W.yo:W.cy;/* đang ngồi: đứng sau lưng chỗ ngồi */
        px=lx+Math.sin(cy)*bk+Math.cos(cy)*sd;pz=lz+Math.cos(cy)*bk-Math.sin(cy)*sd;py=Math.min(cfg.cap,T.h+W.pl*2);
        px=Math.max(cfg.cx-cfg.chw,Math.min(cfg.cx+cfg.chw,px));pz=Math.max(cfg.cz-cfg.chd,Math.min(cfg.cz+cfg.chd,pz));
        if(W.sit&&asp>1){cam.fov=44;W.fov=-1;cam.updateProjectionMatrix()}/* màn hình ngang: thu hẹp góc nhìn để bàn trà to rõ */if(W.sit)cam.position.set(px,py,pz),cam.lookAt(T.look[0],T.look[1],T.look[2]);else{cam.position.set(px,py,pz);cam.lookAt(lx,ty*.6,lz)}return}
      cam.position.set(px,py,pz);cam.lookAt(lx,ty,lz);cam.rotateX(Math.atan(Math.tan(vh)/3))};
    st.walk=W;st.walkAvatar=g;const oc=st.cleanup;st.cleanup=()=>{document.removeEventListener('keydown',key);document.removeEventListener('keyup',key);pad.remove();if(oc)oc()};
    rmHint('Chạm sàn để đi · chạm ghế, bồ đoàn để ngồi · kéo để nhìn quanh · chụm/lăn để zoom')}
  const rTap=(st,obj,fn)=>{st.picks.push({obj,fn});return obj};
  const rAdd=(st,m,x,y,z)=>{m.position.set(x,y,z);st.sc.add(m);return m};
  // ---------------------------------------------------------------- Nhà chuông gió
  // ---------------------------------------------------------------- Haromy · Ngôi nhà của mùi thơm Hạnh phúc
  // Theo bản mô tả Haromy: tủ 18 thảo mộc khô (trái) và tủ 18 lọ tinh dầu (phải) khớp 1–1 theo 3 tầng hương,
  // bàn thấp giữa nhìn ra cửa sổ Hồ Hương (đèn xông tinh dầu bên trái, lư đất nung bên phải), 4 tọa cụ, kệ Lưu Hương 3×3.
  // Quy trình 6 bước: lắng nghe tâm trạng → chọn 1–3 mùi → nhỏ tinh dầu HOẶC đốt thảo mộc → thở cùng hương →
  // Lọ Ước / Túi thơm vào Túi An Yên (và kệ chung, kho 69) → Nhật ký An Yên kèm gợi ý dùng tại nhà.
  const AROMAS=[
    ['sa_chanh','Sả chanh',0,'#C8DF8A','Tươi mát, ấm nhẹ, vị chanh rõ','Quét sạch bụi bặm, làm mới không gian','Giải tỏa uể oải, nặng đầu, xua cảm giác bí bách'],
    ['bac_ha','Bạc hà',0,'#9BE2D8','Mát lạnh, sắc nét, bừng tỉnh','Sự minh mẫn và hanh thông','Giảm căng đầu, buồn ngủ, giúp đầu óc sáng rõ tức thì'],
    ['vo_buoi','Vỏ bưởi',0,'#F2DC78','Thanh ngọt, thân thuộc mùi vườn nhà','Niềm vui giản dị, nhẹ lòng','Nâng tinh thần khi chùng xuống, giảm cảm giác nặng nề'],
    ['cam_ngot','Cam ngọt',0,'#F5B06C','Ngọt dịu, ấm nắng, tươi vui','Năng lượng tích cực, sự cởi mở','Xoa dịu lo âu nhẹ, giúp trẻ hóa tâm trạng, dễ mỉm cười'],
    ['chanh_xanh','Chanh xanh',0,'#A8DF76','Chua thanh, trong trẻo, sắc sảo','Khởi đầu mới, rũ bỏ cũ kỹ','Tăng tập trung, cắt dòng suy nghĩ rối rắm lặp đi lặp lại'],
    ['bach_dan','Bạch đàn',0,'#A8D6CF','The mát, sạch sâu, mùi rừng sớm','Hơi thở rộng mở, tự do','Thông mũi, mở lồng ngực, giải tỏa ngột ngạt, áp lực'],
    ['oai_huong','Oải hương',1,'#B59CE0','Dịu êm, hơi ngọt thảo mộc, thư thái','Sự an nghỉ và buông xuống','Hạ nhịp cảm xúc, giảm lo âu, hỗ trợ vào giấc ngủ sâu'],
    ['hoa_sen','Hoa sen',1,'#F4A6C4','Thanh khiết, thoang thoảng, trong sáng','Tỉnh thức giữa đời thường, tâm không vướng bận','Làm lắng cơn nóng giận/bất an, đưa tâm về tĩnh lặng'],
    ['hoa_nhai','Hoa nhài',1,'#F6F0DC','Ngọt mềm, thanh tao, ấm đêm','Sự dịu dàng và niềm tin vào bản thân','An ủi nỗi buồn sâu, khơi lại cảm giác yêu đời, bớt tự ti'],
    ['hoa_hong','Hoa hồng',1,'#DC5B74','Nồng nàn mềm mại, ấm áp trái tim','Tình thương và sự tự trân trọng','Chữa lành tổn thương tình cảm, vỗ về cô đơn, tủi thân'],
    ['huong_thao','Hương thảo',1,'#5C8E6B','Thảo mộc xanh ấm, sắc sảo, bền bỉ','Trí nhớ sáng và sự kiên định','Giảm kiệt sức tinh thần do làm việc lâu, tăng sáng suốt'],
    ['ngai_cuu','Ngải cứu',1,'#7A8F5E','Đậm chất thảo dược, ấm nồng, thân quen','Sự che chở và bảo vệ','Làm dịu cảm giác bất an, lạnh người, giúp yên dạ'],
    ['tram_huong','Trầm hương',2,'#B6894A','Trầm sâu, ngọt gỗ, linh thiêng','Sự tĩnh tại vượt thời gian','Định tâm khi ngồi thiền, cắt vọng tưởng, an thần sâu'],
    ['go_thong','Gỗ thông',2,'#3E6E52','Mùi nhựa rừng, thanh sạch, vững vàng','Cây thông đứng thẳng giữa gió — nội lực','Giảm căng thẳng tích tụ, cảm giác được thiên nhiên ôm ấp'],
    ['dan_huong','Đàn hương',2,'#D1B086','Mịn như kem gỗ, dịu ngọt, rất êm','Lòng từ hòa và sự sáng suốt trầm tĩnh','Xoa dịu bất an kéo dài, cân bằng cảm xúc khi nhạy cảm'],
    ['que','Quế thanh',2,'#B85D38','Cay ngọt, nồng ấm mạnh mẽ','Ngọn lửa nhỏ sưởi ấm ngày lạnh','Đẩy lùi cảm giác lạnh lẽo, trì trệ, tiếp thêm sinh khí'],
    ['hoa_hoi','Hoa hồi',2,'#9E6B40','Ngọt cay dịu, sâu lắng, nét cổ truyền','Sự đoàn tụ, ấm cúng','Thư giãn cơ thể mệt mỏi, giảm cảm giác trống trải'],
    ['gung_kho','Gừng khô',2,'#D8A448','Ấm cay vừa, mùi đất vững chãi','Dũng khí bước tiếp từng bước nhỏ','Hồi sức khi kiệt quệ, ấm người, tăng ý chí bắt đầu']].map(([id,name,tier,c,feel,mean,heal],i)=>({id,name,tier,c,feel,mean,heal,i}));
  const AR=id=>AROMAS.find(a=>a.id===id);
  const AR_TIERS=['Hương đầu','Hương giữa','Hương nền'];
  const AR_MOODS=[
    {id:'ngu',label:'Khó ngủ · Đầu óc quay cuồng',mix:[['cam_ngot',1],['oai_huong',3],['dan_huong',1]],breath:[4,7,8],title:'Đêm An Giấc'},
    {id:'tai',label:'Quá tải · Căng thẳng công việc',mix:[['vo_buoi',2],['oai_huong',2],['go_thong',1]],breath:[4,4,6],title:'Gió Rừng Thông'},
    {id:'tinh',label:'Nặng đầu · Cần tỉnh táo tập trung',mix:[['bac_ha',2],['huong_thao',2],['chanh_xanh',1]],breath:[4,4,4],title:'Sáng Trong'},
    {id:'buon',label:'Buồn bã · Cô đơn · Cần vỗ về',mix:[['cam_ngot',2],['hoa_hong',2],['hoa_nhai',1]],breath:[4,2,6],title:'Ôm Lòng Dịu Lại'},
    {id:'met',label:'Mệt mỏi · Lạnh người · Hụt sức',mix:[['sa_chanh',2],['ngai_cuu',2],['gung_kho',1]],breath:[5,2,5],title:'Bếp Ấm Chiều Đông'},
    {id:'thien',label:'Muốn tĩnh tâm · Ngồi thiền sâu',mix:[['bach_dan',1],['hoa_sen',2],['tram_huong',2]],breath:[4,4,8],title:'Sen Trầm Làng Yên'}];
  // Drops by the golden ratio: 1 scent → 3 drops; 2 → 3:2 (more for the higher note); 3 → 2 top + 2 middle + 1 base.
  function arRatio(ids){const a=ids.map(AR).sort((x,y)=>x.tier-y.tier);if(a.length===1)return [[a[0].id,3]];if(a.length===2)return [[a[0].id,3],[a[1].id,2]];return [[a[0].id,2],[a[1].id,2],[a[2].id,1]]}
  function arBalanceHint(ids){const set=new Set(ids);if(['que','hoa_hoi','gung_kho'].every(x=>set.has(x)))return 'Ba mùi đều cay nóng · thử thêm Cam ngọt hoặc Vỏ bưởi để bài hương tròn dịu hơn.';if(ids.length===3&&ids.every(x=>AR(x).tier===0))return 'Toàn hương đầu nên mùi bay nhanh · thử thêm Gỗ thông hoặc Oải hương để hương lưu êm hơn.';return ''}
  // ---- Lọ Ước (layered wish bottle) and Túi thơm (linen herb pouch), shared by the room, the shelf and the bag preview
  function makeWishBottle(mix,s=1){const g=new THREE.Group(),glass=new THREE.MeshStandardMaterial({color:'#eef6f4',transparent:true,opacity:.32,roughness:.08,metalness:.1,side:THREE.DoubleSide,depthWrite:false});
    const prof=[[0,0],[.12,0],[.14,.03],[.15,.12],[.14,.24],[.1,.3],[.05,.34],[.045,.4],[.052,.42]];g.add(new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x,y])=>new THREE.Vector2(x,y)),24),glass));
    const order=mix.map(([id,d])=>[AR(id),d]).filter(x=>x[0]).sort((a,b)=>b[0].tier-a[0].tier),tot=order.reduce((t,[,d])=>t+d,0)||1;let y=.012;
    for(const [a,d] of order){const h=.22*d/tot,r=.138,m=new THREE.Mesh(new THREE.CylinderGeometry(r,r*(y<.03?.88:1),h,22),new THREE.MeshStandardMaterial({color:a.c,transparent:true,opacity:.78,roughness:.15,emissive:a.c,emissiveIntensity:.18}));m.position.y=y+h/2;g.add(m);y+=h}
    for(let k=0;k<7;k++){const sp=new THREE.Mesh(new THREE.SphereGeometry(.006,6,4),new THREE.MeshBasicMaterial({color:'#fff6d0'}));const a=k*2.4;sp.position.set(Math.cos(a)*.08,.04+((k*37)%19)/19*Math.max(.02,y-.06),Math.sin(a)*.08);g.add(sp)}
    const cork=new THREE.Mesh(new THREE.CylinderGeometry(.055,.045,.07,14),mat('#b08458'));cork.position.y=.44;g.add(cork);
    const tw=new THREE.Mesh(new THREE.TorusGeometry(.05,.006,5,16),mat('#c8a96a'));tw.rotation.x=Math.PI/2;tw.position.y=.36;g.add(tw);
    const tag=new THREE.Mesh(new THREE.BoxGeometry(.07,.045,.004),mat('#f2e6c8'));tag.position.set(.09,.31,.06);tag.rotation.set(0,-.4,.25);g.add(tag);g.scale.setScalar(s);return g}
  function makeHerbPouch(mix,s=1){const g=new THREE.Group(),a=mix.map(([id])=>AR(id)).filter(Boolean),c0=(a[0]||AROMAS[12]).c,c1=(a[1]||a[0]||AROMAS[12]).c,c2=(a[2]||a[1]||a[0]||AROMAS[12]).c;
    const base=new THREE.Color(c0).lerp(new THREE.Color('#f3ead8'),.45);
    const prof=[[0,0],[.13,.005],[.17,.06],[.17,.16],[.13,.24],[.07,.27],[.08,.3],[.12,.34],[.1,.355]];g.add(new THREE.Mesh(new THREE.LatheGeometry(prof.map(([x,y])=>new THREE.Vector2(x,y)),18),new THREE.MeshStandardMaterial({color:base,roughness:.95,side:THREE.DoubleSide})));
    const cord=new THREE.Mesh(new THREE.TorusGeometry(.075,.009,6,20),mat(c1));cord.rotation.x=Math.PI/2;cord.position.y=.265;g.add(cord);
    for(const sx of [-1,1]){const t=new THREE.Mesh(new THREE.CylinderGeometry(.004,.004,.1,4),mat(c1));t.position.set(sx*.07,.2,.06);t.rotation.z=sx*.3;g.add(t);const ts=new THREE.Mesh(new THREE.ConeGeometry(.018,.05,8),mat(c1));ts.position.set(sx*.085,.14,.065);g.add(ts)}
    for(let k=0;k<6;k++){const l=new THREE.Mesh(new THREE.SphereGeometry(.016,6,4),mat(c2));l.scale.set(1,.35,1.8);const a=k/6*Math.PI-.2;l.position.set(Math.cos(a)*.05,.1+Math.sin(a)*.05,.17);l.rotation.z=a;g.add(l)}
    const stemE=new THREE.Mesh(new THREE.CylinderGeometry(.004,.004,.12,4),mat(c2));stemE.position.set(0,.08,.172);g.add(stemE);
    const tag=new THREE.Mesh(new THREE.BoxGeometry(.07,.045,.004),mat('#f2e6c8'));tag.position.set(.1,.25,.09);tag.rotation.z=.3;g.add(tag);g.scale.setScalar(s);return g}
  function makeAromaGift(r,s){const mix=(r.aromas||[]).map((id,i)=>[id,(r.drops||[])[i]||1]);return r.form==='tui'?makeHerbPouch(mix,s):makeWishBottle(mix,s)}
  // ---- shared shelf (Supabase anyen_aroma_gifts: 9 shown, store of 69 with picks)
  let aromaRows=[];
  async function loadAromas(){if(typeof flowerDb==='undefined'||!flowerDb)return;try{let {data,error}=await flowerDb.from('anyen_aroma_gifts').select('id,seq,form,aromas,drops,title,wish,name,picks,created_at').order('seq',{ascending:false}).limit(STORE_FETCH);if(!error&&data){data=pickNine(data);const local=aromaRows.filter(r=>String(r.id).startsWith('local-')&&!data.some(d=>d.title===r.title&&d.name===r.name));aromaRows=[...local,...data].slice(0,9);if(room&&room.onAromas)room.onAromas()}}catch(e){}}
  setTimeout(loadAromas,3000);
  // ---- the room
  // ---- Haromy: phong cách spa mộc — tường vữa kem, sàn sồi sáng, gỗ mật ong, rèm lanh, nắng qua cửa sổ, đèn mây, cây xanh, thảm cói, nến
  function haromyTex(kind){const cv=document.createElement('canvas');cv.width=cv.height=512;const c=cv.getContext('2d');
    if(kind==='plaster'){c.fillStyle='#ebe0cb';c.fillRect(0,0,512,512);for(let k=0;k<900;k++){const x=Math.random()*512,y=Math.random()*512,r=8+Math.random()*40;const g=c.createRadialGradient(x,y,0,x,y,r);const a=Math.random()*.05;g.addColorStop(0,Math.random()<.5?`rgba(255,250,238,${a})`:`rgba(190,165,130,${a})`);g.addColorStop(1,'rgba(0,0,0,0)');c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r)}}
    else{const base=kind==='ceil'?[150,112,78]:[192,150,106];for(let i=0;i<8;i++){const off=(i*173)%512;for(let s=-1;s<2;s++){const k=.9+((i*31+s*7)%9)/45;c.fillStyle=`rgb(${base[0]*k|0},${base[1]*k|0},${base[2]*k|0})`;c.fillRect(i*64,off+s*512,64,512);c.strokeStyle='rgba(90,60,35,.12)';for(let g=0;g<7;g++){c.beginPath();c.moveTo(i*64+5+g*8,off+s*512);c.bezierCurveTo(i*64+9+g*8,off+s*512+170,i*64+1+g*8,off+s*512+340,i*64+6+g*8,off+s*512+512);c.stroke()}c.fillStyle='rgba(70,45,25,.5)';c.fillRect(i*64,off+s*512,64,2)}c.fillStyle='rgba(70,45,25,.45)';c.fillRect(i*64,0,2,512)}}
    const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t}
  function haromyDecor(st){const W=st.sc,M=(c,o={})=>new THREE.MeshStandardMaterial({color:c,roughness:.85,...o});
    W.background=new THREE.Color('#2c241d');
    // đổi bảng màu: nâu sẫm → gỗ mật ong sáng; tatami ẩn để thay bằng thảm cói tròn
    const REMAP={'4e3a2a':'8f6d4e','6b4a32':'a67d54','5a3d2a':'9a6c43','4a3222':'7f5838','5b3d2a':'8c6646','7a5438':'b48d64','6a4630':'a07b55','5a3b24':'9c7450','6a7a5a':'9fae8f','3a2a1e':'8c6a4a'};
    const plaster=haromyTex('plaster'),oak=haromyTex('floor');
    W.traverse(o=>{if(!o.isMesh||!o.material||!o.material.color)return;const hx=o.material.color.getHexString();
      if(hx==='4a3a2c'){o.material=M('#ffffff',{map:plaster.clone(),roughness:.95});o.material.map.repeat.set(2,1);o.material.map.needsUpdate=true}
      else if(hx==='5e4a36'&&o.geometry?.parameters?.width===8){o.material=M('#ffffff',{map:oak,roughness:.7});oak.repeat.set(4,3)}
      else if(hx==='b9a77a')o.visible=false;
      else if(REMAP[hx]){o.material=o.material.clone();o.material.color.set('#'+REMAP[hx])}});
    // ánh sáng: nắng chiều ấm từ cửa sổ, ánh sáng dịu toàn phòng
    W.add(new THREE.HemisphereLight('#fff4e0','#7a5a3c',.9));const sun=new THREE.DirectionalLight('#ffe2b0',1.6);sun.position.set(-.6,3.2,-6);sun.target.position.set(.4,0,-.6);W.add(sun,sun.target);
    // ốp gỗ chân tường + trần gỗ có xà
    const wain=M('#b48a5e',{roughness:.7});for(const [x,z,w,d] of [[0,-3.42,7.9,.05],[-3.92,0,.05,6.9],[3.92,0,.05,6.9]]){const p=new THREE.Mesh(new THREE.BoxGeometry(w,.85,d),wain);p.position.set(x,.43,z);W.add(p);const cap=new THREE.Mesh(new THREE.BoxGeometry(w+.02,.05,d+.06),M('#8f6d4e'));cap.position.set(x,.87,z);W.add(cap)}
    {const ct=haromyTex('ceil');ct.repeat.set(3,3);const ceil=new THREE.Mesh(new THREE.PlaneGeometry(8,7),M('#ffffff',{map:ct}));ceil.rotation.x=Math.PI/2;ceil.position.y=3.62;W.add(ceil);for(const z of [-2.4,-.8,.8]){const b=new THREE.Mesh(new THREE.BoxGeometry(8,.16,.18),M('#7d5a3c'));b.position.set(0,3.52,z);W.add(b)}}
    // vệt nắng xiên qua cửa sổ xuống sàn
    {const cv=document.createElement('canvas');cv.width=64;cv.height=256;const c=cv.getContext('2d'),g=c.createLinearGradient(0,0,0,256);g.addColorStop(0,'rgba(255,236,190,.55)');g.addColorStop(1,'rgba(255,236,190,0)');c.fillStyle=g;c.fillRect(0,0,64,256);const tx=new THREE.CanvasTexture(cv);
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([-1.05,2.85,-3.35, 1.05,2.85,-3.35, -1.35,.03,-.9, 1.35,.03,-.9],3));geo.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1,1,1],2));geo.setIndex([0,2,1,1,2,3]);
      const shaft=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide,opacity:.22}));W.add(shaft);
      const pool=new THREE.Mesh(new THREE.PlaneGeometry(2.6,1.6),new THREE.MeshBasicMaterial({color:'#ffe9b8',transparent:true,opacity:.07,depthWrite:false,blending:THREE.AdditiveBlending}));pool.rotation.x=-Math.PI/2;pool.position.set(0,.025,-1.2);W.add(pool);
      st.tick.push(t=>{shaft.material.opacity=.2+Math.sin(t*.4)*.04})}
    // rèm lanh mỏng hai bên cửa sổ, thanh treo gỗ
    {const rod=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,4.4,8),M('#7d5a3c'));rod.rotation.z=Math.PI/2;rod.position.set(0,3.15,-3.3);W.add(rod);
      for(const sx of [-1,1]){const g=new THREE.PlaneGeometry(.8,2.7,16,1),p=g.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getX(i)*18)*.05);g.computeVertexNormals();
        const cur=new THREE.Mesh(g,M('#f4eddf',{transparent:true,opacity:.78,side:THREE.DoubleSide,roughness:1}));cur.position.set(sx*1.85,1.78,-3.26);W.add(cur);st.tick.push(t=>{cur.rotation.y=Math.sin(t*.6+sx)*.03})}}
    // thảm cói tròn dưới bàn
    {const rug=new THREE.Mesh(new THREE.CircleGeometry(1.75,48),M('#d6c49c',{roughness:1}));rug.rotation.x=-Math.PI/2;rug.position.set(0,.012,-1.25);W.add(rug);
      for(const r of [1.62,1.3,.9]){const ring=new THREE.Mesh(new THREE.RingGeometry(r-.035,r,64),M('#b39a6c',{roughness:1}));ring.rotation.x=-Math.PI/2;ring.position.set(0,.014,-1.25);W.add(ring)}}
    // hai đèn mây treo trên bàn xông
    for(const x of [-.6,.6]){const g=new THREE.Group();g.position.set(x,2.45,-1.6);W.add(g);const cord=new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,1.1,4),M('#3a2a1e'));cord.position.y=.62;g.add(cord);
      const shade=new THREE.Mesh(new THREE.SphereGeometry(.26,18,10,0,Math.PI*2,0,Math.PI*.55),M('#c9a46c',{side:THREE.DoubleSide,roughness:1,emissive:'#5a3a14',emissiveIntensity:.35}));g.add(shade);
      for(let k=0;k<5;k++){const band=new THREE.Mesh(new THREE.TorusGeometry(.262*Math.sin(Math.PI*(.12+k*.09)),.006,4,24),M('#9b7848'));band.rotation.x=Math.PI/2;band.position.y=.262*Math.cos(Math.PI*(.12+k*.09));g.add(band)}
      const bulb=new THREE.Mesh(new THREE.SphereGeometry(.07,10,8),new THREE.MeshBasicMaterial({color:'#ffe2a8'}));bulb.position.y=.02;g.add(bulb);const pl=new THREE.PointLight('#ffcf8a',2.2,4.5,1.6);pl.position.y=-.05;g.add(pl)}
    // cây xanh: chậu lá lớn ở góc, dây trầu bà trên tủ, chậu nhỏ trên bệ cửa sổ
    const leafMat=M('#4f7a4a',{side:THREE.DoubleSide,roughness:.7}),leafMat2=M('#6b9258',{side:THREE.DoubleSide,roughness:.7});
    const plant=(x,z,s,n)=>{const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(s);W.add(g);const pot=new THREE.Mesh(new THREE.CylinderGeometry(.26,.2,.48,16),M('#e9e1d2',{roughness:.6}));pot.position.y=.24;g.add(pot);const soil=new THREE.Mesh(new THREE.CircleGeometry(.24,14),M('#4a3626'));soil.rotation.x=-Math.PI/2;soil.position.y=.47;g.add(soil);
      for(let k=0;k<n;k++){const a=k*2.4,hgt=.9+(k%4)*.22,stem=new THREE.Mesh(new THREE.CylinderGeometry(.012,.016,hgt,5),M('#5d7a44'));stem.position.set(Math.cos(a)*.08,.48+hgt/2,Math.sin(a)*.08);stem.rotation.set(Math.sin(a)*.25,0,Math.cos(a)*.25);g.add(stem);
        const leaf=new THREE.Mesh(new THREE.CircleGeometry(.22,14),k%2?leafMat:leafMat2);leaf.scale.set(.75,1.25,1);leaf.position.set(Math.cos(a)*(.12+hgt*.25),.48+hgt+.05,Math.sin(a)*(.12+hgt*.25));leaf.rotation.set(-1.1+(k%3)*.25,a,0);g.add(leaf)}
      st.tick.push(t=>{g.rotation.y=Math.sin(t*.3+x)*.03});return g};
    plant(-2.65,-2.95,1.15,11);plant(3.2,-2.95,.72,8);plant(.95,-3.05,.45,6).position.y=1.1;
    for(const side of [-1,1])for(let k=0;k<7;k++){const lf=new THREE.Mesh(new THREE.CircleGeometry(.07,8),k%2?leafMat:leafMat2);lf.scale.set(.8,1.1,1);lf.position.set(side*3.5,3.02-k*.17-(k%2)*.04,-2.95+k*.42);lf.rotation.y=side*Math.PI/2;W.add(lf)}
    // vòng hoa khô treo tường cạnh cửa sổ
    {const wr=new THREE.Group();wr.position.set(-2.35,2.35,-3.38);W.add(wr);wr.add(new THREE.Mesh(new THREE.TorusGeometry(.28,.025,6,28),M('#b08a5a')));const cs=['#c9a1b8','#e8d9b0','#a8b88e','#d7b58a','#b7a0c9'];for(let k=0;k<16;k++){const a=k/16*Math.PI*2,f=new THREE.Mesh(new THREE.SphereGeometry(.045,6,5),M(cs[k%5]));f.position.set(Math.cos(a)*.28,Math.sin(a)*.28,.02);wr.add(f)}}
    // cụm nến sáp ong trên sàn cạnh kệ, lửa nến lung linh
    {const cg=new THREE.Group();cg.position.set(1.35,0,-3.0);W.add(cg);const flames=[];[[0,0,.38],[.18,.08,.26],[-.16,.1,.2],[.05,.2,.16]].forEach(([x,z,hh])=>{const c=new THREE.Mesh(new THREE.CylinderGeometry(.06,.06,hh,14),M('#f3e6c6',{roughness:.6}));c.position.set(x,hh/2,z);cg.add(c);const fl=new THREE.Mesh(new THREE.SphereGeometry(.02,8,6),new THREE.MeshBasicMaterial({color:'#ffcf6a'}));fl.scale.y=1.8;fl.position.set(x,hh+.04,z);cg.add(fl);flames.push(fl)});
      const cl=new THREE.PointLight('#ffb866',1.2,2.4,2);cl.position.set(0,.5,.1);cg.add(cl);st.tick.push(t=>{cl.intensity=1.1+Math.sin(t*9)*.12+Math.sin(t*13.7)*.08;flames.forEach((f,i)=>f.scale.y=1.6+Math.sin(t*10+i*2)*.25)})}
    // biển tên Haromy trên cửa sổ
    {const cv=document.createElement('canvas');cv.width=512;cv.height=96;const c=cv.getContext('2d');c.fillStyle='#8c6646';c.fillRect(0,0,512,96);c.fillStyle='#f6ead0';c.font='italic 600 52px Georgia, serif';c.textAlign='center';c.textBaseline='middle';c.fillText('Haromy',256,50);const tx=new THREE.CanvasTexture(cv);tx.colorSpace=THREE.SRGBColorSpace;
      const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.2,.22),new THREE.MeshBasicMaterial({map:tx}));sign.position.set(0,3.32,-3.36);W.add(sign)}
  }
  // ---------------------------------------------------------------- Quán trà
  const TEA_WORDS=['Uống trà là uống cái tĩnh lặng của lá.','Chén trà ấm nhất là chén trà được mời bằng cả tấm lòng.','Hãy uống trà chậm rãi, như thể trái đất đang xoay quanh chén trà của bạn.','Nước sôi rồi lặng, trà mới thơm. Lòng lặng rồi, lời mới hiền.','Một chén trà, một người bạn, đủ cho một buổi chiều an.','Rót trà cho người khác trước, lòng mình cũng ấm theo.'];
  const ROOM_BUILDERS={nha_hoa_lan:['#cfd9cc','#8a7a62',st=>roomNhaSac(st),{glassRoof:true}],chuong_gio:['#3f3424','#6b5238',st=>roomChuongGio(st)],xong_huong:['#4a3a2c','#5e4a36',st=>roomXongHuong(st)],quan_tra:['#3a3026','#6b5238',st=>roomQuanTra(st)],xuong_gom:['#c9a57a','#7a5636',st=>roomXuongGom(st)],nha_niem:['#4A3C2E','#5a452f',st=>roomNhaNiem(st),{bare:true,solo:true}],van_hoa:['#42362A','#4a3826',st=>roomNhaVanHoa(st),{bare:true,venue:'nha_van_hoa'}]};
  function openRoom(h){const b=ROOM_BUILDERS[h.id];if(!b||roomOpen||bayMode)return Promise.resolve();
    if(!roomsReady){if(openRoom.waiting)return openRoom.waiting;const hint=document.getElementById('zenHint');if(hint)hint.textContent='Đang mở '+(h.name||'phòng')+'…';
      return openRoom.waiting=loadRoomsModule().then(()=>{openRoom.waiting=null;return openRoom(h)}).catch(()=>{openRoom.waiting=null;if(hint)hint.textContent='Chưa tải được phòng, kiểm tra mạng rồi thử lại nhé'})}
   if(typeof activityBusy==='function'&&activityBusy()){askFinish(()=>openRoom(h));return}audio();roomOpen=true;roomOutside=bayMode?null:{h,x:mePosition.x,z:mePosition.z,viewYaw,walkYaw,walkPitch,lookOffset,camZoom,camLift:typeof camLift!=='undefined'?camLift:1};window.dispatchEvent(new CustomEvent('anyen-space',{detail:{space:b[3]&&b[3].solo?'solo:'+h.id:'room:'+((b[3]&&b[3].venue)||h.id)}}));walkRoute.length=0;walkingKeys.clear();window.dispatchEvent(new CustomEvent('langyen-audio-stop',{detail:{except:null}}));
    if(!window.anyenLite)anyenLastPlace({kind:'house',id:h.id});roomBox.querySelector('#roomTitle').textContent=h.icon+' '+h.name;roomBox.hidden=false;document.body.classList.add('room-open');room=makeRoom(b[0],b[1],b[3]);b[2](room);if(!(window.anyenLite&&h.id==='xuong_gom'))enableWalk(room,h.id);else{room.dist=3;room.pitch=.62;room.maxD=3.2;room.target.set(0,.55,0)}/* lite: Nhà Chạm không vẽ hình khách đi lại, chỉ còn đôn, đất và người thợ */setRoomUi(false);room.resize();}
  let roomOutside=null;
  const EXIT_CAM_SIDE=Math.PI;/* 27/11: vừa ra cửa, camera đứng phía đối diện nhìn ngược về nhà: thấy toàn cảnh ngôi nhà, nhân vật đứng trước cửa ở giữa, trên đường 1/3 dưới */
  function roomOutRestore(){const O=roomOutside;roomOutside=null;if(!O||bayMode||!document.body.classList.contains('immersive'))return null;const h=O.h,yaw=h&&h.door?h.rot+Math.PI:O.viewYaw;
    /* 3.40: ra cửa: đứng cách cửa 1 m, quay lưng về cửa (mặt nhìn ra ngoài); chỗ đó vướng thì lùi ra thêm từng chút, rồi tìm ô trống kế bên */
    let p=null;if(h&&h.door){const fd=(h.D||(h.id==='nha_hoa_lan'?ORCHID.d:0))/2,dx=Math.sin(h.rot),dz=Math.cos(h.rot),ok=(a,b)=>walkable(a,b)&&!guestNear(a,b,GUEST_AVOID);
      if(fd){for(let k=0;k<=8&&!p;k++){const d=fd+1+k*.25,q=[h.x+dx*d,h.z+dz*d];if(ok(...q))p=q}if(!p)p=nearestWalkable(h.x+dx*(fd+1),h.z+dz*(fd+1),h.rot)}
      if(!p)p=nearestWalkable(...h.door,yaw)}
    if(!p)p=nearestWalkable(O.x,O.z,yaw)||[O.x,O.z];
    walkRoute.length=0;clearPendingActions();walkingKeys.clear();mePosition.set(p[0],0,p[1]);viewYaw=O.viewYaw;walkYaw=O.walkYaw;walkPitch=O.walkPitch;lookOffset=O.lookOffset;if(O.camZoom)setZoom(O.camZoom);if(typeof setCamLift==='function'&&O.camLift)setCamLift(O.camLift);
    if(h&&h.door){walkYaw=h.rot;viewYaw=h.rot+EXIT_CAM_SIDE;lookOffset=0;{const W=h.W||(h.id==='nha_hoa_lan'?ORCHID.w:11),t=Math.tan(camera.fov*Math.PI/360)*camera.aspect,need=((W/2+2.4)/t-1)/14;camZoom=camZoomS=Math.min(2.6,Math.max(camZoom,1.05,need))}/* lùi đủ xa để bề ngang ngôi nhà (cả mái, hiên chìa ra) vừa khung (điện thoại dọc cần lùi xa hơn); không ghi đè mức thu phóng đã lưu */}
    window.dispatchEvent(new CustomEvent('anyen-position',{detail:{x:p[0],z:p[1]}}));return h}
  function closeRoom(){if(!roomOpen)return;roomOpen=false;{const bk=roomBox.querySelector('[data-rm="back"]');if(bk)bk.textContent='🚪 Ra cửa'}if(roomFromIsland){roomFromIsland=false;const door=window.__tdExitDoor;window.__tdExitDoor=false;if(document.body.classList.contains('immersive'))setTimeout(()=>{if(!bayMode&&!roomOpen)enterBay();/* Rời nhà ở Đảo Yên: ra đứng trước cửa nhà, không về tàu */if(door){let n=0;const t=setInterval(()=>{if(++n>80||(window.__tdAtDoor&&window.__tdAtDoor(door)))clearInterval(t)},150)}},60)}if(document.body.classList.contains('immersive')&&!bayMode)window.dispatchEvent(new CustomEvent('anyen-space',{detail:{space:'forest'}}));if(room){room.run=false;room.cleanup&&room.cleanup();room.sc.traverse(o=>{if(o.geometry)o.geometry.dispose()});room=null}roomBox.hidden=true;document.body.classList.remove('room-open');rmPanel.innerHTML='';if(window.anyenLite)setTimeout(()=>window.dispatchEvent(new Event('anyen-lite-leave')),0);lastWalkFrame=performance.now();{const h=roomOutRestore();document.getElementById('zenHint').textContent=h?'🚪 Đã ra trước cửa '+h.name+' · bấm cửa để vào lại':'Đã trở về Rừng Yên'}}
  roomBox.querySelector('[data-rm="back"]').addEventListener('click',closeRoom);window.addEventListener('anyen-photo',()=>{if(roomOpen)return;if(window.__anyenPhoto){window.__anyenPhoto();return}const h=document.getElementById('zenHint');if(h)h.textContent='📷 Đang mở máy ảnh…';loadBayModule().then(()=>window.__anyenPhoto&&window.__anyenPhoto()).catch(()=>{if(h)h.textContent='Chưa mở được máy ảnh, thử lại nhé'})});window.__roomSt=()=>room;document.addEventListener('keydown',e=>{if(e.key==='Escape'&&roomOpen)closeRoom()});window.addEventListener('anyen-3d-exit',closeRoom);window.addEventListener('resize',()=>{if(room)room.resize()});
  // 3.19: Nghi thức Dâng y. Mở quanh năm; mỗi khách tự may một tấm y.
  // May y trên khung Kathina trong Tịnh thất (mảnh ghép như ruộng lúa) → đội y lên đầu → nhiễu Phật 3 vòng (tượng luôn bên phải)
  // → lạy ba lạy, đặt y dưới chân tượng → ngồi niệm 5 phút → y được thỉnh vào kho y trong Tịnh thất.
  // Y đã dâng lưu trên Supabase (anyen_kathina_robes): 5 phút đầu y nằm dưới chân tượng cho mọi khách cùng thấy, sau đó vào kho.
  const KAT_COLORS=[['Vàng nghệ','#c98a1c'],['Vàng cam','#d4772a'],['Nâu đất','#8a5a32'],['Nâu đỏ','#8e3b26']],KAT_DIEU=[5,7,9],KAT_CHANT_SEC=300,KAT_ROUNDS=3,KAT_R=7.55;
  // Tịnh thất: a small wooden hall on the east edge of the hilltop, facing the statue.
  const TINH_THAT={id:'tinh_that',name:'Nhà May Y',icon:'🟧',x:TT_SPOT[0],z:TT_SPOT[1],W:9,D:8.5,note:'May y, rước y và dâng y'};
  TINH_THAT.rot=Math.atan2(STATUE.x-TINH_THAT.x,STATUE.z-TINH_THAT.z);TINH_THAT.door=[TINH_THAT.x+Math.sin(TINH_THAT.rot)*(TINH_THAT.D/2+1.3),TINH_THAT.z+Math.cos(TINH_THAT.rot)*(TINH_THAT.D/2+1.3)];
  {/* 3.41: Nhà May Y theo ảnh phối cảnh: mái ngói xanh rêu, tường kem, biển gỗ hoa sen, cửa ô kính mở, cờ vải hoa sen, chậu hoa tím, ghế gỗ nhỏ, giá treo y vàng nâu ở hiên */
    const g=new THREE.Group(),W=TINH_THAT.W,D=TINH_THAT.D;
    cottage(g,{W,D,bw:6.6,bd:3.6,sign:['Nhà May Y','May áo Phật','lotus'],banners:'lotus',porch:({P,pb,pz,lav})=>{
      P(GL([[0,0],[.24,.02],[.34,.22],[.28,.4],[.3,.46]],12),'#7e6048',-2.2,pb,pz-.6);lav(-2.2,pz-.6,9);
      P(GB(.5,.06,.45),'#7a5232',1.75,pb+.45,pz-.9);for(const a of [-1,1])for(const b of [-1,1])P(GB(.05,.45,.05),'#5a3a22',1.75+a*.2,pb+.22,pz-.9+b*.18);P(GB(.5,.5,.05),'#7a5232',1.75,pb+.72,pz-1.1);P(GC(.06,.05,.1,8),'#f4efe2',1.65,pb+.53,pz-.9);
      const rx=2.7,rz=pz-.85;for(const s of [-1,1])P(GB(.06,1.7,.06),'#5a3a22',rx+s*.75,pb+.85,rz);P(GC(.025,.025,1.6,6),'#5a3a22',rx,pb+1.68,rz,{rz:Math.PI/2});for(const s of [-1,1])P(GB(.5,.05,.06),'#5a3a22',rx+s*.75,pb+.03,rz);
      ['#d99a2b','#c98a1c','#b8741a','#9a5a2a','#7a4a2a'].forEach((c,k)=>P(GB(.26,1.05,.08),c,rx-.6+k*.3,pb+1.1,rz+.02,{rz:(k%2?.03:-.03)}))}});
    g.position.set(TINH_THAT.x,terrainHeight(TINH_THAT.x,TINH_THAT.z),TINH_THAT.z);g.rotation.y=TINH_THAT.rot;g.userData.house=TINH_THAT;scene.add(g);TINH_THAT.group=g}
  // ===== Cổng Viverse (bên hông Nhà hoa lan, phía lối vào chính): nhà gỗ nhỏ mái dốc hai bên, ván nâu ấm, hoa sen trên đầu hồi,
  // cửa vòm lớn với màn xoáy sáng ngọc lam – tím nhạt – hồng nhạt, hai bụi cẩm tú cầu xanh tím ở chân cổng; bước vào là mở thế giới ORCHID hoa lan.
  // Phần gỗ và hoa gộp thành một khối tô màu theo đỉnh, không thêm đèn thật (nhẹ máy điện thoại).
  const vivU={t:{value:0}};
  {const g=new THREE.Group(),parts=[],P=(...a)=>parts.push(HP(...a)),wood='#9a6a3e',woodL='#b8854f',woodD='#64402a',groove='#76502f',
      BW=4.4,BD=VIV.D+.4,WH=3.1,RISE=1.55,R=1.2,AH=1.75,pb=.22,zf=BD/2;
    // bậc gỗ thấp
    P(GB(BW+.5,pb,BD+.5),woodD,0,pb/2,0);P(GB(BW+.6,.05,BD+.6),'#7a5232',0,pb+.02,0);P(GB(2.9,.12,.45),'#7a5232',0,.06,zf+.45);
    // mặt tiền: tường hồi năm cạnh có khoét cửa vòm
    const fs=new THREE.Shape();fs.moveTo(-BW/2,0);fs.lineTo(BW/2,0);fs.lineTo(BW/2,WH);fs.lineTo(0,WH+RISE);fs.lineTo(-BW/2,WH);fs.lineTo(-BW/2,0);
    const hole=new THREE.Path();hole.moveTo(-R,0);hole.lineTo(R,0);hole.lineTo(R,AH);hole.absarc(0,AH,R,0,Math.PI,false);hole.lineTo(-R,0);fs.holes.push(hole);
    const front=new THREE.ExtrudeGeometry(fs,{depth:.18,bevelEnabled:false,curveSegments:16});P(front,wood,0,pb,zf-.18);
    P(GB(BW,WH,.16),wood,0,pb+WH/2,-zf+.08);for(const s of [-1,1])P(GB(.16,WH,BD-.2),wood,s*(BW/2-.08),pb+WH/2,0);
    // rãnh ván dọc trên mặt tiền (né cửa vòm)
    for(let x=-BW/2+.32;x<BW/2-.1;x+=.36){const top=WH+RISE*(1-Math.abs(x)/(BW/2))-.08;const y0=Math.abs(x)<R+.08?AH+Math.sqrt(Math.max(0,(R+.08)**2-x*x)):0;if(top-y0>.1)P(GB(.025,top-y0,.02),groove,x,pb+(y0+top)/2,zf+.005)}
    // khung cửa vòm gỗ sáng
    for(const s of [-1,1])P(GB(.16,AH,.12),woodL,s*(R+.08),pb+AH/2,zf+.04);
    P(new THREE.TorusGeometry(R+.08,.08,6,20,Math.PI),woodL,0,pb+AH,zf+.04);P(GB(2*R+.36,.1,.16),woodL,0,pb+.05,zf+.04);
    // mái gỗ dốc hai bên, đua ra trước và sau, viền diềm sáng ở đầu hồi
    {const ang=Math.atan2(RISE,BW/2),len=Math.hypot(BW/2,RISE)+.5,RL=BD+.6;
      for(const s of [-1,1]){const cx=s*(BW/4+.14),cy=pb+WH+RISE/2+.16;P(GB(len,.14,RL),woodD,cx,cy,0,{rz:-s*ang});
        for(const zz of [RL/2-.04,-RL/2+.04])P(GB(len,.22,.08),woodL,cx,cy-.03,zz,{rz:-s*ang});
        for(let k=-2;k<=2;k++)P(GB(len,.02,.03),'#4a2e1b',cx,cy+.08,k*RL/5.5,{rz:-s*ang})}
      P(GB(.18,.18,RL+.05),'#4a2e1b',0,pb+WH+RISE+.3,0,{rz:Math.PI/4})}
    g.add(new THREE.Mesh(mergeColored(parts),houseMat));
    // hoa sen vàng nhạt trên đầu hồi
    {const cv=document.createElement('canvas');cv.width=cv.height=128;const c=cv.getContext('2d');c.fillStyle='#6a4528';c.beginPath();c.arc(64,64,62,0,Math.PI*2);c.fill();c.strokeStyle='#d9b878';c.lineWidth=4;c.beginPath();c.arc(64,64,56,0,Math.PI*2);c.stroke();ctIcon(c,'lotus',64,78,1.05,'#f1dca6');
      const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.CircleGeometry(.5,24),new THREE.MeshBasicMaterial({map:t}));m.position.set(0,pb+WH+.5,zf+.02);g.add(m)}
    // màn cổng: xoáy ánh sáng ngọc lam – tím nhạt – hồng nhạt, chuyển động chậm
    const sh=new THREE.Shape();sh.moveTo(-R,0);sh.lineTo(-R,AH);sh.absarc(0,AH,R,Math.PI,0,true);sh.lineTo(R,0);sh.lineTo(-R,0);
    const pm=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,uniforms:{t:vivU.t,H:{value:AH+R}},
      vertexShader:'varying vec2 vP;void main(){vP=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader:'uniform float t,H;varying vec2 vP;void main(){vec2 d=vP-vec2(0.,H*.5);float r=length(d)/(H*.5),a=atan(d.y,d.x);'+
        'float s1=sin(a*2.+r*6.5-t*1.1)*.5+.5,s2=sin(a*2.+r*6.5-t*1.1+2.1)*.5+.5;vec3 teal=vec3(.42,.86,.82),lav=vec3(.72,.62,.95),pink=vec3(1.,.76,.88),wh=vec3(.97,.97,1.);'+
        'vec3 col=mix(mix(teal,lav,s1),pink,s2*.6);col=mix(col,wh,smoothstep(.3,0.,r)*.8);gl_FragColor=vec4(col,.93);}'});
    const portal=new THREE.Mesh(new THREE.ShapeGeometry(sh,16),pm);portal.position.set(0,pb,zf-.12);g.add(portal);
    // hai bụi cẩm tú cầu xanh tím ở chân cổng + biển nhỏ "Cổng Viverse" bên trái
    {const fl=[],F=(...a)=>fl.push(HP(...a)),blues=['#6f86d8','#8a7ad0','#5f93d6','#9a86dc'];
      for(const s of [-1,1]){const hx=s*(BW/2+.35),hz=zf+.35;for(let k=0;k<5;k++){const a=k*1.3+s,xx=hx+Math.cos(a)*.32,zz=hz+Math.sin(a)*.25;
        F(new THREE.IcosahedronGeometry(.24,0),'#3f6a34',xx,.2,zz,{s:[1.3,.7,1.3]});F(new THREE.IcosahedronGeometry(.23,1),blues[(k+(s>0?1:0))%4],xx,.5+(k%2)*.1,zz)}}
      F(GC(.04,.05,1.1,6),'#5a3a22',-BW/2-1.3,.55,zf+.5);g.add(new THREE.Mesh(mergeColored(fl),houseMat));
      const cv=document.createElement('canvas');cv.width=256;cv.height=72;const c=cv.getContext('2d');c.fillStyle='#4a3020';c.fillRect(0,0,256,72);c.strokeStyle='#c9a46a';c.lineWidth=3;c.strokeRect(4,4,248,64);
      c.fillStyle='#f4e2b9';c.font='bold 28px serif';c.textAlign='center';c.textBaseline='middle';c.fillText('Cổng Viverse',128,38);
      const t=new THREE.CanvasTexture(cv);t.colorSpace=THREE.SRGBColorSpace;const b=new THREE.Mesh(new THREE.PlaneGeometry(1.1,.31),new THREE.MeshBasicMaterial({map:t,side:THREE.DoubleSide}));b.position.set(-BW/2-1.3,1.12,zf+.53);g.add(b)}
    g.position.set(VIV.x,terrainHeight(VIV.x,VIV.z),VIV.z);g.rotation.y=VIV.rot;g.userData.house=null;scene.add(g);window.__vivGroup=g;addFadeable(g,VIV.x,VIV.z,3.4)}
  // ===== Tư Gia (bờ đông Hồ Sen): nhà gỗ mái ngói, hiên trước nhìn ra hồ sen; Góc Gieo Hạt ngay cạnh nhà
  {/* 3.41: Tư Gia theo ảnh phối cảnh: nhà một tầng mái ngói xanh rêu, tường kem, khung gỗ, biển "Tư Gia" hoa sen, cửa gỗ hai cánh mở, cửa sổ ô vuông sáng ấm,
     hai đèn lồng treo, ghế gỗ trên hiên, bình hoa trắng, đèn đá, lối đá tròn, hồ sen nhỏ bên trái, oải hương và cẩm tú cầu trắng */
    const g=new THREE.Group(),parts=[],P=(...a)=>parts.push(HP(...a)),W=TU_GIA.W,D=TU_GIA.D,woodD=HOUSE_WALL_D;
    cottage(g,{W,D,bw:7.4,bd:4.4,sign:['Tư Gia','','lotus'],pond:[-W/2+1.7,D/2-1.6,1.1],plants:({hyd,lav})=>{hyd(W/2-.9,D/2-1.6,4);lav(-W/2+3.2,D/2-.6,6)},porch:({P,pb,pz})=>{
      P(GB(1.5,.07,.42),'#7a5232',-2.55,pb+.45,pz-.75);for(const a of [-1,1])P(GB(.08,.45,.36),'#5a3a22',-2.55+a*.65,pb+.22,pz-.75);
      P(GL([[0,0],[.12,.01],[.16,.18],[.09,.32],[.1,.36]],12),'#f3efe6',2.5,pb,pz-.7);for(let k=0;k<8;k++)P(new THREE.IcosahedronGeometry(.07,0),'#fbf8f0',2.5+Math.cos(k*.8)*.12,pb+.5+(k%3)*.06,pz-.7+Math.sin(k*.8)*.12);}});
    // Góc Gieo Hạt: luống đất viền gỗ, mầm non, bình tưới, rào thấp
    const gx=TU_GIA.garden[0]-TU_GIA.x,gz=TU_GIA.garden[1]-TU_GIA.z,lc=Math.cos(-TU_GIA.rot),ls=Math.sin(-TU_GIA.rot),lx=gx*lc-gz*ls,lz=gx*ls+gz*lc;
    P(GB(3.2,.3,2),woodD,lx,.15,lz);P(GB(3,.08,1.8),'#4a3526',lx,.32,lz);
    for(let i=0;i<5;i++)for(let j=0;j<3;j++){const sx=lx-1.2+i*.6,sz=lz-.6+j*.6;P(GC(.015,.02,.22,4),'#5f8f45',sx,.45,sz);P(new THREE.SphereGeometry(.07,6,4),'#7fbf5a',sx+.04,.58,sz,{s:[1.4,.5,1]});P(new THREE.SphereGeometry(.06,6,4),'#8fcc62',sx-.04,.56,sz,{s:[1.4,.5,1]})}
    P(GC(.16,.2,.34,10),'#5a7f8c',lx+2,.17,lz+.6);P(GC(.03,.03,.4,5),'#5a7f8c',lx+2.25,.34,lz+.6,{rz:-.8});
    g.add(new THREE.Mesh(mergeColored(parts),houseMat));
    const gcv=document.createElement('canvas');gcv.width=256;gcv.height=64;const gc=gcv.getContext('2d');gc.fillStyle='#3a2b1f';gc.fillRect(0,0,256,64);gc.fillStyle='#e6f0c8';gc.font='bold 26px sans-serif';gc.textAlign='center';gc.textBaseline='middle';gc.fillText('🌱 Góc Gieo Hạt',128,33);
    const gt=new THREE.CanvasTexture(gcv);gt.colorSpace=THREE.SRGBColorSpace;const gb=new THREE.Mesh(new THREE.PlaneGeometry(1.2,.3),new THREE.MeshBasicMaterial({map:gt,side:THREE.DoubleSide}));gb.position.set(lx-1.9,.75,lz);gb.rotation.y=Math.PI/2;g.add(gb);
    const post=new THREE.Mesh(new THREE.CylinderGeometry(.03,.03,.6,5),mat('#5b3d2a'));post.position.set(lx-1.9,.3,lz);g.add(post);
    g.position.set(TU_GIA.x,terrainHeight(TU_GIA.x,TU_GIA.z),TU_GIA.z);g.rotation.y=TU_GIA.rot;g.userData.house=TU_GIA;scene.add(g);TU_GIA.group=g;window.__homeGroup=g;addFadeable(g,TU_GIA.x,TU_GIA.z,4.5)}
  // ===== Nhà Văn Hóa (bản vẽ ngoại thất v3.6): 16 × 11 m, cao 6,8 m, cửa quay Bắc. Bệ đá rộng với bậc đón 3,6 m, tường vôi ngà,
  // ba gian cửa kính (gian giữa là cửa trượt đôi), hiên 6 cột gỗ tròn, ghế gỗ thấp, biển tên dưới xà; mái hai tầng chồng diêm
  // có dải cửa sổ cổ diêm lấy sáng, nóc viền vàng đồng.
  {const h=VAN_HOA,W=h.W,D=h.D,g=new THREE.Group(),parts=[],glassP=[],P=(...a)=>parts.push(HP(...a)),G=(...a)=>glassP.push(HP(...a));
    const pb=.35,WH=3.2,top=pb+WH,fz=D/2-.75,lime=HOUSE_WALL,frame='#241a11',timber=HOUSE_WALL_D,mull='#2d2015';
    P(GB(W+1.2,.18,D+1.2),'#4a3124',0,.09,0);P(GB(W+.8,pb,D+.8),HOUSE_BRICK,0,pb/2,0);
    P(GB(3.6,.24,.55),HOUSE_BRICK_L,0,.12,D/2+.65);P(GB(4.1,.12,.55),HOUSE_BRICK,0,.06,D/2+1.15);/* bậc đón rộng 3,6 m */
    // tường vôi: mặt tiền lùi vào làm hiên sâu 0,75 m
    P(GB(W-1,WH,.24),lime,0,pb+WH/2,-D/2+.5);for(const sx of [-1,1])P(GB(.24,WH,D-1.25),lime,sx*(W/2-.5),pb+WH/2,-.12);P(GB(W-1,WH,.24),lime,0,pb+WH/2,fz-.12);
    for(const y of [1.05,1.9,2.75]){P(GB(W-.98,.03,.02),'#2b2118',0,pb+y,-D/2+.37);for(const sx of [-1,1])P(GB(.02,.03,D-1.27),'#2b2118',sx*(W/2-.37),pb+y,-.12)}/* đường ván gỗ */
    P(GB(W-1.2,.04,D-1.6),'#5a452f',0,pb+.02,-.1);
    // ba gian kính: hai gian bên 3,5 m, gian giữa cửa trượt đôi 4,5 m
    const bay=(cx,w,hh)=>{G(new THREE.PlaneGeometry(w,hh),'#8c6f42',cx,pb+hh/2,fz+.01);P(GB(w+.16,.12,.1),frame,cx,pb+hh,fz+.05);for(const sx of [-1,1])P(GB(.12,hh,.1),frame,cx+sx*w/2,pb+hh/2,fz+.05);P(GB(w+.16,.1,.1),frame,cx,pb+.05,fz+.05)};
    for(const sx of [-1,1]){const cx=sx*5.08;bay(cx,3.5,2.9);for(const k of [-1,1])P(GB(.07,2.9,.08),mull,cx+k*3.5/6,pb+1.45,fz+.06);P(GB(3.5,.06,.08),mull,cx,pb+2.1,fz+.06)}
    {const hh=3.0;P(GB(4.7,.16,.12),'#1e150d',0,pb+hh+.02,fz+.06);for(const sx of [-1,1]){P(GB(.14,hh,.12),'#1e150d',sx*2.3,pb+hh/2,fz+.06);G(new THREE.PlaneGeometry(1,hh-.15),'#8c6f42',sx*1.55,pb+(hh-.15)/2,fz+.03);P(GB(.06,hh-.15,.07),mull,sx*1.05,pb+(hh-.15)/2,fz+.07)}
      G(new THREE.PlaneGeometry(2.1,hh-.15),'#8a6a40',0,pb+(hh-.15)/2,fz+.012)}/* gian giữa mở, thấy bên trong ấm */
    // hiên 6 cột gỗ tròn, ghế gỗ thấp trước hai gian kính bên
    for(const [x,r] of [[-7.6,.19],[-2.9,.19],[-1.25,.15],[1.25,.15],[2.9,.19],[7.6,.19]])P(GC(r,r+.02,WH,12),timber,x,pb+WH/2,D/2-.15);
    for(const sx of [-1,1]){P(GB(3.1,.08,.42),'#4e3a26',sx*5.08,pb+.45,fz+.4);for(const k of [-1,1])P(GB(.08,.41,.34),'#241a10',sx*5.08+k*1.4,pb+.21,fz+.4)}
    // xà diềm thấp, mái tầng 1 che hiên, dải cổ diêm lấy sáng, mái tầng 2 và nóc viền vàng
    P(GB(W+.6,.42,D+.3),'#231911',0,top+.21,0);
    const r1=top+.42;P(frustumGeo(W/2+1.3,D/2+1.15,W/2-1.5,D/2-1.85,1.2),HOUSE_ROOF,0,r1,0);
    const r2=r1+1.2;P(GB(W-3.3,.52,D-4),'#6e5232',0,r2+.26,0);for(let k=0;k<=8;k++){const x=-(W-3.3)/2+k*(W-3.3)/8;for(const z of [-(D-4)/2-.02,(D-4)/2+.02])P(GB(.09,.52,.05),mull,x,r2+.26,z)}
    for(let k=0;k<=5;k++){const z=-(D-4)/2+k*(D-4)/5;for(const x of [-(W-3.3)/2-.02,(W-3.3)/2+.02])P(GB(.05,.52,.09),mull,x,r2+.26,z)}
    const r3=r2+.52;P(frustumGeo(W/2-1.4,D/2-1.7,3.6,.06,1.05),HOUSE_ROOF,0,r3,0);P(GB(7.5,.16,.28),'#4e3a24',0,r3+1.1,0);
    g.add(new THREE.Mesh(mergeColored(parts),houseMat));
    g.add(new THREE.Mesh(mergeColored(glassP),new THREE.MeshStandardMaterial({vertexColors:true,roughness:.25,metalness:.1,emissive:'#6e5232',emissiveIntensity:.12})));
    const pl=plaqueMesh('NHÀ VĂN HÓA · LÀNG YÊN',4.6,.36,['#1f160f','#a6824b','#edd6a2']);pl.position.set(0,top+.21,D/2+.16);g.add(pl);
    g.position.set(h.x,terrainHeight(h.x,h.z),h.z);g.rotation.y=h.rot;g.userData.house=h;scene.add(g);h.group=g;window.__vhGroup=g;addFadeable(g,h.x,h.z,6.5);
    window.__vhHit=(x,z)=>rectHit(h.x,h.z,h.rot,W+.8,D+.8,x,z,.25)}
  window.__homeHit=(x,z)=>rectHit(TU_GIA.x,TU_GIA.z,TU_GIA.rot,TU_GIA.W,TU_GIA.D,x,z,.3)||rectHit(VIV.x,VIV.z,VIV.rot,VIV.W,VIV.D,x,z,.1)||Math.hypot(x-TU_GIA.garden[0],z-TU_GIA.garden[1])<1.9;
  function goHome(instant,walkOnly){if(bayMode||boatRide)return;if(walkOnly&&Math.hypot(mePosition.x-TU_GIA.door[0],mePosition.z-TU_GIA.door[1])<1.6){walkYaw=TU_GIA.rot+Math.PI;arriveDoor(TU_GIA);return}if(instant){if(teleportTo(...TU_GIA.door,TU_GIA.rot+Math.PI))arriveDoor(TU_GIA);return}standUpForTravel();goToHouse(TU_GIA)}
  // Bên trong Tư Gia: bàn trà thấp 6 chỗ ngồi, Kệ Lưu Hương 9 ô trên tường, cửa sổ nhìn ra hồ sen; 3 phong cách đổi ngay
  const HOME_STYLES={gian_di:{label:'Giản Dị',wall:'#d8cbb0',floor:'#8a6a48',acc:'#6b4a32'},sang_chanh:{label:'Sang Chảnh',wall:'#2f3a3a',floor:'#5a3a2a',acc:'#c8a96a'},hanh_phuc:{label:'Hạnh Phúc',wall:'#f1d6c8',floor:'#b98a5e',acc:'#e58aa6'}};
  ROOM_BUILDERS.tu_gia_me=['#d8cbb0','#8a6a48',st=>roomTuGia(st),{bare:true}];
  const TU_DAO_SPACE={id:'tu_dao_me',name:'Đảo Yên của bạn',icon:'🏝',note:''};let roomFromIsland=false;
  ROOM_BUILDERS.tu_dao_me=['#d8cbb0','#8a6a48',st=>{roomTuGia(st,'tu_dao_me');rmHint('🏝 Đảo Yên · '+(window.__tuDaoSpot||'Bãi đảo')+' · tạm dùng không gian Tư Gia · Trở về để xuống tàu ở cầu tàu')},{bare:true}];
  const TU_DAO_HOUSE={id:'dao_yen_nha',name:'Đảo Yên · Nhà chính',icon:'🏡',note:''};ROOM_BUILDERS.dao_yen_nha=['#efe6d6','#a8754a',st=>roomDaoYen(st),{bare:true,venue:'tu_dao_me'}];/* 27/11: nhà chính là nơi gặp nhau của buổi hẹn Đảo Yên (kênh tu_dao_me__h<buổi>) */
  const TU_DAO_THIEN={id:'dao_yen_thien',name:'Đảo Yên · Nhà Thiền',icon:'🧘',note:''};ROOM_BUILDERS.dao_yen_thien=['#efe3c8','#9a6a42',st=>roomDaoThien(st),{bare:true}];
  function openTuDaoSpace(kind){TU_DAO_SPACE.name='Đảo Yên · '+(window.__tuDaoSpot||'Bãi đảo');roomFromIsland=true;window.__tdExitDoor=(kind==='house'||kind==='med')?kind:false;Promise.resolve(openRoom(kind==='house'?TU_DAO_HOUSE:kind==='med'?TU_DAO_THIEN:TU_DAO_SPACE)).then(()=>{const bk=roomBox.querySelector('[data-rm="back"]');if(bk&&roomOpen)bk.textContent=(kind==='house'||kind==='med')?'🚪 Ra cửa':'← Xuống tàu · Vịnh Yên'})}
  // A folded robe on a wooden tray (used on the head, on the dais and on the shelves).
  const katHex=i=>(KAT_COLORS[+i]||KAT_COLORS[0])[1];
  function robeTray(color,scale=1,pieces=''){const g=new THREE.Group(),c=new THREE.Color(color),dark=c.clone().multiplyScalar(.78),multi=new Set(String(pieces||'')).size>1;
    const tray=new THREE.Mesh(new THREE.BoxGeometry(.56,.04,.42),mat('#6b4a32'));g.add(tray);
    for(let k=0;k<3;k++){const lc=multi?new THREE.Color(katHex(pieces[(k*5)%pieces.length])):k%2?dark:c;const f=new THREE.Mesh(new THREE.BoxGeometry(.46-k*.02,.05,.34-k*.015),new THREE.MeshStandardMaterial({color:lc,roughness:.9}));f.position.y=.045+k*.05;g.add(f)}
    if(multi)for(let i=0;i<6;i++){/* the patchwork shows on the folded top: three columns by two rows */const t=new THREE.Mesh(new THREE.BoxGeometry(.13,.012,.14),new THREE.MeshStandardMaterial({color:katHex(pieces[i%pieces.length]),roughness:.9}));t.position.set(-.145+(i%3)*.145,.152,-.075+Math.floor(i/3)*.15);g.add(t)}
    const band=new THREE.Mesh(new THREE.BoxGeometry(.04,.16,.35),new THREE.MeshStandardMaterial({color:dark,roughness:.9}));band.position.set(.12,.1,0);g.add(band);g.scale.setScalar(scale);return g}
  // An open robe as it was sewn: dieu strips of two long pieces and one short, each piece in the colour it was sewn with.
  function robeCloth(r,W,H){const g=new THREE.Group(),cols=[5,7,9].includes(Number(r.dieu))?Number(r.dieu):5,ps=String(r.pieces||''),gap=W*.017,cw=(W-gap*(cols+1))/cols;
    const back=new THREE.Mesh(new THREE.PlaneGeometry(W+.04,H+.04),new THREE.MeshStandardMaterial({color:'#4a2e1e',roughness:.95,side:THREE.DoubleSide}));back.position.z=-.004;g.add(back);
    for(let i=0;i<cols;i++){const longH=(H-gap*4)*.4,shortH=(H-gap*4)*.2,seq=i%2?[shortH,longH,longH]:[longH,longH,shortH];let y=H/2-gap;
      seq.forEach((h,k)=>{const ci=ps[i*3+k],m=new THREE.Mesh(new THREE.PlaneGeometry(cw,h),new THREE.MeshStandardMaterial({color:ci!=null?katHex(ci):r.color,roughness:.9,side:THREE.DoubleSide}));m.position.set(-W/2+gap+cw/2+i*(cw+gap),y-h/2,0);g.add(m);y-=h+gap})}
    for(const x of [-W*.35,W*.35]){const tie=new THREE.Mesh(new THREE.BoxGeometry(.03,.1,.01),mat('#3a2a1e'));tie.position.set(x,H/2+.05,0);g.add(tie)}
    return g}
  // ---- state
  // Thuốc nhuộm y truyền thống cho từng màu (y cà-sa nhuộm từ cây cỏ, đất son).
  const KAT_DYES=['củ nghệ','lõi mít','củ nâu','đất son'];
  const KAT_DIEU_INFO={5:'An-đà-hội (y 5 điều): y mặc bên trong, dùng khi làm việc, đi đường.',7:'Uất-đa-la-tăng (y 7 điều): thượng y, đắp khi lễ Phật, tụng kinh, nghe pháp.',9:'Tăng-già-lê (y 9 điều trở lên): đại y, đắp trong những dịp trang trọng như vào làng khất thực, thuyết pháp.'};
  const KAT_SEW_WORDS=['Một mũi chỉ, một nhịp thở an','Thở vào, tâm lắng · Thở ra, mỉm cười','Mỗi mảnh vải là một thửa ruộng phước','Đường may thẳng, lòng cũng thẳng','Biết ơn người trồng bông, dệt vải','Từng mũi kim, trở về hiện tại','Nguyện tấm y che chở người tu','Vải mộc, lòng thành','Gieo một hạt lành, gặt một mùa an'];
  const KAT_WISHES=['Hồi hướng bình an cho cha mẹ','Nguyện cho muôn loài an vui','Hồi hướng cho người đã khuất','Nguyện gia đình an lạc'];
  const KAT_ROUND_WORDS=['Niệm Phật','Niệm Pháp','Niệm Tăng'];
  const KAT_GAP=1.7/KAT_R,KAT_ROUND_SEC=KAT_ROUNDS*Math.PI*2*KAT_R/1.25;
  const kat={phase:'idle',color:KAT_COLORS[0][1],pieces:'',dieu:5,wish:'',robe:null,theta:0,t0:0,r0:0,from:null,chantLeft:0,chantTimer:0,leader:'',kj:0,mine:null};
  let pendingKathina=null,katPeers={};
  const katPill=document.createElement('button');katPill.type='button';katPill.id='katPill';katPill.hidden=true;document.body.appendChild(katPill);
  const katJoin=document.createElement('button');katJoin.type='button';katJoin.id='katJoin';katJoin.hidden=true;document.body.appendChild(katJoin);
  const katPanel=document.createElement('section');katPanel.id='katPanel';katPanel.hidden=true;document.body.appendChild(katPanel);
  const say=t=>{document.getElementById('zenHint').textContent=t};
  const katRound=()=>Math.min(KAT_ROUNDS,1+Math.floor(-kat.theta/(Math.PI*2)));
  const katBreath=()=>(Date.now()/1000)%10<4?'Hít vào…':'Thở ra…';
  function refreshKatPill(){const p=kat.phase;katPill.hidden=!['carry','round','offer','fetch','return','follow','join'].includes(p);
    katPill.textContent=p==='carry'?'🟧 Rước y · nhiễu Phật 3 vòng':p==='round'?'🟧 Vòng '+katRound()+'/'+KAT_ROUNDS+' · '+KAT_ROUND_WORDS[katRound()-1]+' · '+katBreath():p==='offer'?'🙏 Đang dâng y…':p==='fetch'?'🟧 Thỉnh y về kho':p==='return'?'🟧 Đang đội y về kho…':p==='join'?'🟧 Đang đến đoàn rước y…':'🟧 Cùng nhiễu Phật · '+katBreath();
    katPill.disabled=!(p==='carry'||p==='fetch')}
  function setCarry(on){if(kat.robe){kat.robe.parent&&kat.robe.parent.remove(kat.robe);kat.robe=null}if(on){kat.robe=robeTray(kat.color,.9,kat.pieces);kat.robe.position.set(0,2.12,0);me.add(kat.robe)}}
  // ---- 1. intro (Nghi thức → Dâng y)
  function openKathinaIntro(){if(bayMode||!document.body.classList.contains('immersive'))return;if(kat.phase!=='idle'&&kat.phase!=='done'){say('🟧 Bạn đang trong nghi thức dâng y');return}
    katPanel.innerHTML='<div class="fl-head"><strong>🟧 Nghi thức dâng y</strong><button type="button" data-kt="close">✕ Đóng</button></div>'
      +'<p class="fl-note">Lễ dâng y Kathina có từ thời Đức Phật, được cử hành sau ba tháng an cư mùa mưa. Tấm y được may từ nhiều mảnh ghép như những thửa ruộng xứ Magadha. Trong Rừng Yên, đây là nghi thức tưởng niệm và gieo duyên; xin bạn giữ tâm thành kính. Nếu có duyên, mời bạn tham dự lễ dâng y đến chư Tăng tại chùa.</p>'
      +'<ol class="og-steps"><li>Nhuộm vải, may y trên khung Kathina trong Tịnh thất; có thể gửi một lời hồi hướng</li><li>Đội y lên đầu, nhiễu Phật ba vòng (khách khác có thể đi cùng)</li><li>Đặt y dưới chân tượng, lạy ba lạy</li><li>Ngồi niệm năm phút</li><li>Đội y về kho trong Tịnh thất</li></ol>'
      +'<div class="fl-row"><button type="button" data-kt="walk">🚶 Đi bộ đến Tịnh thất</button><button type="button" class="fl-gold" data-kt="tp">✨ Đến ngay</button></div>';
    katPanel.hidden=false;document.body.classList.add('flower-open')}
  function closeKatPanel(){katPanel.hidden=true;if(document.getElementById('flowerSheet').hidden&&document.getElementById('bouquetBox').hidden&&document.getElementById('offerGuide').hidden)document.body.classList.remove('flower-open')}
  katPanel.addEventListener('click',e=>{const a=e.target.closest('[data-kt]')?.dataset.kt;if(!a)return;
    if(a==='close'){closeKatPanel();return}
    if(a==='walk'){closeKatPanel();standUpForTravel();goToHouse(TINH_THAT);return}
    if(a==='tp'){closeKatPanel();if(teleportTo(...TINH_THAT.door,TINH_THAT.rot+Math.PI))setTimeout(()=>openRoom(TINH_THAT),300);return}
    if(a==='end'){endChant(true);return}
    if(a==='fetch'){closeKatPanel();katPill.click()}
    });
  // a soft sound of thread pulled through cloth
  function katSwish(){const ac=audio();if(!ac)return;const n=Math.floor(ac.sampleRate*.28),buf=ac.createBuffer(1,n,ac.sampleRate),d=buf.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.sin(i/n*Math.PI);
    const src=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();src.buffer=buf;f.type='bandpass';f.frequency.setValueAtTime(1800,ac.currentTime);f.frequency.linearRampToValueAtTime(3400,ac.currentTime+.28);f.Q.value=2.5;g.gain.value=.05;src.connect(f).connect(g).connect(ac.destination);src.start()}
  // ---- 2. sewing room (opened like the other houses)
  ROOM_BUILDERS.tinh_that=['#e6d6b6','#8a6040',st=>roomTinhThat(st)];
  // ---- 3. procession: walk to the front of the terrace, then three rounds clockwise (statue on the right)
  katPill.addEventListener('click',()=>{
    if(kat.phase==='fetch'){fetchRobe();return}
    if(kat.phase!=='carry')return;const start=[STATUE.x,STATUE.z+KAT_R];if(Math.hypot(mePosition.x-start[0],mePosition.z-start[1])<1){startRounds();return}if(navigateTo(...start)){pendingKathina='round';say('🟧 Đang đội y lên sân thiền…')}});
  function startRounds(){kat.phase='round';kat.theta=0;kat.r0=Date.now();kat.lastRound=1;walkRoute.length=0;strike(98,8,.16,[[1,1],[1.48,.5],[2.3,.3]]);setTimeout(()=>strike(98,8,.14,[[1,1],[1.48,.5]]),2200);setTimeout(()=>strike(98,9,.14,[[1,1],[1.48,.5]]),4400);say('🟧 Vòng 1 · Niệm Phật · Đi chậm rãi, thở theo bước chân');refreshKatPill()}
  // the offering, step by step: walk to the dais, lower the tray from the head to the chest, set it at the Buddha's feet, three bows with a bell each
  const OFFER_T={walk:2.5,chest:1.4,set:1.6,bow:2.2};
  const offerTimes=()=>{const a=OFFER_T.walk,b=a+OFFER_T.chest,c=b+OFFER_T.set,d=c+3*OFFER_T.bow;return {a,b,c,d}};
  const v3=new THREE.Vector3(),v3b=new THREE.Vector3();
  function updateKathina(dt){updatePetals(dt);
    if(kat.phase==='round'){walkRoute.length=0;kat.theta=-(Date.now()-kat.r0)/1000*1.25/KAT_R;const th=kat.theta;
      if(th<=-Math.PI*2*KAT_ROUNDS){kat.phase='offer';kat.t0=performance.now();kat.from=[mePosition.x,mePosition.z];kat.bows=0;kat.offerStep=0;say('🙏 Dâng y lên Đức Phật');refreshKatPill();return}
      const rd=katRound();if(rd!==kat.lastRound){kat.lastRound=rd;strike(523,5,.06,[[1,1],[2.76,.3]]);say('🟧 Vòng '+rd+' · '+KAT_ROUND_WORDS[rd-1])}
      mePosition.set(STATUE.x+Math.sin(th)*KAT_R,0,STATUE.z+Math.cos(th)*KAT_R);const hx=-Math.cos(th),hz=Math.sin(th);walkYaw=Math.atan2(hx,hz);
      if(Math.floor(Date.now()/1000)!==kat.tick){kat.tick=Math.floor(Date.now()/1000);refreshKatPill()}}
    else if(kat.phase==='offer'){walkRoute.length=0;const u=(performance.now()-kat.t0)/1000,T=offerTimes(),[fx,fz]=kat.from,[tx,tz]=OFFER_STAND,e=Math.min(1,u/T.a),s=e*e*(3-2*e);mePosition.set(fx+(tx-fx)*s,0,fz+(tz-fz)*s);walkYaw=Math.PI;
      const robe=kat.robe;if(robe&&u>T.a&&u<=T.b){const k=(u-T.a)/OFFER_T.chest,q=k*k*(3-2*k);robe.position.set(0,2.12-.82*q,-.42*q)}/* from the head down to the chest, held out in front */
      if(robe&&u>T.b&&kat.offerStep===0){kat.offerStep=1;robe.getWorldPosition(v3);me.remove(robe);scene.add(robe);robe.position.copy(v3);robe.rotation.set(0,0,0);kat.robeFrom=v3.clone();v3b.set(STATUE.x,TERRACE_TOP+.56,STATUE.z+1.62);shrine.localToWorld(v3b);kat.robeTo=v3b.clone()}
      if(robe&&kat.offerStep===1){const k=Math.min(1,(u-T.b)/OFFER_T.set),q=k*k*(3-2*k);robe.position.lerpVectors(kat.robeFrom,kat.robeTo,q);robe.position.y+=Math.sin(q*Math.PI)*.15;robe.scale.setScalar(.9+.15*q)}
      if(u>T.c){const b=Math.floor((u-T.c)/OFFER_T.bow);if(b<3&&b>=kat.bows){kat.bows=b+1;strike(196,5,.1)}}
      if(u>T.d&&!kat.placed){kat.placed=true;placeRobe()}}
    else if(kat.phase==='follow')updateFollow(dt);
    else if(kat.phase==='idle'||kat.phase==='done'){/* nothing */}
    if((kat.phase==='round'||kat.phase==='follow')&&Math.floor(Date.now()/1000)!==kat.tick2){kat.tick2=Math.floor(Date.now()/1000);refreshKatPill()}}
  function kathinaPose(){if(kat.phase==='round'||kat.phase==='carry'||kat.phase==='follow'||kat.phase==='return'){me.rotation.y=walkYaw-Math.PI;}
    if(kat.phase==='offer'){const T=offerTimes(),u=(performance.now()-kat.t0)/1000-T.c;me.rotation.y=0;me.rotation.x=u>0&&u<3*OFFER_T.bow?-Math.sin((u%OFFER_T.bow)/OFFER_T.bow*Math.PI)*.55:0}else me.rotation.x=0}
  // ---- 4. offer: the robe rests at the Buddha's feet, saved for everyone; then step back to a cushion
  async function placeRobe(){if(kat.robe){scene.remove(kat.robe);kat.robe=null}const now=new Date();const row={id:'local-'+Date.now(),color:kat.color,pieces:kat.pieces,dieu:kat.dieu,wish:kat.wish,name:guestName(),created_at:now.toISOString(),pendingKho:true};kat.mine={name:row.name,t:now.getTime()};kat.pendingRow=row;katRows.unshift(row);drawDais();/* chỉ lưu khi y đã vào kho (saveRobeToKho) */
    say('🙏 Đã dâng y dưới chân tượng Phật · Mời bạn ngồi niệm năm phút');
    kat.phase='chant';kat.placed=false;refreshKatPill();try{requestSeat(chooseSeat())}catch(e){}startChant();
  }
  // Y vào kho mới lưu (Túi An Yên + kho chung). Chưa vào kho mà tắt trang / mất kết nối thì tấm y bị bỏ.
  async function saveRobeToKho(){const row=kat.pendingRow;if(!row)return;kat.pendingRow=null;row.pendingKho=false;katRows=katRows.filter(r=>r!==row);katKho.push({name:row.name,t:Date.now()});drawDais();
    window.__bagTake&&window.__bagTake('robes',row,true);
    if(katDb){try{const base={color:row.color,dieu:row.dieu,name:row.name},tries=[{...base,pieces:row.pieces,wish:row.wish},{...base,pieces:row.pieces},base];for(const t of tries){const {error}=await katDb.from('anyen_kathina_robes').insert(t);if(!error){loadRobes();break}}}catch(e){}}}
  const guestName=()=>{try{return String(JSON.parse(localStorage.getItem('yenGuestProfile17')||'{}').name||'Khách Yên').slice(0,24)}catch(e){return 'Khách Yên'}};
  // ---- 5. five minutes of recitation and silence
  const RECITE={pali:['Namo tassa Bhagavato Arahato Sammāsambuddhassa','Namo tassa Bhagavato Arahato Sammāsambuddhassa','Namo tassa Bhagavato Arahato Sammāsambuddhassa','Kính lễ Đức Thế Tôn, bậc A-la-hán, đấng Chánh Biến Tri.']};
  function renderChant(){const m=Math.floor(kat.chantLeft/60),s=String(kat.chantLeft%60).padStart(2,'0'),lines=RECITE.pali;
    katPanel.innerHTML='<div class="fl-head"><strong>🙏 Niệm sau khi dâng y · '+m+':'+s+'</strong></div><div class="kt-recite">'+lines.map(l=>'<div>'+l+'</div>').join('')+'</div>'
      +'<p class="fl-note">Đọc thầm ba lần, rồi ngồi yên lặng theo dõi hơi thở. Mỗi phút có một tiếng chuông.</p><div class="fl-row"><button type="button" data-kt="end" class="kt-quiet">Kết thúc sớm</button></div>'}
  function startChant(){kat.chantLeft=KAT_CHANT_SEC;window.dispatchEvent(new CustomEvent('langyen-audio-stop',{detail:{except:null}}));katPanel.hidden=false;document.body.classList.add('kat-chant');renderChant();strike(196,7,.12);
    clearInterval(kat.chantTimer);kat.chantTimer=setInterval(()=>{kat.chantLeft--;if(kat.chantLeft>0&&kat.chantLeft%60===0)strike(196,7,.1);if(kat.chantLeft<=0){endChant(false);return}renderChant()},1000)}
  function endChant(early){clearInterval(kat.chantTimer);kat.phase='fetch';document.body.classList.remove('kat-chant');strike(98,9,.14,[[1,1],[1.48,.5]]);
    katPanel.innerHTML='<div class="fl-head"><strong>🟧 Hồi hướng</strong><button type="button" data-kt="close">✕ Đóng</button></div><p class="kt-recite"><span>Nguyện công đức dâng y này lan tỏa đến muôn loài, cho mọi người được bình an, cho Phật pháp được trường tồn.</span></p>'+(kat.wish?'<p class="kt-recite"><span>'+String(kat.wish).replace(/[&<>"']/g,'')+'</span></p>':'')+'<p class="fl-note">'+(early?'Bạn đã kết thúc niệm sớm. ':'')+'Mời bạn thỉnh y, đội y về kho trong Tịnh thất.</p><div class="fl-row"><button type="button" class="fl-gold" data-kt="fetch">🟧 Thỉnh y về kho</button></div>';
    katPanel.hidden=false;say('🙏 Hồi hướng · Mời thỉnh y về kho');refreshKatPill()}
  // ---- 6. the leader carries the robe back to the robe store in the Tịnh thất
  const katMine=r=>kat.mine&&r.name===kat.mine.name&&Math.abs(new Date(r.created_at).getTime()-kat.mine.t)<20000;
  const katKho=[];const katInKho=r=>katKho.some(q=>q.name===r.name&&Math.abs(new Date(r.created_at).getTime()-q.t)<20000);
  function fetchRobe(){if(kat.phase!=='fetch')return;standUpForTravel();kat.phase='return';if(kat.mine)katKho.push({...kat.mine});drawDais();setCarry(true);refreshKatPill();strike(196,4,.08);
    if(navigateTo(...TINH_THAT.door)){pendingKathina='kho';say('🟧 Đội y về kho trong Tịnh thất…')}else arriveKho()}
  function arriveKho(){if(kat.phase!=='return')return;setCarry(false);saveRobeToKho();kat.phase='done';refreshKatPill();strike(98,9,.12,[[1,1],[1.48,.5]]);say('🟧 Tấm y đã vào kho y · Nghi thức dâng y viên mãn');closeKatPanel();walkYaw=TINH_THAT.rot+Math.PI;setTimeout(()=>openRoom(TINH_THAT),500)}
  // ---- 7. walking together: guests who see a procession can join it; each follower keeps a place behind the leader
  const myUid=()=>window.anyenUid||'me';
  function katLeaders(){return Object.entries(katPeers).filter(([id,p])=>p&&p.kr>0&&Date.now()-p.kr<KAT_ROUND_SEC*1000+30000)}
  function refreshJoin(){const free=(kat.phase==='idle'||kat.phase==='done')&&!bayMode&&document.body.classList.contains('immersive');const L=free?katLeaders()[0]:null;katJoin.hidden=!L;if(L){katJoin.textContent='🟧 '+String(L[1].name||'Khách Yên').slice(0,24)+' đang rước y nhiễu Phật · Chạm để cùng đi';katJoin.dataset.leader=L[0]}}
  katJoin.addEventListener('click',()=>{const id=katJoin.dataset.leader;if(!id||!katPeers[id])return;standUpForTravel();kat.leader=id;kat.kj=Date.now();kat.phase='join';katJoin.hidden=true;refreshKatPill();
    const p=[STATUE.x,STATUE.z+KAT_R+1.2];if(Math.hypot(mePosition.x-p[0],mePosition.z-p[1])<1.5){kat.phase='follow';say('🟧 Cùng nhiễu Phật · đi sau người đội y');return}if(navigateTo(...p)){pendingKathina='follow';say('🟧 Đang đến đoàn rước y…')}else{kat.phase='idle';refreshKatPill()}});
  function startFollow(){if(kat.phase!=='join')return;kat.phase='follow';refreshKatPill();say('🟧 Cùng nhiễu Phật · đi sau người đội y, giữ khoảng cách')}
  function followRank(){const me0={id:myUid(),kj:kat.kj};const list=[me0,...Object.entries(katPeers).filter(([id,p])=>p&&p.kf===kat.leader&&id!==me0.id).map(([id,p])=>({id,kj:p.kj||0}))];list.sort((a,b)=>a.kj-b.kj||(a.id<b.id?-1:1));return list.findIndex(x=>x.id===me0.id)}
  function updateFollow(dt){const L=katPeers[kat.leader];walkRoute.length=0;
    if(!L||!(L.kr>0)){endFollow();return}
    const thL=Math.atan2(L.x-STATUE.x,L.z-STATUE.z),target=thL+(followRank()+1)*KAT_GAP;/* behind the leader: the procession turns with decreasing angle */
    const dx=mePosition.x-STATUE.x,dz=mePosition.z-STATUE.z;let a=Math.atan2(dx,dz),r=Math.hypot(dx,dz);const da=Math.atan2(Math.sin(target-a),Math.cos(target-a)),maxA=2.3*dt/KAT_R;a+=Math.max(-maxA,Math.min(maxA,da));r+=Math.max(-1.5*dt,Math.min(1.5*dt,KAT_R-r));
    mePosition.set(STATUE.x+Math.sin(a)*r,0,STATUE.z+Math.cos(a)*r);walkYaw=Math.atan2(-Math.cos(a),Math.sin(a))}
  function endFollow(){const k=Math.max(0,followRank());kat.phase='idle';kat.leader='';kat.kj=0;refreshKatPill();say('🙏 Người dẫn đầu đang dâng y · Mời bạn lần lượt ngồi tọa thiền');
    setTimeout(()=>{try{requestSeat(chooseSeat())}catch(e){}},600+k*1600)}
  window.addEventListener('anyen-peers',e=>{katPeers=e.detail||{};refreshJoin()});setInterval(refreshJoin,3000);
  // ---- 8. while a procession goes round, a few petals drift down over the terrace
  const PETALS=40,petalMesh=new THREE.InstancedMesh(new THREE.PlaneGeometry(.07,.05),new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false}),PETALS);
  {const cols=['#f2c94c','#f6b6c8','#f4e2b9','#e9a23b'];for(let i=0;i<PETALS;i++)petalMesh.setColorAt(i,new THREE.Color(cols[i%cols.length]));petalMesh.instanceColor.needsUpdate=true}
  petalMesh.visible=false;petalMesh.frustumCulled=false;scene.add(petalMesh);const petalState=Array.from({length:PETALS},(_,i)=>({a:Math.random()*Math.PI*2,r:2+Math.random()*7,h:Math.random()*6,s:.25+Math.random()*.3,sp:Math.random()*6}));const ptM=new THREE.Matrix4(),ptQ=new THREE.Quaternion(),ptE=new THREE.Euler(),ptV=new THREE.Vector3(),ptS=new THREE.Vector3(1,1,1);
  function updatePetals(dt){const on=kat.phase==='round'||katLeaders().length>0;petalMesh.visible=on;if(!on)return;const t=performance.now()/1000,base=HILL.top+TERRACE_TOP;
    petalState.forEach((p,i)=>{p.h-=p.s*dt;if(p.h<0){p.h=5+Math.random()*2;p.a=Math.random()*Math.PI*2;p.r=2+Math.random()*7}const a=p.a+Math.sin(t*.4+p.sp)*.15;ptV.set(STATUE.x+Math.sin(a)*p.r+Math.sin(t+p.sp)*.3,base+p.h,STATUE.z+Math.cos(a)*p.r);ptE.set(t*1.3+p.sp,t*.9+p.sp,0);ptQ.setFromEuler(ptE);ptM.compose(ptV,ptQ,ptS);petalMesh.setMatrixAt(i,ptM)});petalMesh.instanceMatrix.needsUpdate=true}
  // ---- shared robes (Supabase): five minutes on the dais, then on the shelves of the robe store
  const katDb=(typeof flowerDb!=='undefined')?flowerDb:null;let katRows=[];
  const katAge=r=>(Date.now()-new Date(r.created_at).getTime())/1000;
  const daisRobes=new Map();
  function drawDais(){const on=katRows.filter(r=>katAge(r)<KAT_CHANT_SEC&&!katInKho(r)).slice(0,3),keep=new Set(on.map(r=>String(r.id)));
    for(const [k,m] of daisRobes)if(!keep.has(k)){shrine.remove(m);daisRobes.delete(k)}
    on.forEach((r,i)=>{const k=String(r.id);let m=daisRobes.get(k);if(!m){m=robeTray(r.color,1.05,r.pieces);shrine.add(m);daisRobes.set(k,m)}const x=[0,-.6,.6][i];m.position.set(STATUE.x+x,TERRACE_TOP+.56,STATUE.z+1.62)})}
  async function loadRobes(){if(!katDb)return;try{const q=cols=>katDb.from('anyen_kathina_robes').select(cols).order('seq',{ascending:false}).limit(STORE_FETCH);let {data,error}=await q('id,seq,color,pieces,dieu,name,picks,created_at');if(error)({data,error}=await q('id,seq,color,pieces,dieu,name,created_at'));if(error)({data,error}=await q('id,seq,color,dieu,name,created_at'));if(!error&&data){data=pickNine(data);const local=katRows.filter(r=>String(r.id).startsWith('local-')&&(r.pendingKho||katAge(r)<20));katRows=[...local.filter(l=>!data.some(d=>d.name===l.name&&Math.abs(new Date(d.created_at)-new Date(l.created_at))<20000)),...data];drawDais();if(room&&room.onKho)room.onKho()}}catch(e){}}
  setInterval(()=>{if(document.body.classList.contains('immersive')&&!bayMode&&!document.hidden)loadRobes();else drawDais()},12000);loadRobes();
  window.addEventListener('anyen-kathina',openKathinaIntro);window.addEventListener('anyen-3d-exit',()=>{closeKatPanel();katJoin.hidden=true;if(kat.phase==='chant'){clearInterval(kat.chantTimer);document.body.classList.remove('kat-chant')}if(['chant','fetch','return','follow','join'].includes(kat.phase)){setCarry(false);kat.phase='done';kat.leader='';refreshKatPill()}});
  window.__ttHit=(x,z)=>rectHit(TINH_THAT.x,TINH_THAT.z,TINH_THAT.rot,TINH_THAT.W,TINH_THAT.D,x,z,.3);
  addFadeable(TINH_THAT.group,TINH_THAT.x,TINH_THAT.z,4);
  // 3.21: Nhà gốm, theo gốm Chăm Bàu Trúc: không bàn xoay, không khuôn, không men, nung lộ thiên.
  // Trong nhà: nhào đất, rắc cát lên đôn gỗ, đi lùi quanh đôn sáu vòng để vuốt thân gốm, chuốt láng, khắc hoa văn, phơi nắng.
  // Đội gốm ra bãi nung bên hông nhà (phía rộng hơn): củi, rơm, trấu, lửa một phút (thực tế 4–6 giờ), phun nước tạo màu.
  // Gốm lưu trên Supabase (anyen_pottery, giữ 36 chiếc gần nhất cho kệ 6 × 6): trong phút nung mọi khách thấy lửa khói, sau đó gốm lên kệ cạnh bãi nung.
  const GOM_SHAPES=[{name:'Lu nước',pts:[[0,0],[.16,0],[.23,.07],[.28,.19],[.26,.31],[.17,.4],[.13,.43],[.15,.46]]},
    {name:'Hũ',pts:[[0,0],[.12,0],[.17,.05],[.19,.15],[.17,.24],[.12,.27],[.115,.3],[.13,.31]]},
    {name:'Bình cổ cao',pts:[[0,0],[.1,0],[.15,.06],[.17,.15],[.13,.25],[.065,.33],[.05,.43],[.075,.49]]},
    {name:'Đèn gốm',pts:[[0,0],[.15,0],[.17,.04],[.17,.15],[.145,.27],[.09,.36],[.035,.41],[.012,.43],[0,.435]]}];
  const GOM_TOOLS=[['Que tre','vạch chéo'],['Răng lược','sóng nước'],['Vỏ sò','vảy sò']];
  const GOM_FIRE_SEC=60,GOM_ROUNDS=6,GOM_DRY_SEC=10;
  const GOM_FIRED=[['đỏ hồng','#b8644c'],['vàng đỏ','#c4844c'],['đỏ cam','#bf6f45'],['nâu hồng','#a8644e']];
  function gomProfile(shape,frac){const pts=GOM_SHAPES[shape].pts,H=pts[pts.length-1][1];if(frac>=.999)return pts;const cut=Math.max(.02,H*frac),out=[];
    for(let i=0;i<pts.length;i++){const p=pts[i];if(p[1]<=cut){out.push(p);continue}const q=pts[i-1],u=(cut-q[1])/(p[1]-q[1]||1);out.push([q[0]+(p[0]-q[0])*u,cut]);break}
    if(out.length<2)out.push([pts[1][0],cut]);return out}
  const gomGeo=(shape,frac,seg=28)=>GL(gomProfile(shape,frac),seg);
  // Texture: u runs round the pot, v from foot (bottom of canvas) to lip (top). Stage: wet, dry or fired (hỏa biến from the seed).
  function gomCanvas(shape,pattern,seed,stage){const cv=document.createElement('canvas');cv.width=256;cv.height=128;const c=cv.getContext('2d');
    const rng=seededRandom(seed*7+3),fired=stage==='fired',base=fired?GOM_FIRED[seed%GOM_FIRED.length][1]:stage==='dry'?'#b39479':'#7f604c';c.fillStyle=base;c.fillRect(0,0,256,128);
    if(fired){for(let k=0,n=4+Math.floor(rng()*4);k<n;k++){const x=rng()*256,y=rng()*128,r=18+rng()*50,g=c.createRadialGradient(x,y,0,x,y,r),a=.35+rng()*.45;g.addColorStop(0,'rgba(38,32,29,'+a+')');g.addColorStop(1,'rgba(38,32,29,0)');c.fillStyle=g;c.fillRect(0,0,256,128)}
      for(let k=0;k<3;k++){const x=rng()*256,y=rng()*128,r=20+rng()*30,g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,'rgba(226,160,128,.35)');g.addColorStop(1,'rgba(226,160,128,0)');c.fillStyle=g;c.fillRect(0,0,256,128)}}
    else{for(let k=0;k<60;k++){c.fillStyle='rgba(255,240,220,'+(rng()*.05)+')';c.fillRect(rng()*256,rng()*128,2+rng()*6,1)}}
    if(pattern>=0){const ink=fired?'rgba(42,26,18,.6)':'rgba(48,32,22,.55)',hi='rgba(255,232,205,.22)';c.lineWidth=1.6;
      const stroke=fn=>{c.strokeStyle=hi;c.save();c.translate(0,1.2);fn();c.restore();c.strokeStyle=ink;fn()};
      if(pattern===0)stroke(()=>{c.beginPath();for(let x=0;x<256;x+=9){c.moveTo(x,42);c.lineTo(x+6,52);c.moveTo(x+6,56);c.lineTo(x,66)}c.stroke()});
      else if(pattern===1)stroke(()=>{for(let i=0;i<4;i++){c.beginPath();for(let x=0;x<=256;x+=2){const y=44+i*6+Math.sin(x/256*Math.PI*2*6)*3.5;x?c.lineTo(x,y):c.moveTo(x,y)}c.stroke()}});
      else stroke(()=>{for(let r=0;r<3;r++)for(let x=(r%2)*8;x<264;x+=16){c.beginPath();c.arc(x,42+r*8,7,0,Math.PI);c.stroke()}});
      c.strokeStyle=ink;c.lineWidth=1.2;c.beginPath();c.moveTo(0,36);c.lineTo(256,36);c.moveTo(0,72);c.lineTo(256,72);c.stroke()}
    if(shape===3){c.fillStyle=fired?'#1c1410':'#3b2a20';for(let r=0;r<2;r++)for(let x=(r%2)*16;x<256;x+=32){c.beginPath();c.arc(x+8,86+r*12,3.4,0,7);c.fill()}}
    return cv}
  function gomGlow(){const cv=document.createElement('canvas');cv.width=256;cv.height=128;const c=cv.getContext('2d');c.fillStyle='#000';c.fillRect(0,0,256,128);c.fillStyle='#ffb35a';for(let r=0;r<2;r++)for(let x=(r%2)*16;x<256;x+=32){c.beginPath();c.arc(x+8,86+r*12,3.4,0,7);c.fill()}return cv}
  function gomMaterial(shape,pattern,seed,stage,polish){const tex=new THREE.CanvasTexture(gomCanvas(shape,pattern,seed,stage));tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=THREE.RepeatWrapping;
    const m=new THREE.MeshStandardMaterial({map:tex,roughness:polish?.55:.95,side:THREE.DoubleSide});
    if(shape===3&&stage==='fired'){const g=new THREE.CanvasTexture(gomGlow());g.colorSpace=THREE.SRGBColorSpace;m.emissiveMap=g;m.emissive=new THREE.Color('#ffffff');m.emissiveIntensity=1}return m}
  const gomDispose=(m,parent)=>{parent.remove(m);m.geometry.dispose();const mt=m.material;if(mt.map)mt.map.dispose();if(mt.emissiveMap)mt.emissiveMap.dispose();mt.dispose()};
  const gomMesh=(r,scale=1)=>{const m=new THREE.Mesh(gomGeo(r.shape,1,16),gomMaterial(r.shape,r.pattern,r.seed,'fired',true));m.scale.setScalar(scale);return m};
  const gom={phase:'idle',step:'nhao',kneads:0,shape:0,pattern:0,rounds:0,polish:0,seed:0,carry:null};
  // ---- the room: đôn gỗ in the middle, a guest bent over the clay, a shelf of the nine latest pots at the back
  // ---- the firing yard beside the workshop, on its wider side
  const GOM_HOUSE=SENSE_HOUSES.find(h=>h.id==='xuong_gom');
  const gomWorld=(lx,lz)=>[GOM_HOUSE.x+Math.cos(GOM_HOUSE.rot)*lx+Math.sin(GOM_HOUSE.rot)*lz,GOM_HOUSE.z-Math.sin(GOM_HOUSE.rot)*lx+Math.cos(GOM_HOUSE.rot)*lz];
  const GOM_YARD=gomWorld(-GOM_HOUSE.W/2-5.2,-.4),GOM_STAND=gomWorld(-GOM_HOUSE.W/2-5.2,3.1),GOM_RACK=gomWorld(-GOM_HOUSE.W/2-5.2,-3.5),GOM_RACK_STAND=gomWorld(-GOM_HOUSE.W/2-5.2-2.7,-2.4);
  const gomYard=new THREE.Group();gomYard.position.set(GOM_YARD[0],terrainHeight(...GOM_YARD),GOM_YARD[1]);gomYard.rotation.y=GOM_HOUSE.rot;scene.add(gomYard);
  const gomFire=new THREE.Group(),gomRack=new THREE.Group(),gomFlames=[],gomSmoke=[];
  {const parts=[],P=(geo,color,x,y,z,o={})=>{if(o.rz)geo.rotateZ(o.rz);if(o.ry)geo.rotateY(o.ry);if(o.s)geo.scale(...o.s);geo.translate(x,y,z);parts.push([geo,color])};
    P(GC(2.05,2.15,.04,22),'#3e3833',0,.02,0);for(let k=0;k<14;k++){const a=k/14*Math.PI*2;P(new THREE.DodecahedronGeometry(.2,0),k%2?'#6c695d':'#5f5c4d',Math.cos(a)*2.2,.08,Math.sin(a)*2.2,{s:[1,.6,1]})}
    for(let k=0;k<5;k++)P(GC(.07,.08,1.5,6),'#4a3424',-.6+k*.3,.1,0,{rz:Math.PI/2,ry:k*.15});P(GC(.06,.07,1.3,6),'#3a281c',0,.22,0,{rz:Math.PI/2,ry:Math.PI/2});
    for(let r=0;r<2;r++)for(let k=0;k<4-r;k++)P(GC(.12,.12,1.3,7),'#6b4a32',2.9,.12+r*.22,-1+k*.26+r*.13,{rz:Math.PI/2});
    for(let k=0;k<3;k++)P(GK(.45,.7,7),'#a8925a',-2.9,.35,-1+k*.95);/* straw and rice husk heaps */P(GC(.5,.55,.35,8),'#8a7a5a',-2.9,.17,1.9);
    // rack for the nine latest fired pots, behind the yard
    const rx=0,rz=-3.1;for(let k=0;k<6;k++)P(GB(3.5,.06,.45),'#4e3a2a',rx,.12+k*.5,rz);for(const x of [-1.76,1.76])for(const z of [-.2,.2])P(GB(.08,2.95,.08),'#3a2a1e',rx+x,1.47,rz+z);P(GB(3.6,.08,.08),'#3a2a1e',rx,2.95,rz-.2);
    gomYard.add(new THREE.Mesh(mergeColored(parts),houseMat))}
  gomYard.add(gomFire,gomRack);gomFire.visible=false;
  {const mound=new THREE.Mesh(new THREE.ConeGeometry(1.45,1.05,12),new THREE.MeshStandardMaterial({color:'#8f7a4c',roughness:1,flatShading:true}));mound.position.y=.52;gomFire.add(mound);
    const glow=new THREE.Mesh(new THREE.CircleGeometry(1.7,20),new THREE.MeshBasicMaterial({color:'#ff7a2a',transparent:true,opacity:.35,depthWrite:false}));glow.rotation.x=-Math.PI/2;glow.position.y=.05;gomFire.add(glow);
    for(let k=0;k<9;k++){const f=new THREE.Mesh(new THREE.ConeGeometry(.2+(k%3)*.06,.9+(k%4)*.22,6),new THREE.MeshBasicMaterial({color:k%2?'#ffb347':'#ff7a2a',transparent:true,opacity:.85,depthWrite:false}));const a=k/9*Math.PI*2,r=.5+(k%3)*.35;f.position.set(Math.cos(a)*r,.75-r*.2,Math.sin(a)*r);f.userData={y:f.position.y,ph:k*1.7};gomFlames.push(f);gomFire.add(f)}
    for(let k=0;k<10;k++){const s=new THREE.Mesh(new THREE.SphereGeometry(.4,8,6),new THREE.MeshBasicMaterial({color:'#8f8a82',transparent:true,opacity:.25,depthWrite:false}));s.userData={k};gomSmoke.push(s);gomFire.add(s)}}
  function drawRack(){while(gomRack.children.length)gomDispose(gomRack.children[0],gomRack);gomRows.filter(r=>gomAge(r)>=GOM_FIRE_SEC).slice(0,36).forEach((r,i)=>{if(gom.hold&&gom.hold===r.seed+'|'+r.name)return;const m=gomMesh(r,.8);m.position.set(-1.45+(i%6)*.58,.155+Math.floor(i/6)*.5,-3.1);gomRack.add(m)})}
  window.__gomHit=(x,z)=>Math.hypot(x-GOM_YARD[0],z-GOM_YARD[1])<2.4||Math.hypot(x-GOM_RACK[0],z-GOM_RACK[1])<2;
  addFadeable(gomYard,GOM_YARD[0],GOM_YARD[1],2.2);
  // ---- carrying, firing and the spray of colour
  const gomPill=document.createElement('button');gomPill.type='button';gomPill.id='gomPill';gomPill.hidden=true;document.body.appendChild(gomPill);
  const gomPanel=document.createElement('section');gomPanel.id='gomPanel';gomPanel.hidden=true;document.body.appendChild(gomPanel);
  function refreshGomPill(){gomPill.hidden=!(gom.phase==='carry'||gom.phase==='toRack');gomPill.textContent=gom.phase==='toRack'?'🏺 Đội gốm lên kệ':'🏺 Đội gốm ra bãi nung'}
  function setGomCarry(on){if(gom.carry){me.remove(gom.carry);gom.carry=null}if(on){gom.carry=new THREE.Mesh(gomGeo(gom.shape,1,16),gomMaterial(gom.shape,gom.pattern,gom.seed,on==='fired'?'fired':'dry',true));gom.carry.scale.setScalar(1.3);gom.carry.position.set(0,2.08,0);me.add(gom.carry)}}
  gomPill.addEventListener('click',()=>{if(gom.phase==='toRack'){if(Math.hypot(mePosition.x-GOM_RACK_STAND[0],mePosition.z-GOM_RACK_STAND[1])<1.2){placeOnRack();return}standUpForTravel();if(navigateTo(...GOM_RACK_STAND)){pendingKathina='rack';say('🏺 Đang đội gốm tới kệ…')}return}if(gom.phase!=='carry')return;if(Math.hypot(mePosition.x-GOM_STAND[0],mePosition.z-GOM_STAND[1])<1.2){startKiln();return}standUpForTravel();if(navigateTo(...GOM_STAND)){pendingKathina='kiln';say('🏺 Đang đội gốm ra bãi nung…')}});
  /* Trang lite: không ra bãi nung được, nung xong ngay trong nhà: gốm vào kho và Túi An Yên như bản full */
  window.__gomLiteFire=()=>{const row={id:'local-'+Date.now(),shape:gom.shape,pattern:gom.pattern,seed:gom.seed,name:guestName(),created_at:new Date(Date.now()-(GOM_FIRE_SEC+1)*1000).toISOString()};gomRows.unshift(row);gom.row=row;
    if(gomDb){gomDb.from('anyen_pottery').insert({shape:row.shape,pattern:row.pattern,seed:row.seed,name:row.name}).then(({error})=>{if(!error)loadPots()},()=>{})}
    window.__bagTake&&window.__bagTake('pots',row,true);Object.assign(gom,{phase:'room',step:'nhao',kneads:0,rounds:0,polish:0,pattern:0,hold:null,seed:Math.floor(Math.random()*9999)});drawRack();strike(330,2.2,.05,[[1,1],[2.1,.3]]);
    return {fired:GOM_FIRED[row.seed%GOM_FIRED.length][0],name:GOM_SHAPES[row.shape].name,img:gomSnapshot(row)}};
  function startKiln(){if(gom.phase!=='carry')return;gom.phase='fire';setGomCarry(false);refreshGomPill();walkRoute.length=0;
    walkYaw=Math.atan2(GOM_YARD[0]-mePosition.x,GOM_YARD[1]-mePosition.z);viewYaw=walkYaw;
    const row={id:'local-'+Date.now(),shape:gom.shape,pattern:gom.pattern,seed:gom.seed,name:guestName(),created_at:new Date().toISOString()};gomRows.unshift(row);gom.row=row;gom.f0=performance.now();
    if(gomDb){gomDb.from('anyen_pottery').insert({shape:row.shape,pattern:row.pattern,seed:row.seed,name:row.name}).then(({error})=>{if(!error)loadPots()},()=>{})}
    strike(150,3,.05,[[1,1],[1.5,.3]]);gomPanel.hidden=false;renderKiln();clearInterval(gom.timer);gom.timer=setInterval(renderKiln,1000);syncGomYard()}
  function renderKiln(){const left=Math.max(0,Math.ceil(GOM_FIRE_SEC-(performance.now()-gom.f0)/1000));
    if(gom.phase==='fire'&&left>0){gomPanel.innerHTML='<div class="fl-head"><strong>🔥 Nung lộ thiên · 0:'+String(left).padStart(2,'0')+'</strong></div><p class="fl-note">Gốm mộc được xếp trên lớp củi, phủ rơm và trấu cho kín rồi châm lửa. Ở làng Bàu Trúc, mẻ nung lộ thiên kéo dài khoảng 4–6 giờ; trong Rừng Yên rút lại một phút.</p><p class="fl-note">Lửa và khói không đều tạo nên hỏa biến trên áo gốm: đỏ hồng, vàng đỏ, những vệt đen xám. Ngồi yên, nhìn lửa, theo dõi hơi thở.</p>';return}
    if(gom.phase==='fire'){clearInterval(gom.timer);gom.phase='spray';gomPanel.innerHTML='<div class="fl-head"><strong>🔥 Lửa đã tàn</strong></div><p class="fl-note">Khi gốm còn nóng, người thợ phun nước để tạo màu cho áo gốm.</p><div class="fl-row"><button type="button" class="fl-gold" data-gp="spray">💧 Phun nước tạo màu</button></div>';syncGomYard();return}}
  gomPanel.addEventListener('click',e=>{const a=e.target.closest('[data-gp]')?.dataset.gp;if(!a)return;
    if(a==='spray'){strike(1900,1.2,.02,[[1,1],[1.3,.5]]);window.__bagTake&&window.__bagTake('pots',gom.row,true);const r=gom.row,fired=GOM_FIRED[r.seed%GOM_FIRED.length][0];gom.phase='toRack';gom.step='nhao';gom.hold=r.seed+'|'+r.name;setGomCarry('fired');refreshGomPill();
      gomPanel.innerHTML='<div class="fl-head"><strong>🏺 '+GOM_SHAPES[r.shape].name+' · áo gốm '+fired+'</strong><button type="button" data-gp="close">✕ Đóng</button></div><div class="gom-preview"></div><p class="fl-note">Hỏa biến đã để lại trên gốm của bạn những sắc màu không lặp lại. Đội gốm lên đầu, mang tới kệ cạnh bãi nung (kệ 6 × 6 = 36 chỗ; khi đầy, chiếc cũ nhất nhường chỗ).</p><div class="fl-row"><button type="button" class="fl-gold" data-gp="rack">🏺 Đội gốm lên kệ</button></div>';
      const img=gomSnapshot(r);if(img)gomPanel.querySelector('.gom-preview').appendChild(img);drawRack();say('🏺 Gốm nung xong · Đội gốm lên kệ');return}
    if(a==='rack'){gomPanel.hidden=true;gomPill.click();return}
    if(a==='close')gomPanel.hidden=true});
  let gomSnapR=null;
  function gomSnapshot(r){try{const R=gomSnapR||(gomSnapR=new THREE.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true}));R.setPixelRatio(1);R.setSize(360,300,false);R.outputColorSpace=THREE.SRGBColorSpace;R.toneMapping=THREE.ACESFilmicToneMapping;
      const sc=new THREE.Scene();sc.add(new THREE.HemisphereLight('#fff1d6','#3a2c20',1.5));const k=new THREE.DirectionalLight('#ffd9a8',2.2);k.position.set(2,3,3);sc.add(k);const m=gomMesh(r,1);sc.add(m);const H=GOM_SHAPES[r.shape].pts.at(-1)[1];
      const cam=new THREE.PerspectiveCamera(30,360/300,.01,10);cam.position.set(0,H*.75,1.55);cam.lookAt(0,H*.45,0);R.render(sc,cam);const img=new Image();img.src=R.domElement.toDataURL('image/png');img.className='gom-img';m.geometry.dispose();return img}catch(e){return null}}
  function placeOnRack(){if(gom.phase!=='toRack')return;gom.phase='placing';refreshGomPill();walkRoute.length=0;walkYaw=Math.atan2(GOM_RACK[0]-mePosition.x,GOM_RACK[1]-mePosition.z);
    const pot=gom.carry;gom.carry=null;me.remove(pot);const from=new THREE.Vector3(mePosition.x,groundHeight(mePosition.x,mePosition.z)+2.08,mePosition.z),slot=new THREE.Vector3(-1.45,.155,-3.1);gomYard.localToWorld(slot);pot.scale.setScalar(.8);scene.add(pot);
    const t0=performance.now(),step=()=>{const u=Math.min(1,(performance.now()-t0)/1600),e=u*u*(3-2*u);pot.position.lerpVectors(from,slot,e);pot.position.y+=Math.sin(u*Math.PI)*.35;if(u<1){requestAnimationFrame(step);return}
      scene.remove(pot);pot.geometry.dispose();gom.hold=null;gom.phase='idle';drawRack();strike(330,2.2,.05,[[1,1],[2.1,.3]]);say('🏺 Gốm của bạn đã nằm trên kệ, mọi khách đều thấy');refreshGomPill()};requestAnimationFrame(step)}
  // ---- shared pots (Supabase): a minute in the fire for everyone to see, then on the rack
  const gomDb=(typeof flowerDb!=='undefined')?flowerDb:null;let gomRows=[];
  const gomAge=r=>(Date.now()-new Date(r.created_at).getTime())/1000;
  let gomFiring=null;
  function syncGomYard(){const on=gomRows.some(r=>gomAge(r)<GOM_FIRE_SEC)||gom.phase==='fire';if(on!==gomFiring){gomFiring=on;gomFire.visible=on;drawRack()}}
  async function loadPots(){if(!gomDb)return;try{let {data,error}=await gomDb.from('anyen_pottery').select('id,seq,shape,pattern,seed,name,picks,created_at').order('seq',{ascending:false}).limit(STORE_FETCH);if(!error&&data)data=pickNine(data);
      if(!error&&data){const local=gomRows.filter(r=>String(r.id).startsWith('local-')&&gomAge(r)<GOM_FIRE_SEC+20&&!data.some(d=>d.seed===r.seed&&d.name===r.name));gomRows=[...local,...data];gomFiring=null;syncGomYard();if(room&&room.onPots)room.onPots()}}catch(e){}}
  setInterval(()=>{if(document.body.classList.contains('immersive')&&!bayMode&&!document.hidden)loadPots()},12000);loadPots();
  let gomTick=0;
  function updateGom(dt){const t=performance.now()/1000;gomTick+=dt;if(gomTick>1){gomTick=0;syncGomYard()}
    if(!gomFire.visible)return;for(const f of gomFlames){const u=f.userData;f.scale.set(1,.75+Math.sin(t*7+u.ph)*.25+Math.sin(t*13+u.ph*2)*.12,1);f.position.y=u.y+Math.sin(t*5+u.ph)*.05}
    for(const s of gomSmoke){const u=((t*.18+s.userData.k/gomSmoke.length)%1);s.position.set(Math.sin(t*.4+s.userData.k)*.4*u,1.1+u*5,Math.cos(t*.3+s.userData.k)*.3*u-u*.8);s.scale.setScalar(.6+u*2.2);s.material.opacity=.28*(1-u)}}
  window.addEventListener('anyen-3d-exit',()=>{gomPanel.hidden=true;if(gom.phase==='carry'){setGomCarry(false);gom.phase='room';gom.step='xong';refreshGomPill()}if(gom.phase==='toRack'){setGomCarry(false);gom.hold=null;gom.phase='idle';drawRack();refreshGomPill()}});
  // 3.22: Sổ lưu niệm. Kệ, bệ và kho chỉ bày tượng trưng những món gần nhất; chạm vào thì mở danh sách đầy đủ.
  // Mỗi kho trên Supabase giữ 66 món gần nhất, đầy thì xoá dần từ món cũ nhất.
  const ARCH_MAX=69;
  const archPanel=document.createElement('section');archPanel.id='archPanel';archPanel.hidden=true;document.body.appendChild(archPanel);
  const archDate=t=>{try{const d=new Date(t);return d.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'})+' '+d.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit'})}catch(e){return ''}};
  const archEsc=t=>String(t||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ARCH={robes:{title:'🟧 Kho y',table:'anyen_kathina_robes',cols:['id,seq,color,pieces,wish,dieu,name,picks,created_at','id,seq,color,pieces,wish,dieu,name,created_at','id,seq,color,pieces,dieu,name,created_at','id,seq,color,dieu,name,created_at'],local:()=>katRows,unit:'tấm y',
      row:r=>{const ps=String(r.pieces||'');const sw=ps.length>1?ps.split('').map(i=>'<i style="background:'+katHex(i)+'"></i>').join(''):'<i style="background:'+archEsc(r.color)+'"></i>';return '<span class="ar-sw">'+sw+'</span><span>'+(Number(r.dieu)||5)+' điều'+(ps&&new Set(ps).size>1?' · nhiều màu':' · '+((KAT_COLORS.find(c=>c[1]===r.color)||[''])[0]))+'</span>'+(r.wish?'<em class="ar-wish">“'+archEsc(r.wish)+'”</em>':'')}},
    flowers:{title:'💐 Hoa đã dâng',table:'anyen_flower_offerings',cols:['id,seq,flowers,layout,yaw,name,picks,created_at','id,seq,flowers,layout,name,created_at'],local:()=>[],unit:'bó hoa',
      row:r=>'<span class="ar-ic">'+(r.flowers||[]).map(f=>(FLOWER_KINDS[f]||{}).icon||'').join('')+'</span><span>'+((BOUQUET_LAYOUTS[r.layout]||'').replace(/^\S+\s/,'Bó '))+' · '+(r.flowers||[]).length+' bông</span>'},
    aromas:{title:'🫙 Kho Lọ Ước & Túi thơm',table:'anyen_aroma_gifts',cols:['id,seq,form,aromas,drops,title,wish,name,picks,created_at'],local:()=>aromaRows,unit:'món',
      row:r=>'<span class="ar-sw">'+(r.aromas||[]).map(id=>'<i style="background:'+((AR(id)||{}).c||'#ccc')+';border-radius:50%"></i>').join('')+'</span><span>'+(r.form==='tui'?'👝 Túi thơm':'🫙 Lọ Ước')+' · '+archEsc(r.title||'')+'</span>'+(r.wish?'<em class="ar-wish">“'+archEsc(r.wish)+'”</em>':'')},
    pots:{title:'🏺 Kho gốm',table:'anyen_pottery',cols:['id,seq,shape,pattern,seed,name,picks,created_at','id,seq,shape,pattern,seed,name,created_at'],local:()=>gomRows,unit:'món gốm',
      row:r=>'<span class="ar-sw"><i style="background:'+GOM_FIRED[(Number(r.seed)||0)%GOM_FIRED.length][1]+';border-radius:50%"></i></span><span>'+(GOM_SHAPES[r.shape]||GOM_SHAPES[0]).name+' · '+(GOM_TOOLS[r.pattern]||GOM_TOOLS[0])[1]+' · áo gốm '+GOM_FIRED[(Number(r.seed)||0)%GOM_FIRED.length][0]+'</span>'}};
  async function openArchive(kind){const A=ARCH[kind];if(!A)return;archPanel.hidden=false;archPanel.innerHTML='<div class="fl-head"><strong>'+A.title+'</strong><button type="button" data-ar="close">✕ Đóng</button></div><p class="fl-note">Đang mở sổ…</p>';
    let rows=null;if(flowerDb){for(const c of A.cols){try{const {data,error}=await Promise.race([flowerDb.from(A.table).select(c).order('seq',{ascending:false}).limit(ARCH_MAX),new Promise(r=>setTimeout(()=>r({error:'timeout'}),5000))]);if(!error&&data){rows=data;break}if(error==='timeout')break}catch(e){}}}
    if(!rows)rows=A.local().slice(0,ARCH_MAX);archRows={kind,rows};
    archPanel.innerHTML='<div class="fl-head"><strong>'+A.title+' · '+rows.length+' '+A.unit+'</strong><button type="button" data-ar="close">✕ Đóng</button></div>'
      +'<p class="fl-note">Trong rừng chỉ bày tượng trưng những món gần nhất. Kho giữ '+ARCH_MAX+' món: 9 món mới nhất luôn được giữ, còn lại món được mang về nhiều sẽ ở lâu hơn, món ít được chọn nhất rời kho trước. Chạm 🎒 để mang một món về Túi An Yên.</p>'
      +(rows.length?'<ol class="ar-list">'+rows.map((r,i)=>{const src=kind+':'+r.id,has=window.anyenBagHas&&window.anyenBagHas(src);return '<li>'+A.row(r)+'<b>'+archEsc(r.name||'Khách Yên')+'</b><small>'+archDate(r.created_at)+(Number(r.picks)?' · 🎒 '+Number(r.picks):'')+'</small><button type="button" data-take="'+i+'"'+(has?' disabled':'')+'>'+(has?'✓ Đã có trong túi':'🎒 Mang về túi')+'</button></li>'}).join('')+'</ol>':'<p class="fl-note">Chưa có món nào.</p>')}
  let archRows=null;
  archPanel.addEventListener('click',e=>{if(e.target.closest('[data-ar="close"]')){archPanel.hidden=true;return}const t=e.target.closest('[data-take]');if(!t||!archRows)return;const r=archRows.rows[+t.dataset.take];if(!r)return;
    const kind=archRows.kind;bagTake(kind,r,false);t.disabled=true;t.textContent='✓ Đã có trong túi';
    if(flowerDb&&!String(r.id).startsWith('local-')&&!String(r.id).startsWith('t'))flowerDb.rpc('anyen_take',{kind,item:r.id}).then(()=>{},()=>{})});
  window.addEventListener('anyen-bag-note',e=>{const h=document.getElementById('zenHint');if(h)h.textContent=String(e.detail||'')});
  // Put a made item into the Túi An Yên (own = made by this guest, straight after finishing it).
  function bagTake(kind,r,own){const mk=kind==='robes'?'robe':kind==='flowers'?'flower':kind==='aromas'?'aroma':'pot';let label='',data={};
    if(mk==='robe'){label=(Number(r.dieu)||5)+' điều';data={color:r.color,pieces:r.pieces||'',dieu:r.dieu}}
    else if(mk==='flower'){label=(r.flowers||[]).length+' bông · '+String(BOUQUET_LAYOUTS[r.layout]||'').replace(/^\S+\s/,'');data={flowers:r.flowers,layout:r.layout}}
    else if(mk==='aroma'){label=(r.form==='tui'?'Túi thơm':'Lọ Ước')+' · '+String(r.title||'');data={form:r.form,aromas:r.aromas,drops:r.drops,title:r.title,wish:r.wish}}
    else{label=(GOM_SHAPES[r.shape]||GOM_SHAPES[0]).name+' · áo gốm '+GOM_FIRED[(Number(r.seed)||0)%GOM_FIRED.length][0];data={shape:r.shape,pattern:r.pattern,seed:r.seed}}
    window.dispatchEvent(new CustomEvent('anyen-bag-add',{detail:{kind:mk,src:own?'':kind+':'+r.id,label,maker:r.name||'',data,own}}))}
  window.__bagTake=bagTake;
  window.addEventListener('anyen-3d-exit',()=>{archPanel.hidden=true});
  // taps in the forest: the bouquets before the statue, the robes at its feet, the pottery rack and firing yard
  window.__archTap=ray=>{const hit=(objs)=>objs.length&&ray.intersectObjects(objs,true).length;
    if(hit([...offeredShown.values()].map(o=>o.g)))return openArchive('flowers'),true;
    if(hit([...daisRobes.values()]))return openArchive('robes'),true;
    if(hit([gomRack]))return openArchive('pots'),true;return false};
  function bayHeld(on){try{if(kat.robe)kat.robe.visible=on;if(carriedMesh)carriedMesh.visible=on}catch(e){}}
  function enterBay(){
    if(bayMode)return;
    if(!bayModuleReady){if(!enterBay.waiting){enterBay.waiting=true;document.getElementById('zenHint').textContent='⛵ Đang tải Vịnh Yên…';
        loadBayModule().then(()=>{enterBay.waiting=false;if(window.anyenPendingBay||enterBay.want)enterBay()}).catch(()=>{enterBay.waiting=false;window.anyenPendingBay=false;document.getElementById('zenHint').textContent='Chưa tải được Vịnh Yên, kiểm tra mạng rồi bấm lại nhé'})}
      enterBay.want=true;return}
    enterBay.want=false;window.anyenPendingBay=false;saveForestState();setVillageActive(false);window.dispatchEvent(new CustomEvent('anyen-space',{detail:{space:'bay'}}));
    bayStash={pos:mePosition.clone(),bg:scene.background,fog:scene.fog,yaw:viewYaw,pitch:walkPitch,far:camera.far,hemi:[hemiLight.color.clone(),hemiLight.groundColor.clone(),hemiLight.intensity],sun:[sun.color.clone(),sun.intensity,sun.position.clone()]};
    if(meActivity==='sit')document.getElementById('realtimeSit')?.click();if(meActivity==='walk')document.getElementById('realtimeWalk')?.click();clearPendingActions();
    // đồ đang cầm/đội ở rừng (khay y Kathina, bó hoa) không mang theo lên tàu; về rừng thì hiện lại
    bayHeld(false);
    bayMode=true;walkRoute.length=0;pendingSeat=null;pendingBoat=false;wishDestination=null;walkingKeys.clear();
    camera.far=2600;camera.updateProjectionMatrix();{const nm=document.querySelector('.immersive-name');if(nm)nm.textContent='✧ LÀNG YÊN - VỊNH YÊN'}{const ex=document.getElementById('exit3D');if(ex){ex.textContent='🏠 Trang chính';ex.setAttribute('aria-label','Rời vịnh, về trang chính Làng Yên')}}scene.fog=null;viewYaw=0;walkPitch=.05;bayGroup.visible=true;document.body.classList.add('yen-bay');
    const applyLight=d=>{const m=d.map;scene.background=new THREE.Color(m.sky_color);scene.fog=new THREE.FogExp2(m.fog_color,Number(m.fog_density));hemiLight.color.set(m.hemi_sky);hemiLight.groundColor.set(m.hemi_ground);hemiLight.intensity=Number(m.hemi_intensity);sun.color.set(m.sun_color);sun.intensity=Number(m.sun_intensity);sun.position.set(...m.sun_position)};
    const ready=d=>{if(!bayMode)return;if(!bayBuilt)buildBay(d);restoreBayState();const resume=!bayTour&&!bayPause&&!bayShip.path.length&&window.__bayResumeSnap;/* rời vịnh khi đang ở Đảo Yên: lần sau vào lại thì tàu chờ ở cầu tàu với chuyến cũ */applyLight(d);if(window.anyenLite&&window.__liteBayBg){scene.background=window.__liteBayBg;scene.fog=null}updateBay(0);camera.position.copy(bayCam);refreshBayHud();let seenO=false;try{seenO=!!localStorage.getItem(BAY_OUTFIT_SEEN)}catch(e){seenO=true}/* vào thẳng Xếp đá / Nhặt sò từ link AnSense: không mở bảng trang phục đè lên hoạt động (lần sau vào vịnh mới hỏi) */if(!seenO&&!window.anyenSkipBayOutfit)setTimeout(openBayOutfit,500);window.anyenSkipBayOutfit=false;bayCaption('⛵ Du thuyền Yên · Vịnh Hạ Long · Chạm mặt nước để tàu đi tới, vuốt để nhìn quanh',6500);if(resume)window.__bayResumeSnap()};
    if(bayData)ready(bayData);else{bayCaption('Đang tải bản đồ vịnh…',8000);loadBayData().then(ready).catch(()=>bayCaption('Chưa tải được bản đồ vịnh, vui lòng thử lại',6000))}
    document.getElementById('zenHint').textContent='⛵ Vịnh Hạ Long · Chạm mặt nước để tàu đi tới';
  }
  function exitBay(){if(!window.anyenLite)ensureForest();
    if(!bayMode)return;if(bayIsland)islandBoardNow();saveBayState();dropPause();setVillageActive(true);window.dispatchEvent(new CustomEvent('anyen-space',{detail:{space:document.body.classList.contains('immersive')?'forest':'out'}}));if(meActivity==='sit')document.getElementById('realtimeSit')?.click();
    bayMode=false;bayHeld(true);document.body.classList.remove('bay-clean');SEE.on.value=0;SEE.onShip.value=0;meTag.visible=true;bayGroup.visible=false;document.body.classList.remove('yen-bay');{const nm=document.querySelector('.immersive-name');if(nm)nm.textContent='✧ LÀNG YÊN - RỪNG YÊN'}{const ex=document.getElementById('exit3D');if(ex){ex.textContent='🏠 Trang chính';ex.setAttribute('aria-label','Về trang chính Làng Yên')}}endTour(false);closeSheet();closePhoto();(bayMapBox.classList.remove('open'),document.body.classList.remove('bay-map-open'));if(bayOutfitOpen)closeBayOutfit(false);stopBaySound();
    if(bayStash){mePosition.copy(bayStash.pos);scene.background=bayStash.bg;scene.fog=bayStash.fog;viewYaw=bayStash.yaw;walkPitch=bayStash.pitch;camera.far=bayStash.far;camera.updateProjectionMatrix();
      hemiLight.color.copy(bayStash.hemi[0]);hemiLight.groundColor.copy(bayStash.hemi[1]);hemiLight.intensity=bayStash.hemi[2];sun.color.copy(bayStash.sun[0]);sun.intensity=bayStash.sun[1];sun.position.copy(bayStash.sun[2]);bayStash=null}
    window.dispatchEvent(new CustomEvent('anyen-position',{detail:{x:mePosition.x,z:mePosition.z}}));
  }
  window.addEventListener('anyen-3d-exit',()=>{window.anyenPendingBay=false;exitBay()});
  // ---- Đang dở hoạt động (đi thuyền hồ sen, đội y / nghi thức dâng y): không thoát trang, không sang không gian khác.
  // Bấm "Kết thúc ngay" thì hoạt động hoàn tất tức thì (thuyền về bến; y được dâng và đưa về kho) rồi làm tiếp việc vừa bấm.
  const KAT_BUSY=['carry','round','offer','chant','fetch','return','join','follow'];
  function activityBusy(){if(bayMode)return null;if(boatRide)return 'boat';if(KAT_BUSY.includes(kat.phase))return kat.phase==='join'||kat.phase==='follow'?'katFollow':'kat';return null}
  function boatFinishNow(){const r=boatRide;if(!r)return;const g=r.b.group,[lx,lz]=r.b.slot.land;g.position.set(r.b.slot.x,.02,r.b.slot.z);g.rotation.set(0,Math.PI/2,0);
    boatRide=null;pendingBoat=null;mePosition.set(lx,0,lz);viewYaw=walkYaw=0;boatHud.hidden=true;window.dispatchEvent(new CustomEvent('anyen-position',{detail:{x:lx,z:lz}}));say('🚣 Thuyền đã về Bến Sen')}
  function katFinishNow(){const p=kat.phase;walkRoute.length=0;pendingKathina=null;
    if(p==='join'||p==='follow'){kat.phase='idle';kat.leader='';refreshKatPill();say('🟧 Đã rời đoàn rước y');return}
    if(p==='carry'||p==='round'||p==='offer'){me.rotation.x=0;kat.placed=true;if(kat.robe){kat.robe.parent&&kat.robe.parent.remove(kat.robe);kat.robe=null}placeRobe()}/* dâng y ngay: lưu tấm y như khi đặt dưới chân tượng */
    clearInterval(kat.chantTimer);if(kat.mine&&!katKho.some(q=>q.name===kat.mine.name&&q.t===kat.mine.t))katKho.push({...kat.mine});
    setCarry(false);kat.phase='done';document.body.classList.remove('kat-chant');walkRoute.length=0;pendingSeat=null;window.dispatchEvent(new CustomEvent('anyen-seat-intent',{detail:{clear:true}}));
    saveRobeToKho();drawDais();refreshKatPill();closeKatPanel();say('🟧 Nghi thức dâng y đã hoàn tất · tấm y đã vào kho')}
  function finishActivityNow(){const k=activityBusy();if(k==='boat')boatFinishNow();else if(k)katFinishNow()}
  const busyBox=document.createElement('div');busyBox.id='busyBox';busyBox.hidden=true;
  busyBox.innerHTML='<div class="bb-card" role="dialog" aria-modal="true"><p class="bb-msg"></p><div class="bb-row"><button type="button" data-bb="stay">Ở lại tiếp tục</button><button type="button" class="bb-end" data-bb="end">⏹ Kết thúc ngay</button></div></div>';
  {const st=document.createElement('style');st.textContent='#busyBox{position:fixed;inset:0;z-index:120;display:flex;align-items:center;justify-content:center;background:#0008}#busyBox[hidden]{display:none}#busyBox .bb-card{max-width:min(380px,90vw);background:#0b2d28;border:1px solid #c8a96a88;border-radius:16px;padding:16px;color:#f3e7cc;font:15px/1.45 system-ui,sans-serif}#busyBox .bb-row{display:flex;gap:8px;justify-content:flex-end;margin-top:12px;flex-wrap:wrap}#busyBox button{border:1px solid #a18a5e;border-radius:999px;background:#19483b;color:#f5e6c9;padding:9px 14px;font-size:14px;cursor:pointer}#busyBox .bb-end{background:#c8a96a;color:#0b2824;font-weight:600;border-color:#c8a96a}';document.head.appendChild(st)}
  document.body.appendChild(busyBox);let busyThen=null;
  function askFinish(then){const k=activityBusy();if(!k){then&&then();return}busyThen=then;
    busyBox.querySelector('.bb-msg').textContent=k==='boat'?'🚣 Bạn đang dạo thuyền trên hồ sen nên chưa thể rời đi. Kết thúc để thuyền về bến ngay?':k==='kat'?'🟧 Bạn đang trong nghi thức dâng y nên chưa thể rời đi. Kết thúc để hoàn tất ngay (dâng y và đưa y về kho)?':'🟧 Bạn đang đi cùng đoàn rước y. Rời đoàn để đi nơi khác?';
    busyBox.hidden=false;busyBox.querySelector('.bb-end').focus()}
  busyBox.addEventListener('click',e=>{const a=e.target.closest('[data-bb]')?.dataset.bb;if(!a&&e.target!==busyBox)return;busyBox.hidden=true;const t=busyThen;busyThen=null;if(a==='end'){finishActivityNow();if(t)setTimeout(t,60)}});
  // chặn: Thoát 3D, sang Vịnh Yên, AnSense, liên kết mở trong cùng thẻ; phím Esc. Lệnh do máy gọi (khóa 1 hoạt động) thì kết thúc ngay rồi cho đi.
  document.addEventListener('click',e=>{const el=e.target.closest('#exit3D,#enterBay,#ansenseBtn,a[href]');if(!el||!activityBusy())return;
    if(el.tagName==='A'){const h=el.getAttribute('href')||'';if(h.startsWith('#')||h.startsWith('javascript')||el.target==='_blank')return}
    if(!e.isTrusted){finishActivityNow();return}
    e.preventDefault();e.stopImmediatePropagation();askFinish(()=>el.click())},true);
  document.addEventListener('keydown',e=>{if(e.key!=='Escape'||!activityBusy()||!document.body.classList.contains('immersive'))return;e.preventDefault();e.stopImmediatePropagation();if(busyBox.hidden)askFinish(()=>document.getElementById('exit3D')?.click());else busyBox.hidden=true},true);
  // Tắt trang / mất kết nối giữa chừng: coi như đã xong — thuyền về bến; nghi thức dâng y kết thúc, tấm y chưa vào kho bị xoá (kể cả y đã đặt dưới chân tượng).
  function katDiscard(){clearInterval(kat.chantTimer);if(kat.pendingRow){const pr=kat.pendingRow;kat.pendingRow=null;katRows=katRows.filter(r=>r!==pr);drawDais()}if(kat.robe){kat.robe.parent&&kat.robe.parent.remove(kat.robe);kat.robe=null}me.rotation.x=0;kat.phase='done';kat.leader='';pendingKathina=null;walkRoute.length=0;pendingSeat=null;
    document.body.classList.remove('kat-chant');refreshKatPill();closeKatPanel()}
  function dropActivity(){const k=activityBusy();if(k==='boat')boatFinishNow();else if(k){katDiscard();say('🟧 Mất kết nối · nghi thức dâng y đã kết thúc')}}
  window.addEventListener('pagehide',dropActivity);window.addEventListener('offline',dropActivity);
  try{localStorage.removeItem('yen_kat_pending')}catch(e){}
  window.anyenActivityBusy=activityBusy;
  // Nút nơi về, hàng trên cùng ngay bên trái nút Trang chính (27/11): Rừng Yên → 🏡 Tư Gia (đi từ từ tới cửa); Vịnh Yên → 🏝 Về Đảo Yên (tàu cập liền cầu tàu Đảo Yên, như chọn Đảo Yên trong Bản đồ; nút 🏝 trên thanh điều khiển vẫn là đi từ từ)
  {const hb=document.createElement('button');hb.type='button';hb.id='homeBtn';const ex=document.getElementById('exit3D');if(ex)ex.before(hb);else document.body.appendChild(hb);
    const st=document.createElement('style');st.textContent='#homeBtn{display:none;margin-left:auto;pointer-events:auto;border:1px solid #c8a96a;border-radius:999px;background:#19483bee;color:#f5e6c9;font:inherit;font-size:13px;padding:8px 12px;cursor:pointer;white-space:nowrap}body.immersive #homeBtn{display:block}body.room-open #homeBtn,body.orchid-open #homeBtn,body.forest-map-open #homeBtn,body.bay-clean #homeBtn,body.bay-photo-open #homeBtn,body.bay-outfit-open #homeBtn,body.bay-map-open #homeBtn,body.kat-chant #homeBtn,body.bay-island #homeBtn{display:none!important}@media(max-width:800px){#homeBtn{font-size:12px;padding:9px 11px;min-height:40px}}';document.head.appendChild(st);
        const label=()=>{const t=bayMode?'🏝 Về Đảo Yên':'🏡 Tư Gia';if(hb.textContent!==t){hb.textContent=t;hb.title=bayMode?'Về ngay Đảo Yên: tàu cập cầu tàu đảo của bạn':'Đi từ từ tới trước cửa Tư Gia (chạm cửa để vào nhà; muốn tới liền: chọn Tư Gia trong Bản đồ)';hb.setAttribute('aria-label',bayMode?'Về ngay Đảo Yên':'Đi tới Tư Gia')}};label();setInterval(label,800);
    hb.addEventListener('click',e=>{e.stopPropagation();if(bayMode){window.__goTuDao&&window.__goTuDao(true);label();return}askFinish(()=>goHome(false,true))})}
  // Lịch trị liệu: vào thẳng Nhà đã đăng ký (Healer đến giờ phiên, khách đã được nhận). Nhà có phòng bên trong thì mở phòng;
  // Nhà chưa có phòng thì đứng trước cửa và giữ chỗ trong không gian của Nhà đó để vào kênh phiên.
  // Lịch hẹn Tư Gia / Đảo Yên (v3.9): đến giờ hẹn, Chủ nhà và bạn đã khớp vào Tư Gia / Đảo Yên của mình là cùng một kênh.
  function goSchedHouse(id){
    if(id==='tu_dao'){/* 27/11: buổi hẹn Đảo Yên: cập cầu tàu rồi đi thẳng lên trước cửa nhà chính, chạm cửa là vào gặp mọi người */const toHouse=()=>setTimeout(()=>{if(bayMode&&window.__bay&&window.__bay.tdTap)window.__bay.tdTap('house')},900);if(roomOpen||boatRide)return false;if(bayMode){window.__goTuDao&&window.__goTuDao(true);toHouse();return true}
      enterBay();(function wait(n){if(bayMode&&window.__goTuDao){setTimeout(()=>{window.__goTuDao(true);toHouse()},400);return}if(n>0)setTimeout(()=>wait(n-1),500)})(40);return true}
    if(id==='tu_gia'){if(bayMode||boatRide||roomOpen)return false;goHome(true);return true}
    if(bayMode||boatRide||roomOpen)return false;const h=SENSE_HOUSES.find(x=>x.id===id)||(id==='nha_van_hoa'?VAN_HOA:id==='nha_hoa_lan'?NHA_SAC:null);let door,yaw;
    if(h){door=h.door;yaw=h.rot+Math.PI}else if(id==='nha_hoa_lan'){door=ORCHID_DOOR;yaw=ORCHID.rot+Math.PI}else return false;
    if(!teleportTo(door[0],door[1],yaw))return false;
    if(h&&ROOM_BUILDERS[h.id]){window.__anyenSchedHouse=h.id;setTimeout(()=>arriveHouse(h),300)}
    else setTimeout(()=>{window.dispatchEvent(new CustomEvent('anyen-space',{detail:{space:'space:'+id}}));const zh=document.getElementById('zenHint');if(zh)zh.textContent=(h?h.icon+' '+h.name:'🌸 Nhà Sắc')+' · phiên trị liệu của bạn'},300);
    return true}
  window.__forestTest={me:()=>[mePosition.x,mePosition.z],set:(x,z,y)=>{mePosition.set(x,0,z);walkYaw=viewYaw=y},trees:()=>[...treeGrid.values()].flat(),block:(x,z)=>!!treeBlocked(x,z),walkable:(x,z)=>walkable(x,z),go:(x,z)=>navigateTo(x,z)};/* kiểm thử va chạm cây */
  window.__forest={bridgeScr:z=>{const v=new THREE.Vector3(0,bridgeHeight(z)+.1,z).project(camera);return [(v.x+1)/2*innerWidth,(1-v.y)/2*innerHeight]},th:(x,z)=>[+terrainHeight(x,z).toFixed(2),+lakeSDF(x,z).toFixed(2)],goHouse:id=>{const h=[TU_GIA,NHA_SAC,...SENSE_HOUSES,TINH_THAT,VAN_HOA].find(v=>v.id===id);if(h)goToHouse(h);return h&&h.door},isRoom:()=>roomOpen,house:id=>goSchedHouse(id),loop:()=>{let m=1e9,at=null;for(const [x,z] of BOAT_LOOP){const dx=Math.max(0,Math.abs(x-BEN_SEN.x)-BEN_SEN.w/2),dz=Math.max(0,BEN_SEN.z0-z,z-BEN_SEN.z1),d=Math.hypot(dx,dz);if(d<m){m=d;at=[x,z]}}return [m,at]},viverse:o=>o?openOrchid():closeOrchid(),tp:(x,z,y)=>teleportTo(x,z,y),viv:()=>VIV,home:()=>TU_GIA,katCarry:()=>{kat.phase='carry';kat.pieces='0123';setCarry(true);refreshKatPill();return kat.phase},katPhase:()=>kat.phase,robeOn:()=>!!kat.robe,dbg:()=>({cam:[+camera.position.x.toFixed(2),+camera.position.y.toFixed(2),+camera.position.z.toFixed(2)],yaw:+viewYaw.toFixed(3),zoom:+camZoom.toFixed(3),zoomS:+(camZoomS||0).toFixed(3),act:meActivity,route:walkRoute.length,boat:!!boatRide,kat:kat.phase,n:onlineAvatars.size,gd:guestDist(mePosition.x,mePosition.z)}),katFill:n=>{const old=new Date(Date.now()-6e5).toISOString(),d=[5,7,9];katRows=Array.from({length:n},(_,i)=>{const dd=d[i%3];return {id:'t'+i,color:KAT_COLORS[i%4][1],dieu:dd,pieces:i%2?Array.from({length:dd*3},(_,k)=>(k+i)%4).join(''):'',name:'t'+i,created_at:old}});return katRows.length},route:()=>walkRoute.map(q=>[+q[0].toFixed(1),+q[1].toFixed(1)]),pos:()=>[mePosition.x,mePosition.z],paved:(x,z)=>onPaved(x,z),boat:i=>tapBoat(i),ride:()=>boatRide?{phase:boatRide.phase,i:boatRide.b.i,pct:Math.round(100*boatRide.travelled/boatRide.total)}:null,boatsVisible:()=>boats.map(b=>b.group.visible),garden:i=>goToGarden(FLOWER_GARDENS[i]),room:id=>openRoom([NHA_SAC,...SENSE_HOUSES,TINH_THAT,TU_GIA,TU_DAO_SPACE].find(h=>h.id===id)||{id:0}),katSkip:sec=>{kat.r0-=sec*1000},gom:()=>({phase:gom.phase,step:gom.step,rounds:gom.rounds,rows:gomRows.length,fire:gomFire.visible,rack:gomRack.children.length,yard:GOM_YARD,stand:GOM_STAND}),gomFill:n=>{const old=new Date(Date.now()-3e5).toISOString();gomRows=Array.from({length:n},(_,i)=>({id:'t'+i,shape:i%4,pattern:i%3,seed:i*37+5,name:'t',created_at:old}));gomFiring=null;drawRack();return gomRack.children.length},gomSkip:sec=>{gom.f0-=sec*1000;if(gom.row)gom.row.created_at=new Date(new Date(gom.row.created_at).getTime()-sec*1000).toISOString()},kat:()=>({phase:kat.phase,theta:kat.theta,left:kat.chantLeft,rows:katRows.length}),closeRoom:()=>closeRoom(),offered:()=>[...offeredShown.values()].map(o=>o.slot),basket:b=>{if(b){flowerBasket=b.slice()}return flowerBasket.slice()},carried:()=>carriedBouquet,ahead:d=>boatRide?[boatRide.b.group.position.x+Math.sin(boatRide.heading)*d,boatRide.b.group.position.z+Math.cos(boatRide.heading)*d]:null};
  window.__forest.hinfo=id=>{const h=[TU_GIA,NHA_SAC,...SENSE_HOUSES,TINH_THAT,VAN_HOA].find(v=>v.id===id);return h&&{x:h.x,z:h.z,rot:h.rot,door:h.door,D:h.D||0}};
  window.__bay={island:()=>bayIsland&&{x:+bayIsland.x.toFixed(1),z:+bayIsland.z.toFixed(1),n:bayIsland.path.length,y:+tdGroundY(bayIsland.x,bayIsland.z).toFixed(2)},tdTap:k=>tuDaoTap(k),tdWarp:(x,z,yaw,vy)=>{if(!bayIsland)tuDaoTap('pier');bayIsland.x=x;bayIsland.z=z;bayIsland.path=[];bayIsland.then=null;bayIsland.yaw=yaw||0;viewYaw=vy||0},free:(x,z)=>navFree(x,z),tuDao:i=>goTuDao(i),vp:id=>{const p=bayData.props.find(q=>q.id===id);return viewPoint(p)},tour:(id,a,b)=>{const t=bayData.props.find(q=>q.id===id);startTour(t,a,b)},camDist:()=>+camera.position.distanceTo(bayAvatar.pos).toFixed(2),zoom:f=>{if(f)bayZoomBy(f);return {view:bayView,z:bayZoom,far:bayFarZoom,lift:+bayLift.toFixed(2),want:bayLiftWant}},camYaw:()=>{const d=camera.getWorldDirection(new THREE.Vector3());return +Math.atan2(d.x,d.z).toFixed(3)},scr:()=>{const v=bayAvatar.pos.clone();v.y+=1;v.project(camera);return [+v.x.toFixed(2),+v.y.toFixed(2)]},camY:()=>+camera.position.y.toFixed(2),photoCam:o=>{if(bayPhoto)Object.assign(bayPhoto.cam,o)},pause:()=>pauseShip(),resume:()=>resumeShip(),paused:()=>bayPause,go:(x,z)=>setDestination(x,z,'thử'),land:id=>{const p=bayData?.props.find(q=>q.id===id);if(p)goLandmark(p)},get ship(){return bayShip},warp:(x,z,h)=>{bayShip.x=x;bayShip.z=z;if(h!=null)bayShip.heading=h;bayShip.trail.length=0},yaw:y=>{if(y!=null)viewYaw=y;return viewYaw},map:()=>openBayMap()};
  let clock=new THREE.Clock(),lastWalkFrame=performance.now();function animate(){requestAnimationFrame(animate);if(document.hidden||orchidOpen||roomOpen)return;if(window.anyenLite&&!bayMode){if(window.anyenPendingBay&&document.body.classList.contains("immersive"))enterBay();return}/* lite: không có cảnh rừng (chỉ vào nhà, xếp sò, xếp đá) nên không bao giờ vẽ làng, không đưa làng lên bộ nhớ đồ hoạ */orchidRing.material.opacity=.3+.25*Math.sin(performance.now()/500);vivU.t.value=performance.now()/1000;if(!bayMode){updateSenseHouses(performance.now()/1000);}let t=clock.getElapsedTime();
    const nowWalk=performance.now(),dt=Math.min(.05,(nowWalk-lastWalkFrame)/1000);walkDt=Math.min(.15,(nowWalk-lastWalkFrame)/1000);lastWalkFrame=nowWalk;
    if(document.body.classList.contains('immersive')){
      if(!bayMode)updateWishLake();if(!walking){walking=true;walkYaw=Math.PI;viewYaw=Math.PI}
      if(walkingKeys.has('turnleft')){walkYaw+=dt*1.5;}if(walkingKeys.has('turnright')){walkYaw-=dt*1.5;}
      let step=(walkingKeys.has('forward')?1:0)-(walkingKeys.has('back')?1:0);
      if(window.anyenPendingBay&&!bayMode)enterBay();if(boatRide)updateBoatRide(performance.now());if(!bayMode){updateKathina(dt);updateGom(dt)}
      if(step&&!boatRide&&meActivity!=='sit'&&meActivity!=='walk'){/* gặp cây/vật cản: trượt men theo (thử lệch 30°, 60°, 85° hai bên) thay vì đứng khựng hay đi xuyên */const L=walkDt*WALK_SPEED*step;for(const da of [0,.52,-.52,1.05,-1.05,1.48,-1.48]){const a=walkYaw+da,k=da?Math.cos(da):1,nx=mePosition.x+Math.sin(a)*L*k,nz=mePosition.z+Math.cos(a)*L*k;if(walkable(nx,nz)&&guestStepOk(mePosition.x,mePosition.z,nx,nz)){mePosition.x=nx;mePosition.z=nz;break}}}
      if(meActivity==='walk'){if(!walkGoal){const a=walkSeed+(walkCount++*.87),r=5+(walkCount%4)*1.3;walkGoal=[Math.sin(a)*r,21+Math.cos(a)*r];}const dx=walkGoal[0]-mePosition.x,dz=walkGoal[1]-mePosition.z,dist=Math.hypot(dx,dz);if(dist<.35)walkGoal=null;else{const d=Math.min(dist,dt*1.35),nx=mePosition.x+dx/dist*d,nz=mePosition.z+dz/dist*d;if(walkable(nx,nz)&&guestStepOk(mePosition.x,mePosition.z,nx,nz)){mePosition.set(nx,0,nz);walkYaw=Math.atan2(dx,dz);}else walkGoal=null;}}
      unstackT+=dt;if(unstackT>.6){unstackT=0;if(!bayMode&&!boatRide&&meActivity!=='sit'&&(!walkRoute.length||(walkWaitStart&&performance.now()-walkWaitStart>1500))&&kat.phase==='idle'&&onlineAvatars.size&&guestDist(mePosition.x,mePosition.z)<.6){const q=freeSpotNear(mePosition.x,mePosition.z);if(q){mePosition.set(q[0],0,q[1]);window.dispatchEvent(new CustomEvent('anyen-position',{detail:{x:q[0],z:q[1]}}))}}}
      if(walkRoute.length){
        if(meActivity!=='idle')meActivity='idle';
        const goal=walkRoute[0],dx=goal[0]-mePosition.x,dz=goal[1]-mePosition.z,dist=Math.hypot(dx,dz);
        if(dist<.16){walkRoute.shift();if(!walkRoute.length&&!pendingSeat&&!pendingBoat&&guestNear(mePosition.x,mePosition.z,GUEST_AVOID)){const q=nearestWalkable(mePosition.x,mePosition.z);if(q)mePosition.set(q[0],0,q[1]);window.dispatchEvent(new CustomEvent('anyen-position',{detail:{x:mePosition.x,z:mePosition.z}}));}if(!walkRoute.length){const arrivedLake=wishDestination;if(wishDestination){wishDestination=null;}if(!boatRide)document.getElementById('zenHint').textContent=arrivedLake?'Đã đến Hồ '+arrivedLake+' · Bấm Ném xu để nguyện ước':'Chạm đất để đi · Chạm tọa cụ để ngồi · Chạm người để chào';if(pendingBoat){boardBoat();}else if(pendingOrchid){pendingOrchid=false;walkYaw=VIV.rot+Math.PI;lookOffset=0;openOrchid();}else if(pendingHouse){const h=pendingHouse;pendingHouse=null;walkYaw=h.rot+Math.PI;lookOffset=0;arriveDoor(h);}else if(pendingKathina){const pk=pendingKathina;pendingKathina=null;if(pk==='kiln')startKiln();else if(pk==='rack')placeOnRack();else if(pk==='follow')startFollow();else if(pk==='kho')arriveKho();else startRounds();}else if(pendingGarden){const gd=pendingGarden;pendingGarden=null;openGardenSheet(gd);}else if(pendingOffer){pendingOffer=false;offerBouquet();}else if(arriveYaw!=null){walkYaw=arriveYaw;lookOffset=0;arriveYaw=null;}else if(pendingSeat){const s=pendingSeat;pendingSeat=null;if(!seatAvailable(s)){window.dispatchEvent(new CustomEvent('anyen-seat-intent',{detail:{clear:true}}));requestSeat(chooseSeat());}else{mePosition.set(s.x,0,s.z);window.dispatchEvent(new CustomEvent('anyen-position',{detail:{x:s.x,z:s.z}}));document.getElementById('realtimeSit')?.click();window.dispatchEvent(new CustomEvent('anyen-seat-intent',{detail:{clear:true}}));}}}}
        else{const step=Math.min(dist,walkDt*WALK_SPEED);const ux=dx/dist,uz=dz/dist;
          // A guest standing in the way: insert a detour point beside them (the side that is walkable), once per guest.
          // If neither side is open (bridge, narrow path), just squeeze past at close range.
          for(const p of onlineAvatars.values()){const g=p.group;if(!g||!g.visible||p===walkDetourFor)continue;const ox=g.position.x-mePosition.x,oz=g.position.z-mePosition.z,along=ox*ux+oz*uz,lat=Math.abs(ox*uz-oz*ux);
            if(along<.2||along>Math.min(dist,3.2)||lat>GUEST_AVOID)continue;if(Math.hypot(goal[0]-g.position.x,goal[1]-g.position.z)<GUEST_AVOID&&walkRoute.length===1)continue;
            const side=(ox*uz-oz*ux)>=0?-1:1;let det=null;for(const sd of [side,-side]){const q=[g.position.x+uz*sd*GUEST_AVOID*1.15,g.position.z-ux*sd*GUEST_AVOID*1.15];if(walkable(...q)&&clearWalk([mePosition.x,mePosition.z],q)&&!guestNear(q[0],q[1],GUEST_AVOID*.8)){det=q;break}}
            walkDetourFor=p;if(det){walkRoute.unshift(det)}break}
          const nx=mePosition.x+ux*step,nz=mePosition.z+uz*step;
          /* someone right in front: wait a moment; on a narrow way (bridge, path between ponds) squeeze past after 1.2 s */
          const squeeze=walkWaitStart&&performance.now()-walkWaitStart>900;
          if(walkable(nx,nz)&&((squeeze?!guestNear(nx,nz,.55):!guestNear(nx,nz,GUEST_AVOID*.75))||guestDist(nx,nz)>guestDist(mePosition.x,mePosition.z)+1e-4)){mePosition.set(nx,0,nz);walkYaw=Math.atan2(ux,uz);if(!guestNear(nx,nz,GUEST_AVOID))walkWaitStart=0;}else if(walkable(nx,nz)){if(!walkWaitStart)walkWaitStart=performance.now();}else{walkRoute.length=0;document.getElementById('zenHint').textContent='Đường bị chắn, vui lòng chọn điểm khác';}}
      }
      camZoomS+=(camZoom-camZoomS)*Math.min(1,dt*7);const cz=camZoomS,follow=1-Math.exp(-dt*9);let sittingNow=meActivity==='sit';const behind=14*cz,gy=bayMode?0:groundHeight(mePosition.x,mePosition.z),camX=mePosition.x-Math.sin(viewYaw)*behind,camZ=mePosition.z-Math.cos(viewYaw)*behind,up=Math.max(5.6*cz*camLift+Math.max(0,cz-1.5)*7+gy,bayMode?0:terrainHeight(camX,camZ)+2.2);/* thu nhỏ quá 1.5: camera lên cao dần để thấy toàn cảnh rừng, như ở vịnh */if(!bayMode&&Math.hypot(camX-STATUE.x,camZ-STATUE.z)<6.8)up=Math.min(up,HILL.top+5);if(bayMode){}else if(onBoat()){/* behind the boat; swipe to look around (relative to the boat), pinch / ＋－ to zoom, swipe up/down for height */const h=boatRide.heading+(viewYaw-boatRide.heading0),bd=8*cz;camera.position.lerp(new THREE.Vector3(mePosition.x-Math.sin(h)*bd,1.2+2.4*cz*camLift,mePosition.z-Math.cos(h)*bd),1-Math.exp(-dt*5));camera.lookAt(mePosition.x,.75,mePosition.z);camera.rotateX(Math.atan(Math.tan(camera.fov*Math.PI/360)/3));/* avatar centred, on the lower third line */}else{camera.position.lerp(new THREE.Vector3(mePosition.x-Math.sin(viewYaw)*behind,up,mePosition.z-Math.cos(viewYaw)*behind),follow);camera.lookAt(mePosition.x,gy+1.05,mePosition.z);camera.rotateX(Math.atan(Math.tan(camera.fov*Math.PI/360)/3));/* avatar centred, on the lower third line */}if(!bayMode&&scene.fog&&scene.fog.isFogExp2){const f=scene.fog;if(f._base==null)f._base=f.density;f.density=f._base/(1+Math.max(0,cz-1.2)*.7)}/* thu nhỏ xa thì sương mỏng lại để thấy toàn cảnh */if(!bayMode&&bayPhoto&&window.__forestPhotoCam)window.__forestPhotoCam(dt);/* chụp ảnh check-in trong rừng */if(!bayMode)fadeBlockingTrees(camera.position,{x:mePosition.x+Math.sin(viewYaw)*5,z:mePosition.z+Math.cos(viewYaw)*5},dt);if(bayMode)updateBay(dt);
    }else{camera.position.lerp(targetPosition,.035);currentLook.lerp(targetLook,.04);camera.lookAt(currentLook.x+Math.sin(lookOffset)*7,currentLook.y,currentLook.z)}
    me.visible=document.body.classList.contains('immersive')&&!window.__anyenHideMe;me.position.copy(mePosition);me.position.y=groundHeight(mePosition.x,mePosition.z);me.rotation.y=0;me.rotation.z=0;me.rotation.x=0;const inBoat=onBoat();if(inBoat){me.position.y=boatRide.b.group.position.y+.33;me.rotation.y=boatRide.heading;}if(bayMode){me.position.copy(bayAvatar.pos);me.rotation.y=bayAvatar.yaw;if(bayAvatar.hide)me.visible=false;/* ngắm cảnh 360° trên chòi Đảo Yên: nhìn bằng mắt người */if(bayPhoto){const p=bayPhoto.pose,sd=bayPhoto.side;me.rotation.y+=Math.PI+p.yaw*sd+sd*.32;me.rotation.z=p.lean*sd;meHead.rotation.set(0,-p.yaw*sd*.7,p.tilt*sd)}}if(!bayMode&&meActivity==='sit'){const seat=cushions.find(c=>Math.hypot(c.x-mePosition.x,c.z-mePosition.z)<.8);if(seat)seatOnCushion(me,seat);}if(gesture){const u=(performance.now()-gesture.start)/1100;if(u>=1){gesture=null;}else if(gesture.kind==='jump'){me.position.y+=Math.sin(Math.PI*u)*.8;}else if(gesture.kind==='spin'){me.rotation.y=u*Math.PI*2;}else if(gesture.kind==='namaste'){me.rotation.z=Math.sin(Math.PI*u)*.12;}else if(gesture.kind==='handshake'){me.rotation.z=Math.sin(u*Math.PI*6)*.09;}else if(gesture.kind==='hello'){me.rotation.z=Math.sin(u*Math.PI*4)*.07;}}const crouchSit=bayMode&&bayAvatar&&((bayAvatar.crouch||0)>.45||!!bayAvatar.sit);/* ngồi phao trượt, ngồi kayak ở Vịnh Yên *//* ngồi xổm nhặt vỏ sò trên Đảo Yên */if(bayMode&&bayAvatar&&bayAvatar.crouch)me.rotation.x=.22*bayAvatar.crouch;if(bayMode&&bayAvatar&&bayAvatar.lean)me.rotation.x=bayAvatar.lean;poseAvatar(meTorso,meHead,meTag,meActivity==='sit'||inBoat||crouchSit);dressAvatar(meOutfit,meTorso,bayMode?bayOutfit.color:myColor,bayMode?bayBaseStyle():myStyle,meActivity==='sit'||inBoat||crouchSit);if(bayDress)bayDress(meActivity==='sit'||crouchSit);if(bayMode&&bayAvatar&&bayAvatar.pose)bayAvatar.pose(me);/* bơi sải ở Vịnh Yên */if(!bayMode)kathinaPose();
    for(const peer of onlineAvatars.values()){
      if(peer.boatTarget&&peer.boat&&peer.boat.group.visible){const g=peer.boat.group,k=Math.min(1,dt*5);g.position.x+=(peer.boatTarget[0]-g.position.x)*k;g.position.z+=(peer.boatTarget[1]-g.position.z)*k;g.position.y=.02+Math.sin(performance.now()/700+peer.boatIndex)*.025;peer.group.position.x=g.position.x;peer.group.position.z=g.position.z}
      peer.group.rotation.set(0,peer.group.userData.yaw||0,0);
      // Height comes from the ground / mat / boat each frame, so a jump never accumulates.
      if(Number.isFinite(peer.baseY))peer.group.position.y=peer.baseY;
      if(!peer.gesture)continue;
      const u=(performance.now()-peer.gesture.start)/1100;
      if(u>=1){peer.gesture=null;continue;}
      if(peer.gesture.kind==='jump')peer.group.position.y=(Number.isFinite(peer.baseY)?peer.baseY:peer.group.position.y)+Math.sin(Math.PI*u)*.8;
      else if(peer.gesture.kind==='spin')peer.group.rotation.y=u*Math.PI*2;
      else if(peer.gesture.kind==='namaste')peer.group.rotation.z=Math.sin(Math.PI*u)*.12;
      else if(peer.gesture.kind==='handshake')peer.group.rotation.z=Math.sin(u*Math.PI*6)*.09;
      else if(peer.gesture.kind==='hello')peer.group.rotation.z=Math.sin(u*Math.PI*4)*.07;
    }
    if(document.body.classList.contains('immersive')){const near=[...onlineAvatars.values()].some(p=>p.group.position.distanceTo(me.position)<7);document.querySelector('#nearGuest').textContent=near?'Có một khách tham quan gần bạn':'Dạo gần một người để chào'};
    
    flowers.forEach((f,i)=>f.position.y=f.userData.y0+Math.sin(t*.8+i)*.02);(window.anyenSmokePuffs||[]).forEach(o=>{o.mesh.position.x=Math.sin(t*.7+o.phase)*.07;o.mesh.material.opacity=.16+.11*Math.sin(t+o.phase)**2;});(window.anyenFlames||[]).forEach(o=>{o.mesh.scale.setScalar(.9+.12*Math.sin(t*6+o.phase));});
    for(const f of pondAnims)f(t);
    water.material.color.setHSL(.48,.31,.27+Math.sin(t*.5)*.01);renderer.render(scene,camera)
  }animate();
  if(window.anyenLite&&window.__liteWant==='room')loadRoomsModule().catch(()=>{});/* trang lite vào nhà: nạp mã phòng ngay khi 3D dựng xong */

 }catch(err){console.error('LÀNG YÊN 3D:',err,err?.cause||'');window.anyen3DLoading=false;document.querySelector('#sceneMode').textContent='3D chưa tải được';let message=String(err?.message||err||'Lỗi không xác định');if(!err?.kind&&/webgl/i.test(message))message='Thiết bị chưa tạo được WebGL nên chưa mở được 3D ('+message+')';message=message.slice(0,220);document.getElementById('zenHint').textContent='Lỗi 3D: '+message;window.anyen3DError=message;document.body.classList.add('yen-3d-error');return false}
 window.anyen3DLoading=false;return true;
};/* Chờ trang dựng xong mọi nút rồi mới khởi tạo 3D: khi thư viện 3D có sẵn trong bộ nhớ đệm, nó tải xong trước cả phần cuối trang. */const anyenStartWorld=()=>{window.anyenWorldReady=window.anyenRetry3D()};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',anyenStartWorld,{once:true});else anyenStartWorld();
