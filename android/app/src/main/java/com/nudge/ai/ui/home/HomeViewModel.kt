package com.nudge.ai.ui.home

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nudge.ai.data.model.Meeting
import com.nudge.ai.data.repository.MeetingRepository
import kotlinx.coroutines.launch

class HomeViewModel : ViewModel() {

    private val repository = MeetingRepository()

    private val _meetings = MutableLiveData<List<Meeting>>()
    val meetings: LiveData<List<Meeting>> = _meetings

    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    init { loadMeetings() }

    fun loadMeetings() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            repository.getMeetings()
                .onSuccess { _meetings.value = it }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }

    fun deleteMeeting(id: String) {
        viewModelScope.launch {
            repository.deleteMeeting(id).onSuccess {
                _meetings.value = _meetings.value?.filter { it.id != id }
            }
        }
    }
}
