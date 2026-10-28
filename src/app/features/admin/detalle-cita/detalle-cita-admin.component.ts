import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { finalize, Subscription } from 'rxjs';

import { DetalleCita } from '../../../core/models/cita';
import { CitaAdminService } from '../../../core/services/cita-admin.service';
import { obtenerMensajeError } from '../../../core/utils/manejo-errores';

@Component({
  selector: 'app-detalle-cita-admin',
  standalone: false,
  templateUrl: './detalle-cita-admin.component.html',
})
export class DetalleCitaAdminComponent implements OnInit, OnDestroy {
  cita: DetalleCita | null = null;
  cargando = true;
  errorCarga: string | null = null;

  private subscripcionRuta?: Subscription;
  private consulta?: Subscription;
  id = 0;

  constructor(
    private ruta: ActivatedRoute,
    private citaService: CitaAdminService,
    private cdr: ChangeDetectorRef
  ) {}

  /** El número puede cambiar sin recrear el componente (buscar otra cita desde el menú). */
  ngOnInit(): void {
    this.subscripcionRuta = this.ruta.paramMap.subscribe((params) => {
      this.id = Number(params.get('id'));
      this.cargar();
    });
  }

  ngOnDestroy(): void {
    this.subscripcionRuta?.unsubscribe();
    this.consulta?.unsubscribe();
  }

  cargar(): void {
    this.consulta?.unsubscribe();
    this.cargando = true;
    this.errorCarga = null;
    this.cita = null;

    this.consulta = this.citaService
      .obtener(this.id)
      .pipe(
        finalize(() => {
          this.cargando = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (cita) => (this.cita = cita),
        error: (err) => (this.errorCarga = obtenerMensajeError(err, 'No fue posible cargar la cita.')),
      });
  }
}
