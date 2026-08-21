package com.nudge.ai.ui.detail

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.google.android.material.snackbar.Snackbar
import com.nudge.ai.R
import com.nudge.ai.data.model.ActionItem
import com.nudge.ai.data.model.Meeting
import com.nudge.ai.databinding.FragmentMeetingDetailBinding
import java.text.SimpleDateFormat
import java.util.Locale

class MeetingDetailFragment : Fragment() {

    private var _binding: FragmentMeetingDetailBinding? = null
    private val binding get() = _binding!!
    private val viewModel: MeetingDetailViewModel by viewModels()
    private var meetingId: String = ""

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentMeetingDetailBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.btnBack.setOnClickListener { findNavController().popBackStack() }
        binding.btnProcess.setOnClickListener { viewModel.processMeeting(meetingId) }

        meetingId = arguments?.getString("meetingId") ?: ""
        viewModel.loadMeeting(meetingId)
        observeViewModel()
    }

    private fun observeViewModel() {
        viewModel.meeting.observe(viewLifecycleOwner) { meeting ->
            renderMeeting(meeting)
        }

        viewModel.isLoading.observe(viewLifecycleOwner) { loading ->
            binding.progressBar.visibility = if (loading) View.VISIBLE else View.GONE
            binding.btnProcess.isEnabled = !loading
        }

        viewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let {
                Snackbar.make(binding.root, it, Snackbar.LENGTH_LONG)
                    .setAction(R.string.retry) { viewModel.loadMeeting(meetingId) }
                    .show()
            }
        }

        viewModel.actionTaken.observe(viewLifecycleOwner) { msg ->
            msg?.let {
                Snackbar.make(binding.root, it, Snackbar.LENGTH_SHORT)
                    .setBackgroundTint(resources.getColor(R.color.teal_glow, null))
                    .setTextColor(resources.getColor(R.color.teal_primary, null))
                    .show()
            }
        }
    }

    private fun renderMeeting(meeting: Meeting) {
        binding.tvTitle.text = meeting.title.ifBlank { "Untitled Meeting" }
        binding.tvDate.text = formatDate(meeting.createdAt)

        // Summary
        if (!meeting.summary.isNullOrBlank()) {
            binding.tvSummary.text = meeting.summary
            binding.cardSummary.visibility = View.VISIBLE
        } else {
            binding.cardSummary.visibility = View.GONE
        }

        // Decisions
        val decisions = meeting.decisions
        if (!decisions.isNullOrEmpty()) {
            binding.tvDecisionsHeader.visibility = View.VISIBLE
            binding.containerDecisions.removeAllViews()
            decisions.forEach { decision ->
                val tv = LayoutInflater.from(requireContext())
                    .inflate(R.layout.item_decision, binding.containerDecisions, false)
                        as android.widget.TextView
                tv.text = "· $decision"
                binding.containerDecisions.addView(tv)
            }
        } else {
            binding.tvDecisionsHeader.visibility = View.GONE
        }

        // Action items
        val items = meeting.actionItems
        if (!items.isNullOrEmpty()) {
            binding.tvActionItemsHeader.visibility = View.VISIBLE
            binding.btnProcess.visibility = View.GONE
            binding.containerActionItems.removeAllViews()
            items.forEach { item -> addActionItemView(item) }
        } else {
            binding.tvActionItemsHeader.visibility = View.VISIBLE
            binding.containerActionItems.removeAllViews()
            binding.btnProcess.visibility = View.VISIBLE
        }
    }

    private fun addActionItemView(item: ActionItem) {
        val v = LayoutInflater.from(requireContext())
            .inflate(R.layout.item_action_item, binding.containerActionItems, false)

        v.findViewById<android.widget.TextView>(R.id.tvText).text = item.text
        v.findViewById<android.widget.TextView>(R.id.tvOwner).text = item.ownerName ?: "Unassigned"

        val tvDeadline = v.findViewById<android.widget.TextView>(R.id.tvDeadline)
        if (item.deadline != null) {
            tvDeadline.text = "Due ${item.deadline.take(10)}"
            tvDeadline.visibility = View.VISIBLE
        } else {
            tvDeadline.visibility = View.GONE
        }

        val tvStatus = v.findViewById<android.widget.TextView>(R.id.tvStatus)
        tvStatus.text = item.status.replaceFirstChar { it.uppercase() }

        val tvReview = v.findViewById<android.widget.TextView>(R.id.tvReviewBadge)
        tvReview.visibility = if (item.needsReview && !item.isDone) View.VISIBLE else View.GONE

        val btnDone = v.findViewById<android.widget.Button>(R.id.btnMarkDone)
        val btnApprove = v.findViewById<android.widget.Button>(R.id.btnApprove)
        val btnReject = v.findViewById<android.widget.Button>(R.id.btnReject)

        btnDone.visibility = if (item.isDone) View.GONE else View.VISIBLE
        btnApprove.visibility = if (item.needsReview && !item.isDone) View.VISIBLE else View.GONE
        btnReject.visibility = if (item.needsReview && !item.isDone) View.VISIBLE else View.GONE

        btnDone.setOnClickListener { viewModel.markDone(item.id) }
        btnApprove.setOnClickListener { viewModel.approveItem(item.id) }
        btnReject.setOnClickListener { viewModel.rejectItem(item.id) }

        val confidenceBar = v.findViewById<android.widget.ProgressBar>(R.id.confidenceBar)
        confidenceBar.progress = item.confidencePct

        binding.containerActionItems.addView(v)
    }

    private fun formatDate(iso: String): String = try {
        val inFmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.getDefault())
        val outFmt = SimpleDateFormat("MMM d, yyyy · h:mm a", Locale.getDefault())
        outFmt.format(inFmt.parse(iso)!!)
    } catch (e: Exception) { iso.take(10) }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
