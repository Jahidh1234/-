import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getDatabase, ref, set, onValue, get, child } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyC4vBm4STwbUvTGlvxOtWNIqyLvTT5ht2E",
  authDomain: "bhai-bhai-somiti.firebaseapp.com",
  databaseURL: "https://bhai-bhai-somiti-default-rtdb.firebaseio.com",
  projectId: "bhai-bhai-somiti",
  storageBucket: "bhai-bhai-somiti.firebasestorage.app",
  messagingSenderId: "163524207732",
  appId: "1:163524207732:web:507913c067bcfca3049d21",
  measurementId: "G-M3K5W1FP4V"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);

// Authenticate anonymously in the background
export const initAnonymousAuth = async (): Promise<boolean> => {
  try {
    const userCredential = await signInAnonymously(auth);
    console.log('Firebase Anonymous Auth Successful:', userCredential.user.uid);
    return true;
  } catch (error) {
    console.warn('Firebase Anonymous Auth failed or offline:', error);
    return false;
  }
};

// Setup Listeners for automatic real-time sync
export const setupRtdbSync = (
  onMembersChange: (members: any[]) => void,
  onPaymentsChange: (payments: any[]) => void
) => {
  const membersRef = ref(rtdb, 'members');
  const paymentsRef = ref(rtdb, 'payments');

  // Listen to members
  onValue(membersRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      // Data might be stored as an array or object
      const membersList = Array.isArray(data) 
        ? data.filter(Boolean) 
        : Object.keys(data).map(key => ({ ...data[key], id: Number(key) }));
      onMembersChange(membersList);
    } else {
      onMembersChange([]);
    }
  }, (err) => {
    console.warn('Members Realtime listener failed/offline:', err);
  });

  // Listen to payments
  onValue(paymentsRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const paymentsList = Object.keys(data).map(key => ({
        ...data[key],
        id: key
      }));
      onPaymentsChange(paymentsList);
    } else {
      onPaymentsChange([]);
    }
  }, (err) => {
    console.warn('Payments Realtime listener failed/offline:', err);
  });
};

// Save fully compiled data to RTDB (called when data changes or when sync is needed)
export const pushMembersToRtdb = async (members: any[]) => {
  try {
    // Save as object mapped by id for easy path updates
    const membersObj: any = {};
    members.forEach(m => {
      membersObj[m.id] = m;
    });
    await set(ref(rtdb, 'members'), membersObj);
  } catch (error) {
    console.warn('Error pushing members to remote database:', error);
    throw error;
  }
};

export const pushPaymentsToRtdb = async (payments: any[]) => {
  try {
    const paymentsObj: any = {};
    payments.forEach(p => {
      paymentsObj[p.id] = p;
    });
    await set(ref(rtdb, 'payments'), paymentsObj);
  } catch (error) {
    console.warn('Error pushing payments to remote database:', error);
    throw error;
  }
};

export const checkAndInitializeRtdb = async (sampleMembers: any[], samplePayments: any[]): Promise<boolean> => {
  try {
    const initRef = ref(rtdb, 'is_initialized');
    const snapshot = await get(initRef);
    if (!snapshot.exists() || !snapshot.val()) {
      console.log('Initializing remote RTDB with sample data...');
      await set(initRef, true);
      await pushMembersToRtdb(sampleMembers);
      await pushPaymentsToRtdb(samplePayments);
      return true;
    }
    return false;
  } catch (error) {
    console.warn('Could not check or set is_initialized in RTDB:', error);
    return false;
  }
};

