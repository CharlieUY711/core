/**
 * Invariantes de seguridad del premio.
 *
 * Estas funciones son la red de seguridad del dominio. La defensa primaria es
 * arquitectónica (todas las consultas se scopean al `userId` autenticado, los
 * enlaces no portan identidad, el `playId` es único), pero estos asserts
 * garantizan que ninguna ruta de código viole las reglas:
 *
 *   - No transferir premios entre usuarios.
 *   - No compartir enlaces para reutilizarlos.
 *   - No duplicarlos.
 *   - No cambiar manualmente la titularidad.
 */
import type { Prize } from "./types.js";

export class OwnershipError extends Error {
  constructor(message = "El premio no pertenece a este usuario.") {
    super(message);
    this.name = "OwnershipError";
  }
}

/** El premio debe pertenecer al usuario que lo invoca. Sin excepciones. */
export function assertOwnership(prize: Prize, userId: string): void {
  if (prize.userId !== userId) throw new OwnershipError();
}

/**
 * La titularidad es inmutable: comparar el `userId` propuesto contra el
 * persistido. Cualquier intento de reasignación es un error, no una operación.
 */
export function assertImmutableOwner(stored: Prize, incomingUserId: string): void {
  if (stored.userId !== incomingUserId) {
    throw new OwnershipError("La titularidad del premio no puede modificarse.");
  }
}
