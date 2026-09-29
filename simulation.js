(function(root){
function coefficients(p){
 const T=p.dt/1000,fo=1/p.tau,D=4/(T*T)+2*Math.SQRT2*fo/T+fo*fo;
 return {fo,D,b0:fo*fo/D,b1:2*fo*fo/D,b2:fo*fo/D,a1:(2*fo*fo-8/(T*T))/D,a2:(4/(T*T)-2*Math.SQRT2*fo/T+fo*fo)/D};
}
function createFilter(p){
 const alpha=(p.dt/1000)/(p.tau+p.dt/1000),c=coefficients(p);
 let y=0,x1=0,x2=0,y1=0,y2=0;
 return x=>{if(p.filter!=='butterworth'){y+=alpha*(x-y);return y;}
 y=c.b0*x+c.b1*x1+c.b2*x2-c.a1*y1-c.a2*y2;
 x2=x1;x1=x;y2=y1;y1=y;return y;};
}
function simulate(p,duration=185){
 const T=p.dt/1000,alpha=T/(p.tau+T);let seed=73191;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296};
 // Input randomness is independent of the scheduler seed.
 const noise=k=>{let z=(k+91031)|0;z=Math.imul(z^(z>>>16),0x45d9f3b);z=Math.imul(z^(z>>>16),0x45d9f3b);return ((z^(z>>>16))>>>0)/4294967296*2-1;};
 const signal=(t,i)=>{const phase=p.freq*t,a=2*Math.PI*phase,n=noise(i),cycle=Math.floor(phase),u=phase-cycle;
 switch(p.wave){
 case 'stress':{const position=phase%1;return position<.30?1:position<.50?-1:position<.85?1:-1;}
 case 'square':return Math.sin(a)>=0?1:-1;
 case 'noisy':return .65*Math.sin(a)+.35*n;
 case 'mixed':return .5*Math.sin(a)+.3*Math.sin(2.7*a+.5)+.2*Math.sin(7.1*a+1.2);
 case 'drift':{const smooth=u*u*(3-2*u);return .8*(noise(cycle+70000)*(1-smooth)+noise(cycle+70001)*smooth)+.2*n;}
 case 'spikes':{const center=.2+.6*(noise(cycle+80000)+1)/2;const pulse=Math.max(0,1-Math.abs(u-center)/.035);return .2*Math.sin(a*.37)+.7*(noise(cycle+90000)>0?1:-1)*pulse+.1*n;}
 case 'steps':return .85*noise(cycle+60000)+.15*n;
 default:return Math.sin(a);
 }};
 const source=[],ideal=[],late=[],onTimeFilter=createFilter(p),lateFilter=createFilter(p);let y=0;
 for(let i=0;i*T<=duration;i++){const x=signal(i*T,i);source.push({t:i*T,y:x});y=onTimeFilter(x);ideal.push({t:i*T,y});}
 let release=0,lastIndex=-1; y=0;
 while(release*T<=duration){const t=release*T+(p.timing==='fixed'?1:rand())*p.late/1000;if(t>duration)break;const index=Math.min(source.length-1,Math.floor((t+1e-10)/T));const count=index-lastIndex;
 if(p.buffer==='queue'){for(let i=lastIndex+1;i<=index;i++)y=lateFilter(source[i].y);}else{y=lateFilter(source[index].y);}
 late.push({t,y,skipped:p.buffer==='queue'?0:Math.max(0,count-1),consumed:count});lastIndex=index;release=Math.floor((t+1e-10)/T)+1;
 }return {source,ideal,late,alpha,T,coefficients:coefficients(p)};
}
function valueAt(events,t){let lo=0,hi=events.length;while(lo<hi){let m=(lo+hi)>>1;if(events[m].t<=t)lo=m+1;else hi=m;}return lo?events[lo-1].y:0;}
root.FilterSimulation={simulate,valueAt,coefficients,createFilter};if(typeof module!=='undefined')module.exports=root.FilterSimulation;
})(globalThis);
