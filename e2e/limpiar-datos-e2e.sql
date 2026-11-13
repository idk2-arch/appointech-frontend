-- Elimina de la base TODOS los datos de las pruebas E2E (clientes @e2e.test y lo que cuelga de ellos).
-- La limpieza automatica de Playwright usa solo la API: cancela citas, borra franjas y DESACTIVA los clientes; las citas
-- FINALIZADAS no se pueden cancelar por API y quedan. Este script es opcional y lo ejecutas TU, sobre la base que elijas:
--   docker exec -i appointech-db-compose psql -U <usuario> -d <base> < e2e/limpiar-datos-e2e.sql
-- Todo en una transaccion: revisa los conteos antes de confirmar cambiando ROLLBACK por COMMIT.
BEGIN;

CREATE TEMP TABLE e2e_cliente AS
SELECT c.id AS cliente_id, u.id AS usuario_id
FROM usuario u JOIN cliente c ON c.usuario_id = u.id
WHERE u.correo LIKE '%@e2e.test';

CREATE TEMP TABLE e2e_cita AS SELECT id FROM cita WHERE cliente_id IN (SELECT cliente_id FROM e2e_cliente);

DELETE FROM calificacion WHERE cita_id IN (SELECT id FROM e2e_cita);
DELETE FROM comprobante_pago WHERE pago_id IN (SELECT id FROM pago WHERE cita_id IN (SELECT id FROM e2e_cita));
DELETE FROM pago WHERE cita_id IN (SELECT id FROM e2e_cita);
DELETE FROM cita_foto WHERE cita_id IN (SELECT id FROM e2e_cita);
DELETE FROM cita_historial_estado WHERE cita_id IN (SELECT id FROM e2e_cita);
DELETE FROM notificacion WHERE usuario_id IN (SELECT usuario_id FROM e2e_cliente) OR cita_id IN (SELECT id FROM e2e_cita);
DELETE FROM cita WHERE id IN (SELECT id FROM e2e_cita);
DELETE FROM cliente WHERE id IN (SELECT cliente_id FROM e2e_cliente);
DELETE FROM usuario WHERE id IN (SELECT usuario_id FROM e2e_cliente);

SELECT (SELECT count(*) FROM usuario WHERE correo LIKE '%@e2e.test') AS usuarios_e2e_restantes;
ROLLBACK; -- cambia a COMMIT para aplicar
