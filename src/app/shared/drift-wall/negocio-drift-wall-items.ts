import { DriftWallItem } from './drift-wall.component';

/**
 * Shared between LoginComponent and RegistroComponent's left panel.
 * Real photos go in public/negocio/ (this project has no src/assets/ —
 * static files are served from public/, per angular.json). `image` stays
 * omitted for items without a photo yet (placeholder dark tile).
 *
 * foto-13.jpg is a duplicate of foto-1.jpg (same file, both were sent) and
 * is kept on disk but not referenced here to avoid showing the same tile
 * twice. foto-9.png (~1.9MB) and foto-16.jpg (~1MB, 4096x2304) are fine for
 * this preview, but worth compressing/resizing before this goes to
 * production, since tiles render at a fraction of that size.
 */
export const NEGOCIO_DRIFT_WALL_ITEMS: DriftWallItem[] = [
  { title: 'Reparación de lavadoras', image: 'negocio/foto-1.jpg' },
  { title: 'Instalación de aires acondicionados', image: 'negocio/foto-2.jpg' },
  { title: 'Mantenimiento de lavadoras', image: 'negocio/foto-3.jpg' },
  { title: 'Detección de fugas de gas', image: 'negocio/foto-4.jpg' },
  { title: 'Revisión eléctrica y de seguridad', image: 'negocio/foto-5.jpg' },
  { title: 'Servicio técnico en altura', image: 'negocio/foto-6.jpg' },
  { title: 'Formación técnica continua', image: 'negocio/foto-7.jpg' },
  { title: 'Carga y diagnóstico de refrigerante', image: 'negocio/foto-8.jpg' },
  { title: 'Desmontaje y limpieza de lavadoras', image: 'negocio/foto-9.png' },
  { title: 'Seguridad en el trabajo', image: 'negocio/foto-10.jpg' },
  { title: 'Equipo técnico profesional', image: 'negocio/foto-11.jpg' },
  { title: 'Soldadura y reparación de tuberías', image: 'negocio/foto-12.jpg' },
  { title: 'Puesta a punto de aires acondicionados', image: 'negocio/foto-14.jpg' },
  { title: 'Mantenimiento de condensadores', image: 'negocio/foto-15.jpg' },
  { title: 'Capacitación de técnicos', image: 'negocio/foto-16.jpg' },
];
