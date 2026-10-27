import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  NgZone,
  OnDestroy,
  Output,
} from '@angular/core';

/*
 * Tipos mínimos de la Web Speech API: TypeScript no incluye
 * webkitSpeechRecognition (Chrome, Edge, Safari) en lib.dom.
 */
interface ResultadoReconocimiento {
  readonly isFinal: boolean;
  readonly 0: { readonly transcript: string };
}

interface EventoResultadoVoz {
  readonly resultIndex: number;
  readonly results: ArrayLike<ResultadoReconocimiento>;
}

interface EventoErrorVoz {
  readonly error: string;
}

interface ReconocimientoVoz {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((evento: EventoResultadoVoz) => void) | null;
  onerror: ((evento: EventoErrorVoz) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type ConstructorReconocimientoVoz = new () => ReconocimientoVoz;

function obtenerConstructorReconocimiento(): ConstructorReconocimientoVoz | null {
  if (typeof window === 'undefined') return null;
  const ventana = window as unknown as {
    SpeechRecognition?: ConstructorReconocimientoVoz;
    webkitSpeechRecognition?: ConstructorReconocimientoVoz;
  };
  return ventana.SpeechRecognition ?? ventana.webkitSpeechRecognition ?? null;
}

/**
 * Botón de micrófono para dictar texto en español (es-CO). Emite cada frase ya
 * reconocida en `dictado`; el padre la agrega al campo y el usuario puede editarla.
 * Si el navegador no soporta la API, no se muestra nada.
 */
@Component({
  selector: 'app-dictado-voz',
  standalone: false,
  templateUrl: './dictado-voz.component.html',
})
export class DictadoVozComponent implements OnDestroy {
  @Input() deshabilitado = false;
  @Output() dictado = new EventEmitter<string>();

  readonly soportado = obtenerConstructorReconocimiento() !== null;

  escuchando = false;
  textoParcial = '';
  mensaje: string | null = null;

  private reconocimiento?: ReconocimientoVoz;

  constructor(
    private zone: NgZone,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnDestroy(): void {
    this.reconocimiento?.abort();
  }

  alternar(): void {
    if (this.escuchando) {
      this.detener();
    } else {
      this.iniciar();
    }
  }

  detener(): void {
    this.reconocimiento?.stop();
  }

  private iniciar(): void {
    const Constructor = obtenerConstructorReconocimiento();
    if (!Constructor) return;

    this.mensaje = null;
    this.textoParcial = '';

    const reconocimiento = new Constructor();
    reconocimiento.lang = 'es-CO';
    reconocimiento.continuous = true;
    reconocimiento.interimResults = true;

    reconocimiento.onresult = (evento) =>
      this.zone.run(() => {
        let parcial = '';
        for (let i = evento.resultIndex; i < evento.results.length; i++) {
          const resultado = evento.results[i];
          const texto = resultado[0].transcript.trim();
          if (!texto) continue;
          if (resultado.isFinal) {
            this.dictado.emit(texto);
          } else {
            parcial += `${texto} `;
          }
        }
        this.textoParcial = parcial.trim();
        this.cdr.markForCheck();
      });

    reconocimiento.onerror = (evento) =>
      this.zone.run(() => {
        this.mensaje = this.mensajeDeError(evento.error);
        this.cdr.markForCheck();
      });

    reconocimiento.onend = () =>
      this.zone.run(() => {
        this.escuchando = false;
        this.textoParcial = '';
        this.reconocimiento = undefined;
        this.cdr.markForCheck();
      });

    try {
      reconocimiento.start();
      this.reconocimiento = reconocimiento;
      this.escuchando = true;
    } catch {
      this.mensaje = 'No pudimos activar el micrófono. Puedes escribir el problema.';
    }
  }

  private mensajeDeError(codigo: string): string | null {
    switch (codigo) {
      case 'not-allowed':
      case 'service-not-allowed':
        return 'No tenemos permiso para usar el micrófono. No pasa nada: puedes escribir el problema.';
      case 'no-speech':
        return 'No te escuchamos. Toca el micrófono y vuelve a intentarlo, hablando cerca del teléfono.';
      case 'audio-capture':
        return 'No encontramos un micrófono. Puedes escribir el problema.';
      case 'network':
        return 'Para dictar se necesita internet. Revisa tu conexión o escribe el problema.';
      case 'aborted':
        return null;
      default:
        return 'No pudimos entender el audio. Inténtalo otra vez o escribe el problema.';
    }
  }
}
