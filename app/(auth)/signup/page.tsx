"use client";

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import Link from 'next/link';

const GANPAT_INSTITUTES = [
  "U. V. Patel College of Engineering",
  "Institute of Computer Technology",
  "Institute of Technology",
  "B. S. Patel Polytechnic",
  "Institute of Pharmacy",
  "Shree S. K. Patel College of Pharmaceutical Education & Research",
  "V. M. Patel College of Management Studies",
  "Acharya Motibhai Patel Institute of Computer Studies",
  "Mehsana Urban Institute of Sciences (MUIS)",
  "Department of Computer Science",
  "Department of Social Work",
  "Institute of Architecture",
  "Institute of Design & Architecture",
  "Kumud & Bhupesh Institute of Nursing",
  "Institute of Physiotherapy",
  "Kantaben Kashiram Institute of Agricultural Sciences & Research (KKIASR)",
  "Centre for Applied Sciences & Technology",
  "Japan–India Institute for Manufacturing (JIM)",
  "Centre for Advanced Research Studies (CARS)"
];

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [university, setUniversity] = useState('');
  const [universityType, setUniversityType] = useState('');
  const [ganpatInstitute, setGanpatInstitute] = useState('');
  const [otherUniversity, setOtherUniversity] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    fullName?: string;
    phoneNumber?: string;
    universityType?: string;
    ganpatInstitute?: string;
    otherUniversity?: string;
  }>({});

  const validateForm = () => {
    const newErrors: typeof errors = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!fullName) {
      newErrors.fullName = 'Full name is required';
    } else if (fullName.length < 2) {
      newErrors.fullName = 'Full name must be at least 2 characters';
    }

    if (!phoneNumber) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\d{10,15}$/.test(phoneNumber.replace(/\D/g, ''))) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }

    if (!universityType) {
      newErrors.universityType = 'Please select a university';
    } else if (universityType === 'Ganpat University' && !ganpatInstitute) {
      newErrors.ganpatInstitute = 'Please select an institute';
    } else if (universityType === 'Other' && (!otherUniversity || otherUniversity.length < 3)) {
      newErrors.otherUniversity = 'University name must be at least 3 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUniversityTypeChange = (type: string) => {
    setUniversityType(type);
    setGanpatInstitute('');
    setOtherUniversity('');
    setUniversity('');
    // Clear related errors
    setErrors(prev => ({ ...prev, universityType: '', ganpatInstitute: '', otherUniversity: '' }));
  };

  const handleGanpatInstituteChange = (institute: string) => {
    const universityValue = `Ganpat University - ${institute}`;
    setGanpatInstitute(institute);
    setUniversity(universityValue);
    // Clear related errors
    setErrors(prev => ({ ...prev, ganpatInstitute: '' }));
  };

  const handleOtherUniversityChange = (name: string) => {
    setOtherUniversity(name);
    setUniversity(name);
    // Clear related errors
    setErrors(prev => ({ ...prev, otherUniversity: '' }));
  };

  const handleFieldChange = (field: keyof typeof errors, value: string) => {
    // Clear error for this field when user starts typing
    setErrors(prev => ({ ...prev, [field]: '' }));
    
    // Call the appropriate setter
    switch (field) {
      case 'email':
        setEmail(value);
        break;
      case 'password':
        setPassword(value);
        break;
      case 'fullName':
        setFullName(value);
        break;
      case 'phoneNumber':
        setPhoneNumber(value.replace(/\D/g, ''));
        break;
    }
  };

  const isFormValid = () => {
    return (
      email &&
      password &&
      fullName &&
      phoneNumber &&
      universityType &&
      ((universityType === 'Ganpat University' && ganpatInstitute) ||
       (universityType === 'Other' && otherUniversity && otherUniversity.length >= 3))
    );
  };

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setErrors({});
    try {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        throw new Error('Unable to initialize authentication client');
      }

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: {
            full_name: fullName,
            phone_number: phoneNumber,
            university: university,
          },
        },
      });

      if (otpError) throw otpError;

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pending_signup_email', email);
        sessionStorage.setItem('pending_signup_password', password);
      }

      toast.success('OTP sent! Please check your email.');
      router.push(`/otp?email=${encodeURIComponent(email)}`);
    } catch (err: any) {
      toast.error(err.message ?? 'Unable to create account');
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-600">Join us to discover and register for amazing events</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => handleFieldChange('fullName', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 ${
                errors.fullName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your full name"
            />
            {errors.fullName && (
              <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              required
              value={phoneNumber}
              onChange={(e) => handleFieldChange('phoneNumber', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 ${
                errors.phoneNumber ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter phone number"
            />
            {errors.phoneNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.phoneNumber}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              University *
            </label>
            <select
              required
              value={universityType}
              onChange={(e) => handleUniversityTypeChange(e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 ${
                errors.universityType ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select University</option>
              <option value="Ganpat University">Ganpat University</option>
              <option value="Other">Other</option>
            </select>
            {errors.universityType && (
              <p className="mt-1 text-sm text-red-600">{errors.universityType}</p>
            )}
          </div>

          {universityType === 'Ganpat University' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Institute *
              </label>
              <select
                required
                value={ganpatInstitute}
                onChange={(e) => handleGanpatInstituteChange(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 ${
                  errors.ganpatInstitute ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select Institute</option>
                {GANPAT_INSTITUTES.map((institute) => (
                  <option key={institute} value={institute}>
                    {institute}
                  </option>
                ))}
              </select>
              {errors.ganpatInstitute && (
                <p className="mt-1 text-sm text-red-600">{errors.ganpatInstitute}</p>
              )}
            </div>
          )}

          {universityType === 'Other' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                University Name *
              </label>
              <input
                type="text"
                required
                minLength={3}
                value={otherUniversity}
                onChange={(e) => handleOtherUniversityChange(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 ${
                  errors.otherUniversity ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your university name"
              />
              {errors.otherUniversity && (
                <p className="mt-1 text-sm text-red-600">{errors.otherUniversity}</p>
              )}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => handleFieldChange('email', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter your email"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => handleFieldChange('password', e.target.value)}
                className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Create a password (min 6 characters)"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !isFormValid()}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-4 rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-purple-600 hover:text-purple-700 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
