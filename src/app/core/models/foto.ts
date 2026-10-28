/** Cuerpo de PUT /perfil/foto y PUT /admin/usuarios/{id}/foto: una data URL en base64. */
export interface FotoRequest {
  imagenBase64: string;
}

/** `fotoUrl` es relativa al servidor (/api/fotos/<clave>); resolverUrlFoto() arma la dirección completa. */
export interface FotoResponse {
  fotoUrl: string;
}
