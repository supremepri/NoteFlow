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
  deleteDoc,
  getDoc
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

// Global user state
let currentUser = null;

document.addEventListener("DOMContentLoaded", () => {
  // DOM References
  const loginBtn = document.getElementById("google-login");
  const logoutBtn = document.getElementById("logout-btn");
  const notesList = document.getElementById("notes-list");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("user-input");
  const chatBox = document.getElementById("chat-box");
  const loadingIndicator = document.getElementById("loading");

  // Google Sign-In
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

  // Auth state change listener
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

  // Chat form submission handler
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

  // Function: Send AI query via your backend /query endpoint
  async function sendQuery(question) {
    loadingIndicator.style.display = "block";
    try {
      // Optionally include user notes context
      const userNotes = await getNotesForLearning();
      const context = userNotes
        ? `User's notes: ${userNotes}\n\nQuestion: ${question}`
        : question;

      // Call your Flask backend endpoint (which securely uses the API key)
      const res = await fetch("/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: context })
      });

      if (!res.ok) {
        console.error("Error fetching response. Status:", res.status);
        alert("Failed to get response from AI.");
        return;
      }

      const data = await res.json();
      const reply = Array.isArray(data.reply)
        ? data.reply.join("<br>")
        : "🤖 No response.";

      // Create a message element to show the AI response
      const div = document.createElement("div");
      div.classList.add("message", "assistant", "ai-response");
      div.innerHTML = `<span class="full-text">${reply}</span>`;
      chatBox.appendChild(div);
      console.log("AI Response:", reply);
    } catch (err) {
      console.error(err);
      const errorDiv = document.createElement("div");
      errorDiv.classList.add("message", "assistant");
      errorDiv.innerText = "❌ Something went wrong.";
      chatBox.appendChild(errorDiv);
    } finally {
      loadingIndicator.style.display = "none";
    }
  }

  // Save Note functionality
  document.getElementById("save-note").addEventListener("click", async () => {
    // Get the last AI response's full text content
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
      console.log("Note saved successfully!", docRef.id);
      loadUserNotes();
    } catch (err) {
      console.error("Error saving note:", err);
    }
  });

  // Load user notes from Firestore
  async function loadUserNotes() {
    if (!currentUser) return;
    try {
      const q = query(
        collection(db, "notes"),
        where("uid", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      notesList.innerHTML = "";
      snapshot.forEach(docSnap => {
        const note = docSnap.data();
        const li = document.createElement("li");
        li.textContent = note.content.length > 50 ? note.content.slice(0, 50) + "..." : note.content;
        li.onclick = () => {
          document.getElementById("note-editor").value = note.content;
          document.getElementById("note-tags").value = note.tags || "";
          document.getElementById("save-edit").dataset.id = docSnap.id;
          switchView("notes-view");
        };
        notesList.appendChild(li);
      });
    } catch (err) {
      console.error("Error loading notes:", err);
    }
  }

  // Get all user notes for learning (returns a concatenated string)
  async function getNotesForLearning() {
    if (!currentUser) return "";
    try {
      const q = query(
        collection(db, "notes"),
        where("uid", "==", currentUser.uid),
        orderBy("createdAt", "desc")
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(docSnap => docSnap.data().content).join("\n");
    } catch (err) {
      console.error("Error fetching notes for learning:", err);
      return "";
    }
  }

  // Save edits to an existing note
  document.getElementById("save-edit").addEventListener("click", async () => {
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
  });

  // Delete note functionality
  document.getElementById("delete-note").addEventListener("click", async () => {
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
  });

  // Learn View: Ask AI for a selected note's context
  document.getElementById("ask-ai").addEventListener("click", async () => {
    const dropdown = document.getElementById("topic-dropdown");
    const noteId = dropdown.value;
    const userQuery = document.getElementById("learn-input").value.trim();
    if (!noteId) {
      alert("Please select a note first!");
      return;
    }
    if (!userQuery) {
      alert("Please ask a question!");
      return;
    }
    const noteDocRef = doc(db, "notes", noteId);
    const noteSnapshot = await getDoc(noteDocRef);
    if (!noteSnapshot.exists()) {
      alert("Note not found!");
      return;
    }
    const noteContent = noteSnapshot.data().content;
    const context = `User note: ${noteContent}\n\nUser question: ${userQuery}`;
    loadingIndicator.style.display = "block";
    try {
      const res = await fetch("/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: context })
      });
      if (!res.ok) {
        console.error("Error fetching AI response:", res.status);
        alert("AI failed to provide an answer.");
        return;
      }
      const data = await res.json();
      const aiReply = Array.isArray(data.reply)
        ? data.reply.join("<br>")
        : "🤖 No response was generated.";
      renderChatMessage("user", userQuery);
      renderChatMessage("assistant", aiReply);
    } catch (err) {
      console.error("Error during AI fetch:", err.message);
      alert("Failed to get response!");
    } finally {
      loadingIndicator.style.display = "none";
    }
  });

  // Render chat messages in Learn View
  function renderChatMessage(role, message) {
    const learnContent = document.getElementById("learn-content");
    if (!learnContent) {
      console.error("Learn-content element not found!");
      return;
    }
    const messageContainer = document.createElement("div");
    messageContainer.classList.add("chat-message", role);
    const text = document.createElement("p");
    text.textContent = message;
    messageContainer.appendChild(text);
    learnContent.appendChild(messageContainer);
    learnContent.scrollTop = learnContent.scrollHeight;
    console.log(`Message rendered (${role}):`, message);
  }

  // Global error handling (optional)
  window.addEventListener("error", (e) => {
    console.error("Global Error:", e.message);
  });

  // Expose global functions if needed
  window.loadUserNotes = loadUserNotes;
  window.switchView = function (view) {
    const views = ["chat-view", "notes-view", "learn-view"];
    views.forEach(v => {
      document.getElementById(v).style.display = (v === view) ? "block" : "none";
    });
  };
});
