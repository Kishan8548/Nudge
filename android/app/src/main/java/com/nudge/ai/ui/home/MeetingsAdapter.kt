package com.nudge.ai.ui.home

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.nudge.ai.data.model.Meeting
import com.nudge.ai.databinding.ItemMeetingBinding
import java.text.SimpleDateFormat
import java.util.Locale

class MeetingsAdapter(
    private val onItemClick: (Meeting) -> Unit,
    private val onDeleteClick: (Meeting) -> Unit
) : ListAdapter<Meeting, MeetingsAdapter.ViewHolder>(DiffCallback) {

    inner class ViewHolder(private val b: ItemMeetingBinding) :
        RecyclerView.ViewHolder(b.root) {

        fun bind(meeting: Meeting) {
            b.tvTitle.text = meeting.title.ifBlank { "Untitled Meeting" }
            b.tvDate.text = formatDate(meeting.createdAt)

            // Duration
            if (meeting.durationSeconds != null && meeting.durationSeconds > 0) {
                val mins = meeting.durationSeconds / 60
                b.tvDuration.text = "${mins} min"
                b.tvDuration.visibility = android.view.View.VISIBLE
            } else {
                b.tvDuration.visibility = android.view.View.GONE
            }

            // Decisions badge
            val decisionCount = meeting.decisions?.size ?: 0
            if (decisionCount > 0) {
                b.tvDecisions.text = "$decisionCount decisions"
                b.tvDecisions.visibility = android.view.View.VISIBLE
            } else {
                b.tvDecisions.visibility = android.view.View.GONE
            }

            // Review badge
            b.tvNeedsReview.visibility = if (meeting.needsHumanReview)
                android.view.View.VISIBLE else android.view.View.GONE

            b.root.setOnClickListener { onItemClick(meeting) }
            b.btnDelete.setOnClickListener { onDeleteClick(meeting) }
        }

        private fun formatDate(iso: String): String = try {
            val inFmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
            val outFmt = SimpleDateFormat("MMM d, yyyy", Locale.getDefault())
            outFmt.format(inFmt.parse(iso)!!)
        } catch (e: Exception) { iso.take(10) }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = ViewHolder(
        ItemMeetingBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )

    override fun onBindViewHolder(holder: ViewHolder, position: Int) =
        holder.bind(getItem(position))

    object DiffCallback : DiffUtil.ItemCallback<Meeting>() {
        override fun areItemsTheSame(a: Meeting, b: Meeting) = a.id == b.id
        override fun areContentsTheSame(a: Meeting, b: Meeting) = a == b
    }
}
