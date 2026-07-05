from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from paddleocr import PaddleOCR
import cv2
import numpy as np
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize PaddleOCR (CPU mode by default)
ocr = PaddleOCR(use_angle_cls=True, lang='vi')

def extract_info(text_lines):
    data = {
        "fullName": "",
        "birthDate": "",
        "address": "",
        "issueDate": "",
        "issuedBy": ""
    }
    
    for i, line in enumerate(text_lines):
        line_lower = line.lower()
        
        # Name
        if "họ và tên" in line_lower or "họ tên" in line_lower:
            parts = line.split(":")
            if len(parts) > 1 and parts[1].strip():
                data["fullName"] = parts[1].strip()
            elif i + 1 < len(text_lines):
                data["fullName"] = text_lines[i+1].strip()
                
        # Birth Date
        if "ngày, tháng, năm sinh" in line_lower or "ngày sinh" in line_lower:
            match = re.search(r'\d{2}/\d{2}/\d{4}', line)
            if match:
                data["birthDate"] = match.group(0)
            elif i + 1 < len(text_lines):
                match_next = re.search(r'\d{2}/\d{2}/\d{4}', text_lines[i+1])
                if match_next:
                    data["birthDate"] = match_next.group(0)

        # Address
        if "nơi thường trú" in line_lower:
            addr = []
            if ":" in line:
                addr.append(line.split(":")[1].strip())
            for j in range(i+1, min(i+4, len(text_lines))):
                if "có giá trị đến" in text_lines[j].lower():
                    break
                addr.append(text_lines[j].strip())
            data["address"] = " ".join(addr).strip()
            
        # Issued By
        if "nơi cấp" in line_lower or "cơ quan cấp" in line_lower:
            parts = line.split(":")
            if len(parts) > 1 and parts[1].strip():
                data["issuedBy"] = parts[1].strip()
            elif i + 1 < len(text_lines):
                data["issuedBy"] = text_lines[i+1].strip()
                
        # Issue Date (e.g. "Ngày 15 tháng 03 năm 2023")
        if "ngày" in line_lower and "tháng" in line_lower and "năm" in line_lower:
            if not data["issueDate"]:
                match = re.findall(r'\d+', line)
                if len(match) >= 3:
                    data["issueDate"] = f"{match[-3]}/{match[-2]}/{match[-1]}"

    return data

@app.post("/api/ocr")
async def process_ocr(file: UploadFile = File(...)):
    if not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail="File is not an image")
        
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        # OCR extraction
        result = ocr.ocr(img, cls=True)
        
        text_lines = []
        if result and result[0]:
            for line in result[0]:
                text = line[1][0]
                text_lines.append(text)
                
        extracted_data = extract_info(text_lines)
        
        return {
            "success": True,
            "data": extracted_data
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
