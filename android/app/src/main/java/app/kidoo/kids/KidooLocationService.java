package app.kidoo.kids;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.os.Build;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class KidooLocationService extends Service {
    public static final String ACTION_START = "app.kidoo.kids.START_LOCATION";
    public static final String ACTION_STOP = "app.kidoo.kids.STOP_LOCATION";
    public static final String PREFS = "kidoo_location";
    public static final String KEY_ENDPOINT = "endpoint";
    public static final String KEY_TOKEN = "token";
    public static final String KEY_RUNNING = "running";

    private static final String CHANNEL_ID = "kidoo_location";
    private static final int NOTIF_ID = 7101;
    private static final String TAG = "KidooLocation";
    private static final long MIN_INTERVAL_MS = 15_000;
    private static final float MIN_DISTANCE_M = 20f;

    private FusedLocationProviderClient fusedClient;
    private LocationCallback callback;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private long lastSentAt = 0;
    private Location lastSent;

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean(KEY_RUNNING, false).apply();
            stopUpdates();
            stopForeground(STOP_FOREGROUND_REMOVE);
            stopSelf();
            return START_NOT_STICKY;
        }

        getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean(KEY_RUNNING, true).apply();
        startInForeground();
        startUpdates();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        stopUpdates();
        io.shutdownNow();
        super.onDestroy();
    }

    private void startInForeground() {
        NotificationManager manager = getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Localização da família",
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("O KIDOO envia a posição para os pais.");
            manager.createNotificationChannel(channel);
        }

        Intent launch = new Intent(this, MainActivity.class);
        PendingIntent pending = PendingIntent.getActivity(
            this,
            0,
            launch,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification notification = new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("KIDOO Filhos")
            .setContentText("Os pais podem ver onde você está.")
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentIntent(pending)
            .setOngoing(true)
            .setSilent(true)
            .build();

        if (Build.VERSION.SDK_INT >= 34) {
            ServiceCompat.startForeground(
                this,
                NOTIF_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            );
        } else {
            startForeground(NOTIF_ID, notification);
        }
    }

    private void startUpdates() {
        if (fusedClient == null) {
            fusedClient = LocationServices.getFusedLocationProviderClient(this);
        }
        if (callback != null) {
            return;
        }

        LocationRequest request = new LocationRequest.Builder(Priority.PRIORITY_BALANCED_POWER_ACCURACY, MIN_INTERVAL_MS)
            .setMinUpdateIntervalMillis(10_000)
            .setMinUpdateDistanceMeters(MIN_DISTANCE_M)
            .setWaitForAccurateLocation(false)
            .build();

        callback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult result) {
                Location location = result.getLastLocation();
                if (location != null) {
                    maybePost(location);
                }
            }
        };

        try {
            fusedClient.requestLocationUpdates(request, callback, Looper.getMainLooper());
        } catch (SecurityException error) {
            Log.w(TAG, "Sem permissão de localização", error);
        }
    }

    private void stopUpdates() {
        if (fusedClient != null && callback != null) {
            fusedClient.removeLocationUpdates(callback);
        }
        callback = null;
    }

    private void maybePost(Location location) {
        long now = System.currentTimeMillis();
        if (lastSent != null && now - lastSentAt < MIN_INTERVAL_MS && lastSent.distanceTo(location) < MIN_DISTANCE_M) {
            return;
        }
        lastSent = location;
        lastSentAt = now;
        io.execute(() -> postLocation(location));
    }

    private void postLocation(Location location) {
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        String endpoint = prefs.getString(KEY_ENDPOINT, "");
        String token = prefs.getString(KEY_TOKEN, "");
        if (endpoint.isEmpty() || token.isEmpty()) {
            return;
        }

        HttpURLConnection connection = null;
        try {
            JSONObject json = new JSONObject();
            json.put("lat", location.getLatitude());
            json.put("lng", location.getLongitude());
            json.put("accuracy_m", location.getAccuracy());
            if (location.hasBearing()) {
                json.put("heading", (double) location.getBearing());
            }
            if (location.hasSpeed()) {
                json.put("speed_mps", (double) location.getSpeed());
            }

            connection = (HttpURLConnection) new URL(endpoint).openConnection();
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(15000);
            connection.setRequestMethod("POST");
            connection.setRequestProperty("Content-Type", "application/json");
            connection.setRequestProperty("Authorization", "Bearer " + token);
            connection.setDoOutput(true);
            byte[] payload = json.toString().getBytes(StandardCharsets.UTF_8);
            try (OutputStream output = connection.getOutputStream()) {
                output.write(payload);
            }
            int code = connection.getResponseCode();
            if (code >= 400) {
                Log.w(TAG, "POST localização falhou: " + code);
            }
        } catch (Exception error) {
            Log.w(TAG, "Falha ao enviar localização", error);
        } finally {
            if (connection != null) {
                connection.disconnect();
            }
        }
    }
}
