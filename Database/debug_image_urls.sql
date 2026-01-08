-- Debug query to check if events have image URLs
SELECT 
  id,
  title,
  image_url,
  CASE 
    WHEN image_url IS NOT NULL AND image_url != '' THEN 'Has Image'
    ELSE 'No Image'
  END as image_status
FROM events 
ORDER BY created_at DESC 
LIMIT 10;
