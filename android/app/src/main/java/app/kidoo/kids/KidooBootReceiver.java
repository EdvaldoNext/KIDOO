package app.kidoo.kids;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

import androidx.core.content.ContextCompat;

public class KidooBootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || !Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            return;
        }
        boolean running = context
            .getSharedPreferences(KidooLocationService.PREFS, Context.MODE_PRIVATE)
            .getBoolean(KidooLocationService.KEY_RUNNING, false);
        if (!running) {
            return;
        }
        Intent service = new Intent(context, KidooLocationService.class);
        service.setAction(KidooLocationService.ACTION_START);
        ContextCompat.startForegroundService(context, service);
    }
}
