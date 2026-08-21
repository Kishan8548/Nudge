package com.nudge.ai.ui.actionitems

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.nudge.ai.R
import com.nudge.ai.data.model.ActionItem
import com.nudge.ai.databinding.ItemActionItemBinding
import java.text.SimpleDateFormat
import java.util.Locale

class ActionItemsAdapter(
    private val onMarkDone: (ActionItem) -> Unit,
    private val onApprove: (ActionItem) -> Unit
) : ListAdapter<ActionItem, ActionItemsAdapter.ViewHolder>(DiffCallback) {

    inner class ViewHolder(private val b: ItemActionItemBinding) :
        RecyclerView.ViewHolder(b.root) {

        fun bind(item: ActionItem) {
            b.tvText.text = item.text

            // Owner
            b.tvOwner.text = item.ownerName ?: "Unassigned"
            b.tvOwner.alpha = if (item.ownerName != null) 1f else 0.5f

            // Deadline
            if (item.deadline != null) {
                b.tvDeadline.text = formatDeadline(item.deadline)
                b.tvDeadline.visibility = View.VISIBLE
            } else {
                b.tvDeadline.visibility = View.GONE
            }

            // Status chip
            when (item.status) {
                "done" -> {
                    b.tvStatus.text = b.root.context.getString(R.string.status_done)
                    b.tvStatus.setBackgroundResource(R.drawable.chip_bg_green)
                    b.tvStatus.setTextColor(b.root.context.getColor(R.color.status_done))
                    b.btnMarkDone.visibility = View.GONE
                }
                "escalated" -> {
                    b.tvStatus.text = b.root.context.getString(R.string.status_escalated)
                    b.tvStatus.setBackgroundResource(R.drawable.chip_bg_red)
                    b.tvStatus.setTextColor(b.root.context.getColor(R.color.status_escalated))
                    b.btnMarkDone.visibility = View.VISIBLE
                }
                else -> {
                    b.tvStatus.text = b.root.context.getString(R.string.status_pending)
                    b.tvStatus.setBackgroundResource(R.drawable.chip_bg_amber)
                    b.tvStatus.setTextColor(b.root.context.getColor(R.color.status_pending))
                    b.btnMarkDone.visibility = View.VISIBLE
                }
            }

            // Needs review badge
            if (item.needsReview && !item.isDone) {
                b.tvReviewBadge.visibility = View.VISIBLE
                b.btnApprove.visibility = View.VISIBLE
            } else {
                b.tvReviewBadge.visibility = View.GONE
                b.btnApprove.visibility = View.GONE
            }

            // Confidence
            b.confidenceBar.progress = item.confidencePct

            // Actions
            b.btnMarkDone.setOnClickListener { onMarkDone(item) }
            b.btnApprove.setOnClickListener { onApprove(item) }
        }

        private fun formatDeadline(iso: String): String = try {
            val inFmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
            val outFmt = SimpleDateFormat("MMM d", Locale.getDefault())
            "Due " + outFmt.format(inFmt.parse(iso)!!)
        } catch (e: Exception) { iso.take(10) }
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int) = ViewHolder(
        ItemActionItemBinding.inflate(LayoutInflater.from(parent.context), parent, false)
    )
    override fun onBindViewHolder(holder: ViewHolder, position: Int) = holder.bind(getItem(position))

    object DiffCallback : DiffUtil.ItemCallback<ActionItem>() {
        override fun areItemsTheSame(a: ActionItem, b: ActionItem) = a.id == b.id
        override fun areContentsTheSame(a: ActionItem, b: ActionItem) = a == b
    }
}
