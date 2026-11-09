Rediseño de Franjas de técnicos

La pantalla ahora usa el app-stepper existente con tres pasos: Técnico, Fecha y Franja. El admin puede volver mediante los indicadores o Atrás. Al cambiar de técnico se reinician fecha, mes y formulario; Agregar otra franja conserva técnico y mes, y Terminar vuelve al primer paso sin perder al técnico.

El resumen del técnico permanece sobre el asistente, con foto circular o iniciales, radio, Cambiar y una edición compacta del radio. El primer paso muestra únicamente la guía, el buscador y las tarjetas de técnicos.

Fecha muestra un calendario mensual, con indicadores de franjas, hoy resaltado y fechas pasadas deshabilitadas. Las flechas mueven el foco entre días y Enter selecciona. Debajo aparece el día elegido con sus franjas y acciones. Cada consulta abarca solamente el mes mostrado, como máximo 31 días.

Franja contiene el formulario en la propia pantalla. Conserva validaciones, estimación de citas, edición, copias por fecha, resultados parciales y errores 400/409 sin salir del tercer paso. Borrar sigue usando el modal compartido y maneja el 409 sin cerrarlo.

Ver agenda completa abre un panel fuera del Stepper con selector Semana/Mes, navegación y acciones. Reutiliza la organización semanal por días y el mismo listado de franjas para el panel del día y ambas vistas. La vista mensual agrupa todas las fechas del mes en tarjetas adaptables. La agenda consulta su propio rango sin alterar el mes del asistente. Editar desde otra fecha sincroniza el calendario para volver al mes correspondiente.

No se añadieron dependencias ni se modificaron el servicio HTTP, los contratos o el backend. Se mantuvieron NgModules, el tema de la app, [appAparecer], el modal y los toasts existentes. No se modificó el Stepper compartido. Sus animaciones y las de [appAparecer] respetan la preferencia de movimiento reducido.

Archivos del rediseño:

- src/app/features/admin/franjas-tecnicos/franjas-tecnicos.component.ts
- src/app/features/admin/franjas-tecnicos/franjas-tecnicos.component.html
- src/app/features/admin/franjas-tecnicos/franjas-tecnicos.component.css (nuevo)
- src/app/features/admin/franjas-tecnicos/franjas-tecnicos.component.spec.ts
- REPORTE-FRANJAS.md (este reporte actualizado)

Verificación:

- npm run test:ci: 154 archivos y 2.101 pruebas aprobados.
- Componente: 98,25 % de líneas, 91,50 % de ramas y 94,32 % de funciones cubiertas.
- Cobertura global: 80,80 % de líneas.
- npm run build -- --configuration production: correcto. Se mantienen los avisos de presupuesto CSS de fuse-button, stepper, profile-card, mapa-ruta y mapa-ubicacion, sin cambios en esos estilos. El estilo nuevo no genera aviso de presupuesto.
- git diff --check: correcto.

Las pruebas cubren navegación real de indicadores y botones, reinicio al cambiar de técnico, calendario y teclado, creación desde el formulario, Agregar otra y Terminar, errores 400/409, edición, borrado y su confirmación, copias con fallos parciales, agenda semanal y mensual, edición desde otro mes, radio y cancelación de consultas.

No se pudo verificar el aspecto visual a 390 px, el foco y las animaciones en navegador real ni la persistencia contra el backend. No se ejecutó SonarCloud; el Quality Gate no está confirmado. Se generó LCOV para el análisis del proyecto.

Para probar:

1. Desde la carpeta del backend ejecuta docker compose up -d --build frontend y recarga con Ctrl+Shift+R.
2. Entra como admin@appointech.com usando las credenciales de desarrollo indicadas en la tarea. Abre Franjas de técnicos y elige a Freddy Monroy.
3. Pulsa Siguiente, escoge un día futuro y pulsa Nueva franja. Crea 08:00–12:00 y comprueba la estimación según la duración vigente.
4. Pulsa Agregar otra franja; deben conservarse Freddy y el mes. Intenta un horario que se cruce: el error debe permanecer dentro del tercer paso sin perder los datos. Prueba también copiar a varios días, incluyendo uno con choque.
5. Abre Ver agenda completa, alterna Semana/Mes, navega y prueba Editar y Borrar. En una franja con citas, Borrar debe estar deshabilitado con explicación.
6. Prueba Cambiar y elige otro técnico: se deben limpiar fecha y formulario. Editar radio debe guardar el valor individual y actualizar el resumen.

Todo permanece en desarrollo. Sin commit, push ni cambio de rama.
