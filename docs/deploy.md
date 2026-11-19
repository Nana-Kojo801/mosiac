# Deploying Mosaic to Firebase Hosting

The workflow `.github/workflows/deploy.yml` builds and deploys the web app to **https://mosaic-4a9d2.web.app**:
- on every push to the default branch;
- on demand from **Actions → Deploy to Firebase Hosting → Run workflow**.

It needs a single GitHub secret, `FIREBASE_SERVICE_ACCOUNT`. Until that secret exists, the workflow skips without failing.

## 1. Create the deploy key (Google Cloud Shell, about 2 minutes)

Open https://console.cloud.google.com/?cloudshell=true while signed in to the Google account that owns the Firebase project, then paste:

```sh
PROJECT=mosaic-4a9d2
SA=github-hosting-deploy
gcloud config set project "$PROJECT"
gcloud iam service-accounts create "$SA" --display-name="GitHub Actions: Hosting deploy"
for ROLE in roles/firebasehosting.admin roles/serviceusage.apiKeysViewer; do
  gcloud projects add-iam-policy-binding "$PROJECT" \
    --member="serviceAccount:$SA@$PROJECT.iam.gserviceaccount.com" --role="$ROLE" --condition=None
done
gcloud iam service-accounts keys create key.json --iam-account="$SA@$PROJECT.iam.gserviceaccount.com"
cat key.json
```

Copy the whole JSON output, from `{` to `}`, then delete the file: `rm key.json`.

The account can only manage Hosting releases, plus read-only access to API key metadata, which the deploy action needs. It cannot read Firestore, Storage or anything else.

If key creation is refused with `iam.disableServiceAccountKeyCreation`, your project is under an organisation policy that blocks keys. In that case, run `npx firebase-tools init hosting:github` on your own computer instead; it sets up the secret for you.

## 2. Add it to GitHub

Go to https://github.com/Nana-Kojo801/mosiac/settings/secrets/actions, choose **New repository secret**, and enter:
- **Name:** `FIREBASE_SERVICE_ACCOUNT`
- **Secret:** the JSON from step 1

## 3. Deploy

Go to **Actions → Deploy to Firebase Hosting → Run workflow**. Any later push to the default branch also redeploys.

## 4. After the first deploy

- In the reCAPTCHA admin console, the v3 key's domains must include `mosaic-4a9d2.web.app` and `mosaic-4a9d2.firebaseapp.com`, and **not** `localhost`.
- In Firebase console, go to **Security → App Check → Apps**. The web app must be registered with the reCAPTCHA v3 provider (the secret key goes there), or cloud test-pack generation on the live site will be rejected.

## Notes

- Public Firebase config lives in `.env.production`. It is public by design and ships inside the app.
- The App Check debug token is never used in production builds. The workflow refuses to deploy if one, or a test canary, appears in the bundle.
- To revoke deploy access: Google Cloud console → IAM → Service accounts → `github-hosting-deploy` → Keys → delete the key. Then delete the GitHub secret.
