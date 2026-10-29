/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import Tts from 'react-native-tts';
import App from '../App';

test('ana ekran açılır ve karşılama mesajı okunur', async () => {
  let kok: ReactTestRenderer.ReactTestRenderer | undefined;
  await ReactTestRenderer.act(async () => {
    kok = ReactTestRenderer.create(<App />);
  });

  const yazilar = kok!.root.findAllByType('Text' as any).map(t => [t.props.children].flat().join(''));
  expect(yazilar).toContain('BARKOD / QR OKU');
  expect(yazilar).toContain('📝 ALIŞVERİŞ LİSTESİ (0)');
  expect(Tts.speak).toHaveBeenCalledWith(expect.stringContaining('hoş geldiniz'));
});

test('Türkçe ses verisi yoksa kullanıcı uyarılır ve indirme ekranı açılır', async () => {
  const {Alert} = require('react-native');
  const uyari = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  (Tts.setDefaultLanguage as jest.Mock).mockImplementationOnce(() =>
    Promise.reject({code: 'lang_missing_data', message: 'Language data is missing'}));

  await ReactTestRenderer.act(async () => {
    ReactTestRenderer.create(<App />);
  });

  expect(uyari).toHaveBeenCalledWith('Türkçe ses eksik', expect.any(String), expect.any(Array));
  expect(Tts.requestInstallData).toHaveBeenCalled();
});
