package com.nudge.ai.ui.detail

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nudge.ai.data.model.Meeting
import com.nudge.ai.data.repository.MeetingRepository
import kotlinx.coroutines.launch

class MeetingDetailViewModel : ViewModel() {

    private val repository = MeetingRepository()

    private val _meeting = MutableLiveData<Meeting>()
    val meeting: LiveData<Meeting> = _meeting

    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    private val _actionTaken = MutableLiveData<String?>()
    val actionTaken: LiveData<String?> = _actionTaken

    fun loadMeeting(id: String) {
        if (id.isBlank()) return
        viewModelScope.launch {
            _isLoading.value = true
            repository.getMeeting(id)
                .onSuccess { _meeting.value = it }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }

    fun processMeeting(id: String) {
        if (id.isBlank() || _isLoading.value == true) return
        viewModelScope.launch {
            _isLoading.value = true
            repository.processMeeting(id)
                .onSuccess {
                    _meeting.value = it
                    _actionTaken.value = "AI processing complete!"
                }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }

    fun markDone(actionItemId: String) {
        viewModelScope.launch {
            repository.markDone(actionItemId).onSuccess {
                _actionTaken.value = "Marked as done"
                _meeting.value?.id?.let { loadMeeting(it) }
            }
        }
    }

    fun approveItem(actionItemId: String) {
        viewModelScope.launch {
            repository.approveReview(actionItemId).onSuccess {
                _actionTaken.value = "Approved"
                _meeting.value?.id?.let { loadMeeting(it) }
            }
        }
    }

    fun rejectItem(actionItemId: String) {
        viewModelScope.launch {
            repository.rejectReview(actionItemId).onSuccess {
                _actionTaken.value = "Rejected"
                _meeting.value?.id?.let { loadMeeting(it) }
            }
        }
    }

    fun updateTitle(id: String, newTitle: String) {
        if (id.isBlank() || newTitle.isBlank()) return
        viewModelScope.launch {
            _isLoading.value = true
            repository.updateMeetingTitle(id, newTitle)
                .onSuccess {
                    _meeting.value = it
                    _actionTaken.value = "Meeting name updated"
                }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }
}
