'use client';

import React, { useState } from 'react';
import { CCCDData } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Check, X } from 'lucide-react';
import Image from 'next/image';

interface DataTableProps {
  data: CCCDData[];
  onUpdate: (id: string, updatedData: Partial<CCCDData>) => void;
  onDelete: (id: string) => void;
}

export function DataTable({ data, onUpdate, onDelete }: DataTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CCCDData>>({});

  const startEdit = (item: CCCDData) => {
    setEditingId(item.id);
    setEditForm({ ...item });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = (id: string) => {
    onUpdate(id, editForm);
    setEditingId(null);
  };

  const getRowClassName = (item: CCCDData) => {
    if (item.status === 'error') return 'bg-red-50 dark:bg-red-950/20';
    if (item.status === 'success' && (!item.fullName || !item.birthDate)) {
      return 'bg-yellow-50 dark:bg-yellow-950/20';
    }
    return '';
  };

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">STT</TableHead>
            <TableHead className="w-[80px]">Ảnh</TableHead>
            <TableHead className="min-w-[150px]">Họ tên</TableHead>
            <TableHead className="w-[120px]">Ngày sinh</TableHead>
            <TableHead className="min-w-[200px]">Địa chỉ</TableHead>
            <TableHead className="w-[120px]">Ngày cấp</TableHead>
            <TableHead className="min-w-[150px]">Cơ quan cấp</TableHead>
            <TableHead className="w-[100px]">Trạng thái</TableHead>
            <TableHead className="text-right w-[100px]">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                Chưa có dữ liệu.
              </TableCell>
            </TableRow>
          ) : (
            data.map((item, index) => {
              const isEditing = editingId === item.id;
              
              return (
                <TableRow key={item.id} className={getRowClassName(item)}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <div className="relative w-12 h-8 rounded overflow-hidden border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img 
                        src={item.thumbnail} 
                        alt="CCCD" 
                        className="object-cover w-full h-full"
                      />
                    </div>
                  </TableCell>
                  
                  {isEditing ? (
                    <>
                      <TableCell>
                        <Input 
                          value={editForm.fullName || ''} 
                          onChange={e => setEditForm({ ...editForm, fullName: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={editForm.birthDate || ''} 
                          onChange={e => setEditForm({ ...editForm, birthDate: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={editForm.address || ''} 
                          onChange={e => setEditForm({ ...editForm, address: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={editForm.issueDate || ''} 
                          onChange={e => setEditForm({ ...editForm, issueDate: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input 
                          value={editForm.issuedBy || ''} 
                          onChange={e => setEditForm({ ...editForm, issuedBy: e.target.value })}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell>{item.fullName}</TableCell>
                      <TableCell>{item.birthDate}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={item.address}>{item.address}</TableCell>
                      <TableCell>{item.issueDate}</TableCell>
                      <TableCell className="max-w-[150px] truncate" title={item.issuedBy}>{item.issuedBy}</TableCell>
                    </>
                  )}

                  <TableCell>
                    {item.status === 'success' && <Badge variant="default" className="bg-green-600 hover:bg-green-700">OK</Badge>}
                    {item.status === 'processing' && <Badge variant="secondary">Đang xử lý</Badge>}
                    {item.status === 'pending' && <Badge variant="outline">Chờ xử lý</Badge>}
                    {item.status === 'error' && <Badge variant="destructive">Lỗi</Badge>}
                  </TableCell>
                  
                  <TableCell className="text-right">
                    {isEditing ? (
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => saveEdit(item.id)} className="h-8 w-8 text-green-600">
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={cancelEdit} className="h-8 w-8 text-red-600">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => startEdit(item)} className="h-8 w-8" disabled={item.status === 'processing'}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)} className="h-8 w-8 text-red-600" disabled={item.status === 'processing'}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
