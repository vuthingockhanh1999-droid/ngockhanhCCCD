import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';

// Initialize Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Schema cho kết quả trả về
const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    fullName: {
      type: Type.STRING,
      description: "Họ và tên của người trên thẻ. Chữ in hoa, ví dụ: VŨ THỊ NGỌC KHÁNH",
    },
    birthDate: {
      type: Type.STRING,
      description: "Ngày sinh trên thẻ theo định dạng dd/MM/yyyy. Ví dụ: 22/12/1999",
    },
    address: {
      type: Type.STRING,
      description: "Nơi cư trú hoặc Nơi thường trú (bỏ qua 'Nơi đăng ký khai sinh'). Lấy toàn bộ địa chỉ đầy đủ. Ví dụ: 23B Trương Định, An Bình, Rạch Giá, Kiên Giang",
    },
    issueDate: {
      type: Type.STRING,
      description: "Ngày cấp thẻ (Date of issue) theo định dạng dd/MM/yyyy. Thường nằm phía trên dòng 'Ngày, tháng, năm hết hạn'. Ví dụ: 25/11/2024",
    },
    issuedBy: {
      type: Type.STRING,
      description: "Cơ quan cấp thẻ. Thường là 'BỘ CÔNG AN' hoặc 'CỤC CẢNH SÁT QUẢN LÝ HÀNH CHÍNH VỀ TRẬT TỰ XÃ HỘI'. Lấy nguyên gốc phần chữ tiếng Việt.",
    }
  },
  required: ["fullName", "birthDate", "address", "issueDate", "issuedBy"],
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ success: false, error: 'Chưa cấu hình GEMINI_API_KEY' }, { status: 500 });
    }

    // Chuyển file ảnh thành base64 để gửi cho Gemini
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';

    const prompt = `Trích xuất các thông tin sau từ thẻ Căn cước công dân Việt Nam. Thẻ có thể là mặt trước hoặc mặt sau (hoặc chứa cả hai). Hãy đọc thật kỹ các trường thông tin. Nếu không thấy, hãy trả về chuỗi rỗng "". Yêu cầu độ chính xác tuyệt đối.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Image,
                mimeType: mimeType,
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('Gemini returned empty response');
    }

    const data = JSON.parse(text);

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown OCR error';
    console.error('Gemini API Error:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
