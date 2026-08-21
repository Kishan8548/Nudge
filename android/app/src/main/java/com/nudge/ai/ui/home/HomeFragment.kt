package com.nudge.ai.ui.home

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.appcompat.app.AlertDialog
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import androidx.recyclerview.widget.LinearLayoutManager
import com.nudge.ai.R
import com.nudge.ai.databinding.FragmentHomeBinding

class HomeFragment : Fragment() {

    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!
    private val viewModel: HomeViewModel by viewModels()
    private lateinit var adapter: MeetingsAdapter

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHomeBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupRecyclerView()
        setupSwipeRefresh()
        observeViewModel()

        // CTA in empty state → navigate to Record tab
        binding.btnGoRecord.setOnClickListener {
            findNavController().navigate(R.id.recordFragment)
        }

        // Retry button in error state
        binding.btnRetry.setOnClickListener {
            showLoading()
            viewModel.loadMeetings()
        }
    }

    private fun setupRecyclerView() {
        adapter = MeetingsAdapter(
            onItemClick = { meeting ->
                val bundle = Bundle().apply { putString("meetingId", meeting.id) }
                findNavController().navigate(R.id.action_home_to_detail, bundle)
            },
            onDeleteClick = { meeting ->
                AlertDialog.Builder(requireContext())
                    .setTitle(getString(R.string.delete_meeting))
                    .setMessage(getString(R.string.delete_meeting_confirm, meeting.title))
                    .setPositiveButton(R.string.confirm) { _, _ ->
                        viewModel.deleteMeeting(meeting.id)
                    }
                    .setNegativeButton(R.string.cancel, null)
                    .show()
            }
        )
        binding.recyclerMeetings.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = this@HomeFragment.adapter
            itemAnimator?.changeDuration = 0
        }
    }

    private fun setupSwipeRefresh() {
        binding.swipeRefresh.apply {
            setColorSchemeResources(R.color.teal_primary)
            setProgressBackgroundColorSchemeResource(R.color.surface_variant)
            setOnRefreshListener { viewModel.loadMeetings() }
        }
    }

    private fun observeViewModel() {
        viewModel.meetings.observe(viewLifecycleOwner) { meetings ->
            adapter.submitList(meetings)
            showState(
                hasItems  = meetings.isNotEmpty(),
                hasError  = false
            )
        }

        viewModel.isLoading.observe(viewLifecycleOwner) { loading ->
            binding.swipeRefresh.isRefreshing = loading
            if (loading && adapter.currentList.isEmpty()) showLoading()
        }

        viewModel.error.observe(viewLifecycleOwner) { error ->
            error ?: return@observe
            if (adapter.currentList.isEmpty()) {
                // No data at all — show full-screen error state
                binding.tvErrorMessage.text =
                    "Pull down to retry once it's ready.\n\n(${error.take(80)})"
                showState(hasItems = false, hasError = true)
            }
            // If we already have data, the list stays visible — no full-screen error
        }
    }

    // ── State helpers ──────────────────────────────────────────────────────────

    private fun showLoading() {
        binding.shimmerLayout.visibility = View.VISIBLE
        binding.shimmerLayout.startShimmer()
        binding.recyclerMeetings.visibility = View.GONE
        binding.emptyState.visibility       = View.GONE
        binding.errorState.visibility       = View.GONE
    }

    private fun showState(hasItems: Boolean, hasError: Boolean) {
        binding.shimmerLayout.stopShimmer()
        binding.shimmerLayout.visibility = View.GONE

        binding.recyclerMeetings.visibility = if (hasItems) View.VISIBLE else View.GONE
        binding.emptyState.visibility       = if (!hasItems && !hasError) View.VISIBLE else View.GONE
        binding.errorState.visibility       = if (hasError) View.VISIBLE else View.GONE
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
