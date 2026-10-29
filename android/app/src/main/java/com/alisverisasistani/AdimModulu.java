package com.alisverisasistani;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.SystemClock;
import android.util.Log;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.core.DeviceEventManagerModule;

// Bina içi yönlendirmede GPS çalışmadığı için atılan adımlar telefonun adım sensöründen sayılır.
// Her adımda JS tarafına "onAdim" olayı gönderilir.
public class AdimModulu extends ReactContextBaseJavaModule implements SensorEventListener {

    private final ReactApplicationContext reactContext;
    private final SensorManager sensorYoneticisi;
    private boolean dinleniyor = false;
    // Sensör açılmadan önce atılmış ama toplu (batch) gelen adımlar sayılmasın
    private long kayitZamaniNs = 0;

    AdimModulu(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
        this.sensorYoneticisi = (SensorManager) context.getSystemService(Context.SENSOR_SERVICE);
    }

    @Override
    public String getName() {
        return "AdimModulu";
    }

    private Sensor adimSensoru() {
        return sensorYoneticisi == null ? null : sensorYoneticisi.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR);
    }

    @ReactMethod
    public void mevcutMu(Promise promise) {
        promise.resolve(adimSensoru() != null);
    }

    @ReactMethod
    public void baslat() {
        Sensor sensor = adimSensoru();
        if (sensor == null || dinleniyor) return;
        kayitZamaniNs = SystemClock.elapsedRealtimeNanos();
        dinleniyor = sensorYoneticisi.registerListener(this, sensor, SensorManager.SENSOR_DELAY_FASTEST);
    }

    @ReactMethod
    public void durdur() {
        if (!dinleniyor) return;
        sensorYoneticisi.unregisterListener(this);
        dinleniyor = false;
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_STEP_DETECTOR || !reactContext.hasActiveReactInstance()) return;
        if (event.timestamp < kayitZamaniNs) return;
        // Adımın gerçek zamanı (ms) gönderilir: telefon adımları topluca iletse de yürüyüş temposu doğru ölçülür
        double zamanMs = event.timestamp / 1e6;
        Log.d("BAKAdim", "adım " + (long) zamanMs);
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit("onAdim", zamanMs);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}

    @Override
    public void invalidate() {
        durdur();
        super.invalidate();
    }

    // React Native 0.65+ için gerekli
    @ReactMethod
    public void addListener(String eventName) {}

    @ReactMethod
    public void removeListeners(double count) {}
}
