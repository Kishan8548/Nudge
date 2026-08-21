package com.nudge.ai.ui.record

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.MediaRecorder
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.animation.AnimationUtils
import androidx.activity.result.contract.ActivityResultContracts
import androidx.core.content.ContextCompat
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.navigation.fragment.findNavController
import com.google.android.material.snackbar.Snackbar
import com.nudge.ai.R
import com.nudge.ai.databinding.FragmentRecordBinding
import java.io.File

private const val PREFS_NAME = "nudge_prefs"
private const val KEY_SELF_NAME = "self_name"

class RecordFragment : Fragment() {

    private var _binding: FragmentRecordBinding? = null
    private val binding get() = _binding!!
    private val viewModel: RecordViewModel by viewModels()

    private var mediaRecorder: MediaRecorder? = null
    private var outputFile: File? = null

    private val requestPermission = registerForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) startRecording()
        else Snackbar.make(binding.root, R.string.permission_denied, Snackbar.LENGTH_LONG).show()
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
                RecordState.IDLE  -> checkPermissionAndRecord()
                RecordState.RECORDING -> stopRecording()
                else -> { /* no-op while uploading */ }
            }
        }

        observeViewModel()
    }

    private fun checkPermissionAndRecord() {
        if (ContextCompat.checkSelfPermission(
                requireContext(), Manifest.permission.RECORD_AUDIO
            ) == PackageManager.PERMISSION_GRANTED
        ) {
            startRecording()
        } else {
            requestPermission.launch(Manifest.permission.RECORD_AUDIO)
        }
    }

    private fun startRecording() {
        val file = File(requireContext().cacheDir, "nudge_${System.currentTimeMillis()}.m4a")
        outputFile = file

        @Suppress("DEPRECATION")
        mediaRecorder = MediaRecorder().apply {
            setAudioSource(MediaRecorder.AudioSource.MIC)
            setOutputFormat(MediaRecorder.OutputFormat.MPEG_4)
            setAudioEncoder(MediaRecorder.AudioEncoder.AAC)
            setAudioEncodingBitRate(128_000)
            setAudioSamplingRate(44_100)
            setOutputFile(file.absolutePath)
            prepare()
            start()
        }

        viewModel.onRecordingStarted()
    }

    private fun stopRecording() {
        try {
            mediaRecorder?.apply { stop(); release() }
        } catch (e: Exception) { /* ignore stop errors */ }
        mediaRecorder = null

        val file = outputFile ?: return
        val title = binding.etTitle.text.toString().trim()
        val selfName = binding.etSelfName.text.toString().trim().takeIf { it.isNotBlank() }

        // Persist self name for next time
        if (selfName != null) {
            requireContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit().putString(KEY_SELF_NAME, selfName).apply()
        }

        viewModel.onRecordingStopped(file, title, selfName)
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
                }
                RecordState.RECORDING -> {
                    binding.btnRecord.setImageResource(R.drawable.ic_stop)
                    binding.btnRecord.backgroundTintList = ContextCompat.getColorStateList(
                        requireContext(), R.color.record_red)
                    binding.btnRecord.startAnimation(pulseAnim)
                    binding.tvStatus.text = getString(R.string.recording_status_recording)
                    binding.tvStatus.setTextColor(ContextCompat.getColor(requireContext(), R.color.record_red))
                    binding.etTitle.isEnabled = false
                    binding.progressBar.visibility = View.GONE
                    binding.pulseRing.visibility = View.VISIBLE
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
                        findNavController().navigate(R.id.action_record_to_detail, bundle)
                        viewModel.reset()
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
        if (viewModel.state.value == RecordState.RECORDING) stopRecording()
        _binding = null
    }
}
