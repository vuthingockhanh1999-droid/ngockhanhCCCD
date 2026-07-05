'use client';

import React, { useState, useCallback } from 'react';
import { UploadArea } from '@/components/UploadArea';
import { DataTable } from '@/components/DataTable';
import { exportToExcel } from '@/lib/exportExcel';
import { CCCDData } from '@/types';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Download, LayoutDashboard } from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const [data, setData] = useState<CCCDData[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);

  const handleFilesAccepted = useCallback(async (files: File[]) => {
    const newItems: CCCDData[] = files.map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      thumbnail: URL.createObjectURL(file),
      fullName: '',
      birthDate: '',
      address: '',
      issueDate: '',
      issuedBy: '',
      status: 'pending'
    }));

    setData(prev => [...prev, ...newItems]);
    setIsProcessing(true);
    setProgressPercent(0);

    // Process each file sequentially
    for (let i = 0; i < newItems.length; i++) {
      const item = newItems[i];
      await processOCR(item.id, item.file);
      setProgressPercent(Math.round(((i + 1) / newItems.length) * 100));
    }

    setIsProcessing(false);
  }, []);

  const processOCR = async (id: string, file: File) => {
    setData(prev => prev.map(item => item.id === id ? { ...item, status: 'processing' } : item));

    const startTime = Date.now();

    try {
      // Call Gemini API Route
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/gemini-ocr', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      const processingTime = Date.now() - startTime;

      if (result.success && result.data) {
        setData(prev => prev.map(item => item.id === id ? {
          ...item,
          status: 'success',
          fullName: result.data.fullName || '',
          birthDate: result.data.birthDate || '',
          address: result.data.address || '',
          issueDate: result.data.issueDate || '',
          issuedBy: result.data.issuedBy || '',
          processingTime,
        } : item));
        toast.success(`Nhận diện thành công: ${file.name}`);
      } else {
        throw new Error(result.error || 'Unknown error');
      }

    } catch (error) {
      console.error(error);
      setData(prev => prev.map(item => item.id === id ? { ...item, status: 'error', errorMessage: 'Lỗi OCR' } : item));
      toast.error(`Nhận diện thất bại: ${file.name}`);
    }
  };

  const handleUpdate = (id: string, updatedData: Partial<CCCDData>) => {
    setData(prev => prev.map(item => item.id === id ? { ...item, ...updatedData } : item));
    toast.success('Cập nhật dữ liệu thành công');
  };

  const handleDelete = (id: string) => {
    setData(prev => {
      const filtered = prev.filter(item => item.id !== id);
      const itemToDelete = prev.find(i => i.id === id);
      if (itemToDelete?.thumbnail) {
        URL.revokeObjectURL(itemToDelete.thumbnail);
      }
      return filtered;
    });
    toast.success('Đã xóa dòng');
  };

  const handleExport = async () => {
    if (data.length === 0) {
      toast.warning('Không có dữ liệu để xuất');
      return;
    }
    try {
      setIsExporting(true);
      await exportToExcel(data);
      toast.success('Xuất file Excel thành công');
    } catch (error) {
      toast.error('Lỗi khi xuất file Excel');
    } finally {
      setIsExporting(false);
    }
  };

  // Stats
  const total = data.length;
  const processed = data.filter(d => d.status === 'success').length;
  const errors = data.filter(d => d.status === 'error').length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">CCCD OCR System</h1>
          </div>
          <div className="flex items-center gap-4">
            <Button onClick={handleExport} disabled={isExporting || total === 0} variant="default">
              <Download className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-6 rounded-xl border bg-card shadow-sm transition-all hover:shadow-md">
            <p className="text-sm font-medium text-muted-foreground mb-1">Tổng số ảnh</p>
            <p className="text-3xl font-bold">{total}</p>
          </div>
          <div className="p-6 rounded-xl border bg-card shadow-sm transition-all hover:shadow-md">
            <p className="text-sm font-medium text-muted-foreground mb-1">Đã xử lý thành công</p>
            <p className="text-3xl font-bold text-green-600">{processed}</p>
          </div>
          <div className="p-6 rounded-xl border bg-card shadow-sm transition-all hover:shadow-md">
            <p className="text-sm font-medium text-muted-foreground mb-1">Lỗi nhận diện</p>
            <p className="text-3xl font-bold text-red-600">{errors}</p>
          </div>
          <div className="p-6 rounded-xl border bg-card shadow-sm transition-all hover:shadow-md">
            <p className="text-sm font-medium text-muted-foreground mb-1">Đang xử lý</p>
            <p className="text-3xl font-bold text-blue-600">
              {data.filter(d => d.status === 'processing' || d.status === 'pending').length}
            </p>
          </div>
        </div>

        {/* Progress bar khi đang xử lý */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Đang nhận diện...</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        )}

        <section>
          <h2 className="text-lg font-semibold mb-4">Tải ảnh lên</h2>
          <UploadArea onFilesAccepted={handleFilesAccepted} disabled={isProcessing} />
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Kết quả nhận diện</h2>
          </div>
          <DataTable data={data} onUpdate={handleUpdate} onDelete={handleDelete} />
        </section>
      </main>
    </div>
  );
}
