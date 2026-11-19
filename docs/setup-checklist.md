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
| 4 | App Check production provider. **Owner decision (19 Nov): keep the existing reCAPTCHA v3 key.** Done. The text below is kept for reference only. | Firebase now recommends Enterprise for new web apps. It has a no-cost tier of 10,000 assessments a month, needs no billing account (only 4 score levels without billing), and has **no secret key** to handle. Create the key in Google Cloud console > Security > reCAPTCHA (project `mosaic-4a9d2`), type *Website*, domains `mosaic-4a9d2.web.app` and `mosaic-4a9d2.firebaseapp.com` only. **Do not add `localhost`**: Firebase warns that it lets anyone run the app from their own machine. Then go to Firebase console > Security > App Check > Apps > web app > reCAPTCHA Enterprise and paste the site key. | Public site key | Paste the site key | Phase 1 (production build) |
| 5 | App Check debug token for development | Since 2 Nov 2026 Firebase enforces App Check for AI Logic in every project, so local and test runs need a registered debug token. I generated one and stored it in the git-ignored `.env.local` (line `APPCHECK_DEBUG_TOKEN`). Open that file in the Claude app, copy the value and register it under Security > App Check > Apps > web app > ⋮ > Manage debug tokens. Revoke it after judging. | Secret (development only) | Copy from `.env.local`; it isn't printed in chat | **Now** (blocks the first real SDK test) |
| 6 | Hosting deploy key | Follow `docs/deploy.md`: run the Cloud Shell commands to create a Hosting-only service account and key, then save the JSON as the GitHub secret `FIREBASE_SERVICE_ACCOUNT`. The deploy workflow is already in the repo. | Secret (stays in GitHub) | You add the secret; it never passes through chat | When you’re ready to go live |
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
