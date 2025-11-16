import { create } from "zustand"
import {
  FeatureRequest,
  FeatureRequestStatus,
  mockFeatureRequests,
} from "@/lib/mockData"

interface FeedbackState {
  requests: FeatureRequest[]
  userVotes: string[]
  loading: boolean
  error: string | null
  fetchRequests: () => Promise<void>
  submitRequest: (data: { title: string; description: string; tags: string[] }) => Promise<void>
  voteRequest: (requestId: string) => Promise<void>
}

const REQUESTS_STORAGE_KEY = "vibetune_feature_requests"
const VOTES_STORAGE_KEY = "vibetune_feature_votes"

const readLocalStorage = <T,>(key: string, fallback: T): T => {
  if (typeof window === "undefined") {
    return fallback
  }

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch (error) {
    console.warn(`[feedbackStore] Failed to read ${key} from localStorage`, error)
    return fallback
  }
}

const writeLocalStorage = (key: string, value: unknown) => {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    console.warn(`[feedbackStore] Failed to write ${key} to localStorage`, error)
  }
}

const createFeatureRequest = (data: {
  title: string
  description: string
  tags: string[]
}): FeatureRequest => {
  const now = new Date().toISOString()
  const statuses: FeatureRequestStatus[] = ["planned", "in-progress", "done", "backlog"]
  return {
    id: `feature-${Date.now()}`,
    title: data.title,
    description: data.description,
    tags: data.tags,
    votes: 1,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    createdAt: now,
    updatedAt: now,
    comments: [],
  }
}

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  requests: [],
  userVotes: [],
  loading: false,
  error: null,
  fetchRequests: async () => {
    set({ loading: true, error: null })
    try {
      // Simulate small delay to show loading states in UI
      await new Promise((resolve) => setTimeout(resolve, 200))
      const storedRequests = readLocalStorage<FeatureRequest[]>(REQUESTS_STORAGE_KEY, mockFeatureRequests)
      const storedVotes = readLocalStorage<string[]>(VOTES_STORAGE_KEY, [])
      set({
        requests: storedRequests,
        userVotes: storedVotes,
        loading: false,
      })
    } catch (error) {
      console.error("[feedbackStore] Failed to fetch requests", error)
      set({
        loading: false,
        error: "Unable to load feature requests",
      })
    }
  },
  submitRequest: async (data) => {
    set({ loading: true, error: null })
    try {
      await new Promise((resolve) => setTimeout(resolve, 300))
      const newRequest = createFeatureRequest(data)
      const currentRequests = get().requests.length > 0 ? get().requests : mockFeatureRequests
      const updatedRequests = [newRequest, ...currentRequests]
      writeLocalStorage(REQUESTS_STORAGE_KEY, updatedRequests)
      const updatedVotes = Array.from(new Set([newRequest.id, ...get().userVotes]))
      writeLocalStorage(VOTES_STORAGE_KEY, updatedVotes)
      set({
        requests: updatedRequests,
        userVotes: updatedVotes,
        loading: false,
      })
    } catch (error) {
      console.error("[feedbackStore] Failed to submit request", error)
      set({
        loading: false,
        error: "Unable to submit feature request",
      })
      throw error
    }
  },
  voteRequest: async (requestId) => {
    try {
      const hasVoted = get().userVotes.includes(requestId)
      const updatedVotes = hasVoted
        ? get().userVotes.filter((id) => id !== requestId)
        : [...get().userVotes, requestId]

      const updatedRequests = get().requests.map((request) => {
        if (request.id !== requestId) return request
        const voteChange = hasVoted ? -1 : 1
        return {
          ...request,
          votes: Math.max(0, request.votes + voteChange),
          updatedAt: new Date().toISOString(),
        }
      })

      writeLocalStorage(REQUESTS_STORAGE_KEY, updatedRequests)
      writeLocalStorage(VOTES_STORAGE_KEY, updatedVotes)

      set({
        requests: updatedRequests,
        userVotes: updatedVotes,
      })
    } catch (error) {
      console.error("[feedbackStore] Failed to vote on request", error)
      set({ error: "Unable to update vote" })
      throw error
    }
  },
}))

