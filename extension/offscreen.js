/**
 * Nudge AI — Offscreen Recording Document
 *
 * This runs inside an invisible offscreen document where MediaRecorder
 * is available (unlike the service worker). It:
 *   1. Receives a tabCapture stream ID from the service worker
 *   2. Opens the stream with navigator.mediaDevices.getUserMedia
 *   3. Records audio chunks with MediaRecorder
 *   4. On stop, assembles a Blob and stores it for the popup to fetch
 */

let mediaRecorder = null;
let recordedChunks = [];
let audioStream = null;

// ---------- Message handler ----------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "offscreen-start":
      startRecording(message.streamId, message.mimeType);
      break;

    case "offscreen-stop":
      stopRecording();
      break;

    case "offscreen-get-data":
      // Popup requests the recorded audio data
      getRecordedData(sendResponse);
      return true; // async
  }
});

// ---------- Start Recording ----------

async function startRecording(streamId, mimeType) {
  try {
    // Get the actual MediaStream from the tabCapture stream ID
    audioStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        mandatory: {
          chromeMediaSource: "tab",
          chromeMediaSourceId: streamId,
        },
      },
    });

    recordedChunks = [];

    // Route audio back to the speaker so the user can still hear the meeting!
    document.getElementById('playback').srcObject = audioStream;

    mediaRecorder = new MediaRecorder(audioStream, {
      mimeType: mimeType || "audio/webm;codecs=opus",
      audioBitsPerSecond: 64000, // 64kbps — good quality, small files
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      // Notify background that recording is done
      chrome.runtime.sendMessage({ action: "recording-complete" });
    };

    // Collect data every 1 second (for smoother progress tracking)
    mediaRecorder.start(1000);
    console.log("[Nudge Offscreen] Recording started");
  } catch (err) {
    console.error("[Nudge Offscreen] Failed to start recording:", err);
  }
}

// ---------- Stop Recording ----------

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
  if (audioStream) {
    audioStream.getTracks().forEach((track) => track.stop());
    audioStream = null;
  }
  console.log("[Nudge Offscreen] Recording stopped");
}

// ---------- Get Recorded Data ----------

async function getRecordedData(sendResponse) {
  if (recordedChunks.length === 0) {
    sendResponse({ error: "No recorded data" });
    return;
  }

  const blob = new Blob(recordedChunks, { type: "audio/webm" });
  // Convert blob to base64 for message passing (blobs can't be sent via chrome.runtime)
  const reader = new FileReader();
  reader.onloadend = () => {
    sendResponse({
      data: reader.result, // data:audio/webm;base64,...
      size: blob.size,
      type: blob.type,
    });
    // Clear after sending
    recordedChunks = [];
  };
  reader.readAsDataURL(blob);
}
