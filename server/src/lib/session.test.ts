import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { getSessionToken, setSessionCookie, clearSessionCookie } from './session.js';

describe('Talivoy guest session compatibility', () => {
  it('accepts an existing guest token and prefers the new cookie when both exist', () => {
    expect(getSessionToken({ cookies: { restart_sid: 'existing-guest' } } as unknown as Request)).toBe(
      'existing-guest'
    );
    expect(
      getSessionToken({
        cookies: { restart_sid: 'existing-guest', talivoy_sid: 'new-guest' },
      } as unknown as Request)
    ).toBe('new-guest');
    expect(getSessionToken({ cookies: { talivoy_sid: 'demo-token-maria' } } as unknown as Request)).toBeNull();
  });

  it('sets the Talivoy cookie and clears both names on start over', () => {
    const cookie = vi.fn();
    const clearCookie = vi.fn();
    const response = { cookie, clearCookie } as unknown as Response;
    setSessionCookie(response, 'guest');
    expect(cookie).toHaveBeenCalledWith(
      'talivoy_sid',
      'guest',
      expect.objectContaining({ httpOnly: true, sameSite: 'strict', path: '/' })
    );
    clearSessionCookie(response);
    expect(clearCookie).toHaveBeenCalledWith('talivoy_sid', { path: '/' });
    expect(clearCookie).toHaveBeenCalledWith('restart_sid', { path: '/' });
  });
});
