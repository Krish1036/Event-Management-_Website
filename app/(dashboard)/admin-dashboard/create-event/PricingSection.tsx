'use client';

import { useCreateEvent } from './CreateEventProvider';

export function PricingSection({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  const { state, updateField, setError, clearError } = useCreateEvent();
  const paymentsEnabled = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED !== 'false';

  const isLight = variant === 'light';
  const headerBorder = isLight ? 'border-b border-gray-200 pb-2' : 'border-b border-slate-700 pb-2';
  const headerTitle = isLight ? 'text-lg font-semibold text-gray-900' : 'text-lg font-semibold text-white';
  const headerDesc = isLight ? 'text-sm text-gray-600' : 'text-sm text-slate-400';
  const labelClass = isLight ? 'block text-sm font-medium text-gray-700 mb-2' : 'block text-sm font-medium text-slate-300 mb-2';
  const inputBase = isLight
    ? 'block w-full pl-7 pr-12 py-2 rounded-lg border bg-white text-gray-700 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500'
    : 'block w-full pl-7 pr-12 py-2 rounded-lg border bg-slate-800 text-white placeholder:slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500';

  const handlePriceChange = (value: string) => {
    const numValue = parseFloat(value) || 0;
    updateField('price', numValue);
    
    if (state.data.event_type === 'paid' && numValue <= 0) {
      setError('price', 'Price must be greater than 0 for paid events');
    } else {
      clearError('price');
    }
  };

  const handleEventTypeChange = (eventType: 'free' | 'paid' | 'custom') => {
    updateField('event_type', eventType);
    
    // Clear price error when switching to free or custom
    if (eventType === 'free' || eventType === 'custom') {
      clearError('price');
    } else if (state.data.price <= 0) {
      setError('price', 'Price must be greater than 0 for paid events');
    }
  };

  return (
    <div className="space-y-6">
      {!paymentsEnabled && (
        <div className="rounded-md border border-amber-500/60 bg-amber-950/60 px-4 py-3 text-xs text-amber-100">
          Payments are disabled (Test Mode). Paid events will behave as free for testing.
        </div>
      )}
      <div className={headerBorder}>
        <h2 className={headerTitle}>Pricing & Payment</h2>
        <p className={headerDesc}>Set event pricing and payment options</p>
      </div>

      <div className="space-y-6">
        {/* Event Type */}
        <div>
          <label className={labelClass}>
            Event Type
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => handleEventTypeChange('free')}
              className={`rounded-lg p-4 border-2 transition-colors ${
                state.data.event_type === 'free'
                  ? (isLight ? 'border-sky-500 bg-sky-50' : 'border-sky-500 bg-sky-500/10')
                  : (isLight ? 'border-gray-200 hover:border-gray-300 bg-white' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50')
              }`}
            >
              <div className="text-left">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>Free</span>
                  {state.data.event_type === 'free' && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isLight ? 'bg-sky-100 text-sky-800' : 'bg-sky-100 text-sky-800'}`}>
                      Selected
                    </span>
                  )}
                </div>
                <p className={`mt-1 text-sm ${isLight ? 'text-gray-600' : 'text-slate-400'}`}>No payment required</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleEventTypeChange('paid')}
              className={`rounded-lg p-4 border-2 transition-colors ${
                state.data.event_type === 'paid'
                  ? (isLight ? 'border-green-500 bg-green-50' : 'border-green-500 bg-green-500/10')
                  : (isLight ? 'border-gray-200 hover:border-gray-300 bg-white' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50')
              }`}
            >
              <div className="text-left">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>Paid</span>
                  {state.data.event_type === 'paid' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Selected
                    </span>
                  )}
                </div>
                <p className={`mt-1 text-sm ${isLight ? 'text-gray-600' : 'text-slate-400'}`}>Charge attendees to register</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleEventTypeChange('custom')}
              className={`rounded-lg p-4 border-2 transition-colors ${
                state.data.event_type === 'custom'
                  ? (isLight ? 'border-purple-500 bg-purple-50' : 'border-purple-500 bg-purple-500/10')
                  : (isLight ? 'border-gray-200 hover:border-gray-300 bg-white' : 'border-slate-700 hover:border-slate-600 bg-slate-800/50')
              }`}
            >
              <div className="text-left">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>Custom Pricing</span>
                  {state.data.event_type === 'custom' && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Selected
                    </span>
                  )}
                </div>
                <p className={`mt-1 text-sm ${isLight ? 'text-gray-600' : 'text-slate-400'}`}>Multiple pricing options</p>
              </div>
            </button>
          </div>
        </div>

        {/* Price Input (Conditional) */}
        {state.data.event_type === 'paid' && (
          <div>
            <label htmlFor="price" className={labelClass}>
              Price per attendee <span className="text-red-400">*</span>
            </label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className={`sm:text-sm ${isLight ? 'text-gray-500' : 'text-slate-400'}`}>₹</span>
              </div>
              <input
                type="number"
                id="price"
                value={state.data.price || ''}
                onChange={(e) => handlePriceChange(e.target.value)}
                min="0"
                step="0.01"
                className={`${inputBase} ${state.errors.price ? 'border-red-500' : (isLight ? 'border-gray-300' : 'border-slate-600')}`}
                placeholder="0.00"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className={`sm:text-sm ${isLight ? 'text-gray-500' : 'text-slate-400'}`} id="price-currency">
                  INR
                </span>
              </div>
            </div>
            {state.errors.price && (
              <p className="mt-1 text-sm text-red-400">{state.errors.price}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Amount in Indian Rupees (INR)
            </p>
          </div>
        )}

        {/* Custom Pricing Configuration */}
        {state.data.event_type === 'custom' && (
          <div className="space-y-6 border-t pt-6">
            <div>
              <h3 className={`text-lg font-medium ${isLight ? 'text-gray-900' : 'text-white'} mb-4`}>
                Custom Pricing Configuration
              </h3>
              
              {/* Dropdown Label */}
              <div className="mb-6">
                <label htmlFor="pricing_dropdown_label" className={labelClass}>
                  Dropdown Label <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="pricing_dropdown_label"
                  value={state.data.pricing_dropdown_label || ''}
                  onChange={(e) => updateField('pricing_dropdown_label', e.target.value)}
                  className={`${inputBase} ${state.errors.pricing_dropdown_label ? 'border-red-500' : (isLight ? 'border-gray-300' : 'border-slate-600')}`}
                  placeholder="e.g., Select Category, Choose Ticket Type, Who are you?"
                />
                {state.errors.pricing_dropdown_label && (
                  <p className="mt-1 text-sm text-red-400">{state.errors.pricing_dropdown_label}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  This label will be shown to users when they register
                </p>
              </div>

              {/* Pricing Options Builder */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className={labelClass}>
                    Pricing Options <span className="text-red-400">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newOption = {
                        id: Date.now().toString(),
                        label: '',
                        price: 0
                      };
                      updateField('pricing_options', [...state.data.pricing_options, newOption]);
                    }}
                    className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md ${
                      isLight 
                        ? 'bg-purple-600 text-white hover:bg-purple-700' 
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    }`}
                  >
                    + Add Option
                  </button>
                </div>

                {state.errors.pricing_options && (
                  <p className="mb-4 text-sm text-red-400">{state.errors.pricing_options}</p>
                )}

                <div className="space-y-3">
                  {state.data.pricing_options.map((option, index) => (
                    <div key={option.id} className={`flex items-center gap-3 p-3 rounded-lg border ${isLight ? 'border-gray-200 bg-gray-50' : 'border-slate-700 bg-slate-800/50'}`}>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={option.label}
                          onChange={(e) => {
                            const updatedOptions = [...state.data.pricing_options];
                            updatedOptions[index] = { ...option, label: e.target.value };
                            updateField('pricing_options', updatedOptions);
                          }}
                          className={`block w-full rounded-md border py-2 px-3 text-sm ${
                            isLight 
                              ? 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-500' 
                              : 'border-slate-600 bg-slate-700 text-white placeholder:text-slate-400'
                          } ${state.errors[`pricing_option_${index}_label`] ? 'border-red-500' : ''}`}
                          placeholder="Option name (e.g., Student, Teacher)"
                        />
                        {state.errors[`pricing_option_${index}_label`] && (
                          <p className="mt-1 text-xs text-red-400">{state.errors[`pricing_option_${index}_label`]}</p>
                        )}
                      </div>
                      
                      <div className="w-32">
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                            <span className={`text-sm ${isLight ? 'text-gray-500' : 'text-slate-400'}`}>₹</span>
                          </div>
                          <input
                            type="number"
                            value={option.price || ''}
                            onChange={(e) => {
                              const updatedOptions = [...state.data.pricing_options];
                              updatedOptions[index] = { ...option, price: parseFloat(e.target.value) || 0 };
                              updateField('pricing_options', updatedOptions);
                            }}
                            min="0"
                            step="0.01"
                            className={`block w-full pl-7 pr-2 py-2 text-sm rounded-md border ${
                              isLight 
                                ? 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-500' 
                                : 'border-slate-600 bg-slate-700 text-white placeholder:text-slate-400'
                            } ${state.errors[`pricing_option_${index}_price`] ? 'border-red-500' : ''}`}
                            placeholder="0.00"
                          />
                        </div>
                        {state.errors[`pricing_option_${index}_price`] && (
                          <p className="mt-1 text-xs text-red-400">{state.errors[`pricing_option_${index}_price`]}</p>
                        )}
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          const updatedOptions = state.data.pricing_options.filter((_, i) => i !== index);
                          updateField('pricing_options', updatedOptions);
                        }}
                        className={`p-2 text-sm rounded-md ${
                          isLight 
                            ? 'text-red-600 hover:text-red-800 hover:bg-red-50' 
                            : 'text-red-400 hover:text-red-300 hover:bg-red-900/20'
                        }`}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  
                  {state.data.pricing_options.length === 0 && (
                    <div className={`text-center py-8 rounded-lg border-2 border-dashed ${isLight ? 'border-gray-300 bg-gray-50' : 'border-slate-700 bg-slate-800/50'}`}>
                      <p className={`text-sm ${isLight ? 'text-gray-500' : 'text-slate-400'}`}>
                        No pricing options added yet. Click "Add Option" to get started.
                      </p>
                    </div>
                  )}
                </div>
                
                <p className="mt-2 text-xs text-gray-500">
                  Minimum 1 option required. Each option must have a unique name and price greater than 0.
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="pt-2">
          <label className={isLight ? 'block text-sm font-medium text-gray-700 mb-2' : 'block text-sm font-medium text-slate-300 mb-2'}>
            Payment Methods
          </label>
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <input
                id="razorpay-payment"
                name="payment-method"
                type="checkbox"
                checked={true}
                disabled
                className={`h-4 w-4 rounded ${isLight ? 'border-gray-300 bg-white text-sky-500' : 'border-slate-600 bg-slate-800 text-sky-500'} focus:ring-sky-500`}
              />
              <div>
                <label htmlFor="razorpay-payment" className={`block text-sm font-medium ${isLight ? 'text-gray-900' : 'text-white'}`}>
                  Credit/Debit Card (Razorpay)
                </label>
                <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-slate-400'}`}>Secure online payments via Razorpay</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 pt-1">
              <div className="flex-shrink-0 pt-1">
                <input
                  id="offline-payment"
                  name="offline-payment"
                  type="checkbox"
                  disabled
                  className={`h-4 w-4 rounded ${isLight ? 'border-gray-300 bg-white text-gray-400' : 'border-slate-600 bg-slate-800 text-slate-400'} focus:ring-slate-500`}
                />
              </div>
              <div>
                <label htmlFor="offline-payment" className={`block text-sm font-medium ${isLight ? 'text-gray-700' : 'text-slate-400'}`}>
                  Offline Payment (Coming Soon)
                </label>
                <p className={`text-xs ${isLight ? 'text-gray-600' : 'text-slate-500'}`}>
                  Enable cash, bank transfer, or other offline payment methods
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Test Mode Notice */}
        {state.data.event_type === 'paid' && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-amber-300">Test Mode</h3>
                <div className="mt-2 text-sm text-amber-200">
                  <p>
                    Payments are in test mode. No real transactions will be processed. Use Razorpay sandbox/Test credentials to simulate payments.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
