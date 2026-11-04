# FITBEAT — English Edition (new GitHub project)

## Publish
1. Create a NEW public GitHub repository.
2. Upload **the contents of this ZIP** to the repository root. Keep `index.html`, `game.js`, `controller.html`, the `.css` files, `assets/`, `vision_bundle.mjs` and `pose_landmarker_lite.task` together.
3. Upload in batches of fewer than 100 files if using GitHub's website. Do not upload the ZIP as a single file and do not place everything in an extra folder.
4. Settings → Pages → Deploy from branch → `main` / `(root)` → Save. Wait for deployment.
5. Open `https://YOURNAME.github.io/REPOSITORY/` over HTTPS. Test keyboard first, then webcam, then phone pairing.

## Controls
LEFT ARM: 1 Up, 2 Side, 3 Forward, 4 Down. RIGHT ARM: Q Up, W Side, E Forward, R Down.

## Calories
The result shows a **rough estimated kcal**, calculated using a MET assumption, body weight (kg), and session duration: `kcal = MET × 3.5 × kg / 200 × minutes`. It is **not** a sensor measurement or medical assessment.

## Notes / limitations
- This is a static GitHub Pages project. Camera access requires HTTPS and user permission.
- Phone pairing uses PeerJS signaling and requires an internet connection. Phone motion requires permission and may stop when the phone locks.
- MediaPipe pose recognition can misclassify FORWARD, especially in poor lighting or camera angles.
- `TRAVEL=3.3` seconds is the note travel time; movement target timing remains BPM based.
- Existing approved Home Gym background and direction artwork are included. A new white Bichon SVG mascot replaces the brown bear. **Some stage background images are still stylized neon placeholders rather than the previously approved full scenic illustrations.**
- Automated source checks passed; real camera/phone gameplay still needs hands-on browser testing.
