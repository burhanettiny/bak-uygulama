import React from 'react';
import {Alert, Platform} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import Tts from 'react-native-tts';
import App from '../App';

// Varsayılan metin okuma motoru Türkçe bilmiyorsa (bazı Huawei, Samsung telefonlar) uygulama Türkçe bilen başka
// bir motora (Google) geçer; hiçbiri yoksa yardımcıya indirme yollarını gösterir
const tts = Tts as unknown as Record<string, jest.Mock>;

beforeEach(() => {
  Platform.OS = 'android';
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  tts.setDefaultLanguage.mockReset();
  tts.setDefaultEngine.mockClear();
});

async function ac() {
  await ReactTestRenderer.act(async () => { ReactTestRenderer.create(<App />); });
  await ReactTestRenderer.act(async () => { await new Promise(r => setTimeout(r, 0)); });
}

test('varsayılan motor Türkçe bilmiyorsa Google motoruna geçilir, uyarı çıkmaz', async () => {
  let motor = 'com.huawei.hiai';
  tts.engines.mockResolvedValue([{name: 'com.huawei.hiai', default: true}, {name: 'com.google.android.tts', default: false}]);
  tts.setDefaultEngine.mockImplementation(async (ad: string) => { motor = ad; return true; });
  tts.setDefaultLanguage.mockImplementation(async () => {
    if (motor !== 'com.google.android.tts') throw {code: 'lang_not_supported'};
    return 'success';
  });
  await ac();
  expect(tts.setDefaultEngine).toHaveBeenCalledWith('com.google.android.tts');
  expect(Alert.alert).not.toHaveBeenCalledWith('Türkçe ses eksik', expect.anything(), expect.anything());
});

test('hiçbir motor Türkçe bilmiyorsa Google motorunu yükleme ve ses indirme yolu gösterilir', async () => {
  tts.engines.mockResolvedValue([{name: 'com.huawei.hiai', default: true}]);
  tts.setDefaultLanguage.mockRejectedValue({code: 'lang_not_supported'});
  await ac();
  const cagri = (Alert.alert as jest.Mock).mock.calls.find(c => c[0] === 'Türkçe ses eksik');
  expect(cagri).toBeTruthy();
  const dugmeler = cagri![2].map((d: {text: string}) => d.text);
  expect(dugmeler).toEqual(['Google ses motorunu yükle', 'Türkçe sesi indir', 'Kapat']);
});
