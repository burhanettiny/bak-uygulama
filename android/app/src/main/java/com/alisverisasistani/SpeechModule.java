package com.alisverisasistani;

import android.content.Intent;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import java.util.ArrayList;
import java.util.Locale;

public class SpeechModule extends ReactContextBaseJavaModule {

    private static final String ETIKET = "BAKSes";
    private SpeechRecognizer speechRecognizer;
    private final ReactApplicationContext reactContext;
    // Görme engelli kullanıcı ekranı göremez: "duyulmadı" ile "duyuldu ama anlaşılmadı" ayrımı için en yüksek ses
    // düzeyi, sonuç gelmezse kullanılmak üzere de son ara sonuç tutulur
    private float enYuksekSes = -100f;
    private String sonAraSonuc = null;
    private ToneGenerator tonUretici;

    SpeechModule(ReactApplicationContext context) {
        super(context);
        this.reactContext = context;
    }

    @Override
    public String getName() {
        return "SpeechModule";
    }

    private void sendEvent(String eventName, String data) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit(eventName, data);
    }

    @ReactMethod
    public void startListening() {
        if (getCurrentActivity() == null) return;

        getCurrentActivity().runOnUiThread(() -> {
            if (!SpeechRecognizer.isRecognitionAvailable(reactContext)) {
                sendEvent("onSpeechError", "unavailable");
                return;
            }
            // Tanıyıcı her komutta yok edilip yeniden kurulunca Google servisiyle bağlantı sık sık kopuyordu
            // (hata 11). Bir kez kurulur ve yeniden kullanılır; yalnızca bağlantı koparsa yeniden kurulur.
            if (speechRecognizer != null) {
                speechRecognizer.cancel();
            } else {
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(reactContext);
            speechRecognizer.setRecognitionListener(new RecognitionListener() {
                @Override public void onReadyForSpeech(Bundle params) {
                    Log.i(ETIKET, "dinlemeye hazır");
                    sendEvent("onSpeechReady", "");
                }
                @Override public void onResults(Bundle results) {
                    ArrayList<String> matches = results.getStringArrayList(
                        SpeechRecognizer.RESULTS_RECOGNITION);
                    if (matches != null && !matches.isEmpty() && !matches.get(0).trim().isEmpty()) {
                        Log.i(ETIKET, "sonuç alındı");
                        sendEvent("onSpeechResult", matches.get(0));
                    } else if (sonAraSonuc != null) {
                        // Son sonuç boş geldi ama konuşurken anlaşılan vardı: kullanıcı yeniden söylemesin
                        sendEvent("onSpeechResult", sonAraSonuc);
                    } else {
                        // Boş sonuçta JS tarafı zaman aşımını beklemesin: "eşleşme yok" hatası olarak bildir
                        Log.w(ETIKET, "boş sonuç");
                        sendEvent("onSpeechError", String.valueOf(SpeechRecognizer.ERROR_NO_MATCH));
                    }
                }
                @Override public void onError(int error) {
                    Log.w(ETIKET, "tanıma hatası: " + error + ", en yüksek ses " + enYuksekSes);
                    if ((error == SpeechRecognizer.ERROR_NO_MATCH || error == SpeechRecognizer.ERROR_SPEECH_TIMEOUT)
                        && sonAraSonuc != null) {
                        sendEvent("onSpeechResult", sonAraSonuc);
                        return;
                    }
                    sendEvent("onSpeechLevel", String.valueOf(Math.round(enYuksekSes)));
                    if (error == SpeechRecognizer.ERROR_SERVER_DISCONNECTED || error == SpeechRecognizer.ERROR_CLIENT) {
                        // Bağlantı bozuldu: bu tanıyıcı artık kullanılamaz, sonraki dinlemede yenisi kurulur
                        taniyiciyiBirak();
                    }
                    sendEvent("onSpeechError", String.valueOf(error));
                }
                @Override public void onBeginningOfSpeech() {
                    Log.i(ETIKET, "konuşma başladı");
                    sendEvent("onSpeechBegin", "");
                }
                @Override public void onRmsChanged(float rmsdB) {
                    if (rmsdB > enYuksekSes) enYuksekSes = rmsdB;
                }
                @Override public void onBufferReceived(byte[] buffer) {}
                @Override public void onEndOfSpeech() {
                    sendEvent("onSpeechEnd", "");
                }
                @Override public void onPartialResults(Bundle partialResults) {
                    ArrayList<String> kismi = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    if (kismi != null && !kismi.isEmpty() && !kismi.get(0).trim().isEmpty()) {
                        sonAraSonuc = kismi.get(0);
                        sendEvent("onSpeechPartial", sonAraSonuc);
                    }
                }
                @Override public void onEvent(int eventType, Bundle params) {}
            });
            }

            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "tr-TR");
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "tr-TR");
            intent.putExtra(RecognizerIntent.EXTRA_ONLY_RETURN_LANGUAGE_PREFERENCE, true);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            enYuksekSes = -100f;
            sonAraSonuc = null;
            // Kullanıcı titreşimden sonra konuşmaya başlamak için bir iki saniye bekleyebilir; varsayılan kısa
            // sessizlik süresinde servis dinlemeyi erken bitirip "eşleşme yok" (7) diyordu
            intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 3000L);
            intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 2500L);
            intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 2000L);

            speechRecognizer.startListening(intent);
        });
    }

    @ReactMethod
    public void stopListening() {
        if (getCurrentActivity() == null) return;
        getCurrentActivity().runOnUiThread(() -> {
            if (speechRecognizer != null) {
                speechRecognizer.stopListening();
            }
        });
    }

    // Ekranı göremeyen kullanıcı için durum sesleri: "dinle" (mikrofon açılıyor, konuşun), "duydum" (konuşma
    // alındı), "isliyor" (arama sürüyor, kısa tık), "hata". Müzik ses kanalından çalınır: TalkBack ve konuşma
    // sesiyle aynı düzeyde duyulur.
    @ReactMethod
    public void ton(String tur) {
        try {
            if (tonUretici == null) tonUretici = new ToneGenerator(AudioManager.STREAM_MUSIC, 70);
            switch (tur) {
                case "dinle": tonUretici.startTone(ToneGenerator.TONE_PROP_BEEP, 150); break;
                case "duydum": tonUretici.startTone(ToneGenerator.TONE_PROP_ACK, 200); break;
                case "isliyor": tonUretici.startTone(ToneGenerator.TONE_PROP_PROMPT, 60); break;
                case "hata": tonUretici.startTone(ToneGenerator.TONE_PROP_NACK, 250); break;
                default: break;
            }
        } catch (RuntimeException e) {
            Log.w(ETIKET, "ton çalınamadı: " + e.getMessage());
            tonUretici = null;
        }
    }

    private void taniyiciyiBirak() {
        if (speechRecognizer != null) {
            speechRecognizer.destroy();
            speechRecognizer = null;
        }
    }

    @ReactMethod
    public void destroy() {
        if (getCurrentActivity() == null) return;
        getCurrentActivity().runOnUiThread(() -> {
            if (speechRecognizer != null) {
                speechRecognizer.destroy();
                speechRecognizer = null;
            }
        });
    }

    // React Native 0.65+ için gerekli
    @ReactMethod
    public void addListener(String eventName) {}

    @ReactMethod
    public void removeListeners(double count) {}
}
