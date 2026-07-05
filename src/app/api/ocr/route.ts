import { NextRequest, NextResponse } from 'next/server';
import Tesseract from 'tesseract.js';

/**
 * Trích xuất thông tin CCCD từ kết quả OCR text
 */
function extractInfo(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  
  const data = {
    fullName: '',
    birthDate: '',
    address: '',
    issueDate: '',
    issuedBy: '',
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineLower = line.toLowerCase();

    // Họ và tên / Full name
    if (/h[oọ]\s*(v[aà]\s*)?t[eê]n/i.test(line)) {
      const parts = line.split(/[:\/]/);
      if (parts.length > 1 && parts[1].trim()) {
        data.fullName = parts.slice(1).join(':').trim();
      } else if (i + 1 < lines.length) {
        // Name is likely on the next line
        const nextLine = lines[i + 1];
        if (!/ngày|date|sinh|sex|giới/i.test(nextLine)) {
          data.fullName = nextLine.trim();
        }
      }
    }

    // Ngày sinh / Date of birth
    if (/ng[aà]y.*sinh|date.*birth|sinh/i.test(lineLower) && !data.birthDate) {
      const match = line.match(/(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{4})/);
      if (match) {
        data.birthDate = `${match[1].padStart(2, '0')}/${match[2].padStart(2, '0')}/${match[3]}`;
      } else if (i + 1 < lines.length) {
        const matchNext = lines[i + 1].match(/(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{4})/);
        if (matchNext) {
          data.birthDate = `${matchNext[1].padStart(2, '0')}/${matchNext[2].padStart(2, '0')}/${matchNext[3]}`;
        }
      }
    }

    // Nơi thường trú / Quê quán / Address
    if (/n[oơ]i\s*th[uư][oờ]ng\s*tr[uú]|qu[eê]\s*qu[aá]n|place.*residence/i.test(lineLower)) {
      const addrParts: string[] = [];
      const colonSplit = line.split(/[:\/]/);
      if (colonSplit.length > 1 && colonSplit.slice(1).join(':').trim()) {
        addrParts.push(colonSplit.slice(1).join(':').trim());
      }
      // Address can span multiple lines
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        if (/có giá trị|ngày|date|c[oơ]\s*quan|nơi cấp/i.test(lines[j])) break;
        addrParts.push(lines[j].trim());
      }
      if (addrParts.length > 0) {
        data.address = addrParts.join(', ').replace(/,\s*,/g, ',').trim();
      }
    }

    // Cơ quan cấp / Nơi cấp
    if (/c[oơ]\s*quan\s*c[aấ]p|n[oơ]i\s*c[aấ]p/i.test(lineLower)) {
      const parts = line.split(/[:\/]/);
      if (parts.length > 1 && parts.slice(1).join(':').trim()) {
        data.issuedBy = parts.slice(1).join(':').trim();
      } else if (i + 1 < lines.length) {
        data.issuedBy = lines[i + 1].trim();
      }
    }

    // Ngày cấp / có hiệu lực / date of expiry
    if (/ng[aà]y.*th[aá]ng.*n[aă]m|ngày,/i.test(lineLower) && !data.issueDate) {
      const nums = line.match(/\d+/g);
      if (nums && nums.length >= 3) {
        const day = nums[nums.length - 3].padStart(2, '0');
        const month = nums[nums.length - 2].padStart(2, '0');
        const year = nums[nums.length - 1];
        if (parseInt(year) > 2000 && parseInt(year) < 2100) {
          data.issueDate = `${day}/${month}/${year}`;
        }
      }
    }
  }

  return data;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Run Tesseract OCR with Vietnamese language
    const result = await Tesseract.recognize(buffer, 'vie', {
      logger: () => {}, // Suppress logs
    });

    const rawText = result.data.text;
    const extractedData = extractInfo(rawText);

    return NextResponse.json({
      success: true,
      data: extractedData,
      rawText, // Include raw text for debugging
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('OCR Error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
