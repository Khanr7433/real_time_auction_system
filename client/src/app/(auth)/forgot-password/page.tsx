'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [step, setStep] = useState<'request' | 'reset' | 'success'>('request');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setMessage(res.message || 'Password reset requested.');
      // In academic scope, token is returned in response for testing
      if (res.resetToken) {
        setResetToken(res.resetToken);
        setStep('reset');
      } else {
        setStep('reset');
      }
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
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/auth/reset-password', {
        token: resetToken,
        newPassword,
      });
      setMessage(res.message || 'Password has been reset successfully!');
      setStep('success');
    } catch (err: any) {
      setError(err instanceof ApiError ? err.message : 'Failed to reset password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-background relative isolate overflow-x-clip">
      <div className="w-full max-w-md">
        <Card className="card-chai">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-semibold tracking-tight">
              {step === 'success' ? 'Password reset complete' : 'Reset your password'}
            </CardTitle>
            <CardDescription className="text-sm text-neutral-600 dark:text-neutral-400">
              Recover access to your <span className="highlight">BidNow auction account</span>.
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Account email
                  </label>
                  <Input
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
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Reset token
                  </label>
                  <Input
                    type="text"
                    placeholder="Enter reset token"
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    required
                  />
                  <p className="text-[11px] text-neutral-500">
                    In development mode, your token was automatically populated from the server response.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    New password
                  </label>
                  <Input
                    type="password"
                    placeholder="At least 6 characters"
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
              </form>
            )}

            {step === 'success' && (
              <div className="space-y-4 text-center">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Your password has been changed. You can now log in with your new credentials.
                </p>
                <Link href="/login">
                  <Button variant="solid" size="lg" className="w-full">
                    Proceed to sign in
                  </Button>
                </Link>
              </div>
            )}

            <div className="pt-4 text-center">
              <Link
                href="/login"
                className="text-xs text-neutral-500 hover:text-brand underline underline-offset-4"
              >
                Back to sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

