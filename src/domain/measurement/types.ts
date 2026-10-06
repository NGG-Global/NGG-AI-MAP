import type { SegmentKey } from "@/domain/shared/enums";

/** Attributes used for segmentation and routing. Never contain direct identifiers. */
export interface SegmentAttributes {
  department?: string;
  role_family?: string;
  is_manager?: boolean;
  seniority?: string;
  location?: string;
}

export type SegmentSelector = { key: SegmentKey; value: string } | { key: "all"; value: "all" };

export const ALL_SEGMENT: SegmentSelector = { key: "all", value: "all" };
