package com.alisverisasistani;

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.location.Location;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import android.provider.ContactsContract;
import android.view.WindowManager;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

// Görme engelli kullanıcı için cihaz işlevleri:
//  - ara(numara): yardım numarasını doğrudan arar (arama ekranında "ara" tuşunu bulmak zorunda kalmasın)
//  - yonBaslat/yonDurdur: telefonun yönünü (derece) "onYon" olayıyla bildirir. Jiroskop tabanlı
//    oyun dönüş vektörü kullanılır: pusula gibi binadaki metal ve elektrik tesisatından etkilenmez,
//    ama mutlak kuzeyi bilmez; yalnızca yön değişimini ölçmek için uygundur.
//  - konumAl: "konumumu gönder" için tek seferlik konum
//  - kisiSec: rehberden acil kişi seçme
public class CihazModulu extends ReactContextBaseJavaModule implements SensorEventListener {

    private final ReactApplicationContext reactContext;
    private final SensorManager sensorYoneticisi;
    private boolean yonDinleniyor = false;
    private long sonGonderim = 0;
    private final float[] donusMatrisi = new float[9];
    private final float[] yonelim = new float[3];

    CihazModulu(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
        this.sensorYoneticisi = (SensorManager) context.getSystemService(Context.SENSOR_SERVICE);
        context.addActivityEventListener(kisiDinleyici);
    }

    @Override
    public String getName() {
        return "CihazModulu";
    }

    // Barkod ararken, yol tarifiyle yürürken ya da cevap beklenirken ekrana dokunulmaz; telefon ekranı
    // kapatıp kilitlemesin. Kilit açmak görme engelli kullanıcı için zahmetlidir.
    @ReactMethod
    public void ekranAcikTut(boolean acik) {
        Activity etkinlik = getCurrentActivity();
        if (etkinlik == null) return;
        etkinlik.runOnUiThread(() -> {
            if (acik) etkinlik.getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else etkinlik.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        });
    }

    @ReactMethod
    public void ara(String numara, Promise promise) {
        if (reactContext.checkSelfPermission(Manifest.permission.CALL_PHONE) != PackageManager.PERMISSION_GRANTED) {
            promise.reject("izin", "Arama izni yok");
            return;
        }
        Intent arama = new Intent(Intent.ACTION_CALL, Uri.parse("tel:" + Uri.encode(numara)));
        arama.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            reactContext.startActivity(arama);
            promise.resolve(true);
        } catch (Exception e) {
            promise.reject("arama", e.getMessage());
        }
    }

    // ── Konum: yalnızca kullanıcı "konumumu gönder" dediğinde, tek seferlik ──────────
    // Önce taze bir konum istenir (en çok 10 sn); gelmezse telefonun bildiği son konum kullanılır.
    @ReactMethod
    public void konumAl(Promise promise) {
        if (reactContext.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED
            && reactContext.checkSelfPermission(Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            promise.resolve(null);
            return;
        }
        LocationManager yonetici = (LocationManager) reactContext.getSystemService(Context.LOCATION_SERVICE);
        if (yonetici == null) {
            promise.resolve(null);
            return;
        }
        final boolean[] bitti = {false};
        Handler isleyici = new Handler(Looper.getMainLooper());
        Runnable sonBilinen = () -> {
            if (bitti[0]) return;
            bitti[0] = true;
            Location enIyi = null;
            for (String saglayici : yonetici.getProviders(true)) {
                try {
                    Location l = yonetici.getLastKnownLocation(saglayici);
                    if (l != null && (enIyi == null || l.getTime() > enIyi.getTime())) enIyi = l;
                } catch (SecurityException ignored) { }
            }
            promise.resolve(konumHaritasi(enIyi));
        };
        isleyici.postDelayed(sonBilinen, 10000);
        try {
            String saglayici = Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
                && yonetici.isProviderEnabled(LocationManager.FUSED_PROVIDER) ? LocationManager.FUSED_PROVIDER
                : yonetici.isProviderEnabled(LocationManager.GPS_PROVIDER) ? LocationManager.GPS_PROVIDER
                : LocationManager.NETWORK_PROVIDER;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                yonetici.getCurrentLocation(saglayici, null, reactContext.getMainExecutor(), konum -> {
                    if (bitti[0] || konum == null) return;
                    bitti[0] = true;
                    isleyici.removeCallbacks(sonBilinen);
                    promise.resolve(konumHaritasi(konum));
                });
            } else {
                isleyici.post(sonBilinen);
            }
        } catch (Exception e) {
            isleyici.removeCallbacks(sonBilinen);
            isleyici.post(sonBilinen);
        }
    }

    private static WritableMap konumHaritasi(Location konum) {
        if (konum == null) return null;
        WritableMap harita = Arguments.createMap();
        harita.putDouble("enlem", konum.getLatitude());
        harita.putDouble("boylam", konum.getLongitude());
        harita.putDouble("dogruluk", konum.getAccuracy());
        harita.putDouble("zaman", konum.getTime());
        return harita;
    }

    // ── Rehberden kişi seçme ─────────────────────────────────
    // Android'in kişi seçme ekranı açılır; seçilen kişinin yalnızca adı ve numarası okunur.
    // Seçme ekranı bu tek kişiye geçici erişim verdiği için rehberi okuma izni gerekmez.
    private static final int KISI_SEC = 4711;
    private Promise kisiSozu;

    private final ActivityEventListener kisiDinleyici = new BaseActivityEventListener() {
        @Override
        public void onActivityResult(Activity etkinlik, int istek, int sonuc, Intent veri) {
            if (istek != KISI_SEC || kisiSozu == null) return;
            Promise soz = kisiSozu;
            kisiSozu = null;
            if (sonuc != Activity.RESULT_OK || veri == null || veri.getData() == null) {
                soz.resolve(null);
                return;
            }
            String[] alanlar = {ContactsContract.CommonDataKinds.Phone.DISPLAY_NAME,
                                ContactsContract.CommonDataKinds.Phone.NUMBER};
            try (Cursor imlec = reactContext.getContentResolver().query(veri.getData(), alanlar, null, null, null)) {
                if (imlec != null && imlec.moveToFirst()) {
                    WritableMap kisi = Arguments.createMap();
                    kisi.putString("ad", imlec.getString(0));
                    kisi.putString("numara", imlec.getString(1));
                    soz.resolve(kisi);
                } else {
                    soz.resolve(null);
                }
            } catch (Exception e) {
                soz.resolve(null);
            }
        }
    };

    @ReactMethod
    public void kisiSec(Promise promise) {
        Activity etkinlik = getCurrentActivity();
        if (etkinlik == null || kisiSozu != null) {
            promise.resolve(null);
            return;
        }
        kisiSozu = promise;
        try {
            Intent secim = new Intent(Intent.ACTION_PICK, ContactsContract.CommonDataKinds.Phone.CONTENT_URI);
            etkinlik.startActivityForResult(secim, KISI_SEC);
        } catch (Exception e) {
            kisiSozu = null;
            promise.resolve(null);
        }
    }

    // ── WhatsApp ─────────────────────────────────────────────
    // Sohbet, tarayıcı ya da uygulama seçme ekranı araya girmeden doğrudan WhatsApp'ta açılır
    // (wa.me bağlantısı bazı telefonlarda tarayıcıda açılıp kişiyi bulamıyor). numara: ülke kodlu, yalnızca rakam.
    // gorev: "yok" (yalnızca sohbeti aç), "gonder" (yardımcı açıksa Gönder'e basar), "canli" (yardımcı açıksa mesajı
    // gönderip canlı konumu paylaşır). Yardımcının sonucu "onWhatsappGorevi" olayıyla ({basarili, adim}) bildirilir.
    @ReactMethod
    public void whatsappAc(String numara, String metin, String gorev, Promise promise) {
        PackageManager pm = reactContext.getPackageManager();
        String paket = null;
        for (String p : new String[]{"com.whatsapp", "com.whatsapp.w4b"}) {
            try {
                pm.getPackageInfo(p, 0);
                paket = p;
                break;
            } catch (PackageManager.NameNotFoundException ignored) { }
        }
        if (paket == null) {
            promise.resolve("yok");
            return;
        }
        Intent sohbet = new Intent(Intent.ACTION_VIEW,
            Uri.parse("https://api.whatsapp.com/send?phone=" + numara + "&text=" + Uri.encode(metin)));
        sohbet.setPackage(paket);
        sohbet.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        if (!"yok".equals(gorev) && WhatsappYardimcisi.acikMi()) {
            WhatsappYardimcisi.Sonuc bildir = (basarili, adim) -> {
                if (!reactContext.hasActiveReactInstance()) return;
                WritableMap sonuc = Arguments.createMap();
                sonuc.putBoolean("basarili", basarili);
                sonuc.putString("adim", adim);
                reactContext.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class).emit("onWhatsappGorevi", sonuc);
            };
            if ("canli".equals(gorev)) WhatsappYardimcisi.canliKonumGorevi(bildir);
            else WhatsappYardimcisi.gonderGorevi(bildir);
        }
        try {
            reactContext.startActivity(sohbet);
            promise.resolve("acildi");
        } catch (Exception e) {
            promise.resolve("hata");
        }
    }

    @ReactMethod
    public void whatsappYardimcisiAcikMi(Promise promise) {
        promise.resolve(WhatsappYardimcisi.acikMi());
    }

    // Erişilebilirlik ayarları: kullanıcı "BAK WhatsApp yardımcısı"nı bir kez açar
    @ReactMethod
    public void erisilebilirlikAyarlariniAc() {
        Intent ayarlar = new Intent(android.provider.Settings.ACTION_ACCESSIBILITY_SETTINGS);
        ayarlar.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            reactContext.startActivity(ayarlar);
        } catch (Exception ignored) { }
    }

    private Sensor yonSensoru() {
        return sensorYoneticisi == null ? null : sensorYoneticisi.getDefaultSensor(Sensor.TYPE_GAME_ROTATION_VECTOR);
    }

    @ReactMethod
    public void yonVarMi(Promise promise) {
        promise.resolve(yonSensoru() != null);
    }

    @ReactMethod
    public void yonBaslat() {
        Sensor sensor = yonSensoru();
        if (sensor == null || yonDinleniyor) return;
        yonDinleniyor = sensorYoneticisi.registerListener(this, sensor, SensorManager.SENSOR_DELAY_UI);
    }

    @ReactMethod
    public void yonDurdur() {
        if (!yonDinleniyor) return;
        sensorYoneticisi.unregisterListener(this);
        yonDinleniyor = false;
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_GAME_ROTATION_VECTOR || !reactContext.hasActiveReactInstance()) return;
        long simdi = SystemClock.elapsedRealtime();
        if (simdi - sonGonderim < 200) return;   // saniyede 5 ölçüm yeter, pil ve köprü yükü azalır
        sonGonderim = simdi;
        SensorManager.getRotationMatrixFromVector(donusMatrisi, event.values);
        SensorManager.getOrientation(donusMatrisi, yonelim);
        double derece = (Math.toDegrees(yonelim[0]) + 360) % 360;
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit("onYon", derece);
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}

    @Override
    public void invalidate() {
        yonDurdur();
        super.invalidate();
    }

    // React Native 0.65+ için gerekli
    @ReactMethod
    public void addListener(String eventName) {}

    @ReactMethod
    public void removeListeners(double count) {}
}
