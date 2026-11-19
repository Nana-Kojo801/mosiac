import { initializeApp, type FirebaseApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaEnterpriseProvider, ReCaptchaV3Provider } from 'firebase/app-check';

declare const __APPCHECK_DEBUG_TOKEN__: string;
declare global { interface Window { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean } }

/** Public Firebase web config from VITE_* variables. No secrets live here. */
export function firebaseConfigured(): boolean {
  const e = import.meta.env;
  return Boolean(e.VITE_FIREBASE_API_KEY && e.VITE_FIREBASE_PROJECT_ID && e.VITE_FIREBASE_APP_ID && e.VITE_APPCHECK_SITE_KEY);
}

let app: FirebaseApp | null = null;

export function firebaseApp(): FirebaseApp {
  if (app) return app;
  const e = import.meta.env;
  if (!firebaseConfigured()) throw new Error('Firebase is not configured for this build');
  // Debug provider only in the local dev server; the value is '' in production builds.
  if (__APPCHECK_DEBUG_TOKEN__) self.FIREBASE_APPCHECK_DEBUG_TOKEN = __APPCHECK_DEBUG_TOKEN__;
  app = initializeApp({
    apiKey: e.VITE_FIREBASE_API_KEY, authDomain: e.VITE_FIREBASE_AUTH_DOMAIN, projectId: e.VITE_FIREBASE_PROJECT_ID,
    storageBucket: e.VITE_FIREBASE_STORAGE_BUCKET, messagingSenderId: e.VITE_FIREBASE_MESSAGING_SENDER_ID, appId: e.VITE_FIREBASE_APP_ID,
  });
  const key = e.VITE_APPCHECK_SITE_KEY as string;
  initializeAppCheck(app, { provider: e.VITE_APPCHECK_PROVIDER === 'recaptcha-enterprise' ? new ReCaptchaEnterpriseProvider(key) : new ReCaptchaV3Provider(key), isTokenAutoRefreshEnabled: true });
  return app;
}
