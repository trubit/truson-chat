import { create } from 'zustand';
import type { CommunitySummary, CommunityDetail } from '@shared/types';

interface CommunityState {
  communities:    Map<string, CommunitySummary>;
  orderedIds:     string[];
  details:        Map<string, CommunityDetail>;
  isLoading:      boolean;
}

interface CommunityActions {
  setCommunities:  (communities: CommunitySummary[]) => void;
  upsertCommunity: (community: CommunitySummary) => void;
  removeCommunity: (communityId: string) => void;
  setCommunityDetail: (detail: CommunityDetail) => void;
  setLoading:      (v: boolean) => void;
  reset:           () => void;
}

type CommunityStore = CommunityState & CommunityActions;

const initial: CommunityState = {
  communities: new Map(),
  orderedIds:  [],
  details:     new Map(),
  isLoading:   false,
};

function sortedIds(map: Map<string, CommunitySummary>): string[] {
  return Array.from(map.values())
    .sort((a, b) => b.memberCount - a.memberCount)
    .map((c) => c._id);
}

export const useCommunityStore = create<CommunityStore>()((set, get) => ({
  ...initial,

  setCommunities: (communities) => {
    const map = new Map<string, CommunitySummary>(communities.map((c) => [c._id, c]));
    set({ communities: map, orderedIds: sortedIds(map) });
  },

  upsertCommunity: (community) => {
    const communities = new Map(get().communities);
    communities.set(community._id, community);
    set({ communities, orderedIds: sortedIds(communities) });
  },

  removeCommunity: (communityId) => {
    const communities = new Map(get().communities);
    communities.delete(communityId);
    set({ communities, orderedIds: sortedIds(communities) });
  },

  setCommunityDetail: (detail) => {
    const details = new Map(get().details);
    details.set(detail._id, detail);
    set({ details });
  },

  setLoading: (v) => set({ isLoading: v }),
  reset:      () => set(initial),
}));
