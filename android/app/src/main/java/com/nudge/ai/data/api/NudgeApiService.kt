package com.nudge.ai.data.api

import com.nudge.ai.data.model.*
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.*

/** Retrofit interface mapping to the Nudge FastAPI backend. */
interface NudgeApiService {

    // ── Health ──────────────────────────────────────────────────────────────

    @GET("api/health")
    suspend fun health(): Response<Map<String, String>>

    // ── Meetings ─────────────────────────────────────────────────────────────

    @GET("api/meetings")
    suspend fun listMeetings(
        @Query("skip")  skip:  Int = 0,
        @Query("limit") limit: Int = 50
    ): Response<MeetingsResponse>

    @GET("api/meetings/{id}")
    suspend fun getMeeting(
        @Path("id") id: String
    ): Response<Meeting>

    @POST("api/meetings/{id}/process")
    suspend fun processMeeting(
        @Path("id") id: String
    ): Response<Meeting>

    @DELETE("api/meetings/{id}")
    suspend fun deleteMeeting(
        @Path("id") id: String
    ): Response<MessageResponse>

    // ── Upload ───────────────────────────────────────────────────────────────

    /** Upload a .m4a / .webm audio file with a meeting title and optional self name. */
    @Multipart
    @POST("api/upload")
    suspend fun uploadMeeting(
        @Part file:             MultipartBody.Part,
        @Part("title")     title:    RequestBody,
        @Part("self_name") selfName: RequestBody? = null
    ): Response<UploadResponse>

    // ── Action Items ──────────────────────────────────────────────────────────

    @GET("api/action-items")
    suspend fun listActionItems(
        @Query("status")     status:    String? = null,
        @Query("meeting_id") meetingId: String? = null,
        @Query("mine")       mine:      Boolean = true,  // default: only MY tasks
        @Query("skip")       skip:      Int = 0,
        @Query("limit")      limit:     Int = 100
    ): Response<ActionItemsResponse>

    @GET("api/action-items/{id}")
    suspend fun getActionItem(
        @Path("id") id: String
    ): Response<ActionItem>

    @PATCH("api/action-items/{id}")
    suspend fun updateActionItem(
        @Path("id")   id:     String,
        @Body         update: ActionItemUpdate
    ): Response<ActionItem>

    @POST("api/action-items/{id}/review")
    suspend fun reviewActionItem(
        @Path("id")   id:       String,
        @Body         decision: ReviewDecision
    ): Response<MessageResponse>

    @POST("api/action-items/{id}/remind")
    suspend fun triggerReminder(
        @Path("id") id: String
    ): Response<MessageResponse>

    // ── Seed (demo data) ─────────────────────────────────────────────────────

    @POST("api/seed")
    suspend fun seedDemoData(): Response<MessageResponse>
}
