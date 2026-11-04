FITBEAT UPGRADE — 2026-11-03
================================
Base: FITBEAT_FINAL_NEW_PROJECT (original UI preserved).

WHAT'S INCLUDED
1. All 7 original stage backgrounds visible during gameplay, with reduced dark overlay.
2. 8 individually cut neon circular transparent PNG icons, including arm-specific side and twist/punch arrows.
3. Distinct stage-specific, beat-aligned movement patterns; alternating arms and heavy/light interval pacing.
4. QR code and manual pairing code for the phone controller. QR uses qrcodejs from CDN; PeerJS pairing needs internet.
5. Camera and phone setup in Settings; How to Play links to Settings.
6. Seven NEW original electronic fitness loops (OGG) composed for this package, one per stage. No YouTube player. Music slider and FX slider remain in Settings. Browser may require user interaction before playing audio.
7. Profile: weight, height, age, optional BMR calculation category, activity factor, estimated BMR/TDEE, workout history, daily and cumulative estimated kcal, weekly chart, best score and accuracy.
8. Email/password registration, login, password reset and cloud sync scaffolding using Firebase Authentication and Cloud Firestore.

IMPORTANT: FIREBASE CONFIG REQUIRED
Open firebase-config.js and replace the empty apiKey and appId (and verify authDomain and projectId) with the EXACT firebaseConfig shown in Firebase Console > Project settings > General > Your apps > FITBEAT > SDK setup and configuration.
Never paste service account private keys into this file. Firebase web configuration is designed to be visible in client-side apps; Firestore Rules enforce access control.
Until you add real config, the game is playable and progress is stored locally, but cloud login/sync will not work.

FIRESTORE STRUCTURE
users/{uid} => displayName, weightKg, heightCm, age, sex, activity, updatedAt
users/{uid}/workouts/{autoId} => sessionId, dateISO, localDate, stage, stageId, score, accuracy, maxCombo, durationSeconds, kcal, ownerUid, createdAt

RULES
The rules you already published allow a logged-in user to read/write only their own users/{uid} document and workouts subcollection. Before a public release, validate permitted field names/types and bounds, and consider abuse controls/App Check.

GITHUB PAGES
Upload the contents of THIS folder (not the enclosing folder) to the root of your repository, then enable Pages from the correct branch/root. Keep all asset paths intact. Ensure firebase-config.js contains your real configuration before expecting cloud functionality.
You can test the game locally via python -m http.server 8000; then visit http://localhost:8000/ (don't double-click index.html when testing camera/cloud).

PHONE
On desktop open Settings > Create Pair Code. Scan the QR with the phone, or open controller.html and enter the code. Press Connect. For iPhone, tap Enable Motion Sensor to request permission. Phone manual buttons can trigger game moves; raw accelerometer data is not a replacement for full-body pose detection. Camera tracking is experimental and needs camera permission and external MediaPipe scripts.

CALORIES
Estimated kcal = representative MET x body weight (kg) x session hours.
The result is not a direct measurement. BMR (optional) uses Mifflin-St Jeor equations and TDEE uses the selected activity factor. This is general information, not medical advice.

TEST STATUS
Static source checks completed. Real browser/device testing of Firebase login, Firestore read/write, camera pose, iPhone sensor permissions, QR/PeerJS pairing and sound playback is still needed. No changes were made to the user's GitHub repository or Firebase project.
