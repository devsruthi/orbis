package com.orbis.language

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import org.json.JSONObject

/**
 * Android speech recognition for the WebView. Android System WebView does not
 * expose the Web Speech Recognition API, so Orbis uses the platform
 * SpeechRecognizer and reports transcripts to JS. Raw audio is not stored.
 */
class OrbisSpeechBridge(
  private val activity: Activity,
  private val webView: WebView,
) {
  companion object {
    const val REQUEST_RECORD_AUDIO = 9101
  }
  private val mainHandler = Handler(Looper.getMainLooper())
  private var recognizer: SpeechRecognizer? = null
  private var pendingLanguage: String? = null

  @JavascriptInterface
  fun isAvailable(): String {
    return if (SpeechRecognizer.isRecognitionAvailable(activity)) "true" else "false"
  }

  @JavascriptInterface
  fun start(language: String) {
    mainHandler.post { startOnMain(language) }
  }

  @JavascriptInterface
  fun stop() {
    mainHandler.post { recognizer?.stopListening() }
  }

  @JavascriptInterface
  fun cancel() {
    mainHandler.post { destroyRecognizer() }
  }

  fun release() {
    mainHandler.post { destroyRecognizer() }
  }

  private fun startOnMain(language: String) {
    if (!SpeechRecognizer.isRecognitionAvailable(activity)) {
      emitError("unsupported", "Voice mode isn't available on this device.")
      return
    }
    if (
      ContextCompat.checkSelfPermission(activity, Manifest.permission.RECORD_AUDIO)
      != PackageManager.PERMISSION_GRANTED
    ) {
      pendingLanguage = language
      ActivityCompat.requestPermissions(
        activity,
        arrayOf(Manifest.permission.RECORD_AUDIO),
        REQUEST_RECORD_AUDIO,
      )
      return
    }
    startRecognizer(language)
  }

  fun onPermissionResult(granted: Boolean) {
    val language = pendingLanguage
    pendingLanguage = null
    if (!granted || language.isNullOrBlank()) {
      emitError(
        "permission_denied",
        "Microphone access is needed so the character can hear you. You can continue with text.",
      )
      return
    }
    startOnMain(language)
  }

  private fun startRecognizer(language: String) {
    destroyRecognizer()
    val speech = SpeechRecognizer.createSpeechRecognizer(activity)
    recognizer = speech
    speech.setRecognitionListener(
      object : RecognitionListener {
        override fun onReadyForSpeech(params: Bundle?) {}

        override fun onBeginningOfSpeech() {}

        override fun onRmsChanged(rmsdB: Float) {}

        override fun onBufferReceived(buffer: ByteArray?) {}

        override fun onEndOfSpeech() {}

        override fun onError(error: Int) {
          emitError(mapError(error), mapErrorMessage(error))
        }

        override fun onResults(results: Bundle?) {
          val text =
            results
              ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
              ?.firstOrNull()
              .orEmpty()
          emit("final", text)
        }

        override fun onPartialResults(partialResults: Bundle?) {
          val text =
            partialResults
              ?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
              ?.firstOrNull()
              .orEmpty()
          if (text.isNotBlank()) {
            emit("interim", text)
          }
        }

        override fun onEvent(eventType: Int, params: Bundle?) {}
      },
    )
    val intent =
      Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
        putExtra(
          RecognizerIntent.EXTRA_LANGUAGE_MODEL,
          RecognizerIntent.LANGUAGE_MODEL_FREE_FORM,
        )
        putExtra(RecognizerIntent.EXTRA_LANGUAGE, language)
        putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, language)
        putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
      }
    speech.startListening(intent)
  }

  private fun destroyRecognizer() {
    val current = recognizer ?: return
    recognizer = null
    current.setRecognitionListener(null)
    current.cancel()
    current.destroy()
  }

  private fun emit(type: String, text: String) {
    val payload = JSONObject()
    payload.put("type", type)
    payload.put("text", text)
    dispatch(payload)
  }

  private fun emitError(code: String, message: String) {
    val payload = JSONObject()
    payload.put("type", "error")
    payload.put("code", code)
    payload.put("message", message)
    dispatch(payload)
  }

  private fun dispatch(payload: JSONObject) {
    val script = "window.__orbisNativeSpeech&&window.__orbisNativeSpeech($payload);"
    webView.post { webView.evaluateJavascript(script, null) }
  }

  private fun mapError(error: Int): String {
    return when (error) {
      SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> "permission_denied"
      SpeechRecognizer.ERROR_AUDIO -> "microphone_unavailable"
      SpeechRecognizer.ERROR_NETWORK,
      SpeechRecognizer.ERROR_NETWORK_TIMEOUT,
      SpeechRecognizer.ERROR_SERVER -> "network"
      SpeechRecognizer.ERROR_NO_MATCH,
      SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> "no_speech"
      else -> "recognition_failed"
    }
  }

  private fun mapErrorMessage(error: Int): String {
    return when (mapError(error)) {
      "permission_denied" ->
        "Microphone access is needed so the character can hear you. You can continue with text."
      "microphone_unavailable" ->
        "The microphone is unavailable. You can continue with text."
      "network" ->
        "Speech recognition could not reach the speech service. You can continue with text."
      "no_speech" -> "We didn't catch that. Try again, or continue with text."
      "unsupported" -> "Voice mode isn't available on this device."
      else -> "Something went wrong. You can continue with text."
    }
  }
}
