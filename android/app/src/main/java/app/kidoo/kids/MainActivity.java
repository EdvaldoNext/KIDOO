package app.kidoo.kids;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(KidooLocationPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
