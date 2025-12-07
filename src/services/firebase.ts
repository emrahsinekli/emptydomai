import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  GoogleAuthProvider,
  signInWithCredential,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
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
  orderBy,
  limit,
  getDocs,
  addDoc,
  deleteDoc,
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';
import type {
  User,
  UserSettings,
  SearchRecord,
  SearchParams,
  DomainResult,
  Favorite,
} from '../types';

// Firebase configuration - Replace with your actual config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
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
export const signInWithGoogle = async (token: string): Promise<FirebaseUser> => {
  const auth = getFirebaseAuth();
  const credential = GoogleAuthProvider.credential(token);
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

  const constraints: QueryConstraint[] = [
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount),
  ];

  const q = query(searchesRef, ...constraints);
  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as SearchRecord[];
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

  const q = query(
    favoritesRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: doc.data().createdAt?.toDate() || new Date(),
  })) as Favorite[];
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

// Initialize on import
initializeFirebase();
