import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';

// For demo: in-memory store (use Redis or database for production!)
const sessions: Record<
  string,
  {
    questions: any[];
    players: string[];
    answers: Record<string, string[]>;
    finished: boolean;
  }
> = {};

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
  if (pathname.endsWith('/create')) {
    const { creator } = await req.json();
    const sessionCode = uuidv4().slice(0, 6);
    const questions = await fetchQuestions();
    sessions[sessionCode] = {
      questions,
      players: [creator],
      answers: {},
      finished: false,
    };
    return NextResponse.json({ sessionCode, questions });
  }

  // [POST] /api/session/join
  if (pathname.endsWith('/join')) {
    const { sessionCode, player } = await req.json();
    if (!sessions[sessionCode]) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (!sessions[sessionCode].players.includes(player)) {
      sessions[sessionCode].players.push(player);
    }
    return NextResponse.json({ success: true });
  }

  // [POST] /api/session/[code]/answers
  const matchAnswers = pathname.match(/\/api\/session\/([^\/]+)\/answers$/);
  if (matchAnswers) {
    const sessionCode = matchAnswers[1];
    const { player, answers } = await req.json();
    if (!sessions[sessionCode]) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    sessions[sessionCode].answers[player] = answers;
    // If all players answered, set finished
    const allAnswered = sessions[sessionCode].players.every(
      (p) => p in sessions[sessionCode].answers
    );
    sessions[sessionCode].finished = allAnswered;
    if (allAnswered) {
      const questions = sessions[sessionCode].questions;
      const scores = sessions[sessionCode].players.map((player) => {
        const playerAnswers = sessions[sessionCode].answers[player];
        let score = 0;
        questions.forEach((q, idx) => {
          if (playerAnswers[idx] === q.correct_answer) score += 1;
        });
        return { player, score };
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
  const matchQuestions = pathname.match(/\/api\/session\/([^\/]+)\/questions$/);
  if (matchQuestions) {
    const sessionCode = matchQuestions[1];
    if (!sessions[sessionCode]) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    return NextResponse.json({ questions: sessions[sessionCode].questions });
  }

  // [GET] /api/session/[code]/results
  const matchResults = pathname.match(/\/api\/session\/([^\/]+)\/results$/);
  if (matchResults) {
    const sessionCode = matchResults[1];
    if (!sessions[sessionCode]) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    if (!sessions[sessionCode].finished) {
      return NextResponse.json({ waiting: true });
    }
    const questions = sessions[sessionCode].questions;
    const scores = sessions[sessionCode].players.map((player) => {
      const playerAnswers = sessions[sessionCode].answers[player];
      let score = 0;
      questions.forEach((q, idx) => {
        if (playerAnswers[idx] === q.correct_answer) score += 1;
      });
      return { player, score };
    });
    return NextResponse.json({ scores });
  }

  return NextResponse.json({ error: "Unknown endpoint" }, { status: 404 });
}
