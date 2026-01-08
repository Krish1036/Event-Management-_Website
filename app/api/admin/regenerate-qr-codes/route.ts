import { NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';
import { signPayload } from '@/lib/qr';

export async function POST() {
  try {
    const admin = getSupabaseAdminClient();
    
    // Get all confirmed registrations
    const { data: registrations, error: fetchError } = await admin
      .from('registrations')
      .select('id, status, event_id, user_id')
      .eq('status', 'CONFIRMED');
    
    if (fetchError) {
      console.error('Error fetching registrations:', fetchError);
      return NextResponse.json({ 
        error: 'Failed to fetch registrations', 
        details: fetchError 
      }, { status: 500 });
    }
    
    if (!registrations || registrations.length === 0) {
      return NextResponse.json({ 
        message: 'No confirmed registrations found to update',
        count: 0
      });
    }
    
    console.log(`Found ${registrations.length} confirmed registrations to update`);
    
    // Update each registration with a new entry_code (this triggers QR regeneration)
    const updates = [];
    for (const registration of registrations) {
      // Generate new 6-digit entry code
      const newEntryCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      const { data: updatedReg, error: updateError } = await admin
        .from('registrations')
        .update({ entry_code: newEntryCode })
        .eq('id', registration.id)
        .select()
        .single();
      
      if (updateError) {
        console.error(`Error updating registration ${registration.id}:`, updateError);
        updates.push({
          id: registration.id,
          success: false,
          error: updateError.message
        });
      } else {
        console.log(`Updated registration ${registration.id} with new entry code: ${newEntryCode}`);
        updates.push({
          id: registration.id,
          success: true,
          newEntryCode: newEntryCode
        });
      }
    }
    
    const successCount = updates.filter(u => u.success).length;
    const failureCount = updates.filter(u => !u.success).length;
    
    return NextResponse.json({
      message: `QR code regeneration completed`,
      totalRegistrations: registrations.length,
      successCount,
      failureCount,
      details: updates
    });
    
  } catch (error: any) {
    console.error('Unexpected error in QR regeneration:', error);
    return NextResponse.json({ 
      error: 'Unexpected error', 
      details: error.message 
    }, { status: 500 });
  }
}
