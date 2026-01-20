"use client";

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import Link from 'next/link';

export default function OtpClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const emailFromQuery = useMemo(() => searchParams.get('email') ?? '', [searchParams]);

  const [email, setEmail] = useState(emailFromQuery);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEmail(emailFromQuery);
  }, [emailFromQuery]);

  async function handleVerify(e: FormEvent) {
    e.preventDefault();

    const cleanedOtp = otp.replace(/\D/g, '');
    if (!email) {
      toast.error('Email is required');
      return;
    }
    if (cleanedOtp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();

      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: cleanedOtp,
        type: 'email',
      });

      if (error) throw error;

      const pendingPassword = typeof window !== 'undefined' ? sessionStorage.getItem('pending_signup_password') : null;
      if (pendingPassword) {
        const { error: updateError } = await supabase.auth.updateUser({ password: pendingPassword });
        if (updateError) throw updateError;
      }

      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('pending_signup_password');
        sessionStorage.removeItem('pending_signup_email');
      }

      if (data.session) {
        toast.success('Verified successfully!');
        router.push('/events');
      } else {
        toast.success('Verified successfully!');
        router.push('/login');
      }
    } catch (err: any) {
      toast.error(err.message ?? 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email) {
      toast.error('Email is required');
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
      toast.success('OTP resent to your email');
    } catch (err: any) {
      toast.error(err.message ?? 'Unable to resend OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-violet-50 to-orange-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h7l5 5v11a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify OTP</h1>
          <p className="text-gray-600">Enter the 6-digit OTP sent to your email</p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">OTP</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 tracking-widest text-center text-lg"
              placeholder="------"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResend}
            disabled={loading}
            className="text-sm text-purple-600 hover:text-purple-700 font-medium disabled:opacity-50"
          >
            Resend OTP
          </button>

          <Link href="/signup" className="text-sm text-gray-600 hover:text-gray-800 font-medium">
            Back to Signup
          </Link>
        </div>
      </div>
    </div>
  );
}
