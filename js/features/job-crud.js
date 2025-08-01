import { db } from "../config/config.js";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

export async function addJob(data, userId) {
  if (!userId || typeof data !== "object") {
    throw new Error("Invalid data or userId");
  }

  const today = new Date();
  const formattedToday = today.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let followUpDate = "";

  if (data.status === "Applied") {
    const followUp = new Date();
    followUp.setDate(today.getDate() + 3);
    followUpDate = followUp.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  const job = {
    ...data,
    userId,
    applicationDate: data.applicationDate || formattedToday,
    followUpDate: data.followUpDate || followUpDate,
    createdAt: serverTimestamp(), 
  };

  return await addDoc(collection(db, "jobs"), job);
}

export async function getUserJobs(userId) {
  const q = query(collection(db, "jobs"), where("userId", "==", userId));
  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
}

export async function updateJob(jobId, data) {
  if (!jobId || !data || typeof data !== "object") {
    throw new Error("Invalid update data or jobId.");
  }

  const docRef = doc(db, "jobs", jobId);
  return await updateDoc(docRef, data);
}

export async function deleteJob(jobId) {
  if (!jobId) {
    throw new Error("Missing jobId for deletion.");
  }
  const jobRef = doc(db, "jobs", jobId);
  return await deleteDoc(jobRef);
}
