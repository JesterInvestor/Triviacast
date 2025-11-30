import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/server/prisma';

/**
 * POST /api/points
 * Body: { wallet: string, points?: number, quizId?: string, score?: number, details?: any, source?: string }
 *
 * Inserts a row into `quiz_results` (created automatically if missing) and
 * returns the generated `id`.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { wallet, points, quizId, score, details, source } = body as {
      wallet?: string;
      points?: number;
      quizId?: string;
      score?: number;
      details?: any;
      source?: string;
    };

    if (!wallet) {
      return NextResponse.json({ error: 'wallet is required' }, { status: 400 });
    }

    // Use Prisma client and a proper migration (see prisma/schema.prisma)
    const created = await prisma.quizResult.create({
      data: {
        wallet,
        points: typeof points === 'number' ? points : null,
        quizId: quizId ?? null,
        score: typeof score === 'number' ? score : null,
        details: details ?? null,
        source: source ?? null,
      },
    });

    return NextResponse.json({ ok: true, id: created.id });
  } catch (err) {
    console.error('Failed to save points:', err);
    return NextResponse.json({ error: 'failed to save points', details: String(err) }, { status: 500 });
  }
}
