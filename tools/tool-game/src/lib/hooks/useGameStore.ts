import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Prize } from "@/lib/design-system/tokens";

export interface MarketUser {
  id:    string;
  name:  string;
  email: string;
}

interface GameStore {
  user:            MarketUser | null;
  isAuthenticated: boolean;
  currentPrize:    Prize | null;
  prizeHistory:    Prize[];
  setUser:         (u: MarketUser | null) => void;
  setPrize:        (p: Prize) => void;
  clearSession:    () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set) => ({
      user:            null,
      isAuthenticated: false,
      currentPrize:    null,
      prizeHistory:    [],
      setUser:  (user)  => set({ user, isAuthenticated: !!user }),
      setPrize: (prize) => set((s) => ({ currentPrize: prize, prizeHistory: [prize, ...s.prizeHistory] })),
      clearSession: () => set({ user: null, isAuthenticated: false, currentPrize: null }),
    }),
    { name: "market-rewards" }
  )
);
