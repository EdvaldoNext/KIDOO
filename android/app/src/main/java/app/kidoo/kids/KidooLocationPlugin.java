package app.kidoo.kids;

import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "KidooLocation",
    permissions = {
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        ),
        @Permission(
            alias = "background",
            strings = { Manifest.permission.ACCESS_BACKGROUND_LOCATION }
        ),
        @Permission(
            alias = "notifications",
            strings = { Manifest.permission.POST_NOTIFICATIONS }
        )
    }
)
public class KidooLocationPlugin extends Plugin {
    @PluginMethod
    public void start(PluginCall call) {
        String endpoint = call.getString("endpoint");
        String token = call.getString("token");
        if (endpoint == null || endpoint.isEmpty() || token == null || token.isEmpty()) {
            call.reject("Endpoint e token são obrigatórios.");
            return;
        }

        SharedPreferences.Editor editor = getContext().getSharedPreferences(KidooLocationService.PREFS, 0).edit();
        editor.putString(KidooLocationService.KEY_ENDPOINT, endpoint);
        editor.putString(KidooLocationService.KEY_TOKEN, token);
        editor.apply();

        if (getPermissionState("location") != PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "onLocationPermission");
            return;
        }
        continueAfterLocation(call);
    }

    @PermissionCallback
    private void onLocationPermission(PluginCall call) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            call.reject("Permita a localização precisa do KIDOO.");
            return;
        }
        continueAfterLocation(call);
    }

    private void continueAfterLocation(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 33 && getPermissionState("notifications") != PermissionState.GRANTED) {
            requestPermissionForAlias("notifications", call, "onNotificationPermission");
            return;
        }
        continueAfterNotifications(call);
    }

    @PermissionCallback
    private void onNotificationPermission(PluginCall call) {
        continueAfterNotifications(call);
    }

    private void continueAfterNotifications(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 29 && getPermissionState("background") != PermissionState.GRANTED) {
            requestPermissionForAlias("background", call, "onBackgroundPermission");
            return;
        }
        startServiceAndResolve(call, false);
    }

    @PermissionCallback
    private void onBackgroundPermission(PluginCall call) {
        boolean needsSettings = getPermissionState("background") != PermissionState.GRANTED;
        startServiceAndResolve(call, needsSettings);
    }

    private void startServiceAndResolve(PluginCall call, boolean needsSettings) {
        Intent intent = new Intent(getContext(), KidooLocationService.class);
        intent.setAction(KidooLocationService.ACTION_START);
        ContextCompat.startForegroundService(getContext(), intent);

        JSObject result = new JSObject();
        result.put("running", true);
        result.put("needsSettings", needsSettings);
        if (needsSettings) {
            result.put(
                "message",
                "Em Ajustes → Localização, escolha Permitir o tempo todo para o sinal continuar com o app fechado."
            );
        }
        call.resolve(result);
    }

    @PluginMethod
    public void stop(PluginCall call) {
        Intent intent = new Intent(getContext(), KidooLocationService.class);
        intent.setAction(KidooLocationService.ACTION_STOP);
        getContext().startService(intent);
        call.resolve();
    }

    @PluginMethod
    public void status(PluginCall call) {
        boolean running = getContext()
            .getSharedPreferences(KidooLocationService.PREFS, 0)
            .getBoolean(KidooLocationService.KEY_RUNNING, false);
        JSObject result = new JSObject();
        result.put("running", running);
        result.put("backgroundGranted", getPermissionState("background") == PermissionState.GRANTED);
        call.resolve(result);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(intent);
        call.resolve();
    }
}
