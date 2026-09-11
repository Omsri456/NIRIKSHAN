// ============================================================
// Work Recommendation Contracts
// ============================================================

export type RecommendationStatus = 'SUBMITTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED';

export interface WorkRecommendation {
  _id: string;
  recommendedBy: {
    _id: string;
    name: string;
    email: string;
    role: string;
    scope: {
      state: string | null;
      district: string | null;
      constituency: string | null;
    };
  };
  constituency: string;
  district: string;
  state: string;
  description: string;
  category: string;
  estimatedCost: number;
  justification: string;
  status: RecommendationStatus;
  createdWorkId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecommendationPayload {
  description: string;
  category: string;
  estimatedCost: number;
  justification: string;
  constituency: string;
  district: string;
  state: string;
}

export interface RecommendationsQuery {
  page?: number;
  limit?: number;
  status?: RecommendationStatus;
}
