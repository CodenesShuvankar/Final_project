import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { FeatureRequest } from '@/lib/mockData';
import { FeatureRequestsService } from '@/lib/services/featureRequests';

interface FeedbackState {
  featureRequests: FeatureRequest[];
  loading: boolean;
  error: string | null;
  userVotes: string[];
  
  // Actions
  loadFeatureRequests: () => Promise<void>;
  createFeatureRequest: (data: { title: string; description: string; tags: string[] }) => Promise<void>;
  voteFeatureRequest: (requestId: string, userId: string) => Promise<void>;
  addComment: (requestId: string, data: { content: string; userId: string; userName: string }) => Promise<void>;
  filterByStatus: (status?: FeatureRequest['status']) => FeatureRequest[];
  filterByTags: (tags: string[]) => FeatureRequest[];
  searchRequests: (query: string) => Promise<void>;
}

export const useFeedbackStore = create<FeedbackState>()(
  persist(
    (set, get) => ({
      featureRequests: [],
      loading: false,
      error: null,
      userVotes: [],

      loadFeatureRequests: async () => {
        set({ loading: true, error: null });
        try {
          const service = FeatureRequestsService.getInstance();
          const requests = await service.getFeatureRequests();
          set({ featureRequests: requests, loading: false });
        } catch (error) {
          set({ error: 'Failed to load feature requests', loading: false });
        }
      },

      createFeatureRequest: async (data) => {
        set({ loading: true, error: null });
        try {
          const service = FeatureRequestsService.getInstance();
          const newRequest = await service.createFeatureRequest(data);
          const currentRequests = get().featureRequests;
          set({ 
            featureRequests: [newRequest, ...currentRequests], 
            loading: false 
          });
        } catch (error) {
          set({ error: 'Failed to create feature request', loading: false });
        }
      },

      voteFeatureRequest: async (requestId, userId) => {
        try {
          const service = FeatureRequestsService.getInstance();
          const result = await service.voteFeatureRequest(requestId, userId);
          
          const currentRequests = get().featureRequests;
          const updatedRequests = currentRequests.map(request => {
            if (request.id === requestId) {
              return {
                ...request,
                votes: result.votes,
                votedBy: result.voted 
                  ? [...request.votedBy, userId]
                  : request.votedBy.filter(id => id !== userId)
              };
            }
            return request;
          });

          const currentVotes = get().userVotes;
          const updatedVotes = result.voted
            ? [...currentVotes, requestId]
            : currentVotes.filter(id => id !== requestId);

          set({ 
            featureRequests: updatedRequests,
            userVotes: updatedVotes
          });
        } catch (error) {
          set({ error: 'Failed to vote on feature request' });
        }
      },

      addComment: async (requestId, data) => {
        try {
          const service = FeatureRequestsService.getInstance();
          const newComment = await service.addComment(requestId, data);
          
          const currentRequests = get().featureRequests;
          const updatedRequests = currentRequests.map(request => {
            if (request.id === requestId) {
              return {
                ...request,
                comments: [...request.comments, newComment]
              };
            }
            return request;
          });

          set({ featureRequests: updatedRequests });
        } catch (error) {
          set({ error: 'Failed to add comment' });
        }
      },

      filterByStatus: (status) => {
        const requests = get().featureRequests;
        return status ? requests.filter(r => r.status === status) : requests;
      },

      filterByTags: (tags) => {
        const requests = get().featureRequests;
        if (tags.length === 0) return requests;
        
        return requests.filter(request =>
          tags.some(tag =>
            request.tags.some(requestTag =>
              requestTag.toLowerCase().includes(tag.toLowerCase())
            )
          )
        );
      },

      searchRequests: async (query) => {
        set({ loading: true, error: null });
        try {
          const service = FeatureRequestsService.getInstance();
          const results = await service.searchFeatureRequests(query);
          set({ featureRequests: results, loading: false });
        } catch (error) {
          set({ error: 'Failed to search feature requests', loading: false });
        }
      },
    }),
    {
      name: 'spotify-feedback',
      partialize: (state) => ({
        userVotes: state.userVotes,
      }),
    }
  )
);
