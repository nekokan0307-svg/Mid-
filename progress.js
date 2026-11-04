(()=>{
'use strict';
const $=s=>document.querySelector(s),cloud=()=>window.fitbeatCloud;
const defaultProfile={displayName:'',weightKg:60,heightCm:165,age:25,sex:'unspecified',activity:1.375};
let profile={...defaultProfile};try{profile={...profile,...JSON.parse(localStorage.getItem('fitbeatProfile')||'{}')}}catch{}
let history=[];let activeUid=null;function storageKey(){return activeUid?'fitbeatHistory_user_'+activeUid:'fitbeatHistory'}function profileKey(){return activeUid?'fitbeatProfile_user_'+activeUid:'fitbeatProfile'}try{history=JSON.parse(localStorage.getItem(storageKey())||'[]')}catch{}
const keys=['displayName','weightKg','heightCm','age','sex','activity'];
function saveLocal(){localStorage.setItem(profileKey(),JSON.stringify(profile));localStorage.setItem(storageKey(),JSON.stringify(history.slice(-400)))}
function val(k){return $('#profile_'+k)?.value}
function readProfile(){for(const k of keys){if(['weightKg','heightCm','age','activity'].includes(k))profile[k]=Number(val(k))||defaultProfile[k];else profile[k]=String(val(k)||'').trim()}profile.weightKg=Math.max(20,Math.min(300,profile.weightKg));profile.heightCm=Math.max(90,Math.min(230,profile.heightCm));profile.age=Math.max(13,Math.min(110,profile.age));saveLocal();return profile}
function fill(){for(const k of keys)if($('#profile_'+k))$('#profile_'+k).value=profile[k]}
function stats(){const today=new Date().toLocaleDateString('en-CA');const sum=a=>a.reduce((v,x)=>v+Number(x.kcal||0),0);const best=Math.max(0,...history.map(x=>Number(x.score||0)));$('#bestScore').textContent=best;$('#totalWorkouts').textContent=history.length;$('#todayKcal').textContent=sum(history.filter(x=>x.localDate===today)).toFixed(1);$('#totalKcal').textContent=sum(history).toFixed(1);$('#bestAccuracy').textContent=(Math.max(0,...history.map(x=>Number(x.accuracy||0))))+'%';
const p=profile;let bmr=null;if(p.sex==='female')bmr=10*p.weightKg+6.25*p.heightCm-5*p.age-161;else if(p.sex==='male')bmr=10*p.weightKg+6.25*p.heightCm-5*p.age+5;
$('#bmrOut').textContent=bmr===null?'Optional: select a calculation category':Math.round(bmr)+' kcal/day';$('#tdeeOut').textContent=bmr===null?'—':Math.round(bmr*p.activity)+' kcal/day';
const recent=[...history].reverse().slice(0,30);$('#historyRows').innerHTML=recent.length?recent.map(w=>`<tr><td>${escapeText(w.localDate||'')}</td><td>${escapeText(w.stage||'')}</td><td>${Number(w.score)||0}</td><td>${Number(w.accuracy)||0}%</td><td>${Number(w.kcal||0).toFixed(1)}</td></tr>`).join(''):'<tr><td colspan="5">No workouts yet</td></tr>';
const days=Array.from({length:7},(_,i)=>{const d=new Date();d.setDate(d.getDate()-6+i);return d.toLocaleDateString('en-CA')});const values=days.map(d=>sum(history.filter(w=>w.localDate===d)));const max=Math.max(1,...values);$('#weeklyChart').innerHTML=days.map((d,i)=>`<div class="bar-col"><div class="bar-value">${values[i].toFixed(0)}</div><div class="bar" style="height:${Math.max(3,values[i]/max*100)}%"></div><small>${d.slice(5)}</small></div>`).join('');}
function escapeText(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function sync(){const c=cloud();if(!c?.ready||!c.user){stats();return}try{
const remote=await c.loadProfile();if(remote){profile={...defaultProfile,...remote};fill();saveLocal()}
const workouts=await c.loadWorkouts();const ids=new Set(workouts.map(w=>w.sessionId));
// Only retry workouts created under this same signed-in UID; never upload guest/another user's data.
const unsynced=history.filter(w=>w.ownerUid===c.user.uid&&!w.cloudSynced&&!ids.has(w.sessionId));
for(const w of unsynced){await c.saveWorkout(w);w.cloudSynced=true}
const remoteAfter=unsynced.length?await c.loadWorkouts():workouts;
const map=new Map();for(const w of [...history.filter(w=>w.ownerUid===c.user.uid),...remoteAfter])map.set(w.sessionId||w.id,w);
history=[...map.values()].sort((a,b)=>String(a.dateISO||'').localeCompare(String(b.dateISO||'')));saveLocal();stats();$('#syncStatus').textContent='Cloud synced ✓'
}catch(e){$('#syncStatus').textContent='Cloud sync issue: '+e.message;stats()}}
function switchAccount(user){const uid=user?.uid||null;if(uid!==activeUid){activeUid=uid;profile={...defaultProfile};history=[];try{profile={...profile,...JSON.parse(localStorage.getItem(profileKey())||'{}')}}catch{}try{history=JSON.parse(localStorage.getItem(storageKey())||'[]')}catch{}fill();stats()}$('#authLogout').hidden=!user;sync()}
$('#profileSave').onclick=async()=>{readProfile();stats();const c=cloud();if(c?.user)try{await c.saveProfile(profile);$('#syncStatus').textContent='Profile saved to cloud ✓'}catch(e){$('#syncStatus').textContent='Saved locally; cloud error: '+e.message}else $('#syncStatus').textContent='Profile saved on this device';};
$('#authRegister').onclick=async()=>authAction('signup');$('#authLogin').onclick=async()=>authAction('login');$('#authLogout').onclick=async()=>{try{await cloud()?.logout()}catch(e){$('#authStatus').textContent=e.message}};$('#authReset').onclick=async()=>{try{await cloud()?.reset($('#authEmail').value.trim());$('#authStatus').textContent='Password reset email requested. Check your inbox.'}catch(e){$('#authStatus').textContent=e.message||'Configure Firebase first'}};
async function authAction(which){try{const c=cloud();if(!c?.ready)throw Error('Add Firebase configuration first');const email=$('#authEmail').value.trim(),pw=$('#authPassword').value;if(pw.length<6)throw Error('Password must be at least 6 characters');await c[which](email,pw);$('#authPassword').value=''}catch(e){$('#authStatus').textContent=e.message}}
window.fitbeatRecord=async w=>{const now=new Date();const record={...w,sessionId:crypto.randomUUID?.()||String(Date.now())+Math.random(),dateISO:now.toISOString(),localDate:now.toLocaleDateString('en-CA'),cloudSynced:false,ownerUid:cloud()?.user?.uid||null};history.push(record);saveLocal();stats();await sync()};
window.fitbeatGetWeight=()=>profile.weightKg;
window.fitbeatRefresh=()=>{fill();stats();sync()};
window.addEventListener('fitbeat-cloud-ready',()=>{if(cloud())cloud().onChange=switchAccount;switchAccount(cloud().user)});
fill();stats();
})();
