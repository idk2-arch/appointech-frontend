// Foto previa (globalSetup): ids de las franjas que ya tiene el tecnico, para no tocarlas en la limpieza.
import { mkdirSync, writeFileSync } from 'node:fs';
import { franjasDelTecnico } from './api';

export default async function preparar(): Promise<void> {
  mkdirSync('resultados', { recursive: true });
  const franjas = await franjasDelTecnico();
  writeFileSync('resultados/franjas-previas.json', JSON.stringify(franjas.map((f) => f.id)));
}
