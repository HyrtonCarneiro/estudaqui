import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-analytics.js";

const firebaseConfig = {
  apiKey: "AIzaSyCXcmf8vYBZtBWhLP3k1HWDEUAC-_MSkwo",
  authDomain: "estudaqui-be0f5.firebaseapp.com",
  projectId: "estudaqui-be0f5",
  storageBucket: "estudaqui-be0f5.firebasestorage.app",
  messagingSenderId: "271897096717",
  appId: "1:271897096717:web:263533ff30f243c99ddb44",
  measurementId: "G-KJS46W8WP1"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
