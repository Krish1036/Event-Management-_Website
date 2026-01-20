'use client';

import { useState, useEffect } from 'react';
import { Mail, Calendar, Users, CheckCircle, Clock, XCircle, Send, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RichTextEditor } from '@/components/RichTextEditor';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Event {
  id: string;
  title: string;
  event_date: string;
  status: string;
  created_at: string;
}

interface EmailHistory {
  id: string;
  event_id: string;
  sent_by: string;
  sender_role: string;
  subject: string;
  recipient_count: number;
  sent_at: string;
  events: {
    title: string;
  } | {
    title: string;
  }[] | null;
}

interface User {
  id: string;
  email?: string;
}

interface Profile {
  full_name: string;
}

interface OrganizerEmailCenterClientProps {
  user: User;
  profile: Profile;
  events: Event[];
  emailHistory: EmailHistory[];
  selectedEventId?: string;
}

export default function OrganizerEmailCenterClient({
  user,
  profile,
  events,
  emailHistory,
  selectedEventId
}: OrganizerEmailCenterClientProps) {
  const [selectedEvent, setSelectedEvent] = useState<string>(selectedEventId || '');
  const [subject, setSubject] = useState('');
  const [messageBody, setMessageBody] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registrations, setRegistrations] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (selectedEvent) {
      fetchRegistrations();
    }
  }, [selectedEvent]);

  const fetchRegistrations = async () => {
    try {
      const response = await fetch(`/api/organizer/events/${selectedEvent}/registrations`);
      if (!response.ok) throw new Error('Failed to fetch registrations');
      
      const data = await response.json();
      setRegistrations(data);
    } catch (err) {
      console.error('Error fetching registrations:', err);
      setError('Failed to load registration data');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      draft: { label: 'Draft', className: 'bg-gray-100 text-gray-800' },
      pending_approval: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
      approved: { label: 'Approved', className: 'bg-green-100 text-green-800' },
      published: { label: 'Published', className: 'bg-blue-100 text-blue-800' },
      cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-800' },
    };
    
    const variant = variants[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const renderMessagePreview = () => {
    let preview = messageBody;
    
    if (selectedEvent && registrations?.event) {
      const event = registrations.event;
      preview = preview
        .replace(/\{\{event_name\}\}/g, event.title || '')
        .replace(/\{\{event_date\}\}/g, event.event_date ? new Date(event.event_date).toLocaleDateString() : '')
        .replace(/\{\{event_time\}\}/g, event.event_date ? new Date(event.event_date).toLocaleTimeString() : '');
    }
    
    return preview.replace(/\{\{participant_name\}\}/g, '[Participant Name]');
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return dateString;
    return d.toISOString().replace('T', ' ').replace('Z', ' UTC');
  };

  const handleSendEmail = async () => {
    if (!selectedEvent || !subject || !messageBody || !confirmation) {
      setError('Please fill all required fields and confirm');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/organizer/events/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventId: selectedEvent,
          subject,
          body: messageBody,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send email');
      }

      const data = await response.json();
      setSuccess(`Email sent successfully to ${data.recipientCount} confirmed participants`);
      
      // Reset form
      setSubject('');
      setMessageBody('');
      setConfirmation(false);
      setShowPreview(false);
      
      // Refresh email history
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Failed to send email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Event Email Center</h1>
        <p className="text-gray-600 mt-2">Send emails to confirmed event participants</p>
      </div>

      {/* Event Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Select Event
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedEvent} onValueChange={setSelectedEvent}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select an event" />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={event.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{event.title}</span>
                    <div className="flex items-center gap-2 ml-4">
                      <span className="text-sm text-gray-500">
                        {new Date(event.event_date).toLocaleDateString()}
                      </span>
                      {getStatusBadge(event.status)}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!selectedEvent && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-600 text-center">
                Please select an event to continue
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedEvent && registrations && (
        <>
          {/* Recipient Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Recipient Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {registrations.total || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Registrations</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {registrations.confirmed || 0}
                  </div>
                  <div className="text-sm text-gray-600">Confirmed</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {registrations.pending || 0}
                  </div>
                  <div className="text-sm text-gray-600">Pending</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {registrations.cancelled || 0}
                  </div>
                  <div className="text-sm text-gray-600">Cancelled</div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Important:</strong> Only confirmed participants will receive this email.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Email Composer */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Email Composer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject"
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Message Body *</Label>
                <div className="mt-1">
                  <RichTextEditor
                    value={messageBody}
                    onChange={setMessageBody}
                    placeholder="Compose your email message here..."
                    variant="light"
                  />
                </div>
                <div className="mt-2 text-sm text-gray-600">
                  <p>Available variables:</p>
                  <code className="bg-gray-100 px-1 rounded">{'{{event_name}}'}</code>,{' '}
                  <code className="bg-gray-100 px-1 rounded">{'{{event_date}}'}</code>,{' '}
                  <code className="bg-gray-100 px-1 rounded">{'{{event_time}}'}</code>,{' '}
                  <code className="bg-gray-100 px-1 rounded">{'{{participant_name}}'}</code>
                </div>
              </div>

              {/* Preview Toggle */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-2"
                >
                  {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showPreview ? 'Hide Preview' : 'Show Preview'}
                </Button>
              </div>

              {showPreview && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Email Preview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <strong>Subject:</strong> {subject || '[No subject]'}
                      </div>
                      <Separator />
                      <div 
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: renderMessagePreview() }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Confirmation */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="confirmation"
                  checked={confirmation}
                  onCheckedChange={(checked) => setConfirmation(checked as boolean)}
                />
                <Label htmlFor="confirmation" className="text-sm">
                  I understand this email will be sent to all confirmed participants
                </Label>
              </div>

              {/* Error and Success Messages */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800">{success}</p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubject('');
                    setMessageBody('');
                    setConfirmation(false);
                    setShowPreview(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendEmail}
                  disabled={!selectedEvent || !subject || !messageBody || !confirmation || isLoading}
                  className="flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {isLoading ? 'Sending...' : 'Send Email'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Email History */}
      {emailHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Email History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Subject</th>
                    <th className="text-left p-2">Event</th>
                    <th className="text-left p-2">Sent by</th>
                    <th className="text-left p-2">Role</th>
                    <th className="text-left p-2">Recipients</th>
                    <th className="text-left p-2">Sent Time</th>
                  </tr>
                </thead>
                <tbody>
                  {emailHistory.map((email) => (
                    <tr key={email.id} className="border-b">
                      <td className="p-2 font-medium">{email.subject}</td>
                      <td className="p-2">
                        {Array.isArray(email.events)
                          ? email.events[0]?.title
                          : email.events?.title}
                      </td>
                      <td className="p-2">{email.sent_by}</td>
                      <td className="p-2">
                        <Badge variant="outline">{email.sender_role}</Badge>
                      </td>
                      <td className="p-2">{email.recipient_count}</td>
                      <td className="p-2">{formatDate(email.sent_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
