export interface CCCDData {
  id: string;
  thumbnail: string; // base64 or blob URL
  file: File;
  fullName: string;
  birthDate: string;
  address: string;
  issueDate: string;
  issuedBy: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  errorMessage?: string;
  processingTime?: number;
}
