import { FeatureRequest, Comment, mockFeatureRequests } from '@/lib/mockData';

export interface CreateFeatureRequestData {
  title: string;
  description: string;
  tags: string[];
}

export interface CreateCommentData {
  content: string;
  userId: string;
  userName: string;
}

/**
 * Mock feature requests service for managing user feedback and roadmap
 * TODO: Replace with real API calls when backend is integrated
 */
export class FeatureRequestsService {
  private static instance: FeatureRequestsService;
  private readonly STORAGE_KEY = 'spotify_feature_requests';
  private readonly VOTES_KEY = 'spotify_feature_votes';

  static getInstance(): FeatureRequestsService {
    if (!FeatureRequestsService.instance) {
      FeatureRequestsService.instance = new FeatureRequestsService();
    }
    return FeatureRequestsService.instance;
  }

  async getFeatureRequests(): Promise<FeatureRequest[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    
    // Initialize with mock data
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mockFeatureRequests));
    return mockFeatureRequests;
  }

  async createFeatureRequest(data: CreateFeatureRequestData): Promise<FeatureRequest> {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const requests = await this.getFeatureRequests();
    
    const newRequest: FeatureRequest = {
      id: Date.now().toString(),
      title: data.title,
      description: data.description,
      tags: data.tags,
      status: 'planned',
      votes: 0,
      createdAt: new Date().toISOString(),
      comments: [],
      votedBy: [],
    };

    requests.unshift(newRequest); // Add to beginning
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(requests));
    
    return newRequest;
  }

  async voteFeatureRequest(requestId: string, userId: string): Promise<{ voted: boolean; votes: number }> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const requests = await this.getFeatureRequests();
    const request = requests.find(r => r.id === requestId);
    
    if (!request) {
      throw new Error('Feature request not found');
    }

    const hasVoted = request.votedBy.includes(userId);
    
    if (hasVoted) {
      // Remove vote
      request.votedBy = request.votedBy.filter(id => id !== userId);
      request.votes = Math.max(0, request.votes - 1);
    } else {
      // Add vote
      request.votedBy.push(userId);
      request.votes += 1;
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(requests));
    
    return {
      voted: !hasVoted,
      votes: request.votes,
    };
  }

  async addComment(requestId: string, data: CreateCommentData): Promise<Comment> {
    await new Promise(resolve => setTimeout(resolve, 400));
    
    const requests = await this.getFeatureRequests();
    const request = requests.find(r => r.id === requestId);
    
    if (!request) {
      throw new Error('Feature request not found');
    }

    const newComment: Comment = {
      id: Date.now().toString(),
      userId: data.userId,
      userName: data.userName,
      content: data.content,
      createdAt: new Date().toISOString(),
    };

    request.comments.push(newComment);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(requests));
    
    return newComment;
  }

  async filterFeatureRequests(
    status?: FeatureRequest['status'],
    tags?: string[]
  ): Promise<FeatureRequest[]> {
    const requests = await this.getFeatureRequests();
    
    return requests.filter(request => {
      if (status && request.status !== status) {
        return false;
      }
      
      if (tags && tags.length > 0) {
        const hasMatchingTag = tags.some(tag => 
          request.tags.some(requestTag => 
            requestTag.toLowerCase().includes(tag.toLowerCase())
          )
        );
        if (!hasMatchingTag) {
          return false;
        }
      }
      
      return true;
    });
  }

  async updateFeatureRequestStatus(
    requestId: string, 
    status: FeatureRequest['status']
  ): Promise<FeatureRequest> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const requests = await this.getFeatureRequests();
    const request = requests.find(r => r.id === requestId);
    
    if (!request) {
      throw new Error('Feature request not found');
    }

    request.status = status;
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(requests));
    
    return request;
  }

  getUserVotes(userId: string): string[] {
    // Get user's voted feature request IDs from localStorage
    const votes = localStorage.getItem(`${this.VOTES_KEY}_${userId}`);
    return votes ? JSON.parse(votes) : [];
  }

  async searchFeatureRequests(query: string): Promise<FeatureRequest[]> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const requests = await this.getFeatureRequests();
    const lowercaseQuery = query.toLowerCase();
    
    return requests.filter(request =>
      request.title.toLowerCase().includes(lowercaseQuery) ||
      request.description.toLowerCase().includes(lowercaseQuery) ||
      request.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery))
    );
  }

  getFeatureRequestsByStatus(): Record<FeatureRequest['status'], FeatureRequest[]> {
    const requests = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    
    return {
      planned: requests.filter((r: FeatureRequest) => r.status === 'planned'),
      'in-progress': requests.filter((r: FeatureRequest) => r.status === 'in-progress'),
      done: requests.filter((r: FeatureRequest) => r.status === 'done'),
    };
  }
}
