#!/usr/bin/env python3
"""Tách khối Vịnh Yên khỏi js/world3d.js thành js/bay3d.js (nạp lười).

Khối được chạy bằng eval trực tiếp bên trong initialize3D nên vẫn thấy mọi biến của rừng (scene, camera, mat…).
- Biến của khối mà phần còn lại cần đọc/ghi: khai báo `let` ở world3d.js, trong khối bỏ từ khoá (gán vào biến ngoài).
- Hàm của khối mà phần còn lại gọi: biến `let` rỗng ở world3d.js, cuối khối gán lại qua __bayExport({...}).
Chạy lại được: đọc khối từ đánh dấu BAY-BEGIN/BAY-END nếu đã tách, hoặc theo số dòng lần đầu.
"""
import re,sys,hashlib
W='js/world3d.js'
s=open(W,encoding='utf-8').read();L=s.split('\n')
start=next(i for i,l in enumerate(L) if l.startswith('  const BAY={x:0,z:20000};'))
end=next(i for i,l in enumerate(L) if l.startswith('  function loadBayData(){'))
blk=L[start:end+1]
outer_lines=L[:start]+L[end+1:]
outer='\n'.join(outer_lines)
code='\n'.join(blk)
# names declared at the block's top level (2-space indent statements)
def top_decls(text):
    names=[];funcs=[]
    i=0;n=len(text);depth=0
    toks=re.finditer(r"//[^\n]*|/\*.*?\*/|'(?:\\.|[^'\\\n])*'|\"(?:\\.|[^\"\\\n])*\"|`(?:\\.|[^`\\])*`|[{}()\[\]]|\b(?:async\s+)?function\s+[\w$]+|\b(?:const|let|var)\b",text,re.S)
    return toks
# simple top-level scan using brace depth on the joined code
def scan(text):
    out=[]  # (kind,name,pos,stmt_start,stmt_end)
    depth=0;i=0;n=len(text)
    while i<n:
        c=text[i]
        if text.startswith('//',i):j=text.find('\n',i);i=n if j<0 else j;continue
        if text.startswith('/*',i):i=text.find('*/',i)+2;continue
        if c in '\'"`':
            q=c;i+=1
            while i<n and text[i]!=q:
                if text[i]=='\\':i+=1
                elif q=='`' and text.startswith('${',i):
                    d=1;i+=2
                    while d and i<n:
                        if text[i]=='{':d+=1
                        elif text[i]=='}':d-=1
                        i+=1
                    continue
                i+=1
            i+=1;continue
        if c=='/' and depth>=0:
            # regex literal heuristic: previous non-space char is one of ( , = : [ ! & | ? { } ; or start
            k=i-1
            while k>=0 and text[k] in ' \t':k-=1
            if k<0 or text[k] in '(,=:[!&|?{};\n+-*%<>~^':
                if not text.startswith('/=',i) or True:
                    j=i+1;cls=False
                    while j<n and text[j]!='\n':
                        if text[j]=='\\':j+=2;continue
                        if text[j]=='[':cls=True
                        elif text[j]==']':cls=False
                        elif text[j]=='/' and not cls:break
                        j+=1
                    if j<n and text[j]=='/':
                        i=j+1
                        while i<n and text[i].isalpha():i+=1
                        continue
        if c in '{([':depth+=1
        elif c in '})]':depth-=1
        elif depth==0:
            m=re.compile(r'(?:async\s+)?function\s+([\w$]+)').match(text,i)
            if m and (i==0 or not re.match(r'[\w$.]',text[i-1])):
                out.append(('F',m.group(1),i,None,None));i=m.end();continue
            m=re.compile(r'(const|let|var)\s').match(text,i)
            if m and (i==0 or not re.match(r'[\w$.]',text[i-1])):
                # collect declarators until ';' at depth 0
                j=m.end();d=0;names=[];expect=True;cur=''
                while j<n:
                    ch=text[j]
                    if text.startswith('//',j):j=text.find('\n',j);continue
                    if ch in '\'"`':
                        q=ch;j+=1
                        while j<n and text[j]!=q:
                            if text[j]=='\\':j+=1
                            j+=1
                        j+=1;expect=False;continue
                    if ch in '{([':d+=1
                    elif ch in '})]':d-=1
                    elif d==0 and ch==';':break
                    elif d==0 and ch==',':expect=True;cur='';j+=1;continue
                    if expect and d==0:
                        if re.match(r'[\w$]',ch):cur+=ch
                        elif cur:names.append(cur);cur='';expect=False
                        elif ch.strip():expect=False
                    j+=1
                out.append(('V',names,i,m.start(),m.end()));i=j;continue
        i+=1
    return out
decls=scan(code)
vnames=set();fnames=set()
for k,nm,*_ in decls:
    if k=='F':fnames.add(nm)
    else:vnames.update(nm)
def used_outside(n):return re.search(r'(?<![\w$.])'+re.escape(n)+r'(?![\w$])',outer) is not None
# names the forest code needs (declared outside? then it is a local name there, skip)
def declared_outside(n):return re.search(r'(?:const|let|var|function)\s+'+re.escape(n)+r'\b',outer) or re.search(r'(?:for\s*\(\s*(?:const|let)\s*\[[^\]]*\b'+re.escape(n)+r'\b)',outer)
need_v=sorted(n for n in vnames if used_outside(n) and not declared_outside(n))
need_f=sorted(n for n in fnames if used_outside(n) and not declared_outside(n))
# rewrite: drop the keyword of every top-level var statement that declares a needed name; all its names become outer lets
hoist=set();edits=[]
for k,nm,pos,ks,ke in decls:
    if k=='V' and any(x in need_v for x in nm):
        hoist.update(nm);edits.append((ks,ke))
for ks,ke in sorted(edits,reverse=True):code=code[:ks]+code[ke:]
hoist=sorted(hoist)
code+='\n  __bayExport({'+','.join(need_f)+'});\n'
hdr='// LÀNG YÊN · Vịnh Yên (nạp lười). Tách tự động từ js/world3d.js bằng tools/split_lazy.py; chạy bằng eval bên trong initialize3D.\n'
open('js/bay3d.js','w',encoding='utf-8').write(hdr+code)
ver=hashlib.sha1((hdr+code).encode()).hexdigest()[:8]
stub=("  // ===== VỊNH YÊN · nạp lười: phần dựng vịnh nằm ở js/bay3d.js, chỉ tải khi vào vịnh (hoặc lúc rảnh sau khi rừng đã chạy).\n"
 "  // Biến dùng chung với rừng khai báo ở đây; hàm của vịnh được gán lại khi tệp tải xong.\n"
 "  let "+','.join(hoist+need_f)+";\n"
 "  let bayModuleReady=false,bayModuleP=null;\n"
 "  function __bayExport(o){"+';'.join(f+'=o.'+f for f in need_f)+";bayModuleReady=true}\n"
 "  function loadBayModule(){if(bayModuleP)return bayModuleP;bayModuleP=fetch('js/bay3d.js?v="+ver+"').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.text()}).then(code=>{eval(code);if(!bayModuleReady)throw Error('bay module')}).catch(e=>{bayModuleP=null;throw e});return bayModuleP}\n"
 "  window.anyenLoadBay=loadBayModule;")
newL=L[:start]+stub.split('\n')+L[end+1:]
open(W,'w',encoding='utf-8').write('\n'.join(newL))
print('hoisted',hoist);print('funcs',need_f);print('block bytes',len(code.encode()))

# ---- Phòng trong các nhà: các hàm dựng phòng chuyển sang js/rooms3d.js, nạp khi mở phòng đầu tiên.
s=open(W,encoding='utf-8').read();L=s.split('\n')
ROOMS=['roomChuongGio','roomXongHuong','roomQuanTra','roomTuGia','roomTinhThat','roomXuongGom','roomNhaNiem']
parts=[];keep=[];i=0
spans=[]
for f in ROOMS:
    a=next(k for k,l in enumerate(L) if l.startswith('  function '+f+'('))
    b=a+1
    while b<len(L) and not re.match(r'  \S',L[b]):b+=1
    spans.append((a,b,f))
for a,b,f in sorted(spans,reverse=True):
    parts.insert(0,'\n'.join(L[a:b]));L[a:b]=[]
rcode='\n'.join(parts)+'\n  __roomsExport({'+','.join(ROOMS)+'});\n'
rhdr='// LÀNG YÊN · không gian bên trong các nhà (nạp lười). Tách tự động từ js/world3d.js bằng tools/split_lazy.py; chạy bằng eval bên trong initialize3D.\n'
open('js/rooms3d.js','w',encoding='utf-8').write(rhdr+rcode)
rver=hashlib.sha1((rhdr+rcode).encode()).hexdigest()[:8]
s='\n'.join(L)
mk='  let roomRenderer=null;'
assert s.count(mk)==1
s=s.replace(mk,mk+"\n  // Các hàm dựng phòng nằm ở js/rooms3d.js, tải khi mở phòng đầu tiên (hoặc lúc rảnh).\n  let "+','.join(ROOMS)+",roomsReady=false,roomsP=null;\n"
 "  function __roomsExport(o){"+';'.join(f+'=o.'+f for f in ROOMS)+";roomsReady=true}\n"
 "  function loadRoomsModule(){if(roomsP)return roomsP;roomsP=fetch('js/rooms3d.js?v="+rver+"').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.text()}).then(code=>{eval(code);if(!roomsReady)throw Error('rooms module')}).catch(e=>{roomsP=null;throw e});return roomsP}\n"
 "  window.anyenLoadRooms=loadRoomsModule;")
for f in ROOMS:
    s=re.sub(r"(\[\s*'#[0-9a-f]{6}'\s*,\s*'#[0-9a-f]{6}'\s*,\s*)"+f+r"\s*\]",lambda m:m.group(1)+'st=>'+f+'(st)]',s)
open(W,'w',encoding='utf-8').write(s)
print('rooms bytes',len(rcode.encode()))
