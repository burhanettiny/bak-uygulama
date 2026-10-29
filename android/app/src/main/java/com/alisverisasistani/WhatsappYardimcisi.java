package com.alisverisasistani;

import android.accessibilityservice.AccessibilityService;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;

import java.util.List;
import java.util.Locale;

// Görme engelli kullanıcı için WhatsApp'ta canlı konum paylaşımını otomatikleştiren erişilebilirlik yardımcısı.
// WhatsApp'ın canlı konumunu başka bir uygulama başlatamaz; kullanıcı bunu ekranda birkaç düğmeye basarak yapar.
// Bu yardımcı yalnızca BAK bir görev verdiğinde (kullanıcı "canlı konumumu paylaş" dediğinde) ve yalnızca WhatsApp
// ekranında çalışır: hazır mesajı gönderir, ataç → Konum → Canlı konumu paylaş → 1 saat → Gönder düğmelerine basar.
// Düğmeler, WhatsApp sürümleri arasında değişebildiği için kimlik, açıklama ve Türkçe/İngilizce yazıyla aranır.
// Bir adım 8 saniyede bulunamazsa görev bırakılır ve BAK kullanıcıya kalan adımları sesle anlatır.
public class WhatsappYardimcisi extends AccessibilityService {

    public interface Sonuc {
        void bitti(boolean basarili, String adim);
    }

    private static WhatsappYardimcisi calisan;
    private static Sonuc sonuc;
    private static int adim = -1;
    private static boolean yalnizGonder = false;   // normal konum mesajı: yalnızca Gönder'e basılır
    private static long adimBasladi = 0;

    private static final String[] ADIM_ADLARI = {"mesaj", "ataç", "konum", "canlı konum", "gönder"};
    private static final long ADIM_SURESI = 8000;
    private final Handler isleyici = new Handler(Looper.getMainLooper());

    public static boolean acikMi() {
        return calisan != null;
    }

    // BAK'tan: WhatsApp sohbeti mesaj hazır halde açıldıktan hemen önce çağrılır
    public static void canliKonumGorevi(Sonuc s) {
        yalnizGonder = false;
        sonuc = s;
        adim = 0;
        adimBasladi = System.currentTimeMillis();
        if (calisan != null) calisan.zamanlayiciKur();
    }

    // Normal konum mesajı: sohbet hazır mesajla açılınca Gönder'e basılır, sonra BAK'a dönülür
    public static void gonderGorevi(Sonuc s) {
        canliKonumGorevi(s);
        yalnizGonder = true;
    }

    @Override
    protected void onServiceConnected() {
        calisan = this;
    }

    @Override
    public boolean onUnbind(Intent intent) {
        calisan = null;
        return super.onUnbind(intent);
    }

    @Override
    public void onInterrupt() {}

    @Override
    public void onAccessibilityEvent(AccessibilityEvent olay) {
        if (adim < 0 || olay.getPackageName() == null || !olay.getPackageName().toString().startsWith("com.whatsapp")) return;
        // Ekran çizilmesini beklemek için kısa gecikme; art arda olaylarda tek deneme yapılır
        isleyici.removeCallbacks(dene);
        isleyici.postDelayed(dene, 350);
    }

    private final Runnable dene = this::adimiDene;

    private void zamanlayiciKur() {
        isleyici.removeCallbacks(zamanAsimi);
        isleyici.postDelayed(zamanAsimi, ADIM_SURESI);
    }

    private final Runnable zamanAsimi = () -> {
        if (adim >= 0 && System.currentTimeMillis() - adimBasladi >= ADIM_SURESI) bitir(false);
    };

    private void ilerle() {
        adim++;
        adimBasladi = System.currentTimeMillis();
        zamanlayiciKur();
        // Bir sonraki ekran olay üretmeyebilir: kendimiz de bir kez deneriz
        isleyici.postDelayed(dene, 700);
    }

    private void adimiDene() {
        if (adim < 0) return;
        AccessibilityNodeInfo kok = getRootInActiveWindow();
        if (kok == null || kok.getPackageName() == null || !kok.getPackageName().toString().startsWith("com.whatsapp")) return;
        String paket = kok.getPackageName().toString();
        // Canlı konum ilk kez kullanılırken çıkan tanıtım penceresi
        if (adim >= 3 && tikla(bul(kok, paket, null, new String[]{"devam", "continue"}, true))) return;
        switch (adim) {
            case 0: // hazır mesajı gönder
                if (tikla(bul(kok, paket, "send", new String[]{"gönder", "send"}, false))) {
                    if (yalnizGonder) bitir(true);
                    else ilerle();
                }
                break;
            case 1: // ataç (ek) düğmesi
                if (tikla(bul(kok, paket, "input_attach_button", new String[]{"ekle", "ek", "attach"}, false))) ilerle();
                break;
            case 2: // "Konum"
                if (tikla(bul(kok, paket, null, new String[]{"konum", "location"}, true))) ilerle();
                break;
            case 3: // "Canlı konumu paylaş"
                if (tikla(bul(kok, paket, null, new String[]{"canlı konum", "live location"}, true))) ilerle();
                break;
            case 4: // süre (1 saat) ve gönder
                tikla(bul(kok, paket, null, new String[]{"1 saat", "1 hour"}, true));
                if (tikla(bul(kok, paket, "send", new String[]{"gönder", "send"}, false))) bitir(true);
                break;
            default:
                break;
        }
    }

    private void bitir(boolean basarili) {
        String hangi = adim >= 0 && adim < ADIM_ADLARI.length ? ADIM_ADLARI[adim] : "";
        adim = -1;
        isleyici.removeCallbacks(zamanAsimi);
        isleyici.removeCallbacks(dene);
        Sonuc s = sonuc;
        sonuc = null;
        if (s != null) s.bitti(basarili, hangi);
        if (basarili) {
            // Görme engelli kullanıcı BAK'a geri dönsün
            Intent bak = getPackageManager().getLaunchIntentForPackage(getPackageName());
            if (bak != null) {
                bak.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
                isleyici.postDelayed(() -> startActivity(bak), 1200);
            }
        }
    }

    // Önce görünüm kimliği, sonra açıklama/yazı. tamYazi: yazı aranan sözle başlamalı ("Konum", "Canlı konumu paylaş");
    // değilse yazı tam o söz olmalı ("Gönder", "Ekle"), sohbetteki mesaj metinleri yanlışlıkla eşleşmesin
    private AccessibilityNodeInfo bul(AccessibilityNodeInfo kok, String paket, String kimlik, String[] yazilar,
                                      boolean tamYazi) {
        if (kimlik != null) {
            List<AccessibilityNodeInfo> bulunan = kok.findAccessibilityNodeInfosByViewId(paket + ":id/" + kimlik);
            for (AccessibilityNodeInfo d : bulunan) if (d.isVisibleToUser()) return d;
        }
        for (String y : yazilar) {
            for (AccessibilityNodeInfo d : kok.findAccessibilityNodeInfosByText(y)) {
                if (!d.isVisibleToUser()) continue;
                String metin = d.getText() != null ? d.getText().toString()
                    : d.getContentDescription() != null ? d.getContentDescription().toString() : "";
                String k = metin.toLowerCase(new Locale("tr"));
                if (tamYazi ? k.startsWith(y) : (k.equals(y) || k.startsWith(y + " "))) return d;
            }
        }
        return null;
    }

    private boolean tikla(AccessibilityNodeInfo dugum) {
        AccessibilityNodeInfo d = dugum;
        while (d != null && !d.isClickable()) d = d.getParent();
        return d != null && d.performAction(AccessibilityNodeInfo.ACTION_CLICK);
    }
}
