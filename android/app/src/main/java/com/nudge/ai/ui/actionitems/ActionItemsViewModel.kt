package com.nudge.ai.ui.actionitems

import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.nudge.ai.data.model.ActionItem
import com.nudge.ai.data.repository.MeetingRepository
import kotlinx.coroutines.launch

class ActionItemsViewModel : ViewModel() {

    private val repository = MeetingRepository()

    private val _allItems = MutableLiveData<List<ActionItem>>()
    private val _filteredItems = MutableLiveData<List<ActionItem>>()
    val filteredItems: LiveData<List<ActionItem>> = _filteredItems

    private val _isLoading = MutableLiveData(false)
    val isLoading: LiveData<Boolean> = _isLoading

    private val _error = MutableLiveData<String?>()
    val error: LiveData<String?> = _error

    var currentFilter = "all"

    init { loadItems() }

    fun loadItems() {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            repository.getActionItems()
                .onSuccess {
                    _allItems.value = it
                    applyFilter(currentFilter)
                }
                .onFailure { _error.value = it.message }
            _isLoading.value = false
        }
    }

    fun applyFilter(filter: String) {
        currentFilter = filter
        val all = _allItems.value ?: return
        _filteredItems.value = when (filter) {
            "pending"  -> all.filter { it.status == "pending" }
            "done"     -> all.filter { it.status == "done" }
            "review"   -> all.filter { it.confidence < 0.7 }
            else       -> all
        }
    }

    fun markDone(id: String) {
        viewModelScope.launch {
            repository.markDone(id).onSuccess {
                val updated = _allItems.value?.map { item ->
                    if (item.id == id) item.copy(status = "done") else item
                } ?: return@onSuccess
                _allItems.value = updated
                applyFilter(currentFilter)
            }
        }
    }

    fun approveItem(id: String) {
        viewModelScope.launch {
            repository.approveReview(id).onSuccess { loadItems() }
        }
    }
}
