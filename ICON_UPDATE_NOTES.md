# FITBEAT — Approved motion icon update

- Replaced all four exercise cue icons with the matching panels from the newly approved icon sheet: UP, SIDE, DOWN, TWIST & PUNCH.
- TWIST & PUNCH replaces FORWARD in workout cues, keyboard practice and camera events.
- Camera detection now requires both an extended forward arm and detectable shoulder depth rotation using MediaPipe world landmarks. It deliberately avoids guessing a punch from a SIDE pose when 3D tracking is unavailable.
- This is a **prototype heuristic**, not a clinically validated twist measurement. Webcam occlusion, camera angle and low light can cause misses; test on the actual laptop before presenting.
- Other scene backgrounds, mascot images, scores and menus are not changed by this icon update.
- Upload the **contents** of this ZIP into a fresh GitHub repository, or into the existing repo if you intentionally want to replace it. Do not upload the ZIP itself as the site.
