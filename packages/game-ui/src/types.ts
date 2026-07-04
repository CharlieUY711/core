// Contrato entre el panel y el backend. El host inyecta una implementación:
// createHttpClient (producción) o createMockClient (demo / sin backend).

export type UiPrizeStatus = "AVAILABLE" | "USED" | "EXPIRED";

export interface UiPrize {
  id: string;
  code: string;
  segKey: string;        // mapea a un Segment (color/jackpot/label)
  name: string;
  benefitText: string;
  status: UiPrizeStatus;
  createdAt: number;     // epoch ms
  expiresAt: number;     // epoch ms
  usedAt: number | null;
}

export interface GameSession {
  userId: string;
  name?: string;
  email?: string;
}

export interface GameClient {
  listPrizes(): Promise<UiPrize[]>;
  /** El SERVIDOR decide el premio. El cliente solo anima hacia el resultado. */
  play(idempotencyKey: string): Promise<UiPrize>;
  use(prizeId: string): Promise<UiPrize>;
}
