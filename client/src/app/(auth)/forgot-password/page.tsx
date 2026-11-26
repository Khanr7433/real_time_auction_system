'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardBody } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetToken, setResetToken] = useState(tokenFromUrl);
  const [step, setStep] = useState<'request' | 'reset' | 'success'>(tokenFromUrl ? 'reset' : 'request');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (tokenFromUrl) {
      setResetToken(tokenFromUrl);
      setStep('reset');
      setError(null);
    }
  }, [tokenFromUrl]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please provide a valid email address');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setMessage(
        res?.message ||
          'If an account exists with that email, password reset instructions have been sent to your inbox.'
      );
      setStep('reset');
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Unable to request password reset');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!resetToken.trim()) {
      setError('Reset token is required');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/auth/reset-password', {
        token: resetToken.trim(),
        newPassword,
      });
      setMessage(res?.message || 'Password has been reset successfully!');
      setStep('success');
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="sm:opacity-100">
      <CardBody className="p-6 sm:p-8 gap-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {step === 'success' ? 'Password reset complete' : 'Reset your password'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Recover access to your <span className="highlight">BidNow auction account</span>.
          </p>
        </div>
        <div>
          {error && (
            <div className="mb-4">
              <Alert tone="danger">{error}</Alert>
            </div>
          )}
          {message && (
            <div className="mb-4">
              <Alert tone="success">{message}</Alert>
            </div>
          )}

          {step === 'request' && (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="forgot-email" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Account email
                </label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="solid"
                size="lg"
                className="w-full mt-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending request...' : 'Send reset instructions'}
              </Button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="forgot-token" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Reset token
                </label>
                <Input
                  id="forgot-token"
                  type="text"
                  placeholder="Enter reset token from your email"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  Open the reset link sent to your email or paste the reset token here.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="forgot-new-password" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  New password
                </label>
                <Input
                  id="forgot-new-password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                variant="solid"
                size="lg"
                className="w-full mt-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Resetting password...' : 'Set new password'}
              </Button>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setMessage(null);
                  setStep('request');
                }}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer"
              >
                Need a new reset email? Request again
              </button>
            </form>
          )}

          {step === 'success' && (
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Your password has been changed. You can now log in with your new credentials.
              </p>
              <Button asChild variant="solid" size="lg" className="w-full">
                <Link href="/login">Proceed to sign in</Link>
              </Button>
            </div>
          )}

          <div className="pt-4 text-center">
            <Link
              href="/login"
              className="text-xs text-muted-foreground hover:text-brand underline underline-offset-4"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative isolate overflow-x-clip">
      <div className="w-full max-w-md">
        <Suspense
          fallback={
            <Card className="sm:opacity-100">
              <CardBody className="py-12 text-center text-sm text-muted-foreground">
                Loading password reset...
              </CardBody>
            </Card>
          }
        >
          <ForgotPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}

