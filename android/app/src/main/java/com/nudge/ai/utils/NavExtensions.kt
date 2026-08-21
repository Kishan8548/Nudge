package com.nudge.ai.utils

import android.os.Bundle
import android.util.Log
import androidx.navigation.NavController
import androidx.navigation.NavOptions

/**
 * Safe navigation helper to prevent rapid-click crashes, duplicate transitions,
 * or getting stuck when an action is executed from an unexpected destination.
 */
fun NavController.safeNavigate(actionId: Int, args: Bundle? = null, navOptions: NavOptions? = null) {
    try {
        val currentDest = currentDestination ?: return
        val action = currentDest.getAction(actionId)
        if (action != null) {
            navigate(actionId, args, navOptions)
        } else if (currentDest.id != actionId) {
            navigate(actionId, args, navOptions)
        }
    } catch (e: Exception) {
        Log.w("Navigation", "safeNavigate caught exception: ${e.message}")
    }
}
