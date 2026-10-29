import AsyncStorage from '@react-native-async-storage/async-storage';

export async function kayitOku<T>(anahtar: string, varsayilan: T): Promise<T> {
  try {
    const deger = await AsyncStorage.getItem(anahtar);
    return deger ? JSON.parse(deger) : varsayilan;
  } catch { return varsayilan; }
}

export function kayitYaz(anahtar: string, deger: unknown) {
  AsyncStorage.setItem(anahtar, JSON.stringify(deger)).catch(() => {});
}
