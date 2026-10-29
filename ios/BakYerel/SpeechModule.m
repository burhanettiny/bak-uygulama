// BAK sesli komut (iOS): Android'deki SpeechModule.java ile aynı ad, aynı yöntemler ve aynı olaylar.
// JS tarafı (src/servisler/ses.ts) iki platformda da aynı çalışır.
//
// Olaylar: onSpeechReady, onSpeechBegin, onSpeechPartial(metin), onSpeechEnd, onSpeechResult(metin),
//          onSpeechLevel(en yüksek ses, Google ölçeğine yakın -2…10), onSpeechError(kod)
// Hata kodları Android SpeechRecognizer ile aynıdır: 7 eşleşme yok / konuşulmadı, 9 izin yok, 2 ağ, 12 dil yok,
// "unavailable" tanıma yok.
//
// Apple'ın tanıyıcısı Google'ınki gibi konuşma bitince kendiliğinden durmaz: sessizlik burada ölçülür. Kullanıcı
// konuşmaya başladıktan sonra 1,5 sn yeni sözcük gelmezse dinleme bitirilir; hiç konuşmazsa 7 sn sonra "7" denir.

#import <React/RCTEventEmitter.h>
#import <React/RCTBridgeModule.h>
#import <Speech/Speech.h>
#import <AVFoundation/AVFoundation.h>
#import <AudioToolbox/AudioToolbox.h>

static const NSTimeInterval kSessizlikSonu = 1.5;     // konuşmadan sonra bu kadar sessizlik: bitti
static const NSTimeInterval kKonusmaBekleme = 7.0;    // hiç konuşulmazsa vazgeç

@interface SpeechModule : RCTEventEmitter <RCTBridgeModule>
@end

@implementation SpeechModule {
  SFSpeechRecognizer *_taniyici;
  SFSpeechAudioBufferRecognitionRequest *_istek;
  SFSpeechRecognitionTask *_gorev;
  AVAudioEngine *_motor;
  NSTimer *_sessizlik;
  NSString *_sonMetin;
  float _enYuksekSes;
  BOOL _konustu;
  BOOL _bitti;
  BOOL _dinleyici;
}

RCT_EXPORT_MODULE(SpeechModule)

+ (BOOL)requiresMainQueueSetup { return NO; }
- (dispatch_queue_t)methodQueue { return dispatch_get_main_queue(); }

- (NSArray<NSString *> *)supportedEvents {
  return @[@"onSpeechReady", @"onSpeechBegin", @"onSpeechPartial", @"onSpeechEnd", @"onSpeechResult",
           @"onSpeechLevel", @"onSpeechError"];
}

- (void)startObserving { _dinleyici = YES; }
- (void)stopObserving { _dinleyici = NO; }

- (void)gonder:(NSString *)olay veri:(id)veri {
  if (_dinleyici) [self sendEventWithName:olay body:veri ?: @""];
}

RCT_EXPORT_METHOD(startListening) {
  [self temizle];
  // Önce izinler: konuşma tanıma ve mikrofon (ilk kullanımda iOS sorar)
  [SFSpeechRecognizer requestAuthorization:^(SFSpeechRecognizerAuthorizationStatus durum) {
    dispatch_async(dispatch_get_main_queue(), ^{
      if (durum != SFSpeechRecognizerAuthorizationStatusAuthorized) {
        [self gonder:@"onSpeechError" veri:@"9"];
        return;
      }
      [[AVAudioSession sharedInstance] requestRecordPermission:^(BOOL izin) {
        dispatch_async(dispatch_get_main_queue(), ^{
          if (!izin) {
            [self gonder:@"onSpeechError" veri:@"9"];
            return;
          }
          [self dinlemeyiBaslat];
        });
      }];
    });
  }];
}

- (void)dinlemeyiBaslat {
  _taniyici = [[SFSpeechRecognizer alloc] initWithLocale:[NSLocale localeWithLocaleIdentifier:@"tr-TR"]];
  if (!_taniyici) {
    [self gonder:@"onSpeechError" veri:@"12"];
    return;
  }
  if (!_taniyici.isAvailable) {
    [self gonder:@"onSpeechError" veri:@"2"];   // çoğunlukla internet yok ve cihazda Türkçe paket yok
    return;
  }
  NSError *hata = nil;
  AVAudioSession *oturum = [AVAudioSession sharedInstance];
  // Konuşma (TTS) hoparlörden duyulmaya devam etsin; dinleme bitince yeniden yalnızca çalma kipine dönülür
  [oturum setCategory:AVAudioSessionCategoryPlayAndRecord mode:AVAudioSessionModeMeasurement
              options:AVAudioSessionCategoryOptionDefaultToSpeaker | AVAudioSessionCategoryOptionDuckOthers
                error:&hata];
  [oturum setActive:YES withOptions:AVAudioSessionSetActiveOptionNotifyOthersOnDeactivation error:&hata];
  if (hata) {
    [self gonder:@"onSpeechError" veri:@"3"];
    return;
  }

  _istek = [[SFSpeechAudioBufferRecognitionRequest alloc] init];
  _istek.shouldReportPartialResults = YES;
  if (@available(iOS 16.0, *)) _istek.addsPunctuation = NO;
  _sonMetin = nil;
  _enYuksekSes = -2;
  _konustu = NO;
  _bitti = NO;

  _motor = [[AVAudioEngine alloc] init];
  AVAudioInputNode *giris = _motor.inputNode;
  AVAudioFormat *bicim = [giris outputFormatForBus:0];
  __weak SpeechModule *zayif = self;
  [giris installTapOnBus:0 bufferSize:1024 format:bicim block:^(AVAudioPCMBuffer *tampon, AVAudioTime *zaman) {
    SpeechModule *guclu = zayif;
    if (!guclu) return;
    [guclu->_istek appendAudioPCMBuffer:tampon];
    [guclu sesDuzeyiOlc:tampon];
  }];
  [_motor prepare];
  if (![_motor startAndReturnError:&hata]) {
    [self gonder:@"onSpeechError" veri:@"3"];
    [self temizle];
    return;
  }

  _gorev = [_taniyici recognitionTaskWithRequest:_istek resultHandler:^(SFSpeechRecognitionResult *sonuc, NSError *err) {
    dispatch_async(dispatch_get_main_queue(), ^{
      SpeechModule *guclu = zayif;
      if (!guclu || guclu->_bitti) return;
      if (sonuc) {
        NSString *metin = sonuc.bestTranscription.formattedString;
        if (metin.length) {
          if (!guclu->_konustu) {
            guclu->_konustu = YES;
            [guclu gonder:@"onSpeechBegin" veri:@""];
          }
          guclu->_sonMetin = metin;
          [guclu gonder:@"onSpeechPartial" veri:metin];
          [guclu sessizlikSayaci:kSessizlikSonu];
        }
        if (sonuc.isFinal) {
          [guclu sonuclandir];
          return;
        }
      }
      if (err) {
        // Sözcük anlaşıldıysa hata yerine o kullanılır (Android'deki ara sonuç yedeği gibi)
        if (guclu->_sonMetin.length) [guclu sonuclandir];
        else [guclu hataylaBitir:@"7"];
      }
    });
  }];

  [self gonder:@"onSpeechReady" veri:@""];
  [self sessizlikSayaci:kKonusmaBekleme];
}

// Tampondaki ses düzeyi (dBFS) Google'ın onRmsChanged ölçeğine yakın değere çevrilir: sessiz ~0, konuşma 5–10
- (void)sesDuzeyiOlc:(AVAudioPCMBuffer *)tampon {
  if (!tampon.floatChannelData || tampon.frameLength == 0) return;
  float *veri = tampon.floatChannelData[0];
  float toplam = 0;
  for (AVAudioFrameCount i = 0; i < tampon.frameLength; i++) toplam += veri[i] * veri[i];
  float rms = sqrtf(toplam / tampon.frameLength);
  float db = 20 * log10f(MAX(rms, 1e-7f));             // -140 … 0
  float duzey = (db + 50) / 5;                          // -50 dBFS → 0, 0 dBFS → 10
  if (duzey > _enYuksekSes) _enYuksekSes = duzey;
}

- (void)sessizlikSayaci:(NSTimeInterval)sure {
  [_sessizlik invalidate];
  __weak SpeechModule *zayif = self;
  _sessizlik = [NSTimer scheduledTimerWithTimeInterval:sure repeats:NO block:^(NSTimer *t) {
    SpeechModule *guclu = zayif;
    if (!guclu || guclu->_bitti) return;
    if (guclu->_sonMetin.length) [guclu sonuclandir];
    else [guclu hataylaBitir:@"7"];
  }];
}

- (void)sonuclandir {
  if (_bitti) return;
  _bitti = YES;
  NSString *metin = _sonMetin;
  [self gonder:@"onSpeechEnd" veri:@""];
  [self temizle];
  if (metin.length) [self gonder:@"onSpeechResult" veri:metin];
  else [self hataGonder:@"7"];
}

- (void)hataylaBitir:(NSString *)kod {
  if (_bitti) return;
  _bitti = YES;
  [self temizle];
  [self hataGonder:kod];
}

- (void)hataGonder:(NSString *)kod {
  // Önce ses düzeyi: JS "hiç duymadım" ile "duydum ama anlamadım"ı buna göre ayırır
  [self gonder:@"onSpeechLevel" veri:[NSString stringWithFormat:@"%d", (int)lroundf(_enYuksekSes)]];
  [self gonder:@"onSpeechError" veri:kod];
}

- (void)temizle {
  [_sessizlik invalidate];
  _sessizlik = nil;
  if (_motor.isRunning) {
    [_motor stop];
    [_motor.inputNode removeTapOnBus:0];
  }
  [_istek endAudio];
  [_gorev cancel];
  _istek = nil;
  _gorev = nil;
  _motor = nil;
  // Konuşma sesi (TTS) yeniden tam düzeyde ve hoparlörden çalsın
  [[AVAudioSession sharedInstance] setCategory:AVAudioSessionCategoryPlayback
                                          mode:AVAudioSessionModeSpokenAudio options:0 error:nil];
}

// Kullanıcı dinlerken yeniden basarsa: o ana kadar anlaşılan işlenir
RCT_EXPORT_METHOD(stopListening) {
  if (_bitti || !_motor) return;
  if (_sonMetin.length) [self sonuclandir];
  else [self hataylaBitir:@"7"];
}

RCT_EXPORT_METHOD(destroy) {
  _bitti = YES;
  [self temizle];
}

// Durum sesleri (Android'deki ToneGenerator karşılığı, iOS sistem sesleri):
// dinle: kayıt başlıyor, duydum: kayıt bitti, isliyor: kısa tık, hata
RCT_EXPORT_METHOD(ton:(NSString *)tur) {
  SystemSoundID ses = 0;
  if ([tur isEqualToString:@"dinle"]) ses = 1113;
  else if ([tur isEqualToString:@"duydum"]) ses = 1114;
  else if ([tur isEqualToString:@"isliyor"]) ses = 1104;
  else if ([tur isEqualToString:@"hata"]) ses = 1053;
  if (ses) AudioServicesPlaySystemSound(ses);
}

@end
