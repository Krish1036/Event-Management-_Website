import { Metadata } from 'next';
import PublicFooter from '@/components/PublicFooter';
import PublicNavbar from '../PublicNavbar';

export const metadata: Metadata = {
  title: 'Privacy Policy - Ganpat University Event Management',
  description: 'Privacy policy for the Ganpat University Event Management System',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Privacy Policy</h1>
          
          <div className="prose prose-gray max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Introduction</h2>
              <p className="text-gray-700 leading-relaxed">
                Ganpat University ("we," "us," or "our") is committed to protecting your privacy. 
                This Privacy Policy explains how we collect, use, disclose, and safeguard your 
                information when you use our Event Management System.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Information We Collect</h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  <strong>2.1 Personal Information:</strong> We collect information you provide directly, 
                  including but not limited to:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Name and contact information (email, phone number)</li>
                  <li>Academic information (student ID, department, year)</li>
                  <li>Registration details for events</li>
                  <li>Payment information (processed securely through Razorpay)</li>
                  <li>Profile information and preferences</li>
                </ul>
                <p>
                  <strong>2.2 Automatically Collected Information:</strong> We may automatically collect 
                  certain technical information, including:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>IP address and device information</li>
                  <li>Browser type and operating system</li>
                  <li>Pages visited and time spent on our platform</li>
                  <li>Access times and dates</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Information</h2>
              <div className="space-y-3 text-gray-700">
                <p>We use your information for the following purposes:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>To process event registrations and payments</li>
                  <li>To communicate with you about events and updates</li>
                  <li>To manage and organize university events</li>
                  <li>To improve our services and user experience</li>
                  <li>To ensure security and prevent fraud</li>
                  <li>To comply with legal obligations</li>
                  <li>To send important notifications and announcements</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Payment Information Security</h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  <strong>4.1 Razorpay Integration:</strong> All payment processing is handled by 
                  Razorpay Payment Services Private Limited, a PCI DSS compliant payment gateway. 
                  We do not store or process payment card information on our servers.
                </p>
                <p>
                  <strong>4.2 Payment Data:</strong> When you make a payment, your payment information 
                  is encrypted and transmitted directly to Razorpay's secure servers. We only receive 
                  transaction confirmation and minimal necessary details.
                </p>
                <p>
                  <strong>4.3 Razorpay Privacy:</strong> By using our payment services, you also agree 
                  to Razorpay's Privacy Policy, which governs how they handle your payment information.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Information Sharing</h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  <strong>5.1 Event Organizers:</strong> We may share your registration information with 
                  event organizers within the university for event management purposes only.
                </p>
                <p>
                  <strong>5.2 Service Providers:</strong> We share information with third-party service 
                  providers who perform functions on our behalf, such as Razorpay for payment processing.
                </p>
                <p>
                  <strong>5.3 Legal Requirements:</strong> We may disclose your information if required 
                  by law, court order, or government request.
                </p>
                <p>
                  <strong>5.4 Business Transfers:</strong> In the event of a merger, acquisition, or sale 
                  of assets, user information may be transferred as part of the transaction.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Data Security</h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  We implement appropriate technical and organizational measures to protect your 
                  information, including:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>SSL/TLS encryption for data transmission</li>
                  <li>Secure authentication and access controls</li>
                  <li>Regular security assessments and updates</li>
                  <li>Limited access to personal information on a need-to-know basis</li>
                  <li>Compliance with PCI DSS standards for payment processing</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Data Retention</h2>
              <p className="text-gray-700 leading-relaxed">
                We retain your information for as long as necessary to fulfill the purposes outlined 
                in this Privacy Policy, unless a longer retention period is required or permitted by law. 
                Event registration records are typically retained for academic and administrative purposes.
              </p>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Retention</h3>
              <div className="space-y-3">
                <p>We retain your personal information only as long as necessary for the purposes outlined in this privacy policy:</p>
                <ul className="list-disc list-inside space-y-2 ml-6 text-gray-700">
                  <li><strong>Event Registrations:</strong> Retained for 7 years or as required by law</li>
                  <li><strong>Payment Information:</strong> Payment transaction details retained for 7 years for compliance</li>
                  <li><strong>Account Information:</strong> Retained while your account remains active</li>
                  <li><strong>Event Files:</strong> Retained for 1 year after event conclusion</li>
                  <li><strong>System Logs:</strong> Retained for 90 days for security purposes</li>
                  <li><strong>Marketing Communications:</strong> Retained until you unsubscribe</li>
                </ul>
                <p className="text-gray-700">After the retention period, data is securely deleted or anonymized unless we are required to retain it longer by law.</p>
              </div>
            </section>

            <section>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">User Consent and Rights</h3>
              <div className="space-y-3">
                <p className="text-gray-700">By using our platform, you provide explicit consent for:</p>
                <ul className="list-disc list-inside space-y-2 ml-6 text-gray-700">
                  <li>Collection and processing of your personal information as described in this policy</li>
                  <li>Storage of your data for the duration specified in our retention policy</li>
                  <li>Use of your information for event management and communication purposes</li>
                  <li>Sharing of necessary information with Razorpay for payment processing</li>
                  <li>Use of cookies and similar technologies for platform functionality</li>
                </ul>
                
                <p className="font-semibold text-gray-900 mt-4">Your Rights:</p>
                <ul className="list-disc list-inside space-y-2 ml-6 text-gray-700">
                  <li><strong>Access:</strong> Request a copy of your personal data</li>
                  <li><strong>Correction:</strong> Request correction of inaccurate information</li>
                  <li><strong>Deletion:</strong> Request deletion of your personal data (subject to legal requirements)</li>
                  <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                  <li><strong>Objection:</strong> Object to processing of your data in certain circumstances</li>
                  <li><strong>Withdraw Consent:</strong> Withdraw consent at any time (affects future processing only)</li>
                </ul>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-blue-800">
                    <strong>To exercise these rights:</strong> Email us at 24012011187@gnu.ac.in with your request. 
                    We will respond within 30 days as required by applicable privacy laws.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Your Rights</h2>
              <div className="space-y-3 text-gray-700">
                <p>You have the following rights regarding your personal information:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Access:</strong> Request access to your personal information</li>
                  <li><strong>Correction:</strong> Request correction of inaccurate information</li>
                  <li><strong>Deletion:</strong> Request deletion of your personal information (subject to legal requirements)</li>
                  <li><strong>Portability:</strong> Request transfer of your data to another service</li>
                  <li><strong>Objection:</strong> Object to processing of your information</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Cookies and Tracking</h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  We use cookies and similar technologies to enhance your experience, including:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Essential cookies for platform functionality</li>
                  <li>Authentication cookies to keep you logged in</li>
                  <li>Analytics cookies to understand usage patterns</li>
                  <li>Security cookies to prevent fraud and abuse</li>
                </ul>
                <p>
                  You can control cookie settings through your browser preferences, but disabling 
                  certain cookies may affect platform functionality.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Third-Party Links</h2>
              <p className="text-gray-700 leading-relaxed">
                Our platform may contain links to third-party websites and services, including Razorpay. 
                We are not responsible for the privacy practices of these external services. 
                Please review their privacy policies before providing personal information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Children's Privacy</h2>
              <p className="text-gray-700 leading-relaxed">
                Our service is intended for university students and adults. We do not knowingly 
                collect personal information from children under 18. If we become aware that we 
                have collected information from a minor, we will take steps to delete such information.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">12. International Data Transfers</h2>
              <p className="text-gray-700 leading-relaxed">
                Your information is primarily stored and processed in India. Any international 
                data transfers will be conducted in compliance with applicable data protection laws.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">13. Changes to This Policy</h2>
              <p className="text-gray-700 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any 
                material changes by posting the updated policy on our platform and sending you 
                an email notification for significant changes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">14. Contact Information</h2>
              <div className="space-y-2 text-gray-700">
                <p>If you have questions about this Privacy Policy or want to exercise your rights, please contact us:</p>
                <p>
                  <strong>Email:</strong> 24012011187@gnu.ac.in<br />
                  <strong>Phone:</strong> +91 7284825185<br />
                  <strong>Address:</strong> Ganpat University, Mehsana, Gujarat, India 384012
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">15. Razorpay Privacy</h2>
              <p className="text-gray-700 leading-relaxed">
                For information about how Razorpay handles payment data, please review their 
                <a href="https://razorpay.com/privacy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                  Privacy Policy
                </a>. Razorpay is an independent data controller for payment processing purposes.
              </p>
            </section>

            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Last Updated:</strong> January 10, 2026<br />
                This Privacy Policy is effective as of the date stated above and will remain in effect 
                until replaced by a new version.
              </p>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
