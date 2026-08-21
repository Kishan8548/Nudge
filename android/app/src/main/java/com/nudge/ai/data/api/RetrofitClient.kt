package com.nudge.ai.data.api

import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Singleton Retrofit client pointing at the Nudge FastAPI backend.
 *
 * Timeouts are generous (60s connect / 120s read) because:
 *  - Render free tier cold-start takes up to 40s
 *  - Long audio uploads can take 30-60s on mobile
 */
object RetrofitClient {

    const val BASE_URL = "https://nudge-backend-8fri.onrender.com/"

    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = HttpLoggingInterceptor.Level.BODY
    }

    private val okHttpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            // Wake up Render free tier + handle slow uploads
            .connectTimeout(60, TimeUnit.SECONDS)
            .readTimeout(120, TimeUnit.SECONDS)
            .writeTimeout(120, TimeUnit.SECONDS)
            .build()
    }

    val api: NudgeApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(NudgeApiService::class.java)
    }
}
