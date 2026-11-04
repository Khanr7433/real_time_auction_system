'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setError('Please provide a valid email address');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await register(email, password, displayName);
      if (res.success) {
        router.push('/');
      } else {
        setError(res.error || 'Registration failed');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-background relative isolate overflow-x-clip">
      <div className="w-full max-w-md">
        <Card className="border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-black/40 backdrop-blur-md shadow-none">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-semibold tracking-tight">Create your account</CardTitle>
            <CardDescription className="text-sm text-neutral-600 dark:text-neutral-400">
              Join BidNow to participate in <span className="highlight">live real-time auctions</span> with zero latency.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 text-xs rounded-md bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Display name
                </label>
                <Input
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Email address
                </label>
                <Input
                  type="email"
                  placeholder="alex@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Password
                </label>
                <Input
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Confirm password
                </label>
                <Input
                  type="password"
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
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
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </Button>

              <p className="text-center text-xs text-neutral-500 dark:text-neutral-400 pt-2">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-medium text-foreground hover:text-brand underline underline-offset-4"
                >
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

