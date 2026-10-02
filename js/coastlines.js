/*
  Infinite Coastlines
  https://github.com/evoluteur/infinite-coastlines
  (c) 2026 Olivier Giulieri

  Charts: ruler survey of a generated island, its log-log plot, the Koch
  snowflake, the scaling rule N = s^D, real coastline dimensions, and a
  zoomable Mandelbrot set. Colors are read from the theme's CSS variables.
*/

function initCoastlines() {
const $=id=>document.getElementById(id);
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const DPR=()=>Math.min(window.devicePixelRatio||1,2);
function fit(cv,aspect){const w=cv.clientWidth||cv.parentNode.clientWidth;const h=Math.round(w*aspect);
  cv.style.height=h+'px';const d=DPR();cv.width=Math.round(w*d);cv.height=Math.round(h*d);
  const c=cv.getContext('2d');c.setTransform(d,0,0,d,0,0);return {c,w,h};}

/* ---------- island ---------- */
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;}}
function gauss(r){let u=0,v=0;while(!u)u=r();v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);}
const N=720, KM=100; // N = angle bins for the radius lookup; world radius 1 = 100 km
let seed=7, D=1.25, coast=null, radii=null, curve=[];
function makeIsland(){
  // Start from a lumpy 12-sided outline, then repeatedly push each segment's midpoint
  // sideways by g × its length. Each level doubles the pieces and scales them by
  // r = sqrt(1+4g²)/2, so the curve is self-similar with dimension log2 / log(1/r).
  const r=rng(seed), K=12;
  const rr=1/Math.pow(2,1/D), g=Math.sqrt(Math.max(0,4*rr*rr-1))/2;
  const ph=[r()*6.3,r()*6.3,r()*6.3];
  let pts=[];for(let i=0;i<K;i++){const t=i/K*2*Math.PI;
    const rad=1+0.16*Math.sin(2*t+ph[0])+0.1*Math.sin(3*t+ph[1])+0.07*Math.sin(5*t+ph[2]);
    pts.push([rad*Math.cos(t),rad*Math.sin(t)]);}
  for(let lv=0;lv<11;lv++){const out=[];const M=pts.length;
    for(let i=0;i<M;i++){const A=pts[i],B=pts[(i+1)%M];const dx=B[0]-A[0],dy=B[1]-A[1];
      const e=(r()<0.5?-1:1)*(0.75+0.5*r());
      out.push(A,[(A[0]+B[0])/2-dy*g*e,(A[1]+B[1])/2+dx*g*e]);}
    pts=out;}
  let mx=0;for(const p of pts)mx=Math.max(mx,Math.hypot(p[0],p[1]));
  coast=pts.map(p=>[p[0]*1.32/mx,p[1]*1.32/mx]);
  radii=new Float64Array(N);
  for(const p of coast){const b=Math.floor((Math.atan2(p[1],p[0])+2*Math.PI)%(2*Math.PI)/(2*Math.PI)*N)%N;radii[b]=Math.max(radii[b],Math.hypot(p[0],p[1]));}
  curve=[];const L0=0.006,L1=0.5;
  for(let k=0;k<16;k++){const L=L0*Math.pow(L1/L0,k/15);const w=walk(L);curve.push([L*KM,w.len*KM]);}
}
function walk(L){
  const P=coast,M=P.length;let cx=P[0][0],cy=P[0][1],j=0;const pts=[[cx,cy]];let n=0;
  while(n<40000){let found=false;
    for(;j<M;j++){const A=P[j],B=P[(j+1)%M];
      if(j===M-1){/* last segment back to start */}
      const bx=B[0]-cx,by=B[1]-cy;
      if(bx*bx+by*by>=L*L){
        const dx=B[0]-A[0],dy=B[1]-A[1],fx=A[0]-cx,fy=A[1]-cy;
        const qa=dx*dx+dy*dy,qb=2*(fx*dx+fy*dy),qc=fx*fx+fy*fy-L*L;
        const disc=Math.max(0,qb*qb-4*qa*qc);const t=(-qb+Math.sqrt(disc))/(2*qa);
        if(t>=0&&t<=1){cx=A[0]+t*dx;cy=A[1]+t*dy;pts.push([cx,cy]);n++;found=true;break;}
      }
    }
    if(!found)break;
  }
  const rem=Math.hypot(P[0][0]-cx,P[0][1]-cy);pts.push([P[0][0],P[0][1]]);
  return {n,len:n*L+rem,pts};
}
function fitSlope(){const xs=curve.map(p=>Math.log10(p[0])),ys=curve.map(p=>Math.log10(p[1]));
  const n=xs.length,mx=xs.reduce((a,b)=>a+b)/n,my=ys.reduce((a,b)=>a+b)/n;let sxy=0,sxx=0;
  for(let i=0;i<n;i++){sxy+=(xs[i]-mx)*(ys[i]-my);sxx+=(xs[i]-mx)**2;}const m=sxy/sxx;return {m,b:my-m*mx};}

const rulerKm=()=>0.4*Math.pow(150,$('ruler').value/1000);
const fmt=(v,d=0)=>v.toLocaleString('en-US',{maximumFractionDigits:d,minimumFractionDigits:d});

function drawMap(w){
  const {c,w:W,h}=fit($('map'),1);const s=W/2/1.62,ox=W/2,oy=h/2;
  c.fillStyle=css('--ic-sea');c.fillRect(0,0,W,h);
  const path=k=>{c.beginPath();coast.forEach((p,i)=>{const x=ox+p[0]*s*k,y=oy+p[1]*s*k;i?c.lineTo(x,y):c.moveTo(x,y);});c.closePath();};
  c.strokeStyle=css('--ic-contour');c.lineWidth=1;c.setLineDash([3,4]);
  [1.2,1.1].forEach(k=>{path(k);c.stroke();});c.setLineDash([]);
  // soundings
  const r=rng(99);c.fillStyle=css('--ic-muted');c.font='10px "Overpass Mono", monospace';c.textAlign='center';
  for(let i=0;i<70;i++){const t=r()*2*Math.PI,rad=0.9+r()*0.9;const idx=Math.floor(t/(2*Math.PI)*N)%N;
    if(rad<radii[idx]*1.26)continue;const x=ox+Math.cos(t)*rad*s,y=oy+Math.sin(t)*rad*s;
    if(x<14||x>W-14||y<14||y>h-30)continue;c.fillText(String(Math.round(4+(rad-radii[idx])*60)),x,y);}
  path(1);c.fillStyle=css('--ic-land');c.fill();c.strokeStyle=css('--ic-land-edge');c.lineWidth=1;c.stroke();
  // ruler path
  c.strokeStyle=css('--ic-accent');c.lineWidth=2;c.lineJoin='round';c.beginPath();
  w.pts.forEach((p,i)=>{const x=ox+p[0]*s,y=oy+p[1]*s;i?c.lineTo(x,y):c.moveTo(x,y);});c.stroke();
  if(w.pts.length<160){c.fillStyle=css('--ic-accent');w.pts.forEach(p=>{c.beginPath();c.arc(ox+p[0]*s,oy+p[1]*s,2.6,0,7);c.fill();});}
  // scale bar 50 km
  const bl=0.5*s,bx=16,by=h-18;c.fillStyle=css('--ic-ink');c.strokeStyle=css('--ic-ink');c.lineWidth=1;
  c.fillRect(bx,by,bl/2,4);c.strokeRect(bx+bl/2,by,bl/2,4);c.textAlign='left';c.font='10px "Overpass Mono", monospace';
  c.fillText('0',bx,by-5);c.textAlign='center';c.fillText('25',bx+bl/2,by-5);c.fillText('50 km',bx+bl,by-5);
  // north arrow
  const nx=W-26,ny=26;c.beginPath();c.moveTo(nx,ny+16);c.lineTo(nx,ny-8);c.stroke();
  c.beginPath();c.moveTo(nx,ny-12);c.lineTo(nx-5,ny-2);c.lineTo(nx+5,ny-2);c.closePath();c.fill();
  c.fillText('N',nx,ny+28);
}
function drawPlot(cur){
  const {c,w:W,h}=fit($('plot'),0.62);const pad={l:52,r:14,t:12,b:34};
  const xs=curve.map(p=>Math.log10(p[0])),ys=curve.map(p=>Math.log10(p[1]));
  const x0=Math.log10(0.3),x1=Math.log10(80);let y0=Math.min(...ys),y1=Math.max(...ys);const yp=(y1-y0)*0.12+0.02;y0-=yp;y1+=yp;
  const X=v=>pad.l+(v-x0)/(x1-x0)*(W-pad.l-pad.r),Y=v=>h-pad.b-(v-y0)/(y1-y0)*(h-pad.t-pad.b);
  c.fillStyle=css('--ic-plot');c.fillRect(0,0,W,h);
  c.font='10px "Overpass Mono", monospace';c.strokeStyle=css('--ic-line');c.fillStyle=css('--ic-muted');c.lineWidth=1;
  [0.5,1,2,5,10,20,50].forEach(t=>{const x=X(Math.log10(t));c.beginPath();c.moveTo(x,pad.t);c.lineTo(x,h-pad.b);c.stroke();
    c.textAlign='center';c.fillText(t+'',x,h-pad.b+14);});
  c.textAlign='center';c.fillText('ruler (km)',(pad.l+W-pad.r)/2,h-4);
  const nice=[100,200,300,500,700,1000,1500,2000,3000,5000,7000,10000,15000,20000];
  nice.filter(t=>{const l=Math.log10(t);return l>=y0&&l<=y1;}).forEach(t=>{const y=Y(Math.log10(t));
    c.beginPath();c.moveTo(pad.l,y);c.lineTo(W-pad.r,y);c.stroke();c.textAlign='right';c.fillText(fmt(t),pad.l-6,y+3);});
  const f=fitSlope();c.strokeStyle=css('--ic-ink');c.lineWidth=1.2;c.setLineDash([4,3]);c.beginPath();
  c.moveTo(X(x0),Y(f.m*x0+f.b));c.lineTo(X(x1),Y(f.m*x1+f.b));c.stroke();c.setLineDash([]);
  c.fillStyle=css('--ic-ink');xs.forEach((x,i)=>{c.beginPath();c.arc(X(x),Y(ys[i]),3,0,7);c.fill();});
  c.fillStyle=css('--ic-accent');c.beginPath();c.arc(X(Math.log10(cur[0])),Y(Math.log10(cur[1])),6,0,7);c.fill();
  return f;
}
function update(){
  const L=rulerKm(),w=walk(L/KM);
  $('rulerOut').textContent=(L<10?fmt(L,1):fmt(L))+' km';
  $('steps').textContent=fmt(w.n);$('length').textContent=fmt(w.len*KM)+' km';
  drawMap(w);const f=drawPlot([L,w.len*KM]);
  $('slope').textContent=f.m.toFixed(2);$('dimEst').textContent=(1-f.m).toFixed(2);
  $('factor').textContent=Math.pow(10,-f.m).toFixed(1)+'×';
}
function regen(){makeIsland();update();}
$('ruler').addEventListener('input',update);
$('rough').addEventListener('input',()=>{$('roughOut').textContent=($('rough').value/100).toFixed(2);});
$('rough').addEventListener('change',()=>{D=$('rough').value/100;regen();});
$('newIsland').addEventListener('click',()=>{seed=Math.floor(Math.random()*1e9);regen();});

/* ---------- Koch ---------- */
function kochPts(n,a,b){let pts=[a,b];for(let k=0;k<n;k++){const out=[pts[0]];
  for(let i=0;i<pts.length-1;i++){const [x1,y1]=pts[i],[x2,y2]=pts[i+1],dx=(x2-x1)/3,dy=(y2-y1)/3;
    const p1=[x1+dx,y1+dy],p2=[x1+2*dx,y1+2*dy];const c=Math.cos(-Math.PI/3),s=Math.sin(-Math.PI/3);
    const pk=[p1[0]+dx*c-dy*s,p1[1]+dx*s+dy*c];out.push(p1,pk,p2,pts[i+1]);}pts=out;}return pts;}
function drawKoch(){
  const n=+$('iter').value;const {c,w:W,h}=fit($('koch'),0.92);
  c.fillStyle=css('--ic-sea');c.fillRect(0,0,W,h);
  const R=Math.min(W,h)*0.36,cx=W/2,cy=h/2+R*0.12;
  const v=[0,1,2].map(i=>{const t=-Math.PI/2+i*2*Math.PI/3;return [cx+R*Math.cos(t),cy+R*Math.sin(t)];});
  let all=[];for(let i=0;i<3;i++){const seg=kochPts(n,v[i],v[(i+1)%3]);all=all.concat(i?seg.slice(1):seg);}
  c.beginPath();all.forEach((p,i)=>i?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.closePath();
  c.fillStyle=css('--ic-land');c.fill();c.strokeStyle=css('--ic-land-edge');c.lineWidth=1;c.stroke();
  $('iterOut').textContent=n;
  $('kSides').textContent=fmt(3*Math.pow(4,n));
  $('kSide').textContent=n===0?'1':'1/'+fmt(Math.pow(3,n));
  $('kPer').textContent=(3*Math.pow(4/3,n)).toFixed(2);
  $('kArea').textContent=(1.6-0.6*Math.pow(4/9,n)).toFixed(4);
}
$('iter').addEventListener('input',drawKoch);

/* ---------- scaling figures ---------- */
function drawScaling(){
  const ink=css('--ic-ink'),mag=css('--ic-accent'),paper=css('--ic-panel');
  [['sc1',0],['sc2',1],['sc3',2]].forEach(([id,k])=>{const {c,w:W,h}=fit($(id),0.5);c.fillStyle=paper;c.fillRect(0,0,W,h);
    const L=W*0.84,x0=W*0.08;c.lineWidth=2;
    if(k===0){for(let i=0;i<3;i++){c.strokeStyle=i===1?mag:ink;c.beginPath();c.moveTo(x0+i*L/3+2,h/2);c.lineTo(x0+(i+1)*L/3-2,h/2);c.stroke();}}
    if(k===1){const S=h*0.8,sx=(W-S)/2,sy=h*0.1;for(let i=0;i<3;i++)for(let j=0;j<3;j++){c.fillStyle=(i===1&&j===1)?mag:ink;
      c.globalAlpha=(i===1&&j===1)?0.85:0.2+0.08*((i+j)%2);c.fillRect(sx+i*S/3+1.5,sy+j*S/3+1.5,S/3-3,S/3-3);}c.globalAlpha=1;}
    if(k===2){const base=h*0.82;const top=kochPts(1,[x0,base],[x0+L,base]);
      for(let i=0;i<4;i++){const seg=kochPts(3,top[i],top[i+1]);c.strokeStyle=i===1?mag:ink;c.beginPath();
        seg.forEach((p,j)=>j?c.lineTo(p[0],p[1]):c.moveTo(p[0],p[1]));c.stroke();}}
  });
}

/* ---------- real coasts ---------- */
const COASTS=[["South Africa coast",1.02],["Australia coast",1.13],["Spain–Portugal border",1.14],
  ["Germany land border (1900)",1.15],["West coast of Britain",1.25],["Koch snowflake",1.26],["Norway coast",1.52]];
$('coasts').innerHTML='<div class="axis"><span></span><div><span>1.0 smooth line</span><span>1.5</span><span>2.0 fills plane</span></div><span></span></div>'+
  COASTS.map(([n,d])=>`<div class="coast-row"><span>${n}</span><div class="bar" role="img" aria-label="${n}: dimension ${d}"><i style="width:${(d-1)*100}%"></i></div><span>${d.toFixed(2)}</span></div>`).join('');

/* ---------- Mandelbrot explorer ---------- */
const MB={cx:-0.6,cy:0,span:3.2,gen:0,W:0,H:0,img:null,buf:null};
const MB_HOME={cx:-0.6,cy:0,span:3.2};
const PRESETS=[["Seahorse Valley",-0.743643887,0.131825904,0.004],["Elephant Valley",0.2822,0.0101,0.012],
  ["Mini island",-1.7499,0,0.0035],["Spiral bay",-0.761574,-0.0847596,0.0006]];
const hexRGB=h=>{h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return [n>>16&255,n>>8&255,n&255];};
let mbPal=null;
const MB_PALETTES={
  lagoon:{name:"Lagoon",inside:"#020a16",stops:["#04102a","#0b3c6e","#1677a8","#2fb3b5","#a6ecd6","#fff4c9","#f6b24a","#d9534f","#6b1f5c","#04102a"]},
  sunset:{name:"Sunset",inside:"#0c0517",stops:["#1a0b2e","#4a1060","#9c1f6a","#e2484b","#f79b3f","#ffe08a","#fff8e7","#7fd1c7","#2b6f8f","#1a0b2e"]},
  chart:{name:"Survey chart"}
};
let mbPalName='lagoon';
function mbPalette(){
  const def=MB_PALETTES[mbPalName];let stops,inside;
  if(mbPalName==='chart'){const sea=css('--ic-sea'),con=css('--ic-contour');stops=[sea,con,css('--ic-plot'),css('--ic-accent'),con,sea];inside=css('--ic-land');}
  else{stops=def.stops;inside=def.inside;}
  stops=stops.map(hexRGB);const S=1024,P=new Uint8ClampedArray(S*3),n=stops.length-1;
  for(let i=0;i<S;i++){const t=i/S*n,k=Math.floor(t),f=t-k,e=f*f*(3-2*f); // smoothstep between stops
    for(let c=0;c<3;c++)P[i*3+c]=stops[k][c]+(stops[k+1][c]-stops[k][c])*e;}
  mbPal={P,S,land:hexRGB(inside)};
}
const mbMaxIter=()=>Math.min(3000,Math.round(150+90*Math.log2(MB_HOME.span/MB.span+1)));
function mbPixel(x0,y0,maxIt){
  // cardioid and period-2 bulb shortcut
  const q=(x0-0.25)**2+y0*y0;if(q*(q+(x0-0.25))<0.25*y0*y0||(x0+1)**2+y0*y0<0.0625)return -1;
  let x=0,y=0,x2=0,y2=0,n=0;
  while(x2+y2<256&&n<maxIt){y=2*x*y+y0;x=x2-y2+x0;x2=x*x;y2=y*y;n++;}
  if(n>=maxIt)return -1;
  return n+1-Math.log2(Math.log2(x2+y2)/2);
}
function mbColor(mu,o,d){
  if(mu<0){d[o]=mbPal.land[0];d[o+1]=mbPal.land[1];d[o+2]=mbPal.land[2];d[o+3]=255;return;}
  const t=Math.log2(mu+1)*0.85+0.15,f=t-Math.floor(t);
  const i=Math.floor(f*mbPal.S)*3,P=mbPal.P;
  d[o]=P[i];d[o+1]=P[i+1];d[o+2]=P[i+2];d[o+3]=255;
}
function mbSetup(){
  const cv=$('mb');const w=cv.clientWidth||cv.parentNode.clientWidth;const h=Math.round(w*0.66);
  cv.style.height=h+'px';const d=Math.min(window.devicePixelRatio||1,1.5);
  MB.W=Math.round(w*d);MB.H=Math.round(h*d);cv.width=MB.W;cv.height=MB.H;MB.css=w;
  MB.ctx=cv.getContext('2d');MB.img=MB.ctx.createImageData(MB.W,MB.H);mbPalette();
}
function mbReadouts(){
  const mag=MB_HOME.span/MB.span;
  $('mbMag').textContent=mag<1e4?fmt(mag,mag<10?1:0)+'×':mag.toExponential(1).replace('e+',' × 10^')+'';
  $('mbIter').textContent=fmt(mbMaxIter());
  const dig=Math.max(3,Math.ceil(Math.log10(MB.W/MB.span))+1);
  $('mbCenter').textContent=MB.cx.toFixed(dig)+(MB.cy<0?' − ':' + ')+Math.abs(MB.cy).toFixed(dig)+'i';
}
function mbRender(){
  const gen=++MB.gen,W=MB.W,H=MB.H,maxIt=mbMaxIter(),sp=MB.span/W,x0=MB.cx-MB.span/2,y0=MB.cy+sp*H/2;
  const data=MB.img.data;mbReadouts();
  // quick coarse pass, 6px blocks
  const B=6;for(let py=0;py<H;py+=B)for(let px=0;px<W;px+=B){const mu=mbPixel(x0+(px+B/2)*sp,y0-(py+B/2)*sp,Math.min(maxIt,400));
    const o=(py*W+px)*4;mbColor(mu,o,data);
    for(let yy=py;yy<Math.min(py+B,H);yy++)for(let xx=px;xx<Math.min(px+B,W);xx++){const q=(yy*W+xx)*4;data[q]=data[o];data[q+1]=data[o+1];data[q+2]=data[o+2];data[q+3]=255;}}
  MB.ctx.putImageData(MB.img,0,0);
  // full-resolution pass in time slices
  let row=0;
  (function slice(){if(gen!==MB.gen)return;const t0=performance.now();const startRow=row;
    while(row<H&&performance.now()-t0<14){for(let px=0;px<W;px++)mbColor(mbPixel(x0+px*sp,y0-row*sp,maxIt),(row*W+px)*4,data);row++;}
    MB.ctx.putImageData(MB.img,0,0,0,startRow,W,row-startRow);
    if(row<H)setTimeout(slice,0);})();
}
function mbZoomAt(fx,fy,factor){ // fx,fy: fraction of canvas
  const px=MB.cx+(fx-0.5)*MB.span,py=MB.cy-(fy-0.5)*MB.span*MB.H/MB.W;
  const ns=Math.max(3.2e-13,Math.min(4,MB.span*factor));const k=ns/MB.span;
  MB.cx=px+(MB.cx-px)*k;MB.cy=py+(MB.cy-py)*k;MB.span=ns;mbRender();
}
(function mbEvents(){
  const cv=$('mb');let drag=null,wheelT;
  const frac=e=>{const r=cv.getBoundingClientRect();return [(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height];};
  cv.addEventListener('pointerdown',e=>{cv.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,cx:MB.cx,cy:MB.cy,moved:false,shift:e.shiftKey};
    MB.snap=document.createElement('canvas');MB.snap.width=MB.W;MB.snap.height=MB.H;MB.snap.getContext('2d').drawImage(cv,0,0);});
  cv.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(!drag.moved&&Math.hypot(dx,dy)<5)return;drag.moved=true;cv.classList.add('dragging');MB.gen++;
    const r=cv.getBoundingClientRect(),s=MB.W/r.width;MB.ctx.fillStyle=css('--ic-sea');MB.ctx.fillRect(0,0,MB.W,MB.H);
    MB.ctx.drawImage(MB.snap,dx*s,dy*s);});
  const end=e=>{if(!drag)return;cv.classList.remove('dragging');const r=cv.getBoundingClientRect();
    if(drag.moved){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;MB.cx=drag.cx-dx/r.width*MB.span;MB.cy=drag.cy+dy/r.width*MB.span;mbRender();}
    else{const [fx,fy]=frac(e);mbZoomAt(fx,fy,drag.shift?2:0.4);}drag=null;};
  cv.addEventListener('pointerup',end);cv.addEventListener('pointercancel',()=>{drag=null;cv.classList.remove('dragging');mbRender();});
  cv.addEventListener('wheel',e=>{e.preventDefault();const [fx,fy]=frac(e);
    const f=Math.pow(1.0018,e.deltaMode?e.deltaY*30:e.deltaY);
    const px=MB.cx+(fx-0.5)*MB.span,py=MB.cy-(fy-0.5)*MB.span*MB.H/MB.W;const ns=Math.max(3.2e-13,Math.min(4,MB.span*f)),k=ns/MB.span;
    MB.cx=px+(MB.cx-px)*k;MB.cy=py+(MB.cy-py)*k;MB.span=ns;mbReadouts();clearTimeout(wheelT);wheelT=setTimeout(mbRender,60);},{passive:false});
  $('mbIn').addEventListener('click',()=>mbZoomAt(0.5,0.5,0.4));
  $('mbOut').addEventListener('click',()=>mbZoomAt(0.5,0.5,2.5));
  $('mbReset').addEventListener('click',()=>{Object.assign(MB,MB_HOME);mbRender();});
  Object.entries(MB_PALETTES).forEach(([k,v])=>{const b=document.createElement('button');b.type='button';b.textContent=v.name;
    b.setAttribute('aria-pressed',k===mbPalName);b.addEventListener('click',()=>{mbPalName=k;
      $('mbColors').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));mbPalette();mbRender();});
    $('mbColors').appendChild(b);});
  PRESETS.forEach(([n,x,y,s])=>{const b=document.createElement('button');b.type='button';b.textContent=n;
    b.addEventListener('click',()=>{MB.cx=x;MB.cy=y;MB.span=s;mbRender();});$('mbPresets').appendChild(b);});
})();

function redrawAll(){update();drawKoch();drawScaling();mbSetup();mbRender();}
makeIsland();redrawAll();
let rt;window.addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(redrawAll,120);});
new MutationObserver(()=>{mbPalette();redrawAll();}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
const themeLink=document.getElementById('omg-theme-css');
if(themeLink)themeLink.addEventListener('load',redrawAll);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(redrawAll);
}
