'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Plus, List, Map } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FeatureRequestForm } from '@/components/feedback/FeatureRequestForm';
import { FeatureRequestList } from '@/components/feedback/FeatureRequestList';
import { RoadmapView } from '@/components/feedback/RoadmapView';
import { useFeedbackStore } from '@/lib/store/feedbackStore';

/**
 * Feature Requests page with submission form, list view, and roadmap
 */
export default function FeatureRequestsPage() {
  const {
    requests,
    userVotes,
    loading,
    error,
    fetchRequests,
    submitRequest,
    voteRequest,
  } = useFeedbackStore();

  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState('list');

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleSubmitRequest = async (data: { title: string; description: string; tags: string[] }) => {
    try {
      await submitRequest(data);
      setShowForm(false);
    } catch (err) {
      console.error('Failed to submit request:', err);
    }
  };

  const handleVote = async (requestId: string) => {
    try {
      await voteRequest(requestId);
    } catch (err) {
      console.error('Failed to vote:', err);
    }
  };

  const handleShowComments = (requestId: string) => {
    // TODO: Implement comments modal/drawer
    console.log('Show comments for request:', requestId);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-2">
          <p className="text-destructive">Failed to load feature requests</p>
          <Button onClick={fetchRequests} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Feature Requests</h1>
          <p className="text-muted-foreground mt-1">
            Help shape the future of our music app by suggesting new features and voting on existing ones.
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="h-4 w-4" />
          {showForm ? 'Cancel' : 'New Request'}
        </Button>
      </div>

      {/* Submission Form */}
      {showForm && (
        <FeatureRequestForm
          onSubmit={handleSubmitRequest}
          loading={loading}
        />
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="list" className="gap-2">
            <List className="h-4 w-4" />
            All Requests
          </TabsTrigger>
          <TabsTrigger value="roadmap" className="gap-2">
            <Map className="h-4 w-4" />
            Roadmap
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6">
          {loading && requests.length === 0 ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Loading requests...</p>
              </div>
            </div>
          ) : (
            <FeatureRequestList
              requests={requests}
              userVotes={userVotes}
              onVote={handleVote}
              onShowComments={handleShowComments}
            />
          )}
        </TabsContent>

        <TabsContent value="roadmap" className="mt-6">
          {loading && requests.length === 0 ? (
            <div className="flex items-center justify-center min-h-[200px]">
              <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground">Loading roadmap...</p>
              </div>
            </div>
          ) : (
            <RoadmapView requests={requests} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
