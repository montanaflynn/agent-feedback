export type FeedbackStatus = "pending" | "resolved";

export interface FeedbackPage {
  title: string;
  url: string;
}

export interface FeedbackTarget {
  attributes?: Record<string, string>;
  role?: string;
  selector: string;
  tag: string;
  text?: string;
}

export interface FeedbackMetadata {
  component?: string;
  framework?: string;
  hierarchy?: string[];
  [key: string]: unknown;
}

export interface FeedbackSubmission {
  instruction: string;
  metadata?: FeedbackMetadata;
  page: FeedbackPage;
  target: FeedbackTarget;
}

export interface FeedbackRecord extends FeedbackSubmission {
  createdAt: string;
  id: string;
  status: FeedbackStatus;
}

export interface FeedbackResponse {
  id: string;
  status: FeedbackStatus;
}

export interface MetadataProvider {
  inspect(element: Element): FeedbackMetadata | undefined;
  name: string;
}
