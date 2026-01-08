'use client';

import { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  value?: string;
  onChange: (url: string | null) => void;
  required?: boolean;
  variant?: 'light' | 'dark';
  className?: string;
}

export function ImageUpload({ 
  value, 
  onChange, 
  required = false, 
  variant = 'light',
  className = ''
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isLight = variant === 'light';
  const containerClass = isLight 
    ? 'border-gray-300 bg-white text-gray-700' 
    : 'border-slate-600 bg-slate-800 text-white';
  const textClass = isLight ? 'text-gray-600' : 'text-slate-400';

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert('File too large. Maximum size is 5MB.');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      setPreview(result.url);
      onChange(result.url);
    } catch (error) {
      console.error('Upload error:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium">
        Event Image {required && <span className="text-red-400">*</span>}
      </label>
      
      {preview ? (
        <div className="relative">
          <div className="relative rounded-lg overflow-hidden border-2 border-dashed border-gray-300">
            <img
              src={preview}
              alt="Event preview"
              className="w-full h-48 object-cover"
            />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="image-upload"
            disabled={uploading}
          />
          <label
            htmlFor="image-upload"
            className={`flex flex-col items-center justify-center w-full h-48 rounded-lg border-2 border-dashed ${containerClass} cursor-pointer hover:opacity-80 transition-opacity`}
          >
            {uploading ? (
              <div className="flex flex-col items-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                <span className={`text-sm ${textClass}`}>Uploading...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <ImageIcon className="w-8 h-8" />
                <Upload className="w-6 h-6" />
                <div className="text-center">
                  <p className={`text-sm ${textClass}`}>
                    Click to upload event image
                  </p>
                  <p className={`text-xs ${textClass} mt-1`}>
                    PNG, JPG, WebP, GIF up to 5MB
                  </p>
                </div>
              </div>
            )}
          </label>
        </div>
      )}
      
      {required && !preview && (
        <p className="text-sm text-red-400">Event image is required</p>
      )}
    </div>
  );
}
