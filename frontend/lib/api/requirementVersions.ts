import { apiFetch, ApiResponseWrapper } from './client';

export type VersionChangeType = 'CREATED' | 'UPDATED' | 'CLARIFIED' | 'CORRECTED';
export type VersionReviewStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

export interface RequirementVersionItem {
  id: string;
  projectId: string;
  requirementId: string;
  versionNumber: number;
  title: string;
  description: string;
  changeSummary: string;
  changeType: VersionChangeType;
  reviewStatus: VersionReviewStatus;
  createdBy: string;
  reviewedBy?: string | null;
  approvedBy?: string | null;
  reviewComment?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
  approvedAt?: string | null;
}

export interface CreateRequirementVersionPayload {
  title: string;
  description: string;
  changeSummary: string;
  changeType: VersionChangeType;
}

export interface ApproveRequirementVersionPayload {
  reviewComment?: string;
}

export interface RejectRequirementVersionPayload {
  reviewComment: string;
}

export const requirementVersionsApi = {
  getVersionHistory: (
    projectId: string,
    requirementId: string
  ): Promise<ApiResponseWrapper<RequirementVersionItem[]>> =>
    apiFetch(
      `/projects/${encodeURIComponent(projectId)}/requirements/${encodeURIComponent(requirementId)}/versions`
    ),

  getVersion: (
    projectId: string,
    requirementId: string,
    versionNumber: number
  ): Promise<ApiResponseWrapper<RequirementVersionItem>> =>
    apiFetch(
      `/projects/${encodeURIComponent(projectId)}/requirements/${encodeURIComponent(requirementId)}/versions/${encodeURIComponent(versionNumber)}`
    ),

  createDraftVersion: (
    projectId: string,
    requirementId: string,
    payload: CreateRequirementVersionPayload
  ): Promise<ApiResponseWrapper<RequirementVersionItem>> =>
    apiFetch(
      `/projects/${encodeURIComponent(projectId)}/requirements/${encodeURIComponent(requirementId)}/versions`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),
};
