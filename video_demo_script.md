# 🎬 Nudge AI: Screen Recording Video Script & Choreography

*Use this script to guide your screen recording. It tells you exactly what to do on-screen while you read the voiceover.*

---

### Step 1: Introduction (On the Nudge Dashboard)
* **On-screen Action:** Have your browser open to the Nudge Analytics Dashboard (`http://localhost:5173/analytics` or the Vercel link).
* **Your Voiceover:** *"Hi everyone, this is Nudge — an autonomous Agentic AI that lives in your browser, listens to your meetings, and handles all post-meeting workflow so that no task is ever forgotten. Today, I'm going to show you how Nudge completely automates project management."*

---

### Step 2: Starting the Extension & Joining the Meet
* **On-screen Action:** Open the Nudge Chrome Extension in the top right corner. Type in "Q3 Marketing Sync" as the title, and click "Start Capture". Then, join the Google Meet room.
* **Your Voiceover:** *"I'm about to jump into a quick sync with my team lead. Before I join, I simply open the Nudge Chrome Extension, enter a title, and click 'Start Capture'. Nudge is now listening to the browser audio. Let's see what happens."*

---

### Step 3: The Meeting (The Manager's Script)
* **On-screen Action:** You sit quietly in the Google Meet while your friend (the Manager) speaks their script.
* **Manager says:** *(Reads the script from `demo_audio_script.md`)* "Alright team, thanks for joining the Q3 Marketing Sync..."

---

### Step 4: Stopping the Capture
* **On-screen Action:** When he finishes, leave the Google Meet. Open the Nudge Extension and click "Stop Capture".
* **Your Voiceover:** *"The meeting is over, so I just click 'Stop Capture'. Nudge instantly takes the recorded audio and pushes it to our FastAPI backend, where it is transcribed in milliseconds using Groq's ultra-fast LPU inference."*

---

### Step 5: Showing the Processing & AI Dashboard
* **On-screen Action:** The extension will show "Upload complete!" Click over to the **Dashboard** or **Action Items** tab on the Nudge website.
* **Your Voiceover:** *"Our LangGraph AI pipeline has processed the meeting. Let's look at the results. Nudge automatically generated a flawless Executive Summary of the meeting. It also extracted the core decision regarding the 15% budget increase."*

---

### Step 6: Highlighting the Action Items & Human-in-the-Loop
* **On-screen Action:** Scroll down to the Action Items section. Point out your task, the manager's task, and the yellow "Needs Human Review" task.
* **Your Voiceover:** *"Down here, Nudge structured all the action items. It successfully assigned the landing page task to me with a deadline of tomorrow, and assigned the budget task to the manager. But notice this yellow flag! The manager asked 'somebody' to handle the catering, but didn't assign an owner or a date. Because Nudge is an intelligent agent, its confidence score dropped, and it flagged the task for human review rather than guessing. This proves the agent is self-aware of ambiguity."*

---

### Step 7: The PDF Export & Conclusion
* **On-screen Action:** Click the "Export PDF" button to show the beautifully formatted print page.
* **Your Voiceover:** *"With one click, I can export these structured notes to a professional PDF. Finally, our background Smart Escalation Engine is now tracking these deadlines, and will automatically send Slack and SMTP email reminders to the owners if they fall behind. Nudge doesn't just take notes—it ensures the work actually gets done. Thank you!"*

---

### 💡 Tips for Recording
* **Pace yourself:** Don't rush through the clicks. Let the judges see the UI for a few seconds.
* **Practice once before recording:** Do a dry run where you just click through the app while reading the script to make sure the timing feels natural.
