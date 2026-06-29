import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Map each user to their password env variable name
// Server reads from process.env, so passwords NEVER reach the browser
const PASSWORD_ENV_MAP = {
  'Mr. Nouman':          'PASSWORD_NOUMAN',
  'Mr. Husham':          'PASSWORD_HUSHAM',
  'Mr. Bilal':           'PASSWORD_BILAL',
  'Mr. Zafar':           'PASSWORD_ZAFAR',
  'Mr. Mohammad Yousaf': 'PASSWORD_YOUSAF',
};

export async function POST(request) {
  try {
    const { user, password } = await request.json();

    if (!user || !password) {
      return NextResponse.json(
        { error: 'Please select your account and enter your password' },
        { status: 400 }
      );
    }

    const envKey = PASSWORD_ENV_MAP[user];
    if (!envKey) {
      return NextResponse.json(
        { error: 'Unknown user account' },
        { status: 404 }
      );
    }

    const expectedPassword = process.env[envKey];
    if (!expectedPassword) {
      return NextResponse.json(
        { error: `Password not configured for ${user}. Admin: please add ${envKey} environment variable in Vercel.` },
        { status: 500 }
      );
    }

    if (password !== expectedPassword) {
      return NextResponse.json(
        { error: 'Incorrect password. Please try again.' },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, user });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Login failed. Please try again.' },
      { status: 500 }
    );
  }
}
