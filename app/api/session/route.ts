import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase credentials (set these in your Vercel/Next.js env)
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Utility: fetch consistent questions from OpenTDB
async function fetchQuestions(amount: number = 10, difficulty: string = "medium") {
  const res = await fetch(
    `https://opentdb.com/api.php?amount=${amount}&difficulty=${difficulty}&type=multiple`
  );
  const data = await res.json();
  return data.results || [];
}

// [POST] /api/session/create
export async function POST(req: NextRequest) {
  const { pathname } = new URL(req.url);

  // Create new session
  if (pathname.endsWith('/create')) {
    // Creator is a Farcaster identity: { fid, wallet }
    const { creator } = await req.json();
    // creator: { fid: number, wallet: string }
    const sessionCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const questions = await fetchQuestions();
    const { error } = await supabase
      .from('sessions')
      .insert({
        session_code: sessionCode,
        questions,
        players: [creator], // Array of { fid, wallet }
        answers: {},
        finished: false,
      });
    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ sessionCode, questions });
  }

  // Join session
  if (pathname.endsWith('/join')) {
    // player: { fid: number, wallet: string }
    const { sessionCode, player } = await req.json();
    const { data, error } = await supabase
      .from('sessions')
      .select('players')
      .eq('session_code', sessionCode)
      .single();
    if (error || !data)
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    const players = data.players || [];
    // Check if player is already in (by fid or wallet)
    const isIn = players.some((p: any) => p.fid === player.fid || p.wallet === player.wallet);
    if (!isIn) {
      const updated = [...players, player];
      const { error: updateError } = await supabase
        .from('sessions')
        .update({ players: updated })
        .eq('session_code', sessionCode);
      if (updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  }

  // Submit answers
  const matchAnswers = pathname.match(/\/api\/session\/([^\/]+)\/answers$/);
  if (matchAnswers) {
    const sessionCode = matchAnswers[1];
    // player: { fid: number, wallet: string }
    const { player, answers: playerAnswers } = await req.json();
    const { data, error } = await supabase
      .from('sessions')
      .select('answers, players, questions')
      .eq('session_code', sessionCode)
      .single();
    if (error || !data)
      return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const answers = data.answers || {};
    // Use fid as key (or wallet if fid not available)
    const playerKey = player.fid ? `fid:${player.fid}` : `wallet:${player.wallet}`;
    answers[playerKey] = playerAnswers;
    // Check if all players have submitted
    const allAnswered = data.players.every((p: any) => {
      const key = p.fid ? `fid:${p.fid}` : `wallet:${p.wallet}`;
      return answers[key];
    });
    const finished = allAnswered;
    await supabase
      .from('sessions')
      .update({ answers, finished })
      .eq('session_code', sessionCode);

    if (finished) {
      // Calculate scores
      const questions = data.questions;
      const scores = data.players.map((p: any) => {
        const key = p.fid ? `fid:${p.fid}` : `wallet:${p.wallet}`;
        const playerAns = answers[key];
        let score = 0;
        questions.forEach((q: any, idx: number) => {
          if (playerAns && playerAns[idx] === q.correct_answer) score += 1;
        });
        return { player: p, score };
      });
      return NextResponse.json({ scores });
    }
    return NextResponse.json({ waiting: true });
  }

  return NextResponse.json({ error: "Unknown endpoint" }, { status: 404 });
}

// [GET] /api/session/[code]/questions
export async function GET(req: NextRequest) {
  const { pathname } = new URL(req.url);

  // Get questions for session
  const matchQuestions = pathname.match(/\/api\/session\/([^\/]+)\/questions$/);
  if (matchQuestions) {
    const sessionCode = matchQuestions[1];
    const { data, error } = await supabase
      .from('sessions')
      .select('questions')
      .eq('session_code', sessionCode)
      .single();
    if (error || !data)
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    return NextResponse.json({ questions: data.questions });
  }

  // Get results for session
  const matchResults = pathname.match(/\/api\/session\/([^\/]+)\/results$/);
  if (matchResults) {
    const sessionCode = matchResults[1];
    const { data, error } = await supabase
      .from('sessions')
      .select('answers, players, questions, finished')
      .eq('session_code', sessionCode)
      .single();
    if (error || !data)
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    if (!data.finished)
      return NextResponse.json({ waiting: true });

    const { answers, players, questions } = data;
    const scores = players.map((p: any) => {
      const key = p.fid ? `fid:${p.fid}` : `wallet:${p.wallet}`;
      const playerAns = answers[key];
      let score = 0;
      questions.forEach((q: any, idx: number) => {
        if (playerAns && playerAns[idx] === q.correct_answer) score += 1;
      });
      return { player: p, score };
    });
    return NextResponse.json({ scores });
  }

  return NextResponse.json({ error: "Unknown endpoint" }, { status: 404 });
}
