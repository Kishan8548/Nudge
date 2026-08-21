package com.nudge.ai.data.model

import com.google.gson.annotations.SerializedName

/** Single meeting returned by GET /api/meetings and GET /api/meetings/{id} */
data class Meeting(
    @SerializedName("id")               val id: String,
    @SerializedName("title")            val title: String,
    @SerializedName("summary")          val summary: String? = null,
    @SerializedName("created_at")       val createdAt: String,
    @SerializedName("duration_seconds") val durationSeconds: Double? = null,
    @SerializedName("language")         val language: String? = null,
    @SerializedName("decisions")        val decisions: List<String>? = null,
    @SerializedName("needs_human_review") val needsHumanReview: Boolean = false,
    @SerializedName("self_name")        val selfName: String? = null,
    // Populated only on detail endpoint
    @SerializedName("action_items")     val actionItems: List<ActionItem>? = null
)

/** An action item extracted from a meeting */
data class ActionItem(
    @SerializedName("id")               val id: String,
    @SerializedName("meeting_id")       val meetingId: String,
    @SerializedName("text")             val text: String,
    @SerializedName("owner_name")       val ownerName: String? = null,
    @SerializedName("owner_email")      val ownerEmail: String? = null,
    @SerializedName("deadline")         val deadline: String? = null,
    @SerializedName("confidence")       val confidence: Double = 1.0,
    @SerializedName("status")           val status: String = "pending",
    @SerializedName("reminder_count")   val reminderCount: Int = 0,
    @SerializedName("last_reminded_at") val lastRemindedAt: String? = null,
    @SerializedName("created_at")       val createdAt: String? = null,
    @SerializedName("is_mine")          val isMine: Boolean = true,
    @SerializedName("activity_log")     val activityLog: List<ActivityLogEntry>? = null
) {
    val isPending: Boolean get() = status == "pending"
    val isDone: Boolean get() = status == "done"
    val needsReview: Boolean get() = confidence < 0.7
    val isEscalated: Boolean get() = status == "escalated"
    val confidencePct: Int get() = (confidence * 100).toInt()
}

/** Activity log entry from agent reasoning history */
data class ActivityLogEntry(
    @SerializedName("ts")     val timestamp: String,
    @SerializedName("event")  val event: String,
    @SerializedName("detail") val detail: String? = null
)

/** Paginated meetings response */
data class MeetingsResponse(
    @SerializedName("meetings") val meetings: List<Meeting>,
    @SerializedName("total")    val total: Int,
    @SerializedName("skip")     val skip: Int,
    @SerializedName("limit")    val limit: Int
)

/** Paginated action items response */
data class ActionItemsResponse(
    @SerializedName("action_items") val actionItems: List<ActionItem>,
    @SerializedName("total")        val total: Int,
    @SerializedName("skip")         val skip: Int,
    @SerializedName("limit")        val limit: Int
)

/** Upload response from POST /api/upload */
data class UploadResponse(
    @SerializedName("meeting_id")        val meetingId: String,
    @SerializedName("title")             val title: String,
    @SerializedName("transcript_preview") val transcriptPreview: String? = null,
    @SerializedName("status")            val status: String
)

/** Body for PATCH /api/action-items/{id} */
data class ActionItemUpdate(
    @SerializedName("status")      val status: String? = null,
    @SerializedName("owner_name")  val ownerName: String? = null,
    @SerializedName("owner_email") val ownerEmail: String? = null,
    @SerializedName("deadline")    val deadline: String? = null,
    @SerializedName("text")        val text: String? = null
)

/** Body for POST /api/action-items/{id}/review */
data class ReviewDecision(
    @SerializedName("approved")          val approved: Boolean,
    @SerializedName("updated_text")      val updatedText: String? = null,
    @SerializedName("updated_owner")     val updatedOwner: String? = null,
    @SerializedName("updated_deadline")  val updatedDeadline: String? = null
)

/** Generic success message response */
data class MessageResponse(
    @SerializedName("message")     val message: String? = null,
    @SerializedName("status")      val status: String? = null,
    @SerializedName("meeting_id")  val meetingId: String? = null
)

/** Body for PATCH /api/meetings/{id} */
data class UpdateMeetingTitleRequest(
    @SerializedName("title") val title: String
)
