import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider
} from "firebase/auth";

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCZWY3x0PUfvV_bwbgUVbJZhDBE3vfGQ0I",
  authDomain: "neurostack-fb468.firebaseapp.com",
  projectId: "neurostack-fb468",
  storageBucket: "neurostack-fb468.appspot.com",
  messagingSenderId: "912656189609",
  appId: "1:912656189609:web:f49e7778bff02c1c1141b8",
  measurementId: "G-TG4CDSS8LZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// Global User
let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("google-login");
  const logoutBtn = document.getElementByElementById("logout-btn");
  const notesList = document.getElementById("notes-list");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("user-input");
  const chatBox = document.getElementById("chat-box");
  const loadingIndicator = document.getElementById("loading");

  // Google Sign-in
  loginBtn.addEventListener("click", () => {
    signInWithPopup(auth, provider)
      .then(result => {
        console.log("Signed in:", result.user.email);
      })
      .catch(error => {
        console.error("Auth error:", error);
      });
  });

  // Logout
  logoutBtn.addEventListener("click", () => {
    auth.signOut().then(() => {
      console.log("User signed out");
    });
  });

  // Auth state change
  onAuthStateChanged(auth, user => {
    currentUser = user;
    if (user) {
      console.log("Signed in as:", user.email);
      loginBtn.style.display = "none";
      logoutBtn.style.display = "inline-block";
      loadUserNotes();
    } else {
      console.log("User signed out.");
      loginBtn.style.display = "inline-block";
      logoutBtn.style.display = "none";
      notesList.innerHTML = "";
    }
  });

  // Send AI prompt
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const userText = input.value.trim();
    if (!userText) {
      alert("Cannot send an empty message!");
      return;
    }

    sendQuery(userText);
    input.value = "";
  });

  async function sendQuery(question) {
    loadingIndicator.style.display = "block";

    try {
      const userNotes = await getNotesForLearning();
      const context = `User's notes: ${userNotes}\n\nQuestion: ${question}`;

      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: "Bearer YOUR_API_KEY",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "meta-llama/llama-3.3-70b-instruct:free",
          messages: [
            { role: "system", content: "You are an assistant that learns from user notes." },
            { role: "user", content: context }
          ]
        })
      });

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "🤖 No response.";

      const div = document.createElement("div");
      div.classList.add("message", "assistant", "ai-response");
      div.innerHTML = `<span class="full-text">${reply}</span>`;
      chatBox.appendChild(div);

      loadingIndicator.style.display = "none";
    } catch (err) {
      console.error(err);
      const errorDiv = document.createElement("div");
      errorDiv.classList.add("message", "assistant");
      errorDiv.innerText = "❌ Something went wrong.";
      chatBox.appendChild(errorDiv);
      loadingIndicator.style.display = "none";
    }
  }

  // Save Note
  document.getElementById("save-note").onclick = async () => {
    const fullResponseElement = document.querySelector(".ai-response:last-of-type .full-text");
    const responseText = fullResponseElement ? fullResponseElement.innerText.trim() : "";

    if (!responseText) {
      alert("No response to save!");
      return;
    }

    if (!currentUser) {
      alert("You need to be logged in to save notes.");
      return;
    }

    const newNote = {
      uid: currentUser.uid,
      content: responseText,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    try {
      const docRef = await addDoc(collection(db, "notes"), newNote);
      console.log("Note saved successfully!");
      loadUserNotes(); // Refresh notes
    } catch (err) {
      console.error("Error saving note:", err);
    }
  };

  // Load Notes
  async function loadUserNotes() {
    if (!currentUser) return;

    const q = query(
      collection(db, "notes"),
      where("uid", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    try {
      const snapshot = await getDocs(q);
      notesList.innerHTML = "";
      snapshot.forEach(doc => {
        const note = doc.data();
        const li = document.createElement("li");
        li.textContent = note.content.length > 50 ? note.content.slice(0, 50) + "..." : note.content;
        li.onclick = () => {
          document.getElementById("note-editor").value = note.content;
          document.getElementById("note-tags").value = note.tags || "";
          document.getElementById("save-edit").dataset.id = doc.id;
          switchView("notes-view");
        };
        notesList.appendChild(li);
      });
    } catch (err) {
      console.error("Error loading notes:", err);
    }
  }

  // Save Edits to Notes
  document.getElementById("save-edit").onclick = async () => {
    const noteId = document.getElementById("save-edit").dataset.id;
    const content = document.getElementById("note-editor").value;
    const tags = document.getElementById("note-tags").value;
    if (!noteId || !content.trim()) return;

    try {
      await updateDoc(doc(db, "notes", noteId), {
        content,
        tags,
        updatedAt: serverTimestamp()
      });
      alert("Note updated!");
      loadUserNotes();
    } catch (err) {
      console.error("Error updating note:", err);
    }
  };

  // Delete Note
  document.getElementById("delete-note").onclick = async () => {
    const noteId = document.getElementById("save-edit").dataset.id;
    if (!noteId) return;

    try {
      await deleteDoc(doc(db, "notes", noteId));
      alert("Note deleted!");
      document.getElementById("note-editor").value = "";
      document.getElementById("note-tags").value = "";
      loadUserNotes();
    } catch (err) {
      console.error("Error deleting note:", err);
    }
  };

  // Fetch Notes for Learning
  async function getNotesForLearning() {
    if (!currentUser) return "";

    const q = query(
      collection(db, "notes"),
      where("uid", "==", currentUser.uid),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data().content).join("\n");
  }

  // Learn View Logic
  document.getElementById("topic-dropdown").addEventListener("change", async function () {
    const topic = this.value;
    const contentDiv = document.getElementById("learn-content");

    if (!topic) return;

    const notesContext = await getNotesForLearning();
    const context = `User's notes: ${notesContext}\n\nTopic: ${topic}`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: "Bearer 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",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.3-70b-instruct:free",
        messages: [
          { role: "system", content: "You are an assistant that learns from user notes." },
          { role: "user", content: context }
        ]
      })
    });

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || "🤖 No response.";
    contentDiv.innerHTML = `<p>${reply}</p>`;
  });
  // View Switcher
    // View Switcher
  window.switchView = function (view) {
    // Toggle visibility of views based on the provided `view`
    const views = ['chat-view', 'notes-view', 'learn-view'];
    views.forEach(v => {
      document.getElementById(v).style.display = (v === view) ? 'block' : 'none';
    });
  };

  // Expose global functions for testing or external calls
  window.loadUserNotes = loadUserNotes;
});
