const PREFIJO_COLOMBIA = '57';
const MINIMO_DIGITOS = 10;
const MAXIMO_DIGITOS = 15;
/** Solo se aceptan dígitos, espacios, guiones, paréntesis, puntos y un + (al escribirlo). */
const CARACTERES_PERMITIDOS = /^[\d\s\-+().]*$/;

export interface DatosMensajeWhatsapp {
  nombreCliente?: string | null;
  especialidad: string;
  direccion: string;
  descripcion: string;
}

/**
 * Deja solo dígitos con el prefijo del país: quita espacios, guiones, paréntesis y "+";
 * un celular colombiano de 10 dígitos que empieza por 3 recibe el 57.
 * Devuelve null si el número está vacío o no tiene entre 10 y 15 dígitos.
 */
export function normalizarTelefonoWhatsapp(numero: string | null | undefined): string | null {
  if (!numero || !CARACTERES_PERMITIDOS.test(numero)) return null;

  let digitos = numero.replace(/\D/g, '');
  if (digitos.length === MINIMO_DIGITOS && digitos.startsWith('3')) {
    digitos = PREFIJO_COLOMBIA + digitos;
  }
  return digitos.length >= MINIMO_DIGITOS && digitos.length <= MAXIMO_DIGITOS ? digitos : null;
}

/** Para el formulario: vacío es válido (el campo es opcional); lleno debe poder normalizarse. */
export function esTelefonoWhatsappValido(numero: string | null | undefined): boolean {
  return !numero?.trim() || normalizarTelefonoWhatsapp(numero) !== null;
}

export function construirMensajeWhatsapp(datos: DatosMensajeWhatsapp): string {
  const nombre = datos.nombreCliente?.trim();
  const saludo = nombre ? `Hola, soy ${nombre}.` : 'Hola, soy cliente de AppoinTech.';
  return (
    `${saludo} Necesito el servicio de ${datos.especialidad}, pero mi dirección está fuera de la cobertura automática.\n` +
    `Dirección: ${datos.direccion}\n` +
    `Problema: ${datos.descripcion}\n` +
    '¿Podemos coordinar la visita?'
  );
}

/** Saludo corto del administrador a un cliente que dejó una solicitud por coordinar. */
export function construirMensajeAdminWhatsapp(datos: { nombreCliente: string; especialidad: string }): string {
  return `Hola ${datos.nombreCliente.trim()}, te escribimos de AppoinTech sobre tu solicitud de ${datos.especialidad}. ¿Coordinamos la visita?`;
}

/** Enlace de WhatsApp con el mensaje ya escrito, o null si el número no sirve. */
export function construirEnlaceWhatsapp(numero: string | null | undefined, mensaje: string): string | null {
  const normalizado = normalizarTelefonoWhatsapp(numero);
  return normalizado ? `https://wa.me/${normalizado}?text=${encodeURIComponent(mensaje)}` : null;
}
