import { create } from 'zustand';

interface UiState {
  activeConversationId: string | null;
  searchQuery: string;
  isSearchOpen: boolean;
  isMobile: boolean;
  activeModal: string | null;
  modalData: unknown;
}

interface UiActions {
  setActiveConversation: (id: string | null) => void;
  setSearch: (query: string) => void;
  toggleSearch: () => void;
  setMobile: (isMobile: boolean) => void;
  openModal: (modalName: string, data?: unknown) => void;
  closeModal: () => void;
}

type UiStore = UiState & UiActions;

export const useUiStore = create<UiStore>((set) => ({
  activeConversationId: null,
  searchQuery: '',
  isSearchOpen: false,
  isMobile: typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  activeModal: null,
  modalData: null,

  setActiveConversation: (activeConversationId) => set({ activeConversationId }),

  setSearch: (searchQuery) => set({ searchQuery }),

  toggleSearch: () =>
    set((state) => ({
      isSearchOpen: !state.isSearchOpen,
      searchQuery: state.isSearchOpen ? '' : state.searchQuery,
    })),

  setMobile: (isMobile) => set({ isMobile }),

  openModal: (activeModal, modalData = null) => set({ activeModal, modalData }),

  closeModal: () => set({ activeModal: null, modalData: null }),
}));
