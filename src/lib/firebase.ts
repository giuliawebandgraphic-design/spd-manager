import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const FIREBASE_CONFIG = {
  projectId: 'elite-poetry-r9nlt',
  appId: '1:21976513139:web:dcb2de045da6080a34c806',
  apiKey: 'AIzaSyBxS-u-fnt0leW9DmPv7HHL8rksSVQgCJc',
  authDomain: 'elite-poetry-r9nlt.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-sagepaperstudiom-fadc5a75-3403-49cb-88cf-94a024780d96',
  storageBucket: 'elite-poetry-r9nlt.firebasestorage.app',
  messagingSenderId: '21976513139',
};

export const firebaseApp =
  getApps().length > 0
    ? getApp()
    : initializeApp({
        apiKey: FIREBASE_CONFIG.apiKey,
        authDomain: FIREBASE_CONFIG.authDomain,
        projectId: FIREBASE_CONFIG.projectId,
        storageBucket: FIREBASE_CONFIG.storageBucket,
        messagingSenderId: FIREBASE_CONFIG.messagingSenderId,
        appId: FIREBASE_CONFIG.appId,
      });

export const firestoreDb = FIREBASE_CONFIG.firestoreDatabaseId
  ? getFirestore(firebaseApp, FIREBASE_CONFIG.firestoreDatabaseId)
  : getFirestore(firebaseApp);
