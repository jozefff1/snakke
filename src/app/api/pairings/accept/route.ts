import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/requireAuth';
import { db } from '@/lib/db/client';
import { pairings, pairingRequests, users } from '@/lib/db/schema';
import { eq, and, or, sql } from 'drizzle-orm';

function isDemoOpenPairingEnabled() {
  return process.env.DEMO_OPEN_PAIRING === 'true';
}

const acceptSchema = z.object({
  token: z.string().min(1),
  relationship: z.enum(['parent', 'therapist', 'teacher', 'researcher', 'caregiver']),
  shareHistory: z.boolean(),
  shareStats: z.boolean(),
  allowExport: z.boolean(),
});

// POST /api/pairings/accept — accept a pairing invite
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const body = await request.json().catch(() => ({}));
  const result = acceptSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: result.error.issues },
      { status: 400 }
    );
  }

  const { token, relationship, shareHistory, shareStats, allowExport } = result.data;
  const { userId: acceptorId } = authResult as { userId: string };
  const isDemoOpenPairing = isDemoOpenPairingEnabled();

  // Look up the invite token
  const [invite] = await db
    .select()
    .from(pairingRequests)
    .where(and(eq(pairingRequests.token, token), eq(pairingRequests.status, 'pending')))
    .limit(1);

  if (!invite) {
    return NextResponse.json({ error: 'Invalid or expired invite link' }, { status: 404 });
  }

  if (new Date() > invite.expiresAt) {
    await db
      .update(pairingRequests)
      .set({ status: 'expired' })
      .where(eq(pairingRequests.id, invite.id));
    return NextResponse.json({ error: 'This invite has expired' }, { status: 410 });
  }

  if (invite.requesterId === acceptorId) {
    return NextResponse.json({ error: 'You cannot accept your own invite' }, { status: 400 });
  }

  // If the invite was addressed to a specific email, enforce it
  if (invite.invitedEmail && !isDemoOpenPairing) {
    const [acceptorUser] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, acceptorId))
      .limit(1);

    const normalizedInvited = invite.invitedEmail.toLowerCase().trim();
    const normalizedAcceptor = acceptorUser?.email?.toLowerCase().trim() ?? '';

    if (normalizedInvited !== normalizedAcceptor) {
      return NextResponse.json(
        { error: `This invite was sent to ${invite.invitedEmail}. Please sign in with that account to accept it.` },
        { status: 403 }
      );
    }
  }

  // Determine roles: inviter = guardian/supervisor, acceptor = child/patient
  // If the acceptor is a guardian/therapist themselves, they become a co-supervisor
  const [acceptorUser] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, acceptorId))
    .limit(1);

  const isSupervisorRole = ['guardian', 'therapist', 'teacher'].includes(acceptorUser?.role ?? '');

  // Prevent duplicate pairings
  const [existing] = await db
    .select({ id: pairings.id })
    .from(pairings)
    .where(
      and(
        eq(pairings.status, 'accepted'),
        or(
          and(
            eq(pairings.guardianId, invite.requesterId),
            eq(pairings.childId, acceptorId)
          ),
          and(
            eq(pairings.guardianId, acceptorId),
            eq(pairings.childId, invite.requesterId)
          )
        )
      )
    )
    .limit(1);

  if (existing) {
    return NextResponse.json({ error: 'You are already paired with this person' }, { status: 409 });
  }

  // Check pairing limit: max 5 accepted pairings per user
  const [requesterPairingCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pairings)
    .where(
      and(
        eq(pairings.status, 'accepted'),
        or(
          eq(pairings.guardianId, invite.requesterId),
          eq(pairings.childId, invite.requesterId)
        )
      )
    );

  const [acceptorPairingCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(pairings)
    .where(
      and(
        eq(pairings.status, 'accepted'),
        or(
          eq(pairings.guardianId, acceptorId),
          eq(pairings.childId, acceptorId)
        )
      )
    );

  if ((requesterPairingCount?.count ?? 0) >= 5) {
    return NextResponse.json(
      { error: 'The person who sent this invite has reached their pairing limit (5)' },
      { status: 409 }
    );
  }

  if ((acceptorPairingCount?.count ?? 0) >= 5) {
    return NextResponse.json(
      { error: 'You have reached your pairing limit (5). Remove an existing pairing to accept new ones.' },
      { status: 409 }
    );
  }

  // Create the pairing
  const [newPairing] = await db
    .insert(pairings)
    .values({
      guardianId: invite.requesterId,
      childId: acceptorId,
      status: 'accepted',
      relationship,
      shareHistory,
      shareStats,
      allowExport,
      consentAt: new Date(),
    })
    .returning({ id: pairings.id });

  // Mark invite as used
  await db
    .update(pairingRequests)
    .set({ status: 'used' })
    .where(eq(pairingRequests.id, invite.id));

  return NextResponse.json({ pairingId: newPairing.id, isSupervisorRole, requesterId: invite.requesterId }, { status: 201 });
}
