import type { AuthError, EmailOtpType, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

const PASSWORD_LINK_TYPES = new Set<EmailOtpType>(['recovery', 'invite']);

type EstablishPasswordSessionOptions = {
  hash: string;
  tokenHash: string | null;
  tokenType: string | null;
};

type PasswordSessionResult = {
  session: Session | null;
  error: AuthError | Error | null;
};

function isPasswordLinkType(type: string | null): type is EmailOtpType {
  return !!type && PASSWORD_LINK_TYPES.has(type as EmailOtpType);
}

function getHashParams(hash: string) {
  return new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
}

async function waitForSession(timeoutMs = 2500) {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session;

  return await new Promise<Session | null>((resolve) => {
    let settled = false;

    const finalize = (nextSession: Session | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      subscription.unsubscribe();
      resolve(nextSession);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (nextSession) {
        finalize(nextSession);
      }
    });

    const timeoutId = window.setTimeout(() => {
      void supabase.auth.getSession().then(({ data: { session: latestSession } }) => {
        finalize(latestSession ?? null);
      });
    }, timeoutMs);
  });
}

export async function establishPasswordSession({
  hash,
  tokenHash,
  tokenType,
}: EstablishPasswordSessionOptions): Promise<PasswordSessionResult> {
  if (tokenHash && isPasswordLinkType(tokenType)) {
    const { error } = await supabase.auth.verifyOtp({
      type: tokenType,
      token_hash: tokenHash,
    });

    if (error) {
      return { session: null, error };
    }

    const session = await waitForSession();
    return {
      session,
      error: session ? null : new Error('Auth session missing!'),
    };
  }

  const hashParams = getHashParams(hash);
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  const hashType = hashParams.get('type');

  if (accessToken && refreshToken && isPasswordLinkType(hashType)) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      return { session: null, error };
    }

    const session = data.session ?? await waitForSession();
    return {
      session,
      error: session ? null : new Error('Auth session missing!'),
    };
  }

  const fallbackType = tokenType ?? hashType;
  if (isPasswordLinkType(fallbackType)) {
    const session = await waitForSession(1000);
    return {
      session,
      error: session ? null : new Error('Auth session missing!'),
    };
  }

  return { session: null, error: new Error('Auth session missing!') };
}