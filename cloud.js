import {initializeApp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js';
import {getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,sendPasswordResetEmail} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import {getFirestore,doc,setDoc,getDoc,collection,addDoc,getDocs,query,orderBy,limit,serverTimestamp} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';
const cfg=window.FITBEAT_FIREBASE_CONFIG||{};
const cloud={ready:false,user:null,onChange:null};window.fitbeatCloud=cloud;
const status=document.getElementById('authStatus');
function msg(t){if(status)status.textContent=t}
if(!cfg.apiKey||!cfg.appId){msg('Cloud sync not configured. Add your Firebase web config in firebase-config.js. Local progress still works.');}
else{
 try{
 const app=initializeApp(cfg),auth=getAuth(app),db=getFirestore(app);cloud.ready=true;
 cloud.signup=(email,pw)=>createUserWithEmailAndPassword(auth,email,pw);
 cloud.login=(email,pw)=>signInWithEmailAndPassword(auth,email,pw);
 cloud.logout=()=>signOut(auth);
 cloud.reset=(email)=>sendPasswordResetEmail(auth,email);
 cloud.saveProfile=async profile=>{if(!auth.currentUser)throw Error('Sign in first');await setDoc(doc(db,'users',auth.currentUser.uid),{...profile,updatedAt:serverTimestamp()},{merge:true})};
 cloud.loadProfile=async()=>{if(!auth.currentUser)return null;const snap=await getDoc(doc(db,'users',auth.currentUser.uid));return snap.exists()?snap.data():null};
 cloud.saveWorkout=async workout=>{if(!auth.currentUser)throw Error('Sign in first');return addDoc(collection(db,'users',auth.currentUser.uid,'workouts'),{...workout,createdAt:serverTimestamp()})};
 cloud.loadWorkouts=async()=>{if(!auth.currentUser)return [];const snap=await getDocs(query(collection(db,'users',auth.currentUser.uid,'workouts'),orderBy('createdAt','desc'),limit(200)));return snap.docs.map(d=>({...d.data(),id:d.id}))};
 onAuthStateChanged(auth,user=>{cloud.user=user;msg(user?'Signed in: '+user.email:'Not signed in — progress saved locally');cloud.onChange?.(user)});
 }catch(e){msg('Firebase setup error: '+e.message)}
}
window.dispatchEvent(new Event('fitbeat-cloud-ready'));
