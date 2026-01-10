'use client';

import Link from 'next/link';
import { Calendar, CreditCard, Shield, Mail, Phone, MapPin } from 'lucide-react';

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gradient-to-br from-purple-50 to-purple-100 border-t border-purple-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <img 
                src="/icon/U.V.-Patel-College-of-Engineering.png" 
                alt="Ganpat University Logo" 
                className="h-10 w-auto object-contain"
              />
              <div>
                <h3 className="text-gray-900 text-lg font-semibold">Ganpat University</h3>
                <p className="text-sm text-gray-600">Event Management System</p>
              </div>
            </div>
            <p className="text-gray-600 mb-4 leading-relaxed">
              Comprehensive event management platform for university events, workshops, and activities. 
              Secure payment processing powered by Razorpay.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-purple-600" />
                <span className="text-gray-700">Ganpat University, Mehsana, Gujarat, India</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4 text-purple-600" />
                <span className="text-gray-700">24012011187@gnu.ac.in</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-purple-600" />
                <span className="text-gray-700">+91 7284825185</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-gray-900 font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-700 hover:text-purple-600 transition-colors text-sm font-medium">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/events" className="text-gray-700 hover:text-purple-600 transition-colors text-sm font-medium">
                  Browse Events
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-gray-700 hover:text-purple-600 transition-colors text-sm font-medium">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/organizer" className="text-gray-700 hover:text-purple-600 transition-colors text-sm font-medium">
                  Organizer Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal & Support */}
          <div>
            <h4 className="text-gray-900 font-semibold mb-4">Legal & Support</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/terms-of-service" className="text-gray-700 hover:text-purple-600 transition-colors text-sm font-medium">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="text-gray-700 hover:text-purple-600 transition-colors text-sm font-medium">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="text-gray-700 hover:text-purple-600 transition-colors text-sm font-medium">
                  Refund Policy
                </Link>
              </li>
              <li>
                <Link href="/merchant-disclosure" className="text-gray-700 hover:text-purple-600 transition-colors text-sm font-medium">
                  Merchant Disclosure
                </Link>
              </li>
              <li>
                <a 
                  href="https://razorpay.com/terms/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-700 hover:text-purple-600 transition-colors text-sm font-medium flex items-center gap-1"
                >
                  <CreditCard className="w-3 h-3 text-purple-600" />
                  Razorpay Terms
                </a>
              </li>
              <li>
                <a 
                  href="https://razorpay.com/privacy/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-700 hover:text-purple-600 transition-colors text-sm font-medium flex items-center gap-1"
                >
                  <Shield className="w-3 h-3 text-purple-600" />
                  Razorpay Privacy
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Payment Security Badge */}
        <div className="border-t border-purple-200 mt-8 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="w-4 h-4 text-purple-600" />
                <span className="text-gray-700">Razorpay Secure Payments</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CreditCard className="w-4 h-4 text-purple-600" />
                <span className="text-gray-700">PCI DSS Compliant</span>
              </div>
            </div>
            <div className="text-sm text-gray-700">
              © {currentYear} Ganpat University. All rights reserved.
            </div>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="border-t border-purple-200 mt-6 pt-6">
          <p className="text-xs text-gray-600 leading-relaxed">
            This platform uses Razorpay Payment Services Private Limited for payment processing. 
            By using our services, you agree to comply with Razorpay's Terms and Conditions 
            and Privacy Policy. All payments are processed securely through Razorpay's 
            PCI DSS compliant payment gateway. We do not store or handle your payment 
            information directly.
          </p>
        </div>
      </div>
    </footer>
  );
}
