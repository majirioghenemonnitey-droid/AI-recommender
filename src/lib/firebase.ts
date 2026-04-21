import { initializeApp } from "firebase/app";
import { getFirestore, getDocFromServer, doc } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const firebaseAppConfig = {
  ...firebaseConfig,
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey
};

const app = initializeApp(firebaseAppConfig);
export const db = getFirestore(app, firebaseAppConfig.firestoreDatabaseId);

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();
