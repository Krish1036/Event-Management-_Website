"use client";

import { useState } from 'react';
import { toast } from 'sonner';
import { getSupabaseBrowserClient } from '@/lib/supabase-browser';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const PAYMENTS_ENABLED = process.env.NEXT_PUBLIC_PAYMENTS_ENABLED === 'true';
const FILES_BUCKET = 'registration-files';

interface RegistrationFormField {
  id: string;
  label: string;
  field_type: string;
  required: boolean;
  options?: string[] | null;
}

interface RegisterClientProps {
  eventId: string;
  formFields: RegistrationFormField[];
}

interface AnswerPayload {
  field_id: string;
  value: string;
}

export function RegisterClient({ eventId, formFields }: RegisterClientProps) {
  const [loading, setLoading] = useState(false);
  const [textValues, setTextValues] = useState<Record<string, string>>({});
  const [fileValues, setFileValues] = useState<Record<string, File | null>>({});

  function handleTextChange(fieldId: string, value: string) {
    setTextValues((prev) => ({ ...prev, [fieldId]: value }));
  }

  function handleFileChange(fieldId: string, file: File | null) {
    setFileValues((prev) => ({ ...prev, [fieldId]: file }));
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
      const answers = await buildAnswers();
      const endpoint = PAYMENTS_ENABLED ? '/api/register-event' : '/api/register-event-test';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event_id: eventId, answers })
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
        handler: function () {
          toast.success('Payment completed. Awaiting confirmation.');
        },
        modal: {
          ondismiss: function () {
            toast('You can reopen your ticket later once payment is processed.');
          }
        }
      };

      // @ts-expect-error Razorpay is loaded globally by checkout.js script
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
      <Button 
        onClick={(e) => handleRegister(e as any)}
        disabled={loading}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        {loading ? 'Processing…' : 'Register'}
      </Button>
    );
  }

  return (
    <form onSubmit={handleRegister} className="space-y-4">
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

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
      >
        {loading ? 'Processing…' : 'Register'}
      </Button>
    </form>
  );
}
