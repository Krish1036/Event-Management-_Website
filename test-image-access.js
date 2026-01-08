// Test script to verify Supabase storage URL accessibility
// Run this in browser console on your event page

const testImageUrl = 'https://bfspxxunptawbuivhvyq.supabase.co/storage/v1/object/public/event-images/test.jpg';

fetch(testImageUrl)
  .then(response => {
    console.log('✅ Image accessible:', response.status, response.statusText);
    return response.blob();
  })
  .then(blob => {
    console.log('✅ Image blob size:', blob.size, 'bytes');
  })
  .catch(error => {
    console.error('❌ Image not accessible:', error);
  });

// Also test by creating an image element
const img = new Image();
img.onload = () => console.log('✅ Image loaded via Image element');
img.onerror = (e) => console.error('❌ Image failed via Image element:', e);
img.src = testImageUrl;
