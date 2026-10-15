/* ─── Calibração pessoal (kNN) ───────────────────────────────────────────
 * Mãos e câmeras variam muito. Em "Aprender", a pessoa pode gravar a SUA
 * versão de uma letra; os vetores de traços ficam no localStorage deste
 * navegador (nada é enviado) e o classificador passa a reconhecê-la.
 */

export type CalibrationSamples = Record<string, number[][]>;

const KEY = 'mqf:calibracao:v1';
const MAX_POR_LETRA = 40;

export function loadCalibration(): CalibrationSamples {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CalibrationSamples) : {};
  } catch {
    return {};
  }
}

export function saveSamples(id: string, samples: number[][]): CalibrationSamples {
  const all = loadCalibration();
  all[id] = [...(all[id] ?? []), ...samples].slice(-MAX_POR_LETRA);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* modo privado / armazenamento cheio: segue só com as regras */
  }
  return all;
}

export function clearCalibration(id?: string): CalibrationSamples {
  const all = id ? loadCalibration() : {};
  if (id) delete all[id];
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    /* ignora */
  }
  return all;
}
