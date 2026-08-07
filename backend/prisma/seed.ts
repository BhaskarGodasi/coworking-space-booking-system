import { PrismaClient, SpaceType } from "@prisma/client";
import { hashPassword } from "../src/utils/password";

const prisma = new PrismaClient();

/**
 * Every seeded row gets a fixed, hardcoded id instead of relying on a
 * natural key (bookings/maintenance have none -- two real bookings can
 * legitimately share the same space and time). Seeding is a sequence of
 * upserts keyed on these ids, so re-running the script always converges to
 * the same rows instead of accumulating duplicates on each run.
 */
const IDS = {
  userAdmin: "c1b1d27e-ce1d-42b3-bf28-10936d73ced8",
  userMember: "20cfc5d8-bf38-4a16-ae02-74ccccfb10fe",
  spaces: [
    "db0aebd7-e6d1-40b9-8955-40f5e4c6bf1a",
    "4c4e1717-a77d-4584-a1a6-5ff24c1d5de2",
    "532e5bb4-80c8-44b6-aba7-7a33a4da1db7",
    "756f9480-6f0b-4094-998c-295e781e71a3",
    "bbac26c3-98f6-4238-a137-425aefb498b6",
    "43c85b13-2cb8-4e74-89ea-095020bc09ef",
    "66c17174-cd5a-48f9-a775-f24671ef8ad7",
    "d79628ec-2f0c-4843-9fa2-80835c2aee7c",
    "9c6b006c-dd59-45cb-acce-7c2deb5f13b0",
    "6d0ee6e8-ffcd-4aa4-882a-bd58056bd058",
  ],
  bookingApproved1: "6c3f53d3-3b0c-4188-9206-c2ff3b2443fc",
  bookingApproved2: "d59ebf08-9470-4300-af92-982b69b6d237",
  bookingPending1: "e9c2052b-8544-4d9b-92fd-cb26eae38e84",
  bookingPending2: "94a25feb-951f-4d5e-b0dd-9f851a15aaad",
  bookingCancelled1: "9befe1ec-dd72-4f41-929d-86b526977e52",
  bookingRejected1: "c4b2f9b2-f68d-4901-84f4-2f21d8afd9aa",
  maintenance1: "17858a8a-193a-4857-b089-572ca420feba",
  maintenance2: "2d7376c9-3b4c-4ac3-b9a7-759212c251e4",
  maintenance3: "9307c214-6974-4936-bd97-8df8af3818c6",
} as const;

interface SpaceSeed {
  id: string;
  name: string;
  type: SpaceType;
  capacity: number;
  amenities: string[];
}

const SPACE_SEEDS: SpaceSeed[] = [
  { id: IDS.spaces[0], name: "Solo Desk A1", type: "DESK", capacity: 1, amenities: ["wifi"] },
  { id: IDS.spaces[1], name: "Solo Desk A2", type: "DESK", capacity: 1, amenities: ["wifi", "monitor"] },
  { id: IDS.spaces[2], name: "Standing Desk B1", type: "DESK", capacity: 1, amenities: ["wifi", "standing desk"] },
  { id: IDS.spaces[3], name: "Shared Desk Pod C1", type: "DESK", capacity: 4, amenities: ["wifi", "power outlets"] },
  { id: IDS.spaces[4], name: "Quiet Desk D1", type: "DESK", capacity: 2, amenities: ["wifi", "noise cancelling"] },
  { id: IDS.spaces[5], name: "Huddle Room 1", type: "MEETING_ROOM", capacity: 4, amenities: ["whiteboard", "wifi"] },
  { id: IDS.spaces[6], name: "Huddle Room 2", type: "MEETING_ROOM", capacity: 4, amenities: ["whiteboard", "tv screen"] },
  { id: IDS.spaces[7], name: "Conference Room Alpha", type: "MEETING_ROOM", capacity: 10, amenities: ["projector", "wifi", "video conferencing"] },
  { id: IDS.spaces[8], name: "Conference Room Beta", type: "MEETING_ROOM", capacity: 12, amenities: ["projector", "whiteboard", "video conferencing"] },
  { id: IDS.spaces[9], name: "Boardroom", type: "MEETING_ROOM", capacity: 20, amenities: ["projector", "video conferencing", "catering setup"] },
];

/** Days offset from the moment the seed runs, so sample data always looks
 * like a mix of past/future activity regardless of when this is executed,
 * while row ids (and therefore idempotency) stay fixed. */
function daysFromNow(days: number, hour: number) {
  const date = new Date();
  date.setUTCHours(hour, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() + days);
  return date;
}

async function main() {
  const adminPasswordHash = await hashPassword("Admin@123");
  const memberPasswordHash = await hashPassword("Member@123");

  const admin = await prisma.user.upsert({
    where: { id: IDS.userAdmin },
    update: {},
    create: {
      id: IDS.userAdmin,
      email: "admin@coworkhub.com",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      firstName: "Coworkhub",
      lastName: "Admin",
    },
  });

  const member = await prisma.user.upsert({
    where: { id: IDS.userMember },
    update: {},
    create: {
      id: IDS.userMember,
      email: "member@coworkhub.com",
      passwordHash: memberPasswordHash,
      role: "MEMBER",
      firstName: "Coworkhub",
      lastName: "Member",
    },
  });

  for (const space of SPACE_SEEDS) {
    await prisma.space.upsert({
      where: { id: space.id },
      update: {},
      create: {
        id: space.id,
        name: space.name,
        type: space.type,
        capacity: space.capacity,
        amenities: space.amenities,
      },
    });
  }

  const deskSpaceId = IDS.spaces[0];
  const meetingRoomSpaceId = IDS.spaces[5];
  const conferenceRoomSpaceId = IDS.spaces[7];
  const boardroomSpaceId = IDS.spaces[9];
  const huddleRoom2Id = IDS.spaces[6];
  const quietDeskId = IDS.spaces[4];

  await prisma.booking.upsert({
    where: { id: IDS.bookingApproved1 },
    update: {},
    create: {
      id: IDS.bookingApproved1,
      userId: member.id,
      spaceId: conferenceRoomSpaceId,
      startTime: daysFromNow(3, 9),
      endTime: daysFromNow(3, 10),
      status: "APPROVED",
    },
  });

  await prisma.booking.upsert({
    where: { id: IDS.bookingApproved2 },
    update: {},
    create: {
      id: IDS.bookingApproved2,
      userId: member.id,
      spaceId: deskSpaceId,
      startTime: daysFromNow(-2, 13),
      endTime: daysFromNow(-2, 17),
      status: "APPROVED",
    },
  });

  await prisma.booking.upsert({
    where: { id: IDS.bookingPending1 },
    update: {},
    create: {
      id: IDS.bookingPending1,
      userId: member.id,
      spaceId: meetingRoomSpaceId,
      startTime: daysFromNow(5, 14),
      endTime: daysFromNow(5, 15),
      status: "PENDING",
    },
  });

  await prisma.booking.upsert({
    where: { id: IDS.bookingPending2 },
    update: {},
    create: {
      id: IDS.bookingPending2,
      userId: member.id,
      spaceId: boardroomSpaceId,
      startTime: daysFromNow(7, 10),
      endTime: daysFromNow(7, 12),
      status: "PENDING",
    },
  });

  await prisma.booking.upsert({
    where: { id: IDS.bookingCancelled1 },
    update: {},
    create: {
      id: IDS.bookingCancelled1,
      userId: member.id,
      spaceId: quietDeskId,
      startTime: daysFromNow(1, 9),
      endTime: daysFromNow(1, 11),
      status: "CANCELLED",
    },
  });

  await prisma.booking.upsert({
    where: { id: IDS.bookingRejected1 },
    update: {},
    create: {
      id: IDS.bookingRejected1,
      userId: member.id,
      spaceId: huddleRoom2Id,
      startTime: daysFromNow(4, 16),
      endTime: daysFromNow(4, 17),
      status: "REJECTED",
    },
  });

  await prisma.maintenance.upsert({
    where: { id: IDS.maintenance1 },
    update: {},
    create: {
      id: IDS.maintenance1,
      spaceId: IDS.spaces[1],
      startTime: daysFromNow(2, 8),
      endTime: daysFromNow(2, 9),
      reason: "Monitor replacement",
    },
  });

  await prisma.maintenance.upsert({
    where: { id: IDS.maintenance2 },
    update: {},
    create: {
      id: IDS.maintenance2,
      spaceId: IDS.spaces[8],
      startTime: daysFromNow(6, 7),
      endTime: daysFromNow(6, 9),
      reason: "Projector and AV system servicing",
    },
  });

  await prisma.maintenance.upsert({
    where: { id: IDS.maintenance3 },
    update: {},
    create: {
      id: IDS.maintenance3,
      spaceId: IDS.spaces[3],
      startTime: daysFromNow(-1, 18),
      endTime: daysFromNow(-1, 20),
      reason: "Deep cleaning",
    },
  });

  console.log("Seed complete:");
  console.log(`  Users: admin@coworkhub.com (${admin.role}), member@coworkhub.com (${member.role})`);
  console.log(`  Spaces: ${SPACE_SEEDS.length}`);
  console.log("  Bookings: 2 approved, 2 pending, 1 cancelled, 1 rejected");
  console.log("  Maintenance windows: 3");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
