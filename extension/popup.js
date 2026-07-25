/**
 * Nudge AI — Extension Popup Logic
 *
 * Handles:
 *   - Start/stop capture button interaction
 *   - Recording timer display
 *   - Uploading the recorded audio to the Nudge backend
 *   - Showing upload progress and result
 */

// ---------- DOM Elements ----------

const btnStart = document.getElementById("btn-start");
const btnStop = document.getElementById("btn-stop");
const timerSection = document.getElementById("timer-section");
const timerDisplay = document.getElementById("timer-display");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const uploadSection = document.getElementById("upload-section");
const progressFill = document.getElementById("progress-fill");
const uploadStatus = document.getElementById("upload-status");
const resultSection = document.getElementById("result-section");
const resultTitle = document.getElementById("result-title");
const resultDetail = document.getElementById("result-detail");
const meetingTitleInput = document.getElementById("meeting-title");

let timerInterval = null;
let startTime = null;

// ---------- Init ----------

document.addEventListener("DOMContentLoaded", () => {
  // Restore saved backend URL and recording state
  chrome.storage.local.get(["recordingStartTime", "meetingTitle"], (result) => {
    if (result.meetingTitle) {
      meetingTitleInput.value = result.meetingTitle;
    }

    if (result.recordingStartTime) {
      // If a start time exists in storage, we are actively recording!
      startTime = result.recordingStartTime;
      setRecordingUI();
      startTimer();
    } else {
      setReadyUI();
    }
  });
});

// ---------- Event Listeners ----------

btnStart.addEventListener("click", async () => {
  btnStart.disabled = true;

  // Save backend URL and title
  chrome.storage.local.set({ 
    meetingTitle: meetingTitleInput.value
  });

  // Get the active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) {
    showError("No active tab found");
    btnStart.disabled = false;
    return;
  }

  // Send start message to background
  chrome.runtime.sendMessage(
    { action: "start-capture", tabId: tab.id },
    (response) => {
      if (response?.error) {
        showError(response.error);
        btnStart.disabled = false;
        return;
      }

      // Store the start time
      startTime = Date.now();
      chrome.storage.local.set({ recordingStartTime: startTime });

      setRecordingUI();
      startTimer();
    }
  );
});

btnStop.addEventListener("click", () => {
  btnStop.disabled = true;
  stopTimer();
  
  // Clean up start time immediately so the popup doesn't think it's still recording if closed and reopened
  // Also clean up title so the next meeting starts fresh
  chrome.storage.local.remove(["recordingStartTime", "meetingTitle"]);

  // Tell background to stop
  chrome.runtime.sendMessage({ action: "stop-capture" }, (response) => {
    if (response?.error) {
      showError(response.error);
      btnStop.disabled = false;
      return;
    }

    // Wait a moment for MediaRecorder to finish, then fetch data
    setUploadingUI();

    setTimeout(() => {
      fetchAndUpload();
    }, 500);
  });
});

// ---------- Fetch Recorded Data & Upload ----------

async function fetchAndUpload() {
  progressFill.style.width = "10%";
  uploadStatus.textContent = "Retrieving recorded audio...";

  chrome.runtime.sendMessage({ action: "offscreen-get-data" }, async (response) => {
    if (response?.error || !response?.data) {
      showError(response?.error || "No audio data received");
      return;
    }

    progressFill.style.width = "30%";
    uploadStatus.textContent = "Preparing upload...";

    try {
      // Convert base64 data URL back to Blob
      const res = await fetch(response.data);
      const blob = await res.blob();

      const sizeMB = (blob.size / (1024 * 1024)).toFixed(1);
      uploadStatus.textContent = `Uploading ${sizeMB} MB...`;
      progressFill.style.width = "50%";

      // Build FormData (same format as the Nudge frontend upload page)
      const formData = new FormData();
      const fileName = `meeting_${Date.now()}.webm`;
      formData.append("file", blob, fileName);

      const title = meetingTitleInput.value.trim() || "Live Meeting Capture";
      formData.append("title", title);

      const backendUrl = "https://nudge-backend-8fri.onrender.com";

      progressFill.style.width = "60%";

      // Upload to backend
      const uploadRes = await fetch(`${backendUrl}/api/upload`, {
        method: "POST",
        body: formData,
      });

      progressFill.style.width = "90%";

      if (!uploadRes.ok) {
        const errData = await uploadRes.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error ${uploadRes.status}`);
      }

      const data = await uploadRes.json();
      progressFill.style.width = "100%";

      // Show success
      setDoneUI(data);
    } catch (err) {
      showError(err.message);
    }
  });
}

// ---------- Timer ----------

function startTimer() {
  timerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
    const secs = String(elapsed % 60).padStart(2, "0");
    timerDisplay.textContent = `${mins}:${secs}`;
  }, 1000);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

// ---------- UI State Functions ----------

function setReadyUI() {
  statusDot.className = "status-dot ready";
  statusText.textContent = "Ready to capture";
  meetingTitleInput.disabled = false;
  btnStart.classList.remove("hidden");
  btnStart.disabled = false;
  btnStop.classList.add("hidden");
  timerSection.classList.add("hidden");
  uploadSection.classList.add("hidden");
  resultSection.classList.add("hidden");
}

function setRecordingUI() {
  statusDot.className = "status-dot recording";
  statusText.textContent = "Recording tab audio";
  meetingTitleInput.disabled = true;
  btnStart.classList.add("hidden");
  btnStop.classList.remove("hidden");
  btnStop.disabled = false;
  timerSection.classList.remove("hidden");
  uploadSection.classList.add("hidden");
  resultSection.classList.add("hidden");
}

function setUploadingUI() {
  statusDot.className = "status-dot uploading";
  statusText.textContent = "Processing & uploading";
  btnStop.classList.add("hidden");
  timerSection.classList.add("hidden");
  uploadSection.classList.remove("hidden");
  progressFill.style.width = "0%";
  resultSection.classList.add("hidden");
}

function setDoneUI(data) {
  statusDot.className = "status-dot done";
  statusText.textContent = "Capture complete!";
  uploadSection.classList.add("hidden");
  resultSection.classList.remove("hidden");
  resultTitle.textContent = `"${data.title}" uploaded!`;
  resultDetail.textContent = `Meeting ID: ${data.meeting_id}\n${
    data.transcript_preview?.slice(0, 120) || ""
  }...`;

  // Show start button again after a delay
  setTimeout(() => {
    btnStart.classList.remove("hidden");
    btnStart.disabled = false;
  }, 2000);
}

function showError(msg) {
  statusDot.className = "status-dot";
  statusText.textContent = `Error: ${msg}`;
  btnStart.classList.remove("hidden");
  btnStart.disabled = false;
  btnStop.classList.add("hidden");
  timerSection.classList.add("hidden");
  uploadSection.classList.add("hidden");
}
