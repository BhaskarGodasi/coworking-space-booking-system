export const SPACE_TYPES = ["DESK", "MEETING_ROOM"] as const;

export type SpaceTypeValue = (typeof SPACE_TYPES)[number];
