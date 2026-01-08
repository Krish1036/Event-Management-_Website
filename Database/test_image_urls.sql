-- Test query to get actual image URLs and check their format
SELECT 
  id,
  title,
  image_url,
  CASE 
    WHEN image_url IS NOT NULL AND image_url != '' THEN 'Has Image URL'
    ELSE 'No Image URL'
  END as url_status,
  CASE 
    WHEN image_url LIKE 'https://%' THEN 'Valid HTTPS URL'
    WHEN image_url LIKE 'http://%' THEN 'Valid HTTP URL'
    WHEN image_url IS NOT NULL THEN 'Invalid URL Format'
    ELSE 'No URL'
  END as url_format
FROM events 
WHERE image_url IS NOT NULL AND image_url != ''
ORDER BY created_at DESC 
LIMIT 5;
