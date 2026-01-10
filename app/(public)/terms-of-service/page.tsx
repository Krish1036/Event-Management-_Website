import { Metadata } from 'next';
import PublicFooter from '@/components/PublicFooter';
import PublicNavbar from '../PublicNavbar';

export const metadata: Metadata = {
  title: 'Terms of Service - Ganpat University Event Management',
  description: 'Terms and conditions for using the Ganpat University Event Management System',
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Terms of Service</h1>
          
          <div className="prose prose-gray max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                By accessing and using the Ganpat University Event Management System ("Service"), 
                you accept and agree to be bound by the terms and provision of this agreement. 
                If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Payment Terms</h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  <strong>2.1 Payment Processing:</strong> All payments for paid events are processed 
                  through Razorpay Payment Services Private Limited ("Razorpay"). By making a payment, 
                  you agree to Razorpay's Terms of Conditions and Privacy Policy.
                </p>
                <p>
                  <strong>2.2 Currency:</strong> All payments are processed in Indian Rupees (INR) only.
                </p>
                <p>
                  <strong>2.3 Transaction Fees:</strong> Payment processing fees as charged by Razorpay 
                  may be applicable and are included in the event price where applicable.
                </p>
                <p>
                  <strong>2.4 Security:</strong> All payment transactions are secured using industry-standard 
                  encryption and PCI DSS compliance through Razorpay's payment gateway.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Registration and Events</h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  <strong>3.1 Registration:</strong> Registration for events is subject to availability and 
                  confirmation of payment for paid events.
                </p>
                <p>
                  <strong>3.2 Event Changes:</strong> Ganpat University reserves the right to modify, postpone, 
                  or cancel events. In case of cancellation, refunds will be processed as per our Refund Policy.
                </p>
                <p>
                  <strong>3.3 User Conduct:</strong> Users must maintain appropriate conduct during events and 
                  adhere to university guidelines and codes of conduct.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Privacy and Data</h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  <strong>4.1 Data Collection:</strong> We collect personal information necessary for event 
                  registration and communication purposes as outlined in our Privacy Policy.
                </p>
                <p>
                  <strong>4.2 Payment Data:</strong> Payment information is processed directly by Razorpay 
                  and is not stored on our servers in compliance with PCI DSS requirements.
                </p>
                <p>
                  <strong>4.3 Data Usage:</strong> Your data may be used for event management, communication, 
                  and improving our services as per our Privacy Policy.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Refund Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                Refunds for paid events are processed as per our Refund Policy. Please review the 
                refund terms before making any payment. Refund processing times may vary depending 
                on your payment method and bank processing times.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Intellectual Property</h2>
              <p className="text-gray-700 leading-relaxed">
                All content, trademarks, and intellectual property on this platform belong to 
                Ganpat University and are protected by applicable copyright and trademark laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Limitation of Liability</h2>
              <p className="text-gray-700 leading-relaxed">
                Ganpat University shall not be liable for any indirect, incidental, special, or 
                consequential damages arising from your use of this service or participation in events.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Third-Party Services</h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  <strong>8.1 Razorpay Integration:</strong> Our payment processing is powered by Razorpay. 
                  By using our payment services, you agree to be bound by Razorpay's 
                  <a href="https://razorpay.com/terms/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                    Terms and Conditions
                  </a> and 
                  <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                    Privacy Policy
                  </a>.
                </p>
                <p>
                  <strong>8.2 Third-Party Links:</strong> Our service may contain links to third-party websites. 
                  We are not responsible for the content or practices of these external sites.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Termination</h2>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to terminate or suspend access to our service immediately, 
                without prior notice or liability, for any reason whatsoever, including without 
                limitation if you breach the Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Changes to Terms</h2>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to modify these terms at any time. Changes will be effective 
                immediately upon posting on our website. Your continued use of the service after 
                such changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact Information</h2>
              <div className="space-y-2 text-gray-700">
                <p>For questions about these Terms of Service, please contact us at:</p>
                <p>
                  <strong>Email:</strong> 24012011187@gnu.ac.in<br />
                  <strong>Phone:</strong> +91 7284825185<br />
                  <strong>Address:</strong> Ganpat University, Mehsana, Gujarat, India
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">12. Governing Law</h2>
              <p className="text-gray-700 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of India, 
                and any disputes relating to these terms will be subject to the exclusive jurisdiction 
                of the courts in Mehsana, Gujarat.
              </p>
            </section>

            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Last Updated:</strong> January 10, 2026<br />
                By using our service, you acknowledge that you have read, understood, and agree 
                to be bound by these Terms of Service.
              </p>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
