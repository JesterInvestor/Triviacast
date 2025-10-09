import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const amount = searchParams.get('amount') || '10';
  const difficulty = searchParams.get('difficulty') || 'medium';
  const category = searchParams.get('category') || '';

  try {
    const url = `https://opentdb.com/api.php?amount=${amount}&difficulty=${difficulty}${category ? `&category=${category}` : ''}&type=multiple`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.response_code !== 0) {
      return NextResponse.json(
        { error: 'Failed to fetch questions' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching questions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch questions' },
      { status: 500 }
    );
  }
}
