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

export interface FieldComparisonItem {
  field: string;
  oldValue: string | null;
  newValue: string | null;
  addedText: string[];
  removedText: string[];
}

export interface RequirementVersionComparisonResponse {
  requirementId: string;
  fromVersion: number;
  toVersion: number;
  hasChanges: boolean;
  changedFields: FieldComparisonItem[];
  unchangedFields: string[];
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

  submitForReview: (
    projectId: string,
    requirementId: string,
    versionNumber: number
  ): Promise<ApiResponseWrapper<RequirementVersionItem>> =>
    apiFetch(
      `/projects/${encodeURIComponent(projectId)}/requirements/${encodeURIComponent(requirementId)}/versions/${encodeURIComponent(versionNumber)}/submit`,
      {
        method: 'POST',
      }
    ),

  approveVersion: (
    projectId: string,
    requirementId: string,
    versionNumber: number,
    payload?: ApproveRequirementVersionPayload
  ): Promise<ApiResponseWrapper<RequirementVersionItem>> =>
    apiFetch(
      `/projects/${encodeURIComponent(projectId)}/requirements/${encodeURIComponent(requirementId)}/versions/${encodeURIComponent(versionNumber)}/approve`,
      {
        method: 'POST',
        ...(payload ? { body: JSON.stringify(payload) } : {}),
      }
    ),

  rejectVersion: (
    projectId: string,
    requirementId: string,
    versionNumber: number,
    payload: RejectRequirementVersionPayload
  ): Promise<ApiResponseWrapper<RequirementVersionItem>> =>
    apiFetch(
      `/projects/${encodeURIComponent(projectId)}/requirements/${encodeURIComponent(requirementId)}/versions/${encodeURIComponent(versionNumber)}/reject`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    ),

  compareVersions: (
    projectId: string,
    requirementId: string,
    fromVersion: number,
    toVersion: number
  ): Promise<ApiResponseWrapper<RequirementVersionComparisonResponse>> =>
    apiFetch(
      `/projects/${encodeURIComponent(projectId)}/requirements/${encodeURIComponent(requirementId)}/versions/compare?from=${encodeURIComponent(fromVersion)}&to=${encodeURIComponent(toVersion)}`
    ),
};
