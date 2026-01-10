import { Metadata } from 'next';
import PublicFooter from '@/components/PublicFooter';
import PublicNavbar from '../PublicNavbar';

export const metadata: Metadata = {
  title: 'Refund Policy - Ganpat University Event Management',
  description: 'Refund policy for paid events on the Ganpat University Event Management System',
};

export default function RefundPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Refund Policy</h1>
          
          <div className="prose prose-gray max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Overview</h2>
              <p className="text-gray-700 leading-relaxed">
                This Refund Policy governs refunds for paid events registered through the 
                Ganpat University Event Management System. All payments are processed through 
                Razorpay Payment Services Private Limited, and refund processing is subject 
                to Razorpay's policies and banking procedures.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Refund Eligibility</h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  <strong>2.1 Event Cancellation by University:</strong> Full refunds will be 
                  processed if Ganpat University cancels an event for any reason.
                </p>
                <p>
                  <strong>2.2 Event Postponement:</strong> If an event is postponed, you may 
                  choose to either attend the rescheduled event or request a full refund.
                </p>
                <p>
                  <strong>2.3 Participant Cancellation:</strong> Refunds for participant cancellations 
                  are subject to the following conditions:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>More than 7 days before event: 90% refund</li>
                  <li>3-7 days before event: 50% refund</li>
                  <li>Less than 3 days before event: No refund</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">3. Refund Process</h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  <strong>3.1 Refund Request:</strong> To request a refund, please contact us at 
                  24012011187@gnu.ac.in with your registration details and reason for refund.
                </p>
                <p>
                  <strong>3.2 Processing Time:</strong> Refund requests are typically processed within 
                  5-7 business days from approval.
                </p>
                <p>
                  <strong>3.3 Credit Time:</strong> Refunded amounts usually appear in your account 
                  within 5-10 business days after processing, depending on your bank's policies.
                </p>
                <p>
                  <strong>3.4 Refund Method:</strong> Refunds are processed to the original payment 
                  method used for registration.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Non-Refundable Items</h2>
              <div className="space-y-3 text-gray-700">
                <p>The following are generally non-refundable:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Processing fees charged by Razorpay or payment gateways</li>
                  <li>Bank charges for international transactions</li>
                  <li>Late cancellation fees (as per section 2.3)</li>
                  <li>Services already rendered or materials already provided</li>
                  <li>Events marked as "Non-Refundable" during registration</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Special Circumstances</h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  <strong>5.1 Medical Emergencies:</strong> Full or partial refunds may be considered 
                  for medical emergencies with proper documentation.
                </p>
                <p>
                  <strong>5.2 Technical Issues:</strong> If you experience technical issues preventing 
                  event participation, please contact us immediately for resolution.
                </p>
                <p>
                  <strong>5.3 Exceptional Cases:</strong> The university reserves the right to make 
                  exceptions to this policy in exceptional circumstances.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Payment Gateway Refunds</h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  <strong>6.1 Razorpay Processing:</strong> All refunds are processed through Razorpay's 
                  payment gateway and are subject to their refund policies and processing times.
                </p>
                <p>
                  <strong>6.2 Gateway Fees:</strong> Any fees charged by Razorpay or other payment 
                  processors for refund processing may be deducted from the refund amount.
                </p>
                <p>
                  <strong>6.3 Failed Refunds:</strong> If a refund fails due to incorrect bank details 
                  or account closure, please contact us immediately to resolve the issue.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Event-Specific Policies</h2>
              <p className="text-gray-700 leading-relaxed">
                Some events may have specific refund policies that differ from this general policy. 
                Any event-specific refund terms will be clearly stated during the registration process 
                and will take precedence over this general policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">8. Dispute Resolution</h2>
              <div className="space-y-3 text-gray-700">
                <p>
                  If you have any concerns or disputes regarding refunds, please follow these steps:
                </p>
                <ol className="list-decimal pl-6 space-y-1">
                  <li>Contact our support team at 24012011187@gnu.ac.in</li>
                  <li>Provide your registration details and concern</li>
                  <li>Allow 3-5 business days for initial response</li>
                  <li>If unresolved, escalate to the Event Management Committee</li>
                </ol>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">9. Force Majeure</h2>
              <p className="text-gray-700 leading-relaxed">
                Ganpat University shall not be liable for any failure or delay in refund processing 
                due to circumstances beyond our reasonable control, including but not limited to 
                natural disasters, government actions, payment gateway issues, or banking system failures.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">10. Policy Changes</h2>
              <p className="text-gray-700 leading-relaxed">
                We reserve the right to modify this refund policy at any time. Changes will be 
                effective immediately upon posting on our website. Any refunds requested before 
                policy changes will be processed according to the policy in effect at the time 
                of registration.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">11. Contact Information</h2>
              <div className="space-y-2 text-gray-700">
                <p>For refund requests and inquiries, please contact:</p>
                <p>
                  <strong>Email:</strong> 24012011187@gnu.ac.in<br />
                  <strong>Phone:</strong> +91 7284825185<br />
                  <strong>Office Hours:</strong> Monday to Friday, 9:00 AM - 6:00 PM IST<br />
                  <strong>Address:</strong> Event Management Office, Ganpat University, Mehsana, Gujarat
                </p>
              </div>
            </section>

            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">Important Notes:</h3>
              <ul className="list-disc pl-6 space-y-1 text-sm text-yellow-800">
                <li>Refund processing times may vary depending on your bank and payment method</li>
                <li>Always keep your registration confirmation and payment receipts</li>
                <li>Some events may have different refund terms - please check before registering</li>
                <li>Refund requests must be made within 30 days of the event date</li>
                <li>Processing fees charged by Razorpay are non-refundable</li>
              </ul>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Last Updated:</strong> January 10, 2026<br />
                This Refund Policy is effective as of the date stated above and applies to all 
                event registrations made through our platform.
              </p>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
