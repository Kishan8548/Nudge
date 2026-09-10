# 🧩 Module: Chrome Extension (Manifest V3)

The Chrome extension enables one-click audio capture from virtual meeting tabs (Google Meet, Zoom Web, Microsoft Teams) directly into the Nudge backend.

---

## 📂 Source Code Location
- **Root**: `extension/`
- **Manifest**: [extension/manifest.json](file:///c:/Users/suren/Nudge/extension/manifest.json)
- **Background Worker**: [extension/background.js](file:///c:/Users/suren/Nudge/extension/background.js)
- **Offscreen Recorder**: [extension/offscreen.html](file:///c:/Users/suren/Nudge/extension/offscreen.html) & [extension/offscreen.js](file:///c:/Users/suren/Nudge/extension/offscreen.js)
- **Popup UI**: [extension/popup.html](file:///c:/Users/suren/Nudge/extension/popup.html) & [extension/popup.js](file:///c:/Users/suren/Nudge/extension/popup.js)

---

## ⚙️ Manifest V3 Configuration

From [extension/manifest.json](file:///c:/Users/suren/Nudge/extension/manifest.json):

```json
{
  "manifest_version": 3,
  "name": "Nudge AI — Meeting Capture",
  "version": "1.0.0",
  "permissions": [
    "tabCapture",
    "offscreen",
    "storage"
  ],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html"
  }
}
```

---

## 🔄 Capture & Offscreen Recording Flow

Because Chrome Manifest V3 service workers cannot access DOM or `MediaRecorder` APIs, recording is delegated to an offscreen document:

1. **Start Capture**:
   - User enters a meeting title in `popup.html` and clicks **Start Recording**.
   - `popup.js` sends a `start-capture` message with the active `tabId` to `background.js`.
   - `background.js` calls `chrome.tabCapture.getMediaStreamId({ targetTabId: tabId })`.
   - `background.js` creates an offscreen document (`offscreen.html`) with `reasons: ["USER_MEDIA"]`.
   - `background.js` sends `offscreen-start` with the `streamId` to `offscreen.js`.
2. **Audio Encoding**:
   - `offscreen.js` invokes `navigator.mediaDevices.getUserMedia({ audio: { mandatory: { chromeMediaSource: "tab", chromeMediaSourceId: streamId } } })`.
   - Starts `MediaRecorder` with `mimeType: "audio/webm;codecs=opus"`.
3. **Stop & Upload**:
   - User clicks **Stop Recording** in popup.
   - `background.js` signals `offscreen-stop` to finalize the recording.
   - `offscreen.js` converts the recorded chunks into a WebM Blob, formats it as a Data URL, and returns it to `popup.js`.
   - `popup.js` packs the WebM blob into a `FormData` object and uploads it directly to `https://nudge-backend-8fri.onrender.com/api/upload`.

---

## 🔗 Related Notes
- [[Home|Home Overview]]
- [[Architecture|System Architecture]]
- [[Build & Test|Build & Testing Commands]]
- [[Decisions|Architectural Decisions]]
