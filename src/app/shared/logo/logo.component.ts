import { Component, Input } from '@angular/core';

/** Logotipo de la marca. Solo fija la proporción y el tamaño: el alto se controla con `clase`. */
@Component({
  selector: 'app-logo',
  standalone: false,
  template: `
    <img
      [src]="grande ? 'branding/logo-grande.png' : 'branding/logo.png'"
      [attr.width]="grande ? 263 : 105"
      [attr.height]="grande ? 240 : 96"
      alt="AppoinTech"
      decoding="async"
      [class]="clase + ' w-auto shrink-0 object-contain'"
    />
  `,
})
export class LogoComponent {
  /** Clases Tailwind de alto (p. ej. `h-10`). El ancho se calcula solo para no deformar. */
  @Input() clase = 'h-10';
  /** Usa la versión de 240 px de alto, para tamaños mayores de 48 px. */
  @Input() grande = false;
}
