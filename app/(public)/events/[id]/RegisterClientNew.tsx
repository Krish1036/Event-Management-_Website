"use client";

import { useState } from 'react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

const PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true';
const FILES_BUCKET = 'registration-files';

interface RegistrationFormField {
  id: string;
  label: string;
  field_type: string;
  required: boolean;
  options?: string[] | null;
}

interface PricingOption {
  id: string;
  label: string;
  price: number;
}

interface RegisterClientProps {
  eventId: string;
  formFields: RegistrationFormField[];
  event?: any;
  pricingOptions?: PricingOption[] | null;
}

interface AnswerPayload {
  field_id: string;
  value: string;
}

export function RegisterClient({ eventId, formFields, event, pricingOptions }: RegisterClientProps) {
  const [loading, setLoading] = useState(false);
  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [fileValues, setFileValues] = useState<Record<string, File | null>>({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [razorpayTermsAccepted, setRazorpayTermsAccepted] = useState(false);
  const [refundPolicyAccepted, setRefundPolicyAccepted] = useState(false);
  const [selectedPricingOption, setSelectedPricingOption] = useState<string>('');
  const [pricingError, setPricingError] = useState<string>('');

  // Debug logging with more details
  console.log('[DEBUG] RegisterClient - Initialization:', {
    eventId,
    eventPricingType: event?.pricing_type,
    hasEvent: !!event,
    hasPricingOptionsProp: !!pricingOptions,
    pricingOptionsCount: pricingOptions?.length || 0,
    pricingOptionsSample: pricingOptions?.slice(0, 2) || 'none',
    isCustomPricing: event?.pricing_type === 'custom',
    eventStatus: event?.status,
    registrationOpen: event?.is_registration_open,
    timestamp: new Date().toISOString()
  });

  function handleTextChange(fieldId: string, value: string) {
    setTextValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  function handleFileChange(fieldId: string, file: File | null) {
    setFileValues((prev) => ({ ...prev, [fieldId]: file }));
  }

  function handlePricingOptionChange(value: string) {
    console.log('[DEBUG] Pricing option selected:', {
      selectedValue: value,
      optionDetails: pricingOptions?.find(opt => opt.id === value) || 'Not found',
      timestamp: new Date().toISOString()
    });
    setSelectedPricingOption(value);
    setPricingError(''); // Clear error when option is selected
  }

  async function uploadFile(fieldId: string, file: File): Promise<string> {
    const supabase = getSupabaseBrowserClient();
    const path = `${eventId}/${fieldId}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from(FILES_BUCKET).upload(path, file);
    if (error) {
      throw new Error(error.message || 'File upload failed');
    }
    const { data } = supabase.storage.from(FILES_BUCKET).getPublicUrl(path);
    return data.publicUrl;
  }

  async function buildAnswers(): Promise<AnswerPayload[]> {
    const answers: AnswerPayload[] = [];

    for (const field of formFields) {
      if (field.field_type === 'file') {
        const file = fileValues[field.id] || null;
        if (file) {
          const url = await uploadFile(field.id, file);
          answers.push({ field_id: field.id, value: url });
        } else if (field.required) {
          throw new Error(`Please upload a file for "${field.label}"`);
        }
      } else {
        const value = textValues[field.id] ?? '';
        if (field.required && !value.trim()) {
          throw new Error(`Please fill out "${field.label}"`);
        }
        if (value.trim()) {
          answers.push({ field_id: field.id, value: value.trim() });
        }
      }
    }

    return answers;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // Validate legal checkboxes
      if (!termsAccepted) {
        throw new Error('You must accept Terms of Service to continue');
      }
      if (!privacyAccepted) {
        throw new Error('You must accept Privacy Policy to continue');
      }
      if (!razorpayTermsAccepted) {
        throw new Error('You must accept Razorpay Terms and Conditions to continue');
      }
      if (!refundPolicyAccepted) {
        throw new Error('You must accept Refund Policy to continue');
      }

      // Validate custom pricing selection
      if (event?.pricing_type === 'custom') {
        const hasPricingOptions = Array.isArray(pricingOptions) && pricingOptions.length > 0;
        console.log('[DEBUG] Pricing validation - start:', { 
          hasPricingOptions, 
          pricingOptionsCount: pricingOptions?.length || 0,
          selectedPricingOption,
          pricingOptionsSample: pricingOptions?.slice(0, 2) || 'none',
          timestamp: new Date().toISOString()
        });
        
        if (!hasPricingOptions) {
          console.error('[ERROR] No pricing options available for custom pricing event:', {
            eventId: event?.id,
            pricingType: event?.pricing_type,
            pricingOptions,
            timestamp: new Date().toISOString()
          });
          throw new Error('Pricing options are not configured for this event. Please contact the organizer.');
        }
        
        if (!selectedPricingOption) {
          console.log('[DEBUG] No pricing option selected, showing error');
          setPricingError('Please select a pricing option to continue');
          throw new Error('Please select a pricing option to continue');
        }
        
        console.log('[DEBUG] Pricing validation - success:', {
          selectedOption: pricingOptions.find(opt => opt.id === selectedPricingOption),
          timestamp: new Date().toISOString()
        });
      }

      const answers = await buildAnswers();
      const payload: any = { event_id: eventId, answers };
      
      // Include pricing option for custom pricing events
      if (event?.pricing_type === 'custom' && selectedPricingOption) {
        payload.selected_pricing_option_id = selectedPricingOption;
      }

      const endpoint = PAYMENTS_ENABLED ? '/api/register-event' : '/api/register-event-test';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Unable to register');
      }

      if (data.free || !PAYMENTS_ENABLED) {
        toast.success('Registration confirmed for free event');
        if (data.registration_id) {
          window.location.href = `/tickets/${data.registration_id}`;
        }
        return;
      }

      const options: any = {
        key: data.razorpay_key,
        amount: data.amount * 100,
        currency: 'INR',
        order_id: data.order_id,
        name: 'University Events',
        description: 'Event registration',
        image: 'https://bfspxxunptawbuivhvyq.supabase.co/storage/v1/object/public/icon/U.V.-Patel-College-of-Engineering.png',
        theme: {
          color: '#9333ea'
        },
        modal: {
          ondismiss: function () {
            toast('You can reopen your ticket later once payment is processed.');
          },
          escape: false,
          handleback: false,
          confirm: true,
          persistent: true,
          backdropclose: false,
          animation: true
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        notes: {
          event_id: eventId,
          event_title: 'Event Registration'
        },
        handler: async function (response: any) {
          toast.success('Payment completed! Confirming registration...');
          try {
            // Manually confirm registration since test mode doesn't trigger webhooks
            const confirmRes = await fetch('/api/manual-confirm-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event_id: eventId,
                payment_id: response.razorpay_payment_id,
                order_id: response.razorpay_order_id,
                amount: data.amount * 100
              })
            });
            const confirmData = await confirmRes.json();
            if (confirmData.success) {
              toast.success('Registration confirmed! Redirecting to tickets...');
              setTimeout(() => {
                window.location.href = `/tickets/${confirmData.registration_id}`;
              }, 2000);
            } else {
              toast.error('Payment successful but registration failed. Please contact support.');
            }
          } catch (error) {
            console.error('Confirmation error:', error);
            toast.error('Payment successful but confirmation failed. Please contact support.');
          }
        },
      };

      // Razorpay is loaded globally by checkout.js script
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  if (!formFields || formFields.length === 0) {
    return (
      <div className="space-y-4">
        {/* Custom Pricing Dropdown */}
        {event?.pricing_type === 'custom' && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {event.pricing_dropdown_label || 'Select Pricing Option'} <span className="ml-1 text-red-500">*</span>
            </label>
            
            {console.log('[DEBUG] Rendering pricing options dropdown:', {
              hasPricingOptions: Array.isArray(pricingOptions) && pricingOptions.length > 0,
              optionsCount: pricingOptions?.length || 0,
              optionsSample: pricingOptions?.slice(0, 2) || 'none',
              timestamp: new Date().toISOString()
            })}
            
            {Array.isArray(pricingOptions) && pricingOptions.length > 0 ? (
              <>
                <Select 
                  value={selectedPricingOption} 
                  onValueChange={handlePricingOptionChange}
                  disabled={loading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={"Select an option"} />
                  </SelectTrigger>
                  <SelectContent>
                    {pricingOptions.map((option) => (
                      <SelectItem 
                        key={option.id} 
                        value={option.id} 
                        className="text-black hover:bg-purple-100"
                      >
                        {option.label} - ₹{option.price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {pricingError && (
                  <p className="mt-1 text-sm text-red-600">{pricingError}</p>
                )}
              </>
            ) : (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  Pricing options are not configured for this event. Please contact the organizer.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Mobile-only overflow control */}
        <style jsx>{`
          @media (max-width: 480px) {
            div {
              overflow-x: hidden;
              max-width: 100vw;
              width: 100%;
            }
            .space-y-4 > * {
              max-width: 100%;
              box-sizing: border-box;
            }
            .flex {
              flex-wrap: wrap;
            }
            .w-full {
              max-width: 100% !important;
              width: 100% !important;
              box-sizing: border-box;
            }
            .bg-blue-50 {
              max-width: 100%;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            label {
              word-wrap: break-word;
              overflow-wrap: break-word;
              hyphens: auto;
            }
            a {
              word-break: break-all;
              max-width: 100%;
            }
          }
        `}</style>
        {/* Legal Agreements Section */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-lg font-semibold text-gray-900">Legal Agreements</h3>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="terms"
                checked={termsAccepted}
                onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
              />
              <label htmlFor="terms" className="text-sm text-gray-700 leading-relaxed">
                I have read and agree to{' '}
                <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Terms of Service
                </a>
              </label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="privacy"
                checked={privacyAccepted}
                onCheckedChange={(checked) => setPrivacyAccepted(checked as boolean)}
              />
              <label htmlFor="privacy" className="text-sm text-gray-700 leading-relaxed">
                I have read and agree to{' '}
                <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>
              </label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="razorpay-terms"
                checked={razorpayTermsAccepted}
                onCheckedChange={(checked) => setRazorpayTermsAccepted(checked as boolean)}
              />
              <label htmlFor="razorpay-terms" className="text-sm text-gray-700 leading-relaxed">
                I have read and agree to{' '}
                <a href="https://razorpay.com/terms/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Razorpay Terms and Conditions
                </a>{' '}
                for payment processing
              </label>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="refund-policy"
                checked={refundPolicyAccepted}
                onCheckedChange={(checked) => setRefundPolicyAccepted(checked as boolean)}
              />
              <label htmlFor="refund-policy" className="text-sm text-gray-700 leading-relaxed">
                I have read and agree to{' '}
                <a href="/refund-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Refund Policy
                </a>
              </label>
            </div>
          </div>

          {/* Payment Disclosure */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-900 mb-2">Payment Information</h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• All payments are processed in Indian Rupees (INR)</li>
              <li>• Payment processing is handled by Razorpay (PCI DSS compliant)</li>
              <li>• Your payment information is encrypted and secure</li>
              <li>• Transaction fees may apply as per Razorpay's policies</li>
              <li>• Refunds are processed as per our Refund Policy</li>
            </ul>
          </div>
        </div>

        <Button 
          onClick={(e) => handleRegister(e as any)}
          disabled={
            loading || 
            !termsAccepted || 
            !privacyAccepted || 
            !razorpayTermsAccepted || 
            !refundPolicyAccepted ||
            (event?.pricing_type === 'custom' && (!selectedPricingOption || !pricingOptions || pricingOptions.length === 0))
          }
          className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing…' : 'Register'}
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleRegister} className="space-y-4">
      {/* Mobile-only overflow control */}
      <style jsx>{`
        @media (max-width: 480px) {
          form {
            overflow-x: hidden;
            max-width: 100vw;
            width: 100%;
          }
          .space-y-4 > * {
            max-width: 100%;
            box-sizing: border-box;
          }
          .flex {
            flex-wrap: wrap;
          }
          .w-full {
            max-width: 100% !important;
            width: 100% !important;
            box-sizing: border-box;
          }
          input[type="file"],
          input[type="text"],
          input[type="email"],
          input[type="tel"],
          input[type="number"] {
            max-width: 100%;
            width: 100%;
            box-sizing: border-box;
          }
          .bg-blue-50 {
            max-width: 100%;
            word-wrap: break-word;
            overflow-wrap: break-word;
          }
          label {
            word-wrap: break-word;
            overflow-wrap: break-word;
            hyphens: auto;
          }
          a {
            word-break: break-all;
            max-width: 100%;
          }
        }
      `}</style>

      {/* Custom Pricing Dropdown */}
      {event?.pricing_type === 'custom' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {event.pricing_dropdown_label || 'Select Pricing Option'} <span className="ml-1 text-red-500">*</span>
          </label>
          
          {Array.isArray(pricingOptions) && pricingOptions.length > 0 ? (
            <>
              <Select value={selectedPricingOption} onValueChange={handlePricingOptionChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  {pricingOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id} className="text-black hover:bg-purple-100">
                      {option.label} - ₹{option.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {pricingError && (
                <p className="text-sm text-red-600">{pricingError}</p>
              )}
            </>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                Pricing options are not configured for this event. Please contact the organizer.
              </p>
            </div>
          )}
        </div>
      )}

      {formFields.map((field) => {
        const isFile = field.field_type === 'file';
        const isSelect = field.field_type === 'select' && field.options && field.options.length > 0;
        const inputType = field.field_type === 'number' ? 'number' : field.field_type === 'email' ? 'email' : field.field_type === 'phone' ? 'tel' : 'text';

        return (
          <div key={field.id} className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              {field.label}
              {field.required && <span className="ml-1 text-red-500">*</span>}
            </label>
            {isFile ? (
              <Input
                type="file"
                variant="light"
                onChange={(e) => handleFileChange(field.id, e.target.files?.[0] || null)}
                className="w-full"
              />
            ) : isSelect ? (
              <Select value={textValues[field.id] ?? ''} onValueChange={(value) => handleTextChange(field.id, value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {field.options!.map((opt) => (
                    <SelectItem key={opt} value={opt} className="text-black hover:bg-purple-100">
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type={inputType}
                variant="light"
                value={textValues[field.id] ?? ''}
                onChange={(e) => handleTextChange(field.id, e.target.value)}
                placeholder={`Enter ${field.label.toLowerCase()}`}
                className="w-full"
              />
            )}
          </div>
        );
      })}

      {/* Legal Agreements Section */}
      <div className="space-y-4 border-t pt-6">
        <h3 className="text-lg font-semibold text-gray-900">Legal Agreements</h3>
        
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
            />
            <label htmlFor="terms" className="text-sm text-gray-700 leading-relaxed">
              I have read and agree to{' '}
              <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Terms of Service
              </a>
            </label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="privacy"
              checked={privacyAccepted}
              onCheckedChange={(checked) => setPrivacyAccepted(checked as boolean)}
            />
            <label htmlFor="privacy" className="text-sm text-gray-700 leading-relaxed">
              I have read and agree to{' '}
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>
            </label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="razorpay-terms"
              checked={razorpayTermsAccepted}
              onCheckedChange={(checked) => setRazorpayTermsAccepted(checked as boolean)}
            />
            <label htmlFor="razorpay-terms" className="text-sm text-gray-700 leading-relaxed">
              I have read and agree to{' '}
              <a href="https://razorpay.com/terms/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Razorpay Terms and Conditions
              </a>{' '}
              for payment processing
            </label>
          </div>

          <div className="flex items-start space-x-3">
            <Checkbox
              id="refund-policy"
              checked={refundPolicyAccepted}
              onCheckedChange={(checked) => setRefundPolicyAccepted(checked as boolean)}
            />
            <label htmlFor="refund-policy" className="text-sm text-gray-700 leading-relaxed">
              I have read and agree to{' '}
              <a href="/refund-policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                Refund Policy
              </a>
            </label>
          </div>
        </div>

        {/* Payment Disclosure */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">Payment Information</h4>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• All payments are processed in Indian Rupees (INR)</li>
            <li>• Payment processing is handled by Razorpay (PCI DSS compliant)</li>
            <li>• Your payment information is encrypted and secure</li>
            <li>• Transaction fees may apply as per Razorpay's policies</li>
            <li>• Refunds are processed as per our Refund Policy</li>
          </ul>
        </div>
      </div>

      <Button
        type="submit"
        disabled={
          loading || 
          !termsAccepted || 
          !privacyAccepted || 
          !razorpayTermsAccepted || 
          !refundPolicyAccepted ||
          (event?.pricing_type === 'custom' && (!selectedPricingOption || !pricingOptions || pricingOptions.length === 0))
        }
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Processing…' : 'Register'}
      </Button>
    </form>
  );
}
