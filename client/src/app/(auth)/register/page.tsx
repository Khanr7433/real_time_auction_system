'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardBody } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';

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
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
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
    <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative isolate overflow-x-clip">
      <div className="w-full max-w-md">
        <Card className="sm:opacity-100">
          <CardBody className="p-6 sm:p-8 gap-6">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Create your account</h1>
              <p className="text-sm text-muted-foreground">
                Join BidNow to participate in <span className="highlight">live real-time auctions</span> with zero latency.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <Alert tone="danger">{error}</Alert>}

              <div className="space-y-1.5">
                <label htmlFor="register-display-name" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Display name
                </label>
                <Input
                  id="register-display-name"
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="register-email" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Email address
                </label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="alex@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="register-password" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Password
                </label>
                <Input
                  id="register-password"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="register-confirm-password" className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  Confirm password
                </label>
                <Input
                  id="register-confirm-password"
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

              <p className="text-center text-xs text-muted-foreground pt-2">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-medium text-foreground hover:text-brand underline underline-offset-4"
                >
                  Sign in
                </Link>
              </p>
            </form>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

