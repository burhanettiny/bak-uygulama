import {useCallback, useRef} from 'react';

// Ardışık dokunuşları sayar; 400 ms sessizlikten sonra sayıya karşılık gelen işlemi yapar.
// enFazla'dan fazla dokunuş enFazla sayılır.
export function useCokluDokunus() {
  const sayiRef  = useRef(0);
  const zamanRef = useRef(0);

  return useCallback((islemler: Record<number, () => void>, enFazla: number) => {
    const simdi = Date.now();
    if (simdi - zamanRef.current > 500) {
      sayiRef.current = 0;
    }
    zamanRef.current = simdi;
    sayiRef.current += 1;
    setTimeout(() => {
      if (simdi !== zamanRef.current) return;
      const sayi = Math.min(sayiRef.current, enFazla);
      sayiRef.current = 0;
      islemler[sayi]?.();
    }, 400);
  }, []);
}
