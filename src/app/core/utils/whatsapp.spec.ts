import { describe, expect, it } from 'vitest';

import {
  construirEnlaceWhatsapp,
  construirMensajeAdminWhatsapp,
  construirMensajeWhatsapp,
  esTelefonoWhatsappValido,
  normalizarTelefonoWhatsapp,
} from './whatsapp';

describe('normalizarTelefonoWhatsapp', () => {
  it('antepone 57 a un celular de 10 dígitos que empieza por 3', () => {
    expect(normalizarTelefonoWhatsapp('3001234567')).toBe('573001234567');
  });

  it('respeta un número que ya trae el 57', () => {
    expect(normalizarTelefonoWhatsapp('573001234567')).toBe('573001234567');
  });

  it('quita espacios y guiones', () => {
    expect(normalizarTelefonoWhatsapp('300 123-4567')).toBe('573001234567');
  });

  it('quita el + y los paréntesis', () => {
    expect(normalizarTelefonoWhatsapp('+57 (300) 123 4567')).toBe('573001234567');
  });

  it('no antepone 57 a 10 dígitos que no empiezan por 3', () => {
    expect(normalizarTelefonoWhatsapp('6011234567')).toBe('6011234567');
  });

  it.each([null, undefined, '', '12345', '1234567890123456', 'abc3001234567', '300-123-45x7'])(
    'rechaza el número inválido %s',
    (numero) => {
      expect(normalizarTelefonoWhatsapp(numero)).toBeNull();
    }
  );
});

describe('esTelefonoWhatsappValido', () => {
  it('acepta vacío porque el campo es opcional', () => {
    expect(esTelefonoWhatsappValido('')).toBe(true);
    expect(esTelefonoWhatsappValido('   ')).toBe(true);
    expect(esTelefonoWhatsappValido(null)).toBe(true);
  });

  it('acepta un número bien escrito y rechaza uno corto', () => {
    expect(esTelefonoWhatsappValido('+57 300 123 4567')).toBe(true);
    expect(esTelefonoWhatsappValido('300123')).toBe(false);
  });
});

describe('construirEnlaceWhatsapp', () => {
  it('arma el enlace con el mensaje codificado', () => {
    const enlace = construirEnlaceWhatsapp('300 123 4567', 'Hola, ¿qué tal?');
    expect(enlace).toBe(`https://wa.me/573001234567?text=${encodeURIComponent('Hola, ¿qué tal?')}`);
  });

  it('devuelve null si el número es inválido', () => {
    expect(construirEnlaceWhatsapp('123', 'Hola')).toBeNull();
    expect(construirEnlaceWhatsapp(null, 'Hola')).toBeNull();
  });
});

describe('construirMensajeWhatsapp', () => {
  const datos = { especialidad: 'Lavadoras', direccion: 'Calle 6 # 12-34', descripcion: 'No centrifuga' };

  it('incluye nombre, especialidad, dirección y problema', () => {
    const mensaje = construirMensajeWhatsapp({ ...datos, nombreCliente: 'Ana' });
    expect(mensaje).toContain('Hola, soy Ana.');
    expect(mensaje).toContain('Lavadoras');
    expect(mensaje).toContain('Calle 6 # 12-34');
    expect(mensaje).toContain('No centrifuga');
    expect(mensaje).toContain('coordinar la visita');
  });

  it('usa un saludo general si no hay nombre', () => {
    expect(construirMensajeWhatsapp(datos)).toContain('Hola, soy cliente de AppoinTech.');
  });
});

describe('construirMensajeAdminWhatsapp', () => {
  it('saluda al cliente por su nombre y menciona la especialidad', () => {
    const mensaje = construirMensajeAdminWhatsapp({ nombreCliente: ' Ana Pérez ', especialidad: 'Lavadoras' });
    expect(mensaje).toBe('Hola Ana Pérez, te escribimos de AppoinTech sobre tu solicitud de Lavadoras. ¿Coordinamos la visita?');
  });
});
