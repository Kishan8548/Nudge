package com.nudge.ai.data.repository

import com.nudge.ai.data.api.NudgeApiService
import com.nudge.ai.data.api.RetrofitClient
import com.nudge.ai.data.model.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import retrofit2.Response
import java.io.File

/**
 * Single source of truth for all Nudge data operations.
 *
 * Wraps every API call in a [Result] so ViewModels never deal with
 * exceptions directly — they just observe Success / Failure.
 */
class MeetingRepository(
    private val api: NudgeApiService = RetrofitClient.api
) {

    // ── Meetings ──────────────────────────────────────────────────────────────

    suspend fun getMeetings(): Result<List<Meeting>> = safeCall {
        api.listMeetings(limit = 50).requireBody().meetings
    }

    suspend fun getMeeting(id: String): Result<Meeting> = safeCall {
        api.getMeeting(id).requireBody()
    }

    suspend fun processMeeting(id: String): Result<Meeting> = safeCall {
        api.processMeeting(id).requireBody()
    }

    suspend fun deleteMeeting(id: String): Result<Unit> = safeCall {
        api.deleteMeeting(id).requireBody()
        Unit
    }

    // ── Upload ────────────────────────────────────────────────────────────────

    /**
     * Upload a recorded audio file to the backend.
     *
     * @param file      The audio file on disk (typically .m4a from MediaRecorder)
     * @param title     Meeting title entered by the user
     * @param selfName  Your name as spoken in the meeting — used to tag YOUR tasks
     */
    suspend fun uploadMeeting(
        file: File,
        title: String,
        selfName: String? = null
    ): Result<UploadResponse> = safeCall {
        val mimeType = when (file.extension.lowercase()) {
            "m4a"  -> "audio/m4a"
            "webm" -> "audio/webm"
            "mp3"  -> "audio/mpeg"
            else   -> "audio/mpeg"
        }
        val requestFile = file.asRequestBody(mimeType.toMediaTypeOrNull())
        val filePart    = MultipartBody.Part.createFormData("file", file.name, requestFile)
        val titlePart   = title.toRequestBody("text/plain".toMediaTypeOrNull())
        val selfPart    = selfName?.toRequestBody("text/plain".toMediaTypeOrNull())
        api.uploadMeeting(filePart, titlePart, selfPart).requireBody()
    }

    // ── Action Items ──────────────────────────────────────────────────────────

    suspend fun getActionItems(
        status: String? = null,
        meetingId: String? = null
    ): Result<List<ActionItem>> = safeCall {
        api.listActionItems(status = status, meetingId = meetingId, limit = 100)
            .requireBody()
            .actionItems
    }

    suspend fun markDone(id: String): Result<ActionItem> = safeCall {
        api.updateActionItem(id, ActionItemUpdate(status = "done")).requireBody()
    }

    suspend fun approveReview(id: String): Result<MessageResponse> = safeCall {
        api.reviewActionItem(id, ReviewDecision(approved = true)).requireBody()
    }

    suspend fun rejectReview(id: String): Result<MessageResponse> = safeCall {
        api.reviewActionItem(id, ReviewDecision(approved = false)).requireBody()
    }

    suspend fun triggerReminder(id: String): Result<MessageResponse> = safeCall {
        api.triggerReminder(id).requireBody()
    }

    // ── Health / Wakeup ───────────────────────────────────────────────────────

    /** Ping the backend to wake Render from cold start. Call on app launch. */
    suspend fun pingBackend(): Result<Unit> = safeCall {
        api.health()
        Unit
    }

    // ── Seed ─────────────────────────────────────────────────────────────────

    suspend fun seedDemoData(): Result<MessageResponse> = safeCall {
        api.seedDemoData().requireBody()
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /** Wraps a suspend block in Result.success / Result.failure */
    private suspend fun <T> safeCall(block: suspend () -> T): Result<T> = try {
        Result.success(block())
    } catch (e: com.google.gson.JsonSyntaxException) {
        android.util.Log.e("MeetingRepository", "JsonSyntaxException: ${e.message}", e)
        Result.failure(Exception("Server is waking up — pull to refresh in a moment"))
    } catch (e: com.google.gson.stream.MalformedJsonException) {
        android.util.Log.e("MeetingRepository", "MalformedJsonException: ${e.message}", e)
        Result.failure(Exception("Server is waking up — pull to refresh in a moment"))
    } catch (e: java.net.SocketTimeoutException) {
        android.util.Log.e("MeetingRepository", "SocketTimeoutException: ${e.message}", e)
        Result.failure(Exception("Request timed out — server may be starting up"))
    } catch (e: java.io.EOFException) {
        android.util.Log.e("MeetingRepository", "EOFException: ${e.message}", e)
        Result.failure(Exception("Server is waking up — pull to refresh in a moment"))
    } catch (e: Exception) {
        android.util.Log.e("MeetingRepository", "API Exception: ${e.message}", e)
        Result.failure(e)
    }

    /** Throws if response is not successful or body is null */
    private fun <T> Response<T>.requireBody(): T {
        if (!isSuccessful) {
            val errBody = errorBody()?.string()?.take(200) ?: ""
            val msg = if (errBody.startsWith("<!DOCTYPE") || errBody.startsWith("<html"))
                "Server is waking up — try again in a moment"
            else
                "HTTP ${code()}: $errBody"
            error(msg)
        }
        return body() ?: error("Empty response body")
    }
}
