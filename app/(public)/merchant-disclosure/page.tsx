import PublicNavbar from '../PublicNavbar';

export default function MerchantDisclosurePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      <PublicNavbar />
      
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Merchant Disclosure</h1>
          
          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Business Information</h2>
              <div className="bg-gray-50 rounded-lg p-6 space-y-3">
                <p><strong>Merchant Name:</strong> Ganpat University</p>
                <p><strong>Business Type:</strong> Educational Institution</p>
                <p><strong>Service Category:</strong> Event Management Services</p>
                <p><strong>Registration:</strong> University Grants Commission (UGC) Approved</p>
                <p><strong>Address:</strong> Ganpat University, Mehsana, Gujarat, India - 384012</p>
                <p><strong>Phone:</strong> +91 7284825185</p>
                <p><strong>Email:</strong> 24012011187@gnu.ac.in</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Payment Processing</h2>
              <div className="bg-blue-50 rounded-lg p-6 space-y-3">
                <p><strong>Payment Gateway:</strong> Razorpay Payment Services Private Limited</p>
                <p><strong>Gateway Registration:</strong> Razorpay Verified Merchant</p>
                <p><strong>Compliance:</strong> PCI DSS Compliant Payment Processing</p>
                <p><strong>Security:</strong> 256-bit SSL Encryption for all transactions</p>
                <p><strong>Currency:</strong> Indian Rupees (INR) only</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Legal Compliance</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Regulatory Compliance</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Registered under University Grants Commission (UGC)</li>
                    <li>Compliant with Information Technology Act, 2000</li>
                    <li>Follows Reserve Bank of India (RBI) guidelines for digital payments</li>
                    <li>Adheres to Consumer Protection Act, 2019</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Data Protection</h3>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Compliant with Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011</li>
                    <li>Data encryption in transit and at rest</li>
                    <li>Regular security audits and penetration testing</li>
                    <li>User consent management for data processing</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Service Terms</h2>
              <div className="bg-yellow-50 rounded-lg p-6 space-y-3">
                <p><strong>Service Scope:</strong> Event registration and management services for university events</p>
                <p><strong>Geographic Scope:</strong> Services available within India only</p>
                <p><strong>Payment Terms:</strong> Advance payment required for event registration</p>
                <p><strong>Refund Policy:</strong> As per our published Refund Policy</p>
                <p><strong>Dispute Resolution:</strong> Through university grievance redressal mechanism</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
              <div className="bg-gray-50 rounded-lg p-6 space-y-3">
                <p><strong>For Payment Related Issues:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-6">
                  <li>Email: 24012011187@gnu.ac.in</li>
                  <li>Phone: +91 7284825185 (Ext: 567)</li>
                </ul>
                
                <p><strong>For Technical Support:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-6">
                  <li>Email: 24012011187@gnu.ac.in</li>
                  <li>Phone: +91 7284825185 (Ext: 234)</li>
                </ul>
                
                <p><strong>For Legal & Compliance:</strong></p>
                <ul className="list-disc list-inside space-y-1 ml-6">
                  <li>Email: 24012011187@gnu.ac.in</li>
                  <li>Phone: +91 7284825185 (Ext: 123)</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Third-Party Services</h2>
              <div className="space-y-3">
                <p>We use the following third-party services to provide our platform:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li><strong>Razorpay:</strong> Payment processing services</li>
                  <li><strong>Supabase:</strong> Database and authentication services</li>
                  <li><strong>Vercel:</strong> Cloud hosting services</li>
                </ul>
                <p className="text-sm text-gray-600">
                  Each third-party service has its own terms of service and privacy policy that apply to your use of their services.
                </p>
              </div>
            </section>

            <div className="border-t pt-6 mt-8">
              <p className="text-sm text-gray-500">
                <strong>Last Updated:</strong> January 2026<br />
                This disclosure is part of our commitment to transparency and compliance with applicable laws and regulations.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
