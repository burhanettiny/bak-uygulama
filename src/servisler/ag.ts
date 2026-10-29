// Yanıt vermeyen sunucu yüzünden kullanıcı sonsuza kadar beklemesin
export async function zamanAsimliFetch(url: string, secenekler: RequestInit = {}, ms = 6000): Promise<Response> {
  const kontrol = new AbortController();
  const zamanlayici = setTimeout(() => kontrol.abort(), ms);
  try {
    // Open*Facts uygulamaların kendini tanıtmasını istiyor; tanıtmayan istekler kısıtlanabiliyor
    const headers = {'User-Agent': 'BAK/1.0 (Android; gorme engelliler icin sesli alisveris ve yol tarifi asistani)', ...secenekler.headers};
    return await fetch(url, {...secenekler, headers, signal: kontrol.signal});
  } finally {
    clearTimeout(zamanlayici);
  }
}
