package com.nudge.ai.ui.record

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nudge.ai.data.repository.MeetingRepository
import kotlinx.coroutines.launch
import java.io.File

enum class RecordState { IDLE, RECORDING, UPLOADING, PROCESSING, DONE, ERROR }

class RecordViewModel : ViewModel() {

    private val repository = MeetingRepository()

    private val _state = MutableLiveData(RecordState.IDLE)
    val state: LiveData<RecordState> = _state

    private val _statusMessage = MutableLiveData<String>()
    val statusMessage: LiveData<String> = _statusMessage

    private val _uploadedMeetingId = MutableLiveData<String?>()
    val uploadedMeetingId: LiveData<String?> = _uploadedMeetingId

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    fun onRecordingStarted() {
        _state.value = RecordState.RECORDING
    }

    fun onRecordingStopped(audioFile: File, title: String, selfName: String? = null) {
        viewModelScope.launch {
            _state.value = RecordState.UPLOADING
            val meetingTitle = title.ifBlank { "Meeting ${System.currentTimeMillis()}" }

            repository.uploadMeeting(audioFile, meetingTitle, selfName)
                .onSuccess { response ->
                    _uploadedMeetingId.value = response.meetingId
                    _state.value = RecordState.DONE
                    audioFile.delete()
                }
                .onFailure { err ->
                    _error.value = err.message
                    _state.value = RecordState.ERROR
                }
        }
    }

    fun reset() {
        _state.value = RecordState.IDLE
        _uploadedMeetingId.value = null
        _error.value = null
    }
}
