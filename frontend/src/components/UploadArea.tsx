'use client';

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface UploadAreaProps {
  onFilesAccepted: (files: File[]) => void;
  disabled?: boolean;
}

export function UploadArea({ onFilesAccepted, disabled }: UploadAreaProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFilesAccepted(acceptedFiles);
    }
  }, [onFilesAccepted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/webp': ['.webp']
    },
    disabled
  });

  return (
    <Card
      {...getRootProps()}
      className={`border-2 border-dashed p-12 flex flex-col items-center justify-center cursor-pointer transition-colors duration-200 ${
        isDragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input {...getInputProps()} />
      <UploadCloud className="w-12 h-12 text-muted-foreground mb-4" />
      <p className="text-lg font-medium mb-1">
        {isDragActive ? 'Thả ảnh vào đây...' : 'Kéo thả hoặc click để chọn ảnh CCCD'}
      </p>
      <p className="text-sm text-muted-foreground">
        Hỗ trợ định dạng JPG, JPEG, PNG, WEBP.
      </p>
    </Card>
  );
}
