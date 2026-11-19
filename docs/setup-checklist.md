# Gate 2 setup checklist

Everything the build needs from the owner (spec 16.0, Gate 2). Public values can be pasted into the conversation. Secret values never go into chat, files or commits. The table says how each one is handled.

Phases refer to the implementation sequence in spec 16.1:
1. SDK proof
2. Contracts and safety
3. Web workflow
4. Cloud packs
5. Native clients
6. Quality
7. Release
8. Demo pipeline

## Required

| # | Item | Where to get it | Public / secret | How it reaches the build | Needed by |
|---|---|---|---|---|---|
| 1 | Firebase project on the no-cost Spark plan | console.firebase.google.com > Add project. Analytics can stay off; Mosaic doesn't use it. | Public (project ID) | Paste the project ID | Phase 1 |
| 2 | Firebase AI Logic enabled with the **Gemini Developer API** provider | Console > AI Logic (under Build / AI) > Get started > Gemini Developer API. This works on Spark without billing. Don't enable billing. | n/a | Tell me it's done | Phase 1 |
| 3 | Registered web app and its config | Console > Project settings > General > Your apps > Add app > Web (Hosting can stay unticked). Copy the `firebaseConfig` object. | Public | Paste the six values (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId) | Phase 1 |
| 4 | App Check: reCAPTCHA v3 keys | google.com/recaptcha/admin > Create: type v3; domains `localhost`, `<project-id>.web.app`, `<project-id>.firebaseapp.com`. Then Console > App Check > Apps > web app > reCAPTCHA > enter the **secret key** there. **Leave enforcement off for now.** I'll ask you to turn it on once the app is verified. | Site key is public. Secret key is secret. | Paste the **site key** only. The secret key stays in the Firebase console. | Phase 1 |
| 5 | App Check debug token for development | I generate one, keep it in the git-ignored `.env.local`, and send it to you. You add it under Console > App Check > Apps > web app > ⋮ > Manage debug tokens. You can revoke it at any time. | Secret (development only) | You register a token I give you; you don't send one | Phase 1 |
| 6 | Hosting deploy route | Recommended: GitHub Actions deploys to Firebase Hosting, using a service-account key stored as a **GitHub repository secret**. On your own computer run `firebase init hosting:github`, which creates the key and the secret for you. Alternatively, create a service account with the *Firebase Hosting Admin* role in Google Cloud console and save its JSON as a repository secret named `FIREBASE_SERVICE_ACCOUNT`. | Secret (never leaves GitHub) | Tell me the secret's name; I write the workflow | Phase 7 (wanted by ~25 Nov for a first deploy) |
| 7 | Hosting site name | Defaults to the project ID (`<id>.web.app`). Only needed if you want a different site. | Public | Paste it, or say "default" | Phase 7 |
| 8 | GitHub repository decisions | The repo is `Nana-Kojo801/mosiac`. (a) Keep the name or rename it to `mosaic`? (b) It must be **public** by submission. When should it go public? (c) I push only to `claude/new-session-kckk1f`. Should I keep doing that while you merge, or may I push to `main`? | Public | Answer in chat | Phase 2 |
| 9 | ElevenLabs API key and plan check | elevenlabs.io > Profile > API keys. Check the current plan terms: commercial use, attribution, and whether a hackathon entry is allowed (the free tier has had attribution and non-commercial limits). | Secret | A secure credential form I open in this session. The key is held by the network proxy and never appears in chat or files. | Phase 8 (rough cut ~24 Nov) |
| 10 | Eligible machine for the local-inference kit (spec 21) | Any physical computer with desktop Chrome that meets Chrome's built-in AI requirements (roughly 22 GB free disk; more than 4 GB VRAM, or 16 GB RAM and 4 cores; unmetered connection). Yours, a friend's, a lab's. No rented or remote machines. Someone runs one command and sends back the output folder. | n/a | Tell me if one is available and when | Phase 1 (or at least before ~28 Nov) |

## Optional

| # | Item | Notes | Needed by |
|---|---|---|---|
| 11 | Supported Android phone (Gemini Nano via AICore) | Needed before Android can be claimed as a platform (F20, spec 21.5). Without one, Android stays out of the submission. | Phase 5 |
| 12 | Mac with Xcode and an Apple Intelligence iPhone | iOS can't be built or signed in this container. Without both, iOS stays out of the submission. | Phase 5 |
| 13 | Custom domain | Otherwise `<id>.web.app` is used. | Phase 7 |
| 14 | YouTube channel name / handle | For the description links. You upload the video yourself. | Phase 8 |
| 15 | Hackathon temporary quota account | Optional. The request deadline is 25 Nov, 10 AM PT (6 PM Ghana). Never the only path for judges. | Before 25 Nov |

## Owner-only actions (no value needed from you)

- Register on Devpost and join the hackathon. Confirm your eligibility and that you're entering solo.
- Later: upload the video and captions to YouTube, make them public, and submit on Devpost by 30 Nov, 10 PM Ghana time (aim for 29 Nov).
