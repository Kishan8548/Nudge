package com.nudge.ai.ui.record

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.animation.AnimationUtils
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.navigation.fragment.findNavController
import com.google.android.material.snackbar.Snackbar
import com.nudge.ai.R
import com.nudge.ai.databinding.FragmentRecordBinding
import com.nudge.ai.services.AudioRecordingService
import com.nudge.ai.services.AudioRecordingService.Companion.ServiceState
import com.nudge.ai.utils.safeNavigate
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

private const val PREFS_NAME = "nudge_prefs"
private const val KEY_SELF_NAME = "user_self_name"

class RecordFragment : Fragment() {

    private var _binding: FragmentRecordBinding? = null
    private val binding get() = _binding!!
    private val viewModel: RecordViewModel by viewModels()

    private var recordStartTime: Long = 0L
    private val timerHandler = Handler(Looper.getMainLooper())
    private val timerRunnable = object : Runnable {
        override fun run() {
            if (viewModel.state.value == RecordState.RECORDING && recordStartTime > 0) {
                val elapsedSec = (System.currentTimeMillis() - recordStartTime) / 1000
                val m = elapsedSec / 60
                val s = elapsedSec % 60
                binding.tvStatus.text = String.format(java.util.Locale.US, "Recording... %02d:%02d", m, s)
                timerHandler.postDelayed(this, 1000)
            }
        }
    }

    private val requestPermissionsLauncher = registerForActivityResult(
        ActivityResultContracts.RequestMultiplePermissions()
    ) { permissions ->
        val micGranted = permissions[Manifest.permission.RECORD_AUDIO] == true
        if (micGranted) {
            startRecordingService()
        } else {
            Snackbar.make(binding.root, R.string.permission_denied, Snackbar.LENGTH_LONG).show()
        }
    }

    override fun onCreateView(
        inflater: LayoutInflater, container: ViewGroup?, savedInstanceState: Bundle?
    ): View {
        _binding = FragmentRecordBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Restore saved self name across sessions
        val prefs = requireContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val savedName = prefs.getString(KEY_SELF_NAME, "")
        if (!savedName.isNullOrBlank()) {
            binding.etSelfName.setText(savedName)
        }

        binding.btnRecord.setOnClickListener {
            when (viewModel.state.value) {
                RecordState.IDLE -> checkPermissionsAndStart()
                RecordState.RECORDING -> stopRecordingService()
                else -> { /* no-op while uploading */ }
            }
        }

        observeViewModel()
        observeRecordingService()
    }

    private fun checkPermissionsAndStart() {
        val permissions = mutableListOf(Manifest.permission.RECORD_AUDIO)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }

        val allGranted = permissions.all {
            ContextCompat.checkSelfPermission(requireContext(), it) == PackageManager.PERMISSION_GRANTED
        }

        if (allGranted) {
            startRecordingService()
        } else {
            requestPermissionsLauncher.launch(permissions.toTypedArray())
        }
    }

    private fun startRecordingService() {
        val selfName = binding.etSelfName.text.toString().trim()
        val title = binding.etTitle.text.toString().trim()

        if (selfName.isNotBlank()) {
            val prefs = requireContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putString(KEY_SELF_NAME, selfName).apply()
        }

        val intent = Intent(requireContext(), AudioRecordingService::class.java).apply {
            action = AudioRecordingService.ACTION_START
            putExtra(AudioRecordingService.EXTRA_TITLE, title)
            putExtra(AudioRecordingService.EXTRA_SELF_NAME, selfName)
        }

        ContextCompat.startForegroundService(requireContext(), intent)
    }

    private fun stopRecordingService() {
        val intent = Intent(requireContext(), AudioRecordingService::class.java).apply {
            action = AudioRecordingService.ACTION_STOP
        }
        requireContext().startService(intent)
    }

    private fun observeRecordingService() {
        viewLifecycleOwner.lifecycleScope.launch {
            AudioRecordingService.recordingState.collectLatest { serviceState ->
                when (serviceState) {
                    is ServiceState.Recording -> {
                        recordStartTime = serviceState.startTimeMs
                        viewModel.onRecordingStarted()
                        timerHandler.removeCallbacks(timerRunnable)
                        timerHandler.post(timerRunnable)
                    }
                    is ServiceState.Completed -> {
                        timerHandler.removeCallbacks(timerRunnable)
                        recordStartTime = 0L
                        viewModel.onRecordingStopped(
                            audioFile = serviceState.file,
                            title = serviceState.title,
                            selfName = serviceState.selfName.ifBlank { null }
                        )
                        AudioRecordingService.resetState()
                    }
                    is ServiceState.Error -> {
                        timerHandler.removeCallbacks(timerRunnable)
                        recordStartTime = 0L
                        Snackbar.make(binding.root, serviceState.message, Snackbar.LENGTH_LONG).show()
                        viewModel.reset()
                        AudioRecordingService.resetState()
                    }
                    is ServiceState.Idle -> {
                        if (viewModel.state.value == RecordState.RECORDING) {
                            timerHandler.removeCallbacks(timerRunnable)
                            recordStartTime = 0L
                        }
                    }
                }
            }
        }
    }

    private fun observeViewModel() {
        viewModel.state.observe(viewLifecycleOwner) { state ->
            val pulseAnim = AnimationUtils.loadAnimation(requireContext(), R.anim.pulse)
            when (state) {
                RecordState.IDLE -> {
                    binding.btnRecord.setImageResource(R.drawable.ic_record)
                    binding.btnRecord.backgroundTintList = ContextCompat.getColorStateList(
                        requireContext(), R.color.teal_primary)
                    binding.btnRecord.clearAnimation()
                    binding.tvStatus.text = getString(R.string.recording_status_ready)
                    binding.tvStatus.setTextColor(ContextCompat.getColor(requireContext(), R.color.text_muted))
                    binding.etTitle.isEnabled = true
                    binding.progressBar.visibility = View.GONE
                    binding.pulseRing.visibility = View.GONE
                    binding.btnRecord.isEnabled = true
                }
                RecordState.RECORDING -> {
                    binding.btnRecord.setImageResource(R.drawable.ic_stop)
                    binding.btnRecord.backgroundTintList = ContextCompat.getColorStateList(
                        requireContext(), R.color.record_red)
                    binding.btnRecord.startAnimation(pulseAnim)
                    binding.tvStatus.setTextColor(ContextCompat.getColor(requireContext(), R.color.record_red))
                    binding.etTitle.isEnabled = false
                    binding.progressBar.visibility = View.GONE
                    binding.pulseRing.visibility = View.VISIBLE
                    binding.btnRecord.isEnabled = true
                }
                RecordState.UPLOADING -> {
                    binding.btnRecord.clearAnimation()
                    binding.tvStatus.text = getString(R.string.recording_status_uploading)
                    binding.tvStatus.setTextColor(ContextCompat.getColor(requireContext(), R.color.teal_secondary))
                    binding.progressBar.visibility = View.VISIBLE
                    binding.pulseRing.visibility = View.GONE
                    binding.btnRecord.isEnabled = false
                }
                RecordState.DONE -> {
                    binding.progressBar.visibility = View.GONE
                    binding.btnRecord.isEnabled = true
                    val id = viewModel.uploadedMeetingId.value
                    if (id != null) {
                        val bundle = Bundle().apply { putString("meetingId", id) }
                        findNavController().safeNavigate(R.id.action_record_to_detail, bundle)
                    }
                }
                RecordState.ERROR -> {
                    binding.progressBar.visibility = View.GONE
                    binding.btnRecord.isEnabled = true
                    Snackbar.make(
                        binding.root,
                        viewModel.error.value ?: getString(R.string.error_server),
                        Snackbar.LENGTH_LONG
                    ).setAction(R.string.retry) { viewModel.reset() }.show()
                    viewModel.reset()
                }
                else -> {}
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        timerHandler.removeCallbacks(timerRunnable)
        _binding = null
    }
}
