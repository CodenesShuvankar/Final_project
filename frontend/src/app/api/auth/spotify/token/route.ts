/**
 * API route for exchanging Spotify authorization code for access token
 */
import { NextRequest, NextResponse } from 'next/server';

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;

export async function POST(request: NextRequest) {
  try {
    const { code, redirect_uri } = await request.json();

    if (!code || !redirect_uri) {
      return NextResponse.json(
        { error: 'Missing code or redirect_uri' },
        { status: 400 }
      );
    }

    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Spotify token exchange failed:', error);
      return NextResponse.json(
        { error: 'Token exchange failed' },
        { status: response.status }
      );
    }

    const tokens = await response.json();
    return NextResponse.json(tokens);

  } catch (error) {
    console.error('Error in token exchange:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}