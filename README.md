# Ứng dụng Web OCR Căn cước Công dân (CCCD)

Hệ thống trích xuất thông tin tự động từ hình ảnh Căn cước công dân sử dụng Next.js (Frontend) và FastAPI + PaddleOCR (Backend).

## Cấu trúc Dự án

- `frontend/`: Chứa mã nguồn Next.js 15, giao diện người dùng, upload ảnh, giao tiếp API và xuất Excel.
- `backend-ocr/`: Chứa mã nguồn FastAPI và PaddleOCR xử lý AI/Computer Vision, bóc tách text tiếng Việt.

## Hướng dẫn Chạy Local

### 1. Backend OCR (Python)

Yêu cầu: Python 3.8 - 3.10.

```bash
cd backend-ocr
python -m venv venv
# Windows: venv\Scripts\activate | Mac/Linux: source venv/bin/activate
pip install -r requirements.txt
python main.py
```
Backend sẽ chạy tại `http://localhost:8000`. Endpoint OCR là `POST /api/ocr`.

*Lưu ý: Lần đầu tiên chạy, PaddleOCR sẽ tải mô hình ngôn ngữ tiếng Việt (vi) về máy.*

### 2. Frontend (Next.js)

Yêu cầu: Node.js 18.17 trở lên, pnpm.

```bash
cd frontend
pnpm install
pnpm run dev
```
Frontend sẽ chạy tại `http://localhost:3000`. 
Mặc định frontend sẽ gọi backend tại `http://localhost:8000/api/ocr`. Bạn có thể thay đổi bằng cách tạo file `.env.local` trong thư mục `frontend`:
```env
NEXT_PUBLIC_OCR_API_URL=http://localhost:8000/api/ocr
```

## Hướng dẫn Triển khai (Deploy)

### Frontend (Vercel)
- Upload toàn bộ repo lên GitHub.
- Trên Vercel Dashboard, import repo.
- Ở phần **Root Directory**, bấm Edit và chọn `frontend`.
- Vercel sẽ tự động nhận diện framework Next.js và tự cấu hình các lệnh Build. Deploy thẳng từ nhánh main.

### Backend OCR (Railway / Render / VPS)
- Môi trường Serverless của Vercel giới hạn dung lượng code sau khi nén ở mức 50MB, đồng thời thiếu thư viện C++ (libgl1) dùng cho OpenCV. Vì vậy API OCR không thể chạy trên Vercel Functions.
- Backend được thiết kế để triển khai bằng **Docker**.
- Trong `backend-ocr/` đã cung cấp sẵn `Dockerfile`. Bạn có thể kết nối repo GitHub này với Railway hoặc Render, chọn thư mục gốc là `backend-ocr`, nền tảng sẽ tự động build image qua Docker và chạy server FastAPI.
- Sau khi có URL của Backend, hãy thêm URL đó vào biến môi trường `NEXT_PUBLIC_OCR_API_URL` của Frontend trên Vercel.
