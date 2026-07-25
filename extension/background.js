/**
 * Nudge AI — Background Service Worker
 *
 * Manages tab audio capture and coordinates with the offscreen document
 * that runs MediaRecorder (MediaRecorder cannot run in a service worker).
 *
 * Flow:
 *   1. Popup sends "start-capture" → we call chrome.tabCapture.getMediaStreamId
 *   2. We create an offscreen document and pass the stream ID to it
 *   3. Offscreen doc records audio via MediaRecorder
 *   4. Popup sends "stop-capture" → we tell offscreen to stop and return the blob
 */

let offscreenReady = false;

// ---------- Message handler ----------

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case "start-capture":
      handleStartCapture(message, sendResponse);
      return true; // async response

    case "stop-capture":
      handleStopCapture(sendResponse);
      return true;

    case "get-status":
      chrome.storage.local.get(["recordingStartTime"], (res) => {
        sendResponse({ recording: !!res.recordingStartTime });
      });
      return true;

    case "recording-complete":
      // Offscreen doc finished — data comes back through here
      chrome.storage.local.remove(["recordingStartTime"]);
      return false;
  }
});

async function isRecording() {
  const result = await chrome.storage.local.get(["recordingStartTime"]);
  return !!result.recordingStartTime;
}

// ---------- Start Capture ----------

async function handleStartCapture(message, sendResponse) {
  const recording = await isRecording();
  if (recording) {
    sendResponse({ error: "Already recording" });
    return;
  }

  try {
    // Step 1: Get a media stream ID for the active tab
    const streamId = await chrome.tabCapture.getMediaStreamId({
      targetTabId: message.tabId,
    });

    // Step 2: Ensure offscreen document exists
    await ensureOffscreen();

    // Step 3: Tell the offscreen document to start recording
    chrome.runtime.sendMessage({
      action: "offscreen-start",
      streamId: streamId,
      mimeType: "audio/webm;codecs=opus",
    });

    sendResponse({ success: true });
  } catch (err) {
    console.error("tabCapture failed:", err);
    sendResponse({ error: err.message });
  }
}

// ---------- Stop Capture ----------

async function handleStopCapture(sendResponse) {
  // Always try to stop if the popup requests it.
  // This ensures that even if the service worker went to sleep,
  // the offscreen doc gets the message to stop recording.
  try {
    // Tell offscreen to stop — it will reply with the recorded data
    chrome.runtime.sendMessage({ action: "offscreen-stop" });
    sendResponse({ success: true });
  } catch (err) {
    sendResponse({ error: err.message });
  }
}

// ---------- Offscreen Document ----------

async function ensureOffscreen() {
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [chrome.runtime.getURL("offscreen.html")],
  });

  if (existingContexts.length > 0) return;

  await chrome.offscreen.createDocument({
    url: "offscreen.html",
    reasons: ["USER_MEDIA"],
    justification: "Recording tab audio via MediaRecorder",
  });
}
