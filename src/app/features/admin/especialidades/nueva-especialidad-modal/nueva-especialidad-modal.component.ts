import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { EspecialidadService } from '../../../../core/services/especialidad.service';

@Component({
  selector: 'app-nueva-especialidad-modal',
  standalone: false,
  templateUrl: './nueva-especialidad-modal.component.html',
})
export class NuevaEspecialidadModalComponent implements OnChanges {
  @Input() abierto = false;
  @Output() cerrar = new EventEmitter<void>();
  @Output() creada = new EventEmitter<void>();

  form: FormGroup;
  cargando = false;
  errorMensaje: string | null = null;

  constructor(
    private fb: FormBuilder,
    private especialidadService: EspecialidadService,
    private cdr: ChangeDetectorRef
  ) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required]],
      descripcion: [''],
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['abierto'] && this.abierto) {
      this.errorMensaje = null;
      this.cargando = false;
      this.form.reset({ nombre: '', descripcion: '' });
    }
  }

  get nombre() {
    return this.form.get('nombre');
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.abierto && !this.cargando) this.onCancelar();
  }

  onCancelar(): void {
    this.cerrar.emit();
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.cargando = true;
    this.errorMensaje = null;

    this.especialidadService.crearEspecialidad(this.form.value).subscribe({
      next: () => {
        this.cargando = false;
        this.creada.emit();
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargando = false;
        this.errorMensaje = 'No fue posible crear la especialidad. Intenta de nuevo.';
        this.cdr.markForCheck();
      },
    });
  }
}
