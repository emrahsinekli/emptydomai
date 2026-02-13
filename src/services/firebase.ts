import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth/web-extension';
import {
  getFirestore,
  Firestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  addDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
import type {
  User,
  UserSettings,
  SearchRecord,
  SearchParams,
  DomainResult,
  Favorite,
} from '../types';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCoD3qhWiOnftZNCLKC3ZGIAk_6NOAcoKs",
  authDomain: "emptydomai-6d098.firebaseapp.com",
  projectId: "emptydomai-6d098",
  storageBucket: "emptydomai-6d098.firebasestorage.app",
  messagingSenderId: "989858667510",
  appId: "1:989858667510:web:1a187400e5fdee4b7d45d7"
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

// Initialize Firebase
export const initializeFirebase = (): void => {
  if (!app) {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
  }
};

// Get Firebase instances
export const getFirebaseAuth = (): Auth => {
  if (!auth) initializeFirebase();
  return auth;
};

export const getFirebaseDb = (): Firestore => {
  if (!db) initializeFirebase();
  return db;
};

// Auth functions
export const signInWithGoogle = async (accessToken: string): Promise<FirebaseUser> => {
  const auth = getFirebaseAuth();
  // Chrome identity API returns access_token, not id_token
  // Pass null as id_token and access_token as second parameter
  const credential = GoogleAuthProvider.credential(null, accessToken);
  const result = await signInWithCredential(auth, credential);
  return result.user;
};

export const signOut = async (): Promise<void> => {
  const auth = getFirebaseAuth();
  await firebaseSignOut(auth);
};

export const getCurrentUser = (): FirebaseUser | null => {
  const auth = getFirebaseAuth();
  return auth.currentUser;
};

export const onAuthChange = (callback: (user: FirebaseUser | null) => void): (() => void) => {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
};

// User document functions
export const createUserDocument = async (
  firebaseUser: FirebaseUser,
  defaultSettings: UserSettings
): Promise<User> => {
  const db = getFirebaseDb();
  const userRef = doc(db, 'users', firebaseUser.uid);

  const userDoc = await getDoc(userRef);

  if (userDoc.exists()) {
    return userDoc.data() as User;
  }

  const newUser: User = {
    uid: firebaseUser.uid,
    email: firebaseUser.email || '',
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    createdAt: new Date(),
    plan: 'free',
    settings: defaultSettings,
  };

  await setDoc(userRef, {
    ...newUser,
    createdAt: Timestamp.fromDate(newUser.createdAt),
  });

  return newUser;
};

export const getUserDocument = async (uid: string): Promise<User | null> => {
  const db = getFirebaseDb();
  const userRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) return null;

  const data = userDoc.data();
  return {
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
  } as User;
};

export const updateUserSettings = async (uid: string, settings: Partial<UserSettings>): Promise<void> => {
  const db = getFirebaseDb();
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, { settings });
};

// Search history functions
export const saveSearchRecord = async (
  userId: string,
  params: SearchParams,
  results: DomainResult[]
): Promise<string> => {
  const db = getFirebaseDb();
  const searchesRef = collection(db, 'searches');

  const docRef = await addDoc(searchesRef, {
    userId,
    params,
    results,
    createdAt: Timestamp.now(),
  });

  return docRef.id;
};

export const getSearchHistory = async (
  userId: string,
  limitCount: number = 20
): Promise<SearchRecord[]> => {
  const db = getFirebaseDb();
  const searchesRef = collection(db, 'searches');

  // Simple query without orderBy to avoid composite index requirement
  const q = query(
    searchesRef,
    where('userId', '==', userId),
    limit(limitCount * 2) // Fetch more since we'll sort client-side
  );

  const snapshot = await getDocs(q);

  const records = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as SearchRecord[];

  // Sort client-side and limit
  return records
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, limitCount);
};

export const getSearchById = async (searchId: string): Promise<SearchRecord | null> => {
  const db = getFirebaseDb();
  const searchRef = doc(db, 'searches', searchId);
  const searchDoc = await getDoc(searchRef);

  if (!searchDoc.exists()) return null;

  const data = searchDoc.data();
  return {
    id: searchDoc.id,
    ...data,
    createdAt: data.createdAt?.toDate() || new Date(),
  } as SearchRecord;
};

// Favorites functions
export const addFavorite = async (
  userId: string,
  domain: string,
  tld: string,
  sourceSearchId?: string,
  notes?: string
): Promise<string> => {
  const db = getFirebaseDb();
  const favoritesRef = collection(db, 'favorites');

  // Check if already favorited
  const existingQuery = query(
    favoritesRef,
    where('userId', '==', userId),
    where('fullDomain', '==', `${domain}${tld}`)
  );
  const existingDocs = await getDocs(existingQuery);

  if (!existingDocs.empty) {
    return existingDocs.docs[0].id;
  }

  const docRef = await addDoc(favoritesRef, {
    userId,
    domain,
    tld,
    fullDomain: `${domain}${tld}`,
    sourceSearchId,
    notes,
    createdAt: Timestamp.now(),
  });

  return docRef.id;
};

export const removeFavorite = async (favoriteId: string): Promise<void> => {
  const db = getFirebaseDb();
  const favoriteRef = doc(db, 'favorites', favoriteId);
  await deleteDoc(favoriteRef);
};

export const removeFavoriteByDomain = async (userId: string, fullDomain: string): Promise<void> => {
  const db = getFirebaseDb();
  const favoritesRef = collection(db, 'favorites');

  const q = query(
    favoritesRef,
    where('userId', '==', userId),
    where('fullDomain', '==', fullDomain)
  );

  const snapshot = await getDocs(q);

  for (const doc of snapshot.docs) {
    await deleteDoc(doc.ref);
  }
};

export const getFavorites = async (
  userId: string,
  limitCount: number = 100
): Promise<Favorite[]> => {
  const db = getFirebaseDb();
  const favoritesRef = collection(db, 'favorites');

  // Simple query without orderBy to avoid composite index requirement
  const q = query(
    favoritesRef,
    where('userId', '==', userId),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);

  const favorites = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as Favorite[];

  // Sort client-side instead
  return favorites.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

export const isFavorite = async (userId: string, fullDomain: string): Promise<boolean> => {
  const db = getFirebaseDb();
  const favoritesRef = collection(db, 'favorites');

  const q = query(
    favoritesRef,
    where('userId', '==', userId),
    where('fullDomain', '==', fullDomain)
  );

  const snapshot = await getDocs(q);
  return !snapshot.empty;
};

// ============================================
// PLAN MANAGEMENT (Firestore <-> Local sync)
// ============================================

/**
 * Fetch user's plan from Firestore
 * Called after login and periodically to sync
 */
export const getUserPlanFromFirestore = async (uid: string): Promise<'free' | 'lifetime'> => {
  try {
    const db = getFirebaseDb();
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) return 'free';

    const data = userDoc.data();
    return data?.plan === 'lifetime' ? 'lifetime' : 'free';
  } catch (error) {
    console.error('Failed to fetch plan from Firestore:', error);
    return 'free';
  }
};

// Initialize on import
initializeFirebase();
