import { create } from "zustand";

/**
 * Estado de interface do carrinho — apenas o que é visual. O conteúdo do
 * carrinho vive no banco e chega pelos Server Components; duplicá-lo aqui
 * criaria duas fontes de verdade.
 */
interface CartUiState {
  drawerOpen: boolean;
  /** Contador otimista, para o badge reagir antes do servidor responder. */
  optimisticCount: number | null;
  openDrawer: () => void;
  closeDrawer: () => void;
  setOptimisticCount: (n: number | null) => void;
}

export const useCartUi = create<CartUiState>((set) => ({
  drawerOpen: false,
  optimisticCount: null,
  openDrawer: () => set({ drawerOpen: true }),
  closeDrawer: () => set({ drawerOpen: false }),
  setOptimisticCount: (n) => set({ optimisticCount: n }),
}));
