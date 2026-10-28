import { ChangeDetectorRef, NgZone } from '@angular/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DictadoVozComponent } from './dictado-voz.component';
import '../cliente.module';

interface ReconocimientoFalso {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((evento: unknown) => void) | null;
  onerror: ((evento: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  abort: ReturnType<typeof vi.fn>;
}

describe('DictadoVozComponent', () => {
  let creados: ReconocimientoFalso[];
  let fallarAlIniciar: boolean;
  const ventana = window as unknown as Record<string, unknown>;

  const instalarApi = (): void => {
    ventana['webkitSpeechRecognition'] = class {
      lang = '';
      continuous = false;
      interimResults = false;
      onresult = null;
      onerror = null;
      onend = null;
      start = vi.fn(() => {
        if (fallarAlIniciar) throw new Error('micrófono ocupado');
      });
      stop = vi.fn();
      abort = vi.fn();
      constructor() {
        creados.push(this as unknown as ReconocimientoFalso);
      }
    };
  };

  const crear = (): DictadoVozComponent =>
    new DictadoVozComponent({ run: (fn: () => void) => fn() } as unknown as NgZone, { markForCheck: vi.fn() } as unknown as ChangeDetectorRef);

  /** Resultados de la Web Speech API: `{ isFinal, 0: { transcript } }`. */
  const resultado = (transcript: string, isFinal: boolean): unknown => ({ isFinal, 0: { transcript } });

  beforeEach(() => {
    creados = [];
    fallarAlIniciar = false;
    instalarApi();
  });

  afterEach(() => {
    delete ventana['webkitSpeechRecognition'];
    delete ventana['SpeechRecognition'];
  });

  describe('soporte del navegador', () => {
    it('con la API disponible, está soportado', () => {
      expect(crear().soportado).toBe(true);
    });

    it('también acepta la versión sin prefijo', () => {
      delete ventana['webkitSpeechRecognition'];
      ventana['SpeechRecognition'] = class {};
      expect(crear().soportado).toBe(true);
    });

    it('sin la API, no está soportado y alternar no hace nada', () => {
      delete ventana['webkitSpeechRecognition'];
      const componente = crear();

      expect(componente.soportado).toBe(false);
      componente.alternar();
      expect(componente.escuchando).toBe(false);
      expect(creados).toEqual([]);
    });
  });

  describe('iniciar y detener', () => {
    it('alternar inicia el reconocimiento en español de Colombia, continuo y con resultados parciales', () => {
      const componente = crear();
      componente.alternar();

      expect(componente.escuchando).toBe(true);
      expect(creados[0]).toMatchObject({ lang: 'es-CO', continuous: true, interimResults: true });
      expect(creados[0].start).toHaveBeenCalledTimes(1);
    });

    it('alternar mientras escucha lo detiene', () => {
      const componente = crear();
      componente.alternar();
      componente.alternar();
      expect(creados[0].stop).toHaveBeenCalledTimes(1);
    });

    it('detener sin haber iniciado no falla', () => {
      expect(() => crear().detener()).not.toThrow();
    });

    it('iniciar limpia el mensaje y el texto parcial anteriores', () => {
      const componente = crear();
      componente.mensaje = 'viejo';
      componente.textoParcial = 'viejo';
      componente.alternar();
      expect(componente.mensaje).toBeNull();
      expect(componente.textoParcial).toBe('');
    });

    it('si el micrófono no se puede activar, avisa y no queda escuchando', () => {
      fallarAlIniciar = true;
      const componente = crear();
      componente.alternar();

      expect(componente.escuchando).toBe(false);
      expect(componente.mensaje).toBe('No pudimos activar el micrófono. Puedes escribir el problema.');
    });

    it('cuando termina el reconocimiento, deja de escuchar y limpia el parcial', () => {
      const componente = crear();
      componente.alternar();
      creados[0].onresult?.({ resultIndex: 0, results: [resultado('hola', false)] });

      creados[0].onend?.();

      expect(componente.escuchando).toBe(false);
      expect(componente.textoParcial).toBe('');
    });

    it('al destruirse aborta el reconocimiento en curso', () => {
      const componente = crear();
      componente.alternar();
      componente.ngOnDestroy();
      expect(creados[0].abort).toHaveBeenCalledTimes(1);
    });

    it('destruirlo sin haber dictado no falla', () => {
      expect(() => crear().ngOnDestroy()).not.toThrow();
    });
  });

  describe('resultados', () => {
    let componente: DictadoVozComponent;
    let frases: string[];

    beforeEach(() => {
      componente = crear();
      frases = [];
      componente.dictado.subscribe((f) => frases.push(f));
      componente.alternar();
    });

    it('una frase final se emite sin espacios sobrantes', () => {
      creados[0].onresult?.({ resultIndex: 0, results: [resultado('  la lavadora no centrifuga ', true)] });
      expect(frases).toEqual(['la lavadora no centrifuga']);
      expect(componente.textoParcial).toBe('');
    });

    it('lo que aún se está diciendo se muestra como texto parcial y no se emite', () => {
      creados[0].onresult?.({ resultIndex: 0, results: [resultado('la lavadora', false), resultado('hace ruido', false)] });
      expect(frases).toEqual([]);
      expect(componente.textoParcial).toBe('la lavadora hace ruido');
    });

    it('mezcla frases finales y parciales', () => {
      creados[0].onresult?.({ resultIndex: 0, results: [resultado('primera', true), resultado('segunda', false)] });
      expect(frases).toEqual(['primera']);
      expect(componente.textoParcial).toBe('segunda');
    });

    it('solo procesa los resultados nuevos (desde resultIndex)', () => {
      creados[0].onresult?.({ resultIndex: 1, results: [resultado('vieja', true), resultado('nueva', true)] });
      expect(frases).toEqual(['nueva']);
    });

    it('ignora los resultados vacíos', () => {
      creados[0].onresult?.({ resultIndex: 0, results: [resultado('   ', true), resultado('', false)] });
      expect(frases).toEqual([]);
      expect(componente.textoParcial).toBe('');
    });
  });

  describe('errores', () => {
    const errorDe = (codigo: string): string | null => {
      const componente = crear();
      componente.alternar();
      creados[creados.length - 1].onerror?.({ error: codigo });
      return componente.mensaje;
    };

    it.each(['not-allowed', 'service-not-allowed'])('%s: sin permiso para el micrófono', (codigo) => {
      expect(errorDe(codigo)).toContain('No tenemos permiso para usar el micrófono');
    });

    it('no-speech: no se escuchó nada', () => {
      expect(errorDe('no-speech')).toContain('No te escuchamos');
    });

    it('audio-capture: no hay micrófono', () => {
      expect(errorDe('audio-capture')).toContain('No encontramos un micrófono');
    });

    it('network: se necesita internet', () => {
      expect(errorDe('network')).toContain('se necesita internet');
    });

    it('aborted: no es un error para la persona, no muestra nada', () => {
      expect(errorDe('aborted')).toBeNull();
    });

    it('cualquier otro código: mensaje genérico', () => {
      expect(errorDe('lo-que-sea')).toContain('No pudimos entender el audio');
    });
  });
});
