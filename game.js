(() => {
'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const stages=[
{id:'warmup',name:'Warm-up',desc:'Sunrise Park',emoji:'☀',bpm:105,seconds:60,met:2.5},
{id:'light',name:'Light',desc:'Campus Park',emoji:'🌿',bpm:115,seconds:60,met:3.5},
{id:'moderate',name:'Moderate',desc:'Taipei City Run',emoji:'🏙',bpm:125,seconds:90,met:5},
{id:'vigorous',name:'Vigorous',desc:'Riverside Cherry Blossom',emoji:'🌸',bpm:135,seconds:120,met:7},
{id:'maximum',name:'Maximum',desc:'Mountain Trail',emoji:'⛰',bpm:145,seconds:120,met:8},
{id:'interval',name:'Interval',desc:'Night Challenge',emoji:'⚡',bpm:130,seconds:180,met:6},
{id:'cooldown',name:'Cool-down',desc:'Sunset Lakeside',emoji:'☾',bpm:90,seconds:60,met:2.3}];
const moves=['up','side','down','jack'], symbols={up:'↑',side:'↔',down:'↓',jack:'👏'};
let mode='workout',selected=stages[1],playing=false,paused=false,started=false,frame=0,notes=[],events=[],score=0,combo=0,maxCombo=0,hits=0,misses=0,elapsed=0,clockStart=0,pauseStarted=0,lastFrame=0,feedbackTimer=0,trackMode='keyboard',pose=null,cameraStream=null,poseLoop=false,peer=null,phoneConn=null,phoneMotion=0,phoneArm='left';
let audio=null,nextBeat=0,beatIndex=0,beatBpm=100;const soundtrack=new Audio();soundtrack.loop=true;soundtrack.preload='auto';soundtrack.addEventListener('error',()=>{if($('#tracking'))$('#tracking').textContent='Music file unavailable — rhythm cues still work'});
const settings={music:65,fx:45,reduced:false};
try{Object.assign(settings,JSON.parse(localStorage.getItem('fitbeatSettings')||'{}'))}catch{}
function save(){localStorage.setItem('fitbeatSettings',JSON.stringify(settings))}
function page(id){document.body.classList.toggle('camera-setup-visible',id==='settings');if(playing) stopGame();$$('.page').forEach(p=>p.classList.toggle('active',p.id===id));window.scrollTo(0,0);if(id==='select')renderStages();if(id==='progress')window.fitbeatRefresh?.()}
$$('[data-page]').forEach(b=>b.addEventListener('click',()=>page(b.dataset.page)));
function renderStages(){const filtered=stages.filter(s=>mode==='workout'?!['warmup','cooldown'].includes(s.id):s.id===mode);$('#stagecards').innerHTML=filtered.map(s=>`<button class="stage-card" data-stage="${s.id}"><img src="assets/${s.id}.webp" alt="${s.desc} stage background"><span class="stage-emoji">${s.emoji}</span><strong>${s.name}</strong><small>${s.desc} · ${s.bpm} BPM · ${s.seconds}s</small></button>`).join('');$$('[data-stage]').forEach(b=>b.onclick=()=>prepare(stages.find(s=>s.id===b.dataset.stage)))}
$$('[data-mode]').forEach(b=>b.onclick=()=>{mode=b.dataset.mode;$$('[data-mode]').forEach(x=>x.classList.toggle('active',x===b));renderStages()});
for(const [id,key] of [['musicVol','music'],['fxVol','fx']]){$('#'+id).value=settings[key];$('#'+id.replace('Vol','Out')).textContent=settings[key]+'%';$('#'+id).oninput=e=>{settings[key]=+e.target.value;$('#'+id.replace('Vol','Out')).textContent=settings[key]+'%';if(key==='music')soundtrack.volume=settings.music/100;save()}}

$('#reduceMotion').checked=settings.reduced;document.body.classList.toggle('reduced',settings.reduced);$('#reduceMotion').onchange=e=>{settings.reduced=e.target.checked;document.body.classList.toggle('reduced',settings.reduced);save()};
function prepare(stage){selected=stage;page('play');$('#playBg').style.backgroundImage=`url("assets/${stage.id}.webp")`;reset();showOverlay('GET READY','Ready to Move?',`${stage.name} • ${stage.bpm} BPM • ${stage.seconds} seconds`,'▶ Start Game',startGame)}
function reset(){jackOpen=false;armStates.left.position='unknown';armStates.right.position='unknown';notes=[];events=[];score=combo=maxCombo=hits=misses=elapsed=0;started=false;playing=false;paused=false;$('#score').textContent='0';$('#combo').textContent='0';$('#timer').textContent=formatTime(selected.seconds);$('#progressBar').style.width='0%';$('#feedback').textContent='';$('#leftNotes').querySelectorAll('.note').forEach(n=>n.remove());$('#rightNotes').querySelectorAll('.note').forEach(n=>n.remove());$('#tracking').textContent=cameraStream?'📷 Camera tracking ready':'⌨ Keyboard mode'}
function showOverlay(eyebrow,title,desc,action,fn){$('#overlayEyebrow').textContent=eyebrow;$('#overlayTitle').textContent=title;$('#overlayText').textContent=desc;$('#overlayAction').textContent=action;$('#overlayAction').onclick=fn;$('#overlay').classList.remove('hidden')}
function formatTime(n){n=Math.max(0,Math.ceil(n));return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`}
// Adaptive stage-specific movement cadence. Musical BPM stays unchanged.
// Movement cues are spaced to remain playable and readable on both lanes.
function buildSequence(){
 const beat=60/selected.bpm, end=selected.seconds-0.65;
 // Number of musical beats per movement count. The minimum between
 // repeated cues prevents dense overlapping notes and gives webcam time.
 const pace={warmup:4.5,light:3.5,moderate:3.5,vigorous:3.5,maximum:3,interval:3.5,cooldown:4.5};
 const count=beat*pace[selected.id];
 const minGap=beat*({warmup:3.5,light:3,moderate:3, vigorous:3,maximum:3,interval:3,cooldown:3.5}[selected.id]);
 const step=(gap)=>Math.max(minGap,gap*count);
 let t=4*beat, id=0;
 const add=(arm,move,time)=>{if(time<end)events.push({id:id++,arm,move,at:time,spawned:false,judged:false})};
 const both=(move,time)=>{add('left',move,time);add('right',move,time)};
 const repeated=(arm,move,n,gap)=>{for(let i=0;i<n;i++){if(arm==='both')both(move,t);else add(arm,move,t);t+=step(gap)}};
 const alternate=(n,gap)=>{for(let i=0;i<n;i++){add(i%2===0?'left':'right','up',t);t+=step(gap)}};
 const updown=(arm,n)=>{for(let i=0;i<n;i++){if(arm==='both')both('up',t);else add(arm,'up',t);t+=step(1);if(arm==='both')both('down',t);else add(arm,'down',t);t+=step(3)}};
 const jack=(n,gap)=>{for(let i=0;i<n;i++){both('jack',t);t+=step(gap)}};
 const warm=()=>{both('up',t);t+=count;both('side',t);t+=count;updown('both',6);add('left','side',t);t+=2*count;add('right','side',t);t+=2*count;for(let i=0;i<6;i++){add('left','side',t);t+=2*count;add('right','side',t);t+=2*count}};
 const light=()=>{repeated('right','up',6,1);t+=2*count;repeated('left','up',6,1);t+=2*count;repeated('right','side',6,1);t+=2*count;repeated('left','side',6,1);t+=5*count;jack(8,3);alternate(6,1);repeated('both','side',6,2)};
 const moderate=()=>{alternate(6,1);t+=count;repeated('right','up',8,.5);t+=count;repeated('left','up',8,.5);t+=count;repeated('both','side',6,1);jack(8,3);updown('right',6);updown('left',6);t+=2*count};
 const vigorous=(fast=false)=>{const k=fast?.5:1;alternate(6,k);t+=count;repeated('right','up',8,.5*k);t+=count;repeated('left','up',8,.5*k);t+=count;jack(8,2*k);t+=count;repeated('both','side',6,k);t+=count};
 const interval=()=>{const hard=Math.floor(t/30)%2===1, factor=hard?.5:1;repeated('right','up',6,factor);t+=count;repeated('left','up',6,factor);t+=count;jack(8,2*factor);t+=count};
 while(t<end){const before=t;
  switch(selected.id){case 'warmup':case 'cooldown':warm();break;case 'light':light();break;case 'moderate':moderate();break;case 'vigorous':vigorous();break;case 'maximum':vigorous(true);break;case 'interval':interval();break;}
  if(t<=before)t=before+count;
 }
 // Keep paired left/right events synchronized while protecting each lane.
 events.sort((a,b)=>a.at-b.at||a.id-b.id);
 const lastAt={left:-Infinity,right:-Infinity};
 const grouped=new Map();
 for(const ev of events){const key=ev.at.toFixed(6);if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(ev)}
 for(const group of grouped.values()){
   const at=Math.max(group[0].at,...group.map(ev=>lastAt[ev.arm]+minGap));
   for(const ev of group){ev.at=at;lastAt[ev.arm]=at}
 }
 events=events.filter(ev=>ev.at<end);
 events.sort((a,b)=>a.at-b.at||a.id-b.id);
}
function initAudio(){try{audio=audio||new (window.AudioContext||window.webkitAudioContext)();audio.resume()}catch{}}
function tone(freq,duration,vol,type='sine'){if(!audio||vol<=0)return;const osc=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;osc.type=type;osc.frequency.setValueAtTime(freq,now);gain.gain.setValueAtTime(Math.min(.16,vol/100*.12),now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);osc.connect(gain).connect(audio.destination);osc.start(now);osc.stop(now+duration+.01)}
function startGame(){reset();buildSequence();initAudio();soundtrack.src='assets/music/'+selected.id+'.ogg';soundtrack.volume=settings.music/100;soundtrack.currentTime=0;soundtrack.play().catch(()=>{$('#tracking').textContent='Tap to enable music; gameplay continues'});$('#overlay').classList.add('hidden');playing=true;started=true;clockStart=performance.now();lastFrame=clockStart;beatIndex=0;nextBeat=0;frame=requestAnimationFrame(tick)}
function tick(now){if(!playing||paused)return;elapsed=(now-clockStart)/1000;const remain=selected.seconds-elapsed;$('#timer').textContent=formatTime(remain);$('#progressBar').style.width=(100*Math.min(1,elapsed/selected.seconds))+'%';
// Music is an original per-stage loop, synchronized to the session start.
for(const ev of events){if(!ev.spawned && elapsed>=ev.at-1.35){ev.spawned=true;const el=document.createElement('div');el.className='note '+ev.move;const iconName=ev.move==='side'?'side_'+ev.arm:ev.move;el.innerHTML=`<img src="assets/icons/${iconName}.${ev.move==='jack'?'svg':'png'}" alt="${ev.arm} ${ev.move}">`;el.setAttribute('aria-label',ev.move);ev.el=el;$('#'+ev.arm+'Notes').append(el);notes.push(ev);if(ev.move==='jack'&&ev.arm==='left'){const j=$('#jumpFx');j.classList.remove('jump-pop');void j.offsetWidth;j.classList.add('jump-pop')}}
if(ev.spawned&&!ev.judged){const area=ev.el.parentElement;const h=area.clientHeight;const target=h*.76+33;const progress=(elapsed-(ev.at-1.35))/1.35;ev.el.style.top=(Math.max(-40,Math.min(h+70,progress*target)))+'px';if(elapsed>ev.at+.58)judge(ev,false)}}
if(elapsed>=selected.seconds){finish();return}frame=requestAnimationFrame(tick)}
function feedback(text,good){$('#feedback').textContent=text;$('#feedback').style.color=good?'#81f5e5':'#ff9fbd';clearTimeout(feedbackTimer);feedbackTimer=setTimeout(()=>$('#feedback').textContent='',450)}
function judge(ev,good){if(ev.judged)return;ev.judged=true;ev.el?.remove();if(good){hits++;combo++;maxCombo=Math.max(combo,maxCombo);const delta=Math.abs(elapsed-ev.at);score+=delta<.14?120:90;feedback(delta<.14?'PERFECT!':'GREAT!',true);tone(delta<.14?660:520,.12,settings.fx)}else{misses++;combo=0;feedback('MISS',false);tone(190,.13,settings.fx)}$('#score').textContent=score;$('#combo').textContent=combo}
function inputMove(arm,move){if(!playing||paused)return;const candidate=events.filter(e=>e.arm===arm&&e.move===move&&e.spawned&&!e.judged&&Math.abs(e.at-elapsed)<.58).sort((a,b)=>Math.abs(a.at-elapsed)-Math.abs(b.at-elapsed))[0];if(candidate)judge(candidate,true)}
const keys={'1':['left','up'],'2':['left','side'],'3':['left','jack'],'4':['left','down'],q:['right','up'],w:['right','side'],e:['right','jack'],r:['right','down']};
window.addEventListener('keydown',e=>{if(['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName))return;const k=e.key.toLowerCase();if(keys[k]){e.preventDefault();inputMove(...keys[k])}if(k===' '&&$('#play').classList.contains('active')){e.preventDefault();if(playing)togglePause()}});
function stopGame(){soundtrack.pause();playing=false;paused=false;cancelAnimationFrame(frame);$('#overlay').classList.add('hidden')}
function togglePause(){if(!playing)return;if(!paused){paused=true;soundtrack.pause();pauseStarted=performance.now();cancelAnimationFrame(frame);showOverlay('PAUSED','Take a Break','Resume when you are ready.','▶ Resume',togglePause);$('#pause').textContent='▶ Resume'}else{clockStart+=performance.now()-pauseStarted;paused=false;soundtrack.play().catch(()=>{});$('#overlay').classList.add('hidden');$('#pause').textContent='Ⅱ Pause';frame=requestAnimationFrame(tick)}}
$('#pause').onclick=togglePause;$('#quit').onclick=()=>page('select');
function finish(){const duration=Math.min(elapsed,selected.seconds);stopGame();const total=hits+misses;$('#resultScore').textContent=score;$('#resultAccuracy').textContent=(total?Math.round(hits/total*100):0)+'%';$('#resultCombo').textContent=maxCombo;const kcal=selected.met*(window.fitbeatGetWeight?.()||60)*duration/3600;$('#resultKcal').textContent=kcal.toFixed(1)+' kcal';window.fitbeatRecord?.({stage:selected.name,stageId:selected.id,score,accuracy:total?Math.round(hits/total*100):0,maxCombo,durationSeconds:Math.round(duration),kcal:Number(kcal.toFixed(2))});const best=+(localStorage.getItem('fitbeatBest')||0);if(score>best)localStorage.setItem('fitbeatBest',score);page('results')}
$('#retry').onclick=()=>prepare(selected);
// Camera: hands are located using wrist/shoulder landmarks, without leg tracking.
// Jumping Jack requires both arms to rise and return down; no jump is required for scoring.
const armStates={left:{last:'',lastAt:0,position:'unknown'},right:{last:'',lastAt:0,position:'unknown'}};
let jackOpen=false,jackOpenAt=0,lastJack=0;
async function cameraToggle(){
 const video=$('#cam');
 if(cameraStream){poseLoop=false;cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null;video.pause();video.srcObject=null;video.style.display='none';$('#cameraToggle').textContent='📷 Start Camera';$('#cameraStatus').textContent='Camera off';return}
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Camera requires HTTPS and browser permission');
  cameraStream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:640},height:{ideal:480},facingMode:'user'},audio:false});
  // Keep the camera video visible while playing; hidden Settings videos can stop updating on some browsers.
  video.classList.add('fitbeat-camera-preview');video.style.display='block';document.body.classList.toggle('camera-setup-visible',$('#settings').classList.contains('active'));video.srcObject=cameraStream;
  await video.play();$('#cameraStatus').textContent='Loading camera model…';$('#cameraToggle').textContent='Stop Camera';
  await loadPose();poseLoop=true;$('#cameraStatus').textContent='Camera running — move your hands';processPose();
 }catch(e){$('#cameraStatus').textContent='Camera error: '+e.message;$('#tracking').textContent='⚠ '+e.message;if(cameraStream){cameraStream.getTracks().forEach(t=>t.stop());cameraStream=null}video.style.display='none';$('#cameraToggle').textContent='📷 Start Camera'}
}
function script(src){return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=src;s.onload=resolve;s.onerror=()=>reject(new Error('Could not load '+src));document.head.append(s)})}
async function loadPose(){if(pose)return;await script('https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js');pose=new Pose({locateFile:f=>'https://cdn.jsdelivr.net/npm/@mediapipe/pose/'+f});pose.setOptions({modelComplexity:0,smoothLandmarks:true,minDetectionConfidence:.42,minTrackingConfidence:.4});pose.onResults(onPose)}
function onPose(result){const lm=result.poseLandmarks;if(!lm){$('#tracking').textContent='⚠ No body landmarks — move farther back';return}
 const now=performance.now();let tracked=0;
 for(const [arm,sh,wr] of [['left',11,15],['right',12,16]]){
  const shoulder=lm[sh],wrist=lm[wr],st=armStates[arm];
  if(!shoulder||!wrist||shoulder.visibility<.25||wrist.visibility<.20){st.position='unknown';continue}
  tracked++;
  const width=Math.max(.10,Math.abs(lm[11].x-lm[12].x));
  const dx=(wrist.x-shoulder.x)/width,dy=(wrist.y-shoulder.y)/width;
  let position='transition';
  if(dy<-.42)position='up';
  else if(Math.abs(dx)>.67&&Math.abs(dy)<.73)position='side';
  else if(dy>.48)position='down';
  if(position!==st.position){st.position=position;if(position!=='transition'&&position!=='unknown'){st.lastAt=now;inputMove(arm,position)}}
 }
 if(tracked===2){const left=armStates.left.position,right=armStates.right.position;
  if(left==='up'&&right==='up'&&!jackOpen){jackOpen=true;jackOpenAt=now}
  if(jackOpen&&left==='down'&&right==='down'&&now-jackOpenAt>120&&now-lastJack>450){inputMove('left','jack');inputMove('right','jack');lastJack=now;jackOpen=false}
  if(jackOpen&&now-jackOpenAt>6000)jackOpen=false;
 }
 $('#tracking').textContent=`📷 Camera: L ${armStates.left.position.toUpperCase()} · R ${armStates.right.position.toUpperCase()}${tracked<2?' · show both wrists':''}`;
}
async function processPose(){while(poseLoop&&cameraStream){try{if($('#cam').readyState>=2)await pose.send({image:$('#cam')})}catch(e){$('#tracking').textContent='⚠ Pose error: '+e.message;$('#cameraStatus').textContent='Pose error: '+e.message;poseLoop=false;break}await new Promise(r=>setTimeout(r,65))}}
$('#cameraToggle').onclick=cameraToggle;
// Optional phone assist: PeerJS direct peer connection. It does not substitute for full camera pose recognition.
let pairingCode='', pairHeartbeat=null, pairWatchdog=null;
function pairStatus(message){$('#connection').textContent='📱 '+message;const el=$('#phonePairStatus');if(el)el.textContent=message}
function phoneDiag(id,msg){const el=$(id);if(el)el.textContent=msg}
let phoneLastSensor=0;setInterval(()=>{if(phoneConn?.open&&phoneLastSensor&&Date.now()-phoneLastSensor>3000)phoneDiag('#phoneSensorState','Motion sensor: No recent data (check iPhone permission)')},1000);
function acceptPhone(conn){
 if(phoneConn&&phoneConn!==conn){try{phoneConn.close()}catch{}}
 phoneConn=conn;pairStatus('Phone connecting…');phoneDiag('#phoneLinkState','Connection: Connecting…');
 conn.on('open',()=>{pairStatus('Connected ✓');phoneDiag('#phoneLinkState','Connection: Connected ✓');$('#pairCode').textContent=pairingCode;clearInterval(pairHeartbeat);clearInterval(pairWatchdog);
  pairHeartbeat=setInterval(()=>{if(conn.open)try{conn.send({type:'ping',t:Date.now()})}catch{}},3000);
  let lastPong=Date.now();conn.on('data',data=>{if(data?.type==='pong'){lastPong=Date.now();return}if(data?.type==='motion'){phoneMotion=performance.now();phoneLastSensor=Date.now();phoneArm=data.arm||'left';phoneDiag('#phoneSensorState','Motion sensor: Receiving data ✓ ('+phoneArm+' arm)');const n=v=>Number.isFinite(Number(v))?Number(v).toFixed(2):'—';phoneDiag('#phoneSensorValues','X: '+n(data.x)+' · Y: '+n(data.y)+' · Z: '+n(data.z))}if(data?.type==='move'&&data.move&&data.arm){phoneDiag('#phoneLastInput','Last test: '+data.arm.toUpperCase()+' '+data.move.toUpperCase()+' ✓');inputMove(data.arm,data.move)}});
  pairWatchdog=setInterval(()=>{if(Date.now()-lastPong>15000){pairStatus('Phone not responding — reconnecting');try{conn.close()}catch{}}},4000);
 });
 conn.on('close',()=>{clearInterval(pairHeartbeat);clearInterval(pairWatchdog);if(phoneConn===conn){phoneConn=null;pairStatus('Disconnected — reconnect on phone');phoneDiag('#phoneLinkState','Connection: Disconnected')}});
 conn.on('error',e=>pairStatus('Connection error: '+(e.type||e.message)));
}
async function pair(){
 try{
  if(!window.Peer)await script('https://unpkg.com/peerjs@1.5.5/dist/peerjs.min.js');
  if(peer){try{peer.destroy()}catch{}}clearInterval(pairHeartbeat);clearInterval(pairWatchdog);
  pairingCode='fitbeat-'+Math.random().toString(36).slice(2,9);
  peer=new Peer(pairingCode,{debug:1});$('#pairCode').textContent='Connecting to pairing server…';pairStatus('Connecting to pairing server…');
  peer.on('open',async id=>{
   pairingCode=id;$('#pairCode').textContent=id;pairStatus('Ready — scan QR with phone');phoneDiag('#phoneLinkState','Connection: Waiting for iPhone');const target=$('#pairQr');target.innerHTML='';
   const url=new URL('controller.html',location.href);url.searchParams.set('code',id);
   const link=$('#phonePairLink');if(link){link.href=url.href;link.textContent=url.href}
   try{if(!window.QRCode)await script('https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js');new QRCode(target,{text:url.href,width:170,height:170,correctLevel:QRCode.CorrectLevel.M});target.style.display='grid'}
   catch(e){target.innerHTML='';const a=document.createElement('a');a.href=url.href;a.textContent='Open Phone Controller';target.appendChild(a);target.style.display='block'}
  });
  peer.on('connection',acceptPhone);
  peer.on('error',e=>{const msg=e.type||e.message;pairStatus('Pairing error: '+msg);$('#pairCode').textContent='Pairing error: '+msg});
  peer.on('disconnected',()=>{pairStatus('Pair server disconnected — reconnecting…');try{peer.reconnect()}catch{}});
 }catch(e){pairStatus('Pairing unavailable: '+e.message);$('#pairCode').textContent='Pairing unavailable'}
}
$('#pair').onclick=pair;
renderStages();
})();