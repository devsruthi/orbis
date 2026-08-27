package com.orbis.language

import android.content.pm.PackageManager
import android.os.Bundle
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge

class MainActivity : TauriActivity() {
  private var speechBridge: OrbisSpeechBridge? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  override fun onWebViewCreate(webView: WebView) {
    val bridge = OrbisSpeechBridge(this, webView)
    speechBridge = bridge
    webView.addJavascriptInterface(bridge, "OrbisNativeSpeech")
  }

  override fun onRequestPermissionsResult(
    requestCode: Int,
    permissions: Array<out String>,
    grantResults: IntArray,
  ) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults)
    if (requestCode != OrbisSpeechBridge.REQUEST_RECORD_AUDIO) {
      return
    }
    val granted =
      grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
    speechBridge?.onPermissionResult(granted)
  }

  override fun onDestroy() {
    speechBridge?.release()
    speechBridge = null
    super.onDestroy()
  }
}
