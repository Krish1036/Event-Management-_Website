"use client";

import { FormEvent, useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import Link from 'next/link';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        throw new Error('Unable to initialize authentication client');
      }

      // Create user account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          }
        }
      });

      if (signUpError) throw signUpError;

      if (authData.user && !authData.session) {
        // Email confirmation required
        toast.success('Account created! Please check your email to confirm your account.');
      } else if (authData.session) {
        // Auto sign-in (email confirmations disabled in Supabase)
        toast.success('Account created successfully!');
        // You could redirect here if needed
      } else {
        throw new Error('Unable to create account');
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Unable to create account');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-10">
      <h1 className="mb-4 text-2xl font-semibold tracking-tight">Sign Up</h1>
      <p className="mb-6 text-sm text-slate-300">
        Create a new account to register for events.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <label className="block text-xs font-medium text-slate-200">
          Full Name
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
            placeholder="Enter your full name"
          />
        </label>
        <label className="block text-xs font-medium text-slate-200">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
            placeholder="Enter your email"
          />
        </label>
        <label className="block text-xs font-medium text-slate-200">
          Password
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
            placeholder="Create a password (min 6 characters)"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded bg-sky-600 px-3 py-2 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-60"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>
      <p className="mt-6 text-center text-xs text-slate-400">
        Already have an account?{' '}
        <Link href="/login" className="text-sky-400 hover:text-sky-300">
          Sign in
        </Link>
      </p>
    </div>
  );
}
