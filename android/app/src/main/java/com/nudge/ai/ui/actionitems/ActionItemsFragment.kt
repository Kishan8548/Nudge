package com.nudge.ai.ui.actionitems

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.chip.Chip
import com.google.android.material.snackbar.Snackbar
import com.nudge.ai.R
import com.nudge.ai.databinding.FragmentActionItemsBinding

class ActionItemsFragment : Fragment() {

    private var _binding: FragmentActionItemsBinding? = null
    private val binding get() = _binding!!
    private val viewModel: ActionItemsViewModel by viewModels()
    private lateinit var adapter: ActionItemsAdapter

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentActionItemsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        setupRecyclerView()
        setupFilters()
        setupSwipeRefresh()
        observeViewModel()
    }

    private fun setupRecyclerView() {
        adapter = ActionItemsAdapter(
            onMarkDone = { item ->
                viewModel.markDone(item.id)
                Snackbar.make(binding.root, "Marked as done ✓", Snackbar.LENGTH_SHORT)
                    .setBackgroundTint(resources.getColor(R.color.status_done_bg, null))
                    .setTextColor(resources.getColor(R.color.status_done, null))
                    .show()
            },
            onApprove = { item -> viewModel.approveItem(item.id) }
        )
        binding.recyclerActionItems.apply {
            layoutManager = LinearLayoutManager(requireContext())
            adapter = this@ActionItemsFragment.adapter
        }
    }

    private fun setupFilters() {
        val chipMap = mapOf(
            binding.chipAll to "all",
            binding.chipPending to "pending",
            binding.chipDone to "done",
            binding.chipReview to "review"
        )
        chipMap.forEach { (chip, filter) ->
            chip.setOnClickListener {
                chipMap.keys.forEach { it.isChecked = it == chip }
                viewModel.applyFilter(filter)
            }
        }
        binding.chipAll.isChecked = true
    }

    private fun setupSwipeRefresh() {
        binding.swipeRefresh.apply {
            setColorSchemeResources(R.color.teal_primary)
            setProgressBackgroundColorSchemeResource(R.color.surface_variant)
            setOnRefreshListener { viewModel.loadItems() }
        }
    }

    private fun observeViewModel() {
        viewModel.filteredItems.observe(viewLifecycleOwner) { items ->
            adapter.submitList(items)
            binding.emptyState.visibility = if (items.isEmpty()) View.VISIBLE else View.GONE
            binding.recyclerActionItems.visibility = if (items.isEmpty()) View.GONE else View.VISIBLE
        }

        viewModel.isLoading.observe(viewLifecycleOwner) { loading ->
            binding.swipeRefresh.isRefreshing = loading
        }

        viewModel.error.observe(viewLifecycleOwner) { error ->
            error?.let {
                Snackbar.make(binding.root, it, Snackbar.LENGTH_LONG)
                    .setAction(R.string.retry) { viewModel.loadItems() }
                    .show()
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
