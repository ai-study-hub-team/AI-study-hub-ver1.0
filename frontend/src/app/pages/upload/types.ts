import type { LucideIcon } from "lucide-react";
import type { AiStatus, AiStatusFilter, DocumentStatus } from "../../constants/documentStatus";

export type UploadStep = 1 | 2 | 3;

export type UploadFilter = AiStatusFilter;

export interface UploadType {
  label: string;
  icon: LucideIcon;
}

export interface RecentUpload {
  id: number;
  name: string;
  type: string;
  documentStatus: DocumentStatus;
  aiStatus: AiStatus;
  uploadedAt: string;
}
