import type { QuestionDataDTO, QuestionPropositionDTO } from "#shared/question";

export type SubmissionStatus = "PENDING" | "APPROVED" | "REJECTED";
export type SubmissionVoteType = "APPROVE" | "REJECT";
export type ContributorTrustTier = "NEWBIE" | "RELIABLE" | "ELITE" | "WATCH";

export interface ContributorTrustScoreDTO {
  userId: string;
  userName: string;
  userSlug?: string;
  totalSubmitted: number;
  totalApproved: number;
  totalRejected: number;
  totalPending: number;
  approvalRate: number; // 0 à 100
  trustTier: ContributorTrustTier;
  tierLabel: string;
  tierBadgeColor: string;
  totalRoyaltiesEarned: number;
}

export interface QuestionSubmissionDTO {
  id: number;
  userId: string;
  userName?: string;
  userSlug?: string;
  data: QuestionDataDTO;
  themes: string[];
  difficulty: number;
  source?: string | null;
  status: SubmissionStatus;
  approvalCount: number;
  rejectionCount: number;
  rejectionReason?: string | null;
  rejectionComments?: { reason: string; createdAt: string | Date }[];
  createdQuestionId?: number | null;
  deleted?: boolean;
  deletedAt?: string | Date | null;
  createDate: string | Date;
  updateDate: string | Date;
  authorTrust?: ContributorTrustScoreDTO | null;
  answersReceivedCount?: number;
  royaltiesEarned?: number;
}

export interface QuestionSubmissionVoteDTO {
  id: number;
  submissionId: number;
  userId: string;
  userName?: string;
  vote: SubmissionVoteType;
  rejectionReason?: string | null;
  createdAt: string | Date;
}

/** Données envoyées au relecteur en aveugle (avant réponse) */
export interface ReviewQuestionDTO {
  submissionId: number;
  libelle: string;
  propositions: QuestionPropositionDTO[];
  themes: string[];
  difficulty: number;
  img?: string | null;
  authorName: string;
  authorSlug?: string;
  authorTrust?: ContributorTrustScoreDTO | null;
}

/** Révélation après que le relecteur a soumis sa réponse de test */
export interface ReviewRevealDTO {
  submissionId: number;
  isCorrect: boolean;
  userResponseId: number;
  correctResponseId: number;
  commentaire?: string;
  commentaireImg?: string;
  source?: string | null;
}

/** Payload de création d'une soumission */
export interface CreateSubmissionPayload {
  libelle: string;
  propositions: Array<{ id: number; value: string; img?: string }>;
  response: number;
  themes: string[];
  difficulty: number;
  commentaire?: string;
  commentaireImg?: string;
  source?: string;
  img?: string;
}
