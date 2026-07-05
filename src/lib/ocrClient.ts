import Tesseract from 'tesseract.js';

/**
 * Trích xuất thông tin CCCD từ kết quả OCR text.
 * Hỗ trợ nhiều layout CCCD khác nhau, xử lý lỗi typo từ OCR.
 */
function extractInfo(text: string) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const fullText = lines.join(' ');

  const data = {
    fullName: '',
    birthDate: '',
    address: '',
    issueDate: '',
    issuedBy: '',
  };

  // ===== 1. TÌM NGÀY SINH (tìm trước để loại trừ khi tìm tên) =====
  // Pattern: dd/mm/yyyy hoặc dd-mm-yyyy hoặc dd.mm.yyyy
  const allDates: string[] = [];
  const dateRegex = /(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{4})/g;
  let dateMatch;
  while ((dateMatch = dateRegex.exec(fullText)) !== null) {
    const d = dateMatch[1].padStart(2, '0');
    const m = dateMatch[2].padStart(2, '0');
    const y = dateMatch[3];
    allDates.push(`${d}/${m}/${y}`);
  }

  // Tìm ngày sinh gắn với từ khóa
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const combined = i + 1 < lines.length ? line + ' ' + lines[i + 1] : line;

    if (/sinh|birth|Date of birth/i.test(combined) && !data.birthDate) {
      const m = combined.match(/(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{4})/);
      if (m) {
        data.birthDate = `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[3]}`;
      }
    }
  }
  // Fallback: nếu không tìm được qua keyword, lấy ngày đầu tiên có năm 19xx hoặc 20xx hợp lý (tuổi 10-100)
  if (!data.birthDate && allDates.length > 0) {
    for (const d of allDates) {
      const year = parseInt(d.split('/')[2]);
      if (year >= 1920 && year <= 2015) {
        data.birthDate = d;
        break;
      }
    }
  }

  // ===== 2. TÌM HỌ VÀ TÊN =====
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Pattern 1: "Họ, chữ đệm và tên khai sinh / Full name" hoặc "Họ và tên" hoặc "Full name"
    if (/h[oọ],?\s*ch[uữ]\s*[dđ][eệ]m|h[oọ]\s*(v[aà]\s*)?t[eê]n|full\s*name|khai\s*sinh/i.test(line)) {
      // Tên có thể nằm trên cùng dòng sau dấu ":"
      const parts = line.split(/[:]/);
      if (parts.length > 1) {
        const nameCandidate = parts.slice(1).join(':')
          .replace(/full\s*name/i, '')
          .replace(/[\/\\]/g, '')
          .trim();
        if (nameCandidate.length > 2 && !/^\d+$/.test(nameCandidate)) {
          data.fullName = nameCandidate;
          continue;
        }
      }
      // Tên nằm ở dòng tiếp theo
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        const nextLine = lines[j];
        // Bỏ qua nếu dòng tiếp theo là keyword khác
        if (/sinh|birth|sex|gi[oớ]i|qu[oố]c|nationality|ngày|date/i.test(nextLine)) break;
        // Tên thường là chữ IN HOA hoặc có dấu tiếng Việt
        const cleaned = nextLine.replace(/[\/\\]/g, '').trim();
        if (cleaned.length > 2 && !/^\d+$/.test(cleaned)) {
          data.fullName = cleaned;
          break;
        }
      }
      continue;
    }

    // Pattern 2: Dòng ngay trước ngày sinh thường là tên (trên CCCD mới)
    if (!data.fullName && i + 1 < lines.length) {
      if (/sinh|birth/i.test(lines[i + 1]) && !/c[aă]n\s*c[uư][oớ]c|citizen|republic|vi[eệ]t|identity|s[oố]\s*[dđ][iị]nh/i.test(line)) {
        const candidate = line.replace(/full\s*name/i, '').replace(/[\/\\:]/g, '').trim();
        if (candidate.length > 2 && /[A-ZĐ\u00C0-\u024F\u1E00-\u1EFF]/.test(candidate) && !/^\d+$/.test(candidate)) {
          data.fullName = candidate;
        }
      }
    }
  }

  // ===== 3. TÌM ĐỊA CHỈ =====
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Tìm Nơi cư trú / Nơi thường trú / Quê quán
    if (/n[oơ]i\s*th[uư][oờ]ng\s*tr[uú]|place\s*(of\s*)?residen|qu[eê]\s*qu[aá]n|place\s*(of\s*)?origin|n[oơ]i\s*c[uư]\s*tr[uú]/i.test(line)) {
      const addrParts: string[] = [];
      const colonSplit = line.split(/[:]/);
      let afterLabel = '';
      
      if (colonSplit.length > 1) {
        afterLabel = colonSplit.slice(1).join(':');
      } else {
        // Trường hợp không có dấu ':' (như Nơi cư trú trên CCCD mới)
        const match = line.match(/(n[oơ]i\s*th[uư][oờ]ng\s*tr[uú]|place\s*(of\s*)?residen|qu[eê]\s*qu[aá]n|place\s*(of\s*)?origin|n[oơ]i\s*c[uư]\s*tr[uú])/i);
        if (match && match.index !== undefined) {
           afterLabel = line.substring(match.index + match[0].length);
        }
      }

      // Làm sạch đoạn text sau label
      const cleanedAfterLabel = afterLabel
        .replace(/place\s*(of\s*)?(residence|origin)|n[oơ]i\s*c[uư]\s*tr[uú]/i, '')
        .replace(/[\/\\]/g, '')
        .trim();
        
      if (cleanedAfterLabel.length > 2) {
        addrParts.push(cleanedAfterLabel);
      }

      // Lấy các dòng tiếp theo (địa chỉ có thể nhiều dòng)
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const nextLine = lines[j];
        // Dừng lại nếu gặp các nhãn khác
        if (/c[oó]\s*gi[aá]\s*tr[iị]|ngày|date|c[oơ]\s*quan|n[oơ]i\s*c[aấ]p|đ[aặ]c\s*đi[eể]m|personal|expiry|đ[aă]ng\s*k[yý]|khai\s*sinh/i.test(nextLine)) break;
        if (/n[oơ]i\s*th[uư][oờ]ng|place\s*(of\s*)?residen|n[oơ]i\s*c[uư]\s*tr[uú]|qu[eê]\s*qu[aá]n/i.test(nextLine)) break;
        
        addrParts.push(nextLine.replace(/[\/\\]/g, '').trim());
      }
      
      if (addrParts.length > 0) {
        // Ưu tiên "Nơi cư trú" hoặc "Nơi thường trú" hơn là "Quê quán" nếu cả 2 đều tồn tại
        const parsedAddress = addrParts.join(', ').replace(/,\s*,/g, ',').trim();
        if (/n[oơ]i\s*(c[uư]|th[uư][oờ]ng)\s*tr[uú]|residen/i.test(line) || !data.address) {
           data.address = parsedAddress;
        }
      }
    }
  }

  // ===== 4. TÌM CƠ QUAN CẤP =====
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // CCCD mẫu mới nhất: BỘ CÔNG AN
    if (/b[oộ]\s*c[oô]ng\s*an|ministry.*public\s*security/i.test(line)) {
      data.issuedBy = 'BỘ CÔNG AN';
      break; // Found it, no need to search further
    }

    // CCCD mẫu cũ: CỤC CẢNH SÁT QUẢN LÝ HÀNH CHÍNH...
    if (/c[uụ]c\s*c[aả]nh\s*s[aá]t|cục cs/i.test(line)) {
      data.issuedBy = 'CỤC CẢNH SÁT QUẢN LÝ HÀNH CHÍNH VỀ TRẬT TỰ XÃ HỘI';
      break;
    }

    // Fallback: nếu có chữ "Cơ quan cấp" nhưng không nhận dạng được Cục/Bộ
    if (/c[oơ]\s*quan\s*c[aấ]p|n[oơ]i\s*c[aấ]p|issuing/i.test(line) && !data.issuedBy) {
      const parts = line.split(/[:\/]/);
      if (parts.length > 1) {
        const val = parts.slice(1).join(':').replace(/[\/\\]/g, '').trim();
        if (val.length > 2) {
          data.issuedBy = val;
        }
      } else if (i + 1 < lines.length) {
        data.issuedBy = lines[i + 1].replace(/[\/\\]/g, '').trim();
      }
    }
  }

  // ===== 5. TÌM NGÀY CẤP =====
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const combined = i + 1 < lines.length ? line + ' ' + lines[i + 1] : line;

    // Pattern 1: "Ngày, tháng, năm cấp / Date of issue: 25/11/2024" (trên CCCD mới, ngày tháng thường ở dòng dưới)
    if (/(ng[aà]y.*c[aấ]p|date\s*of\s*issue)/i.test(combined) && !data.issueDate) {
      const m = combined.match(/(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{4})/);
      if (m) {
        data.issueDate = `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[3]}`;
        continue;
      }
    }

    // Pattern 2: "Ngày XX tháng XX năm XXXX" (trên CCCD cũ)
    if (/ng[aà]y.*th[aá]ng.*n[aă]m/i.test(line) && !/(sinh|birth|h[eế]t\s*h[aạ]n|expiry)/i.test(line) && !data.issueDate) {
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

  // Fallback ngày cấp: nếu có nhiều ngày và chưa tìm được, lấy ngày có năm > 2015
  if (!data.issueDate && allDates.length > 1) {
    for (const d of allDates) {
      if (d === data.birthDate) continue;
      const year = parseInt(d.split('/')[2]);
      if (year >= 2015 && year <= 2030) {
        data.issueDate = d;
        break;
      }
    }
  }

  return data;
}

/**
 * Xử lý ảnh trước khi OCR (Grayscale, Tăng độ tương phản)
 * Giúp loại bỏ nhiễu nền trên CCCD và tăng độ chính xác cho Tesseract
 */
async function preprocessImage(imageSource: string | File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(typeof imageSource === 'string' ? imageSource : URL.createObjectURL(imageSource));
        return;
      }

      // Giữ nguyên kích thước ảnh gốc
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Áp dụng Grayscale và tăng Contrast
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Chuyển sang ảnh xám (Grayscale)
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;

        // Tăng độ tương phản (Contrast)
        const factor = (259 * (128 + 255)) / (255 * (259 - 128));
        gray = factor * (gray - 128) + 128;

        // Ép giới hạn 0-255
        gray = Math.max(0, Math.min(255, gray));

        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    img.onerror = () => reject(new Error('Lỗi khi tiền xử lý ảnh'));
    
    if (typeof imageSource === 'string') {
      img.src = imageSource;
    } else {
      img.src = URL.createObjectURL(imageSource);
    }
  });
}

/**
 * Chạy OCR trên trình duyệt bằng Tesseract.js (Web Worker)
 * Hỗ trợ tiếng Việt + Anh (CCCD có cả 2 ngôn ngữ)
 */
export async function runOCR(imageSource: string | File): Promise<{
  success: boolean;
  data: {
    fullName: string;
    birthDate: string;
    address: string;
    issueDate: string;
    issuedBy: string;
  };
  rawText?: string;
  error?: string;
}> {
  try {
    // Tiền xử lý ảnh (Khử màu, tăng tương phản)
    const processedImage = await preprocessImage(imageSource);

    // Dùng cả tiếng Việt và tiếng Anh để nhận diện tốt hơn
    const result = await Tesseract.recognize(processedImage, 'vie+eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR progress: ${Math.round((m.progress || 0) * 100)}%`);
        }
      },
    });

    const rawText = result.data.text;
    console.log('=== RAW OCR TEXT ===');
    console.log(rawText);
    console.log('===================');

    const extractedData = extractInfo(rawText);
    console.log('=== EXTRACTED DATA ===');
    console.log(extractedData);
    console.log('=====================');

    return {
      success: true,
      data: extractedData,
      rawText,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown OCR error';
    console.error('OCR Error:', message);
    return {
      success: false,
      data: { fullName: '', birthDate: '', address: '', issueDate: '', issuedBy: '' },
      error: message,
    };
  }
}
