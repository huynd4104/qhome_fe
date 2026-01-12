import { createWorker } from 'tesseract.js';

export interface CCCDInfo {
  fullName?: string;
  nationalId?: string;
  dob?: string;
  address?: string;
  gender?: string;
  nationality?: string;
}

/**
 * Enhance image quality for better OCR recognition
 * - Increase contrast
 * - Sharpen edges
 * - Convert to grayscale (optional but often improves OCR)
 * - Adjust brightness if needed
 * - Resize to optimal size
 */
async function enhanceImageForOCR(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Optimal size for OCR: 2000-3000px width (not too small, not too large)
        const maxWidth = 2500;
        const maxHeight = 2500;
        
        let width = img.width;
        let height = img.height;
        
        // Resize if too large (maintain aspect ratio)
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        // Resize if too small 
        if (width < 800) {
          width = Math.max(width, 800);
          height = Math.max(height, (800 * img.height) / img.width);
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Draw original image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Get image data for processing
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        
        // Apply enhancements
        for (let i = 0; i < data.length; i += 4) {
          // Get RGB values
          let r = data[i];
          let g = data[i + 1];
          let b = data[i + 2];
          
          // Convert to grayscale (better for OCR)
          const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          
          // Increase contrast (multiply by 1.3, then clamp)
          let enhanced = gray * 1.3;
          enhanced = Math.min(255, Math.max(0, enhanced));
          
          // Apply slight brightness adjustment
          enhanced = enhanced * 1.1;
          enhanced = Math.min(255, Math.max(0, enhanced));
          
          // Set grayscale values
          data[i] = enhanced;     // R
          data[i + 1] = enhanced; // G
          data[i + 2] = enhanced; // B
          // Alpha stays the same
        }
        
        // Apply sharpening filter (unsharp mask effect)
        const sharpenedData = sharpenImage(imageData, width, height);
        
        // Put processed image data back
        ctx.putImageData(sharpenedData, 0, 0);
        
        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file); // Return original if processing fails
              return;
            }
            
            // Create new File from processed image
            const enhancedFile = new File(
              [blob],
              file.name,
              {
                type: 'image/png', // PNG for better quality
                lastModified: Date.now()
              }
            );
            
            resolve(enhancedFile);
          },
          'image/png',
          1.0 // Maximum quality
        );
      };
      
      img.onerror = () => {
        resolve(file); // Return original if image load fails
      };
      
      if (e.target?.result) {
        img.src = e.target.result as string;
      } else {
        resolve(file);
      }
    };
    
    reader.onerror = () => {
      resolve(file); // Return original if read fails
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Apply sharpening filter to image data (gentle sharpening for OCR)
 */
function sharpenImage(imageData: ImageData, width: number, height: number): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const output = new Uint8ClampedArray(imageData.data);
  
  // Gentle sharpening kernel (less aggressive for better OCR)
  // This helps enhance text edges without over-sharpening
  const kernel = [
    0, -0.5, 0,
    -0.5, 3, -0.5,
    0, -0.5, 0
  ];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      for (let c = 0; c < 3; c++) { // RGB channels only (all same in grayscale)
        let sum = 0;
        let kernelIndex = 0;
        
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4 + c;
            sum += data[idx] * kernel[kernelIndex];
            kernelIndex++;
          }
        }
        
        const idx = (y * width + x) * 4 + c;
        // Clamp values to valid range
        output[idx] = Math.min(255, Math.max(0, Math.round(sum)));
      }
      // Keep alpha channel unchanged
      output[(y * width + x) * 4 + 3] = data[(y * width + x) * 4 + 3];
    }
  }
  
  return new ImageData(output, width, height);
}

/**
 * Extract information from CCCD image using OCR
 */
/**
 * Convert File to data URL
 */
async function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result && typeof e.target.result === 'string') {
        resolve(e.target.result);
      } else {
        reject(new Error('Failed to read file as data URL'));
      }
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
}

export async function extractCCCDInfo(imageFile: File): Promise<CCCDInfo> {
  let worker = null;
  let enhancedImage: File | null = null;
  
  try {
    // Try to enhance image quality first, but fallback to original if it fails
    try {
      enhancedImage = await enhanceImageForOCR(imageFile);
    } catch (enhanceError) {
      console.warn('Image enhancement failed, using original image:', enhanceError);
      enhancedImage = imageFile;
    }
    
    // Create worker - in tesseract.js v4, createWorker takes options or language string
    // Using empty options first, then load language
    worker = await createWorker();
    
    if (!worker) {
      throw new Error('Failed to create Tesseract worker');
    }
    
    // Load and initialize Vietnamese language
    await worker.loadLanguage('vie');
    await worker.initialize('vie');
    
    // Try with enhanced image first, fallback to original if it fails
    let dataURL: string;
    let recognitionResult;
    
    try {
      // Convert File to data URL - Tesseract.js v4 handles data URLs reliably
      dataURL = await fileToDataURL(enhancedImage);
      
      // Enhanced image is already processed for better OCR accuracy
      // The image has been: grayscaled, contrast-enhanced, sharpened, and resized optimally
      // Use data URL which Tesseract.js can reliably process
      recognitionResult = await worker.recognize(dataURL);
    } catch (recognizeError) {
      // If enhanced image fails, try with original image
      console.warn('Recognition with enhanced image failed, trying original:', recognizeError);
      if (enhancedImage !== imageFile) {
        dataURL = await fileToDataURL(imageFile);
        recognitionResult = await worker.recognize(dataURL);
      } else {
        throw recognizeError;
      }
    }
    
    const text = recognitionResult.data.text;
    
    // Parse the extracted text
    const info = parseCCCDText(text);
    
    return info;
  } catch (error) {
    console.error('OCR Error:', error);
    throw error;
  } finally {
    // Always terminate worker if it was created
    if (worker) {
      try {
        await worker.terminate();
      } catch (terminateError) {
        console.error('Error terminating worker:', terminateError);
      }
    }
  }
}

/**
 * Parse OCR text to extract CCCD information
 * Focus on 3 main fields:
 * - Full name (Họ và tên)
 * - National ID (Số căn cước công dân - 13 digits)
 * - Date of birth (Ngày sinh - DD/MM/YYYY)
 */
function parseCCCDText(text: string): CCCDInfo {
  const info: CCCDInfo = {};
  console.log('text', text);
  
  // Clean up text - preserve line breaks for better parsing
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  const cleanedText = text.replace(/\s+/g, ' ').trim();
  
  // ===== Extract Số căn cước công dân (12 or 13 digits) =====
  // CCCD number can be 12 or 13 digits (old CMND is 9 digits, new CCCD is 12-13 digits)
  // Usually appears after keywords like "Số", "CCCD", "Căn cước"
  
  const keywordPatterns = [
    /(?:Số|Số\s+CCCD|CCCD|Căn\s+cước|sánh)[:\s]*(\d{12,13})/i, // OCR might misread "Số" as "sánh"
    /(?:Số|CCCD|Căn\s+cước)[:\s]*(\d{3}\s?\d{3}\s?\d{3}\s?\d{3,4})/i, // With spaces
  ];
  
  for (const pattern of keywordPatterns) {
    const match = cleanedText.match(pattern);
    if (match && match[1]) {
      let id = match[1].replace(/\s+/g, ''); // Remove spaces
      // Accept 12 or 13 digits
      if (/^\d{12,13}$/.test(id)) {
        info.nationalId = id;
        break;
      }
    }
  }
  
  // Also check in lines for better accuracy (line-by-line is more reliable)
  if (!info.nationalId) {
    for (const line of lines) {
      // Try with keywords first (most reliable)
      const keywordPatterns = [
        /(?:Số|CCCD|Căn\s+cước|sánh|số)[:\s]*(\d{12,13})/i,
        /(?:Số|CCCD|Căn\s+cước)[:\s]*(\d{3}\s?\d{3}\s?\d{3}\s?\d{3,4})/i,
      ];
      
      for (const pattern of keywordPatterns) {
        const lineMatch = line.match(pattern);
        if (lineMatch && lineMatch[1]) {
          let id = lineMatch[1].replace(/\s+/g, '');
          if (/^\d{12,13}$/.test(id)) {
            info.nationalId = id;
            break;
          }
        }
      }
      
      if (info.nationalId) break;
      
      // Try standalone 12-13 digits in line (but exclude dates and other numbers)
      const standalonePatterns = [
        /\b(\d{12,13})\b/, // 12 or 13 digits
        /\b(\d{3}\s?\d{3}\s?\d{3}\s?\d{3,4})\b/, // With spaces
      ];
      
      for (const pattern of standalonePatterns) {
        const standaloneMatch = line.match(pattern);
        if (standaloneMatch && standaloneMatch[1]) {
          let id = standaloneMatch[1].replace(/\s+/g, '');
          // Validate it's not a date or other number
          if (/^\d{12,13}$/.test(id)) {
            const lowerLine = line.toLowerCase();
            // Exclude if it's clearly a date or other context
            if (
              !lowerLine.includes('ngày') &&
              !lowerLine.includes('date') &&
              !lowerLine.includes('birth') &&
              !lowerLine.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/) // Not a date pattern
            ) {
              info.nationalId = id;
              break;
            }
          }
        }
      }
      
      if (info.nationalId) break;
    }
  }
  
  // Last resort: search entire text for 12-13 digit numbers
  if (!info.nationalId) {
    const allMatches = cleanedText.matchAll(/\b(\d{12,13})\b/g);
    for (const match of allMatches) {
      const id = match[1].replace(/\s+/g, '');
      if (/^\d{12,13}$/.test(id)) {
        // Make sure it's not part of a date
        const context = cleanedText.substring(Math.max(0, match.index! - 20), match.index! + match[0].length + 20);
        if (!context.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/)) {
          info.nationalId = id;
          break;
        }
      }
    }
  }
  
  // ===== Extract Ngày sinh (Date of birth) =====
  // Look for "Ngày sinh" keyword followed by date DD/MM/YYYY
  const dobKeywords = ['Ngày sinh', 'Sinh ngày', 'DOB', 'Date of birth', 'Ngày', 'Sinh'];
  let dobFound = false;
  
  // First, try to find date after keywords
  for (const keyword of dobKeywords) {
    const keywordRegex = new RegExp(keyword.replace(/\s+/g, '\\s+'), 'i');
    const keywordMatch = cleanedText.match(keywordRegex);
    
    if (keywordMatch && keywordMatch.index !== undefined) {
      const afterKeyword = cleanedText.substring(keywordMatch.index + keywordMatch[0].length);
      // Look for date pattern DD/MM/YYYY or DD-MM-YYYY
      const dobMatch = afterKeyword.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
      if (dobMatch) {
        const day = parseInt(dobMatch[1], 10);
        const month = parseInt(dobMatch[2], 10);
        const year = parseInt(dobMatch[3], 10);
        
        // Validate date (reasonable range for adults: 1950-2006)
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1950 && year <= 2006) {
          info.dob = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          dobFound = true;
          break;
        }
      }
    }
  }
  
  // Also check in lines for better accuracy
  if (!dobFound) {
    for (const line of lines) {
      for (const keyword of dobKeywords) {
        if (line.toLowerCase().includes(keyword.toLowerCase())) {
          const keywordIndex = line.toLowerCase().indexOf(keyword.toLowerCase());
          const afterKeyword = line.substring(keywordIndex + keyword.length);
          const dobMatch = afterKeyword.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
          if (dobMatch) {
            const day = parseInt(dobMatch[1], 10);
            const month = parseInt(dobMatch[2], 10);
            const year = parseInt(dobMatch[3], 10);
            
            if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1950 && year <= 2006) {
              info.dob = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              dobFound = true;
              break;
            }
          }
        }
      }
      if (dobFound) break;
    }
  }
  
  // If still not found, try to find any date pattern (but prioritize dates that look like DOB)
  if (!dobFound) {
    const dobPatterns = [
      /\b(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{4})\b/g, // DD/MM/YYYY
      /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/g, // D/M/YYYY
    ];
    
    for (const pattern of dobPatterns) {
      const matches = [...cleanedText.matchAll(pattern)];
      for (const match of matches) {
        const day = parseInt(match[1], 10);
        const month = parseInt(match[2], 10);
        const year = parseInt(match[3], 10);
        
        // Validate reasonable date for adults (18+ years old)
        if (day >= 1 && day <= 31 && month >= 1 && month <= 12 && year >= 1950 && year <= 2006) {
          info.dob = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          dobFound = true;
          break;
        }
      }
      if (dobFound) break;
    }
  }
  
  // ===== Extract Họ và tên (Full name) =====
  // Look for "Họ và tên" or "Họ tên" keyword followed by the name
  const nameKeywords = ['Họ và tên', 'Họ tên', 'Tên', 'Full name', 'Name'];
  let nameFound = false;
  
  // Vietnamese name pattern: starts with capital letter, contains Vietnamese characters
  const vietnameseNamePattern = /[A-ZÀÁẢÃẠẦẤẨẪẬÈÉẺẼẸỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌỒỐỔỖỘỜỚỞỠỢÙÚỦŨỤỪỨỬỮỰỲÝỶỸỴĐ][A-ZÀÁẢÃẠẦẤẨẪẬÈÉẺẼẸỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌỒỐỔỖỘỜỚỞỠỢÙÚỦŨỤỪỨỬỮỰỲÝỶỸỴĐàáảãạầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵđ\s]{4,}/;
  
  // First, try to find name after keywords in cleaned text
  for (const keyword of nameKeywords) {
    const keywordRegex = new RegExp(keyword.replace(/\s+/g, '\\s+'), 'i');
    const keywordMatch = cleanedText.match(keywordRegex);
    
    if (keywordMatch && keywordMatch.index !== undefined) {
      const afterKeyword = cleanedText.substring(keywordMatch.index + keywordMatch[0].length);
      // Look for name pattern after colon, space, or directly after keyword
      const nameMatch = afterKeyword.match(/[:\s]*([A-ZÀÁẢÃẠẦẤẨẪẬÈÉẺẼẸỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌỒỐỔỖỘỜỚỞỠỢÙÚỦŨỤỪỨỬỮỰỲÝỶỸỴĐ][A-ZÀÁẢÃẠẦẤẨẪẬÈÉẺẼẸỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌỒỐỔỖỘỜỚỞỠỢÙÚỦŨỤỪỨỬỮỰỲÝỶỸỴĐàáảãạầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵđ\s]{5,})/);
      if (nameMatch) {
        let name = nameMatch[1].trim();
        // Clean up name - remove extra spaces and invalid characters
        name = name.replace(/\s+/g, ' ').replace(/[^\w\sÀ-ỹĐđ]/g, '').trim();
        const words = name.split(/\s+/).filter(w => w.length > 0);
        
        // Vietnamese names typically have 3-4 words, at least 2 words
        if (words.length >= 2 && words.length <= 5 && name.length >= 5 && name.length <= 50) {
          // Make sure it doesn't contain numbers or special patterns
          if (!name.match(/\d{13}|\d{2}[\/\-]\d{2}[\/\-]\d{4}/)) {
            info.fullName = name;
            nameFound = true;
            break;
          }
        }
      }
    }
  }
  
  // Try in lines (often name appears on its own line after keyword)
  if (!nameFound) {
    for (const line of lines) {
      for (const keyword of nameKeywords) {
        if (line.toLowerCase().includes(keyword.toLowerCase())) {
          const keywordIndex = line.toLowerCase().indexOf(keyword.toLowerCase());
          const afterKeyword = line.substring(keywordIndex + keyword.length);
          const nameMatch = afterKeyword.match(/[:\s]*([A-ZÀÁẢÃẠẦẤẨẪẬÈÉẺẼẸỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌỒỐỔỖỘỜỚỞỠỢÙÚỦŨỤỪỨỬỮỰỲÝỶỸỴĐ][A-ZÀÁẢÃẠẦẤẨẪẬÈÉẺẼẸỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌỒỐỔỖỘỜỚỞỠỢÙÚỦŨỤỪỨỬỮỰỲÝỶỸỴĐàáảãạầấẩẫậèéẻẽẹềếểễệìíỉĩịòóỏõọồốổỗộờớởỡợùúủũụừứửữựỳýỷỹỵđ\s]{5,})/);
          if (nameMatch) {
            let name = nameMatch[1].trim();
            name = name.replace(/\s+/g, ' ').replace(/[^\w\sÀ-ỹĐđ]/g, '').trim();
            const words = name.split(/\s+/).filter(w => w.length > 0);
            
            if (words.length >= 2 && words.length <= 5 && name.length >= 5 && name.length <= 50) {
              if (!name.match(/\d{13}|\d{2}[\/\-]\d{2}[\/\-]\d{4}/)) {
                info.fullName = name;
                nameFound = true;
                break;
              }
            }
          }
        }
      }
      if (nameFound) break;
    }
  }
  
  // If name not found with keywords, try to find capitalized Vietnamese name pattern in lines
  if (!nameFound) {
    for (const line of lines) {
      // Look for lines that look like names (starts with capital, contains Vietnamese chars, 2-5 words)
      if (vietnameseNamePattern.test(line)) {
        let name = line.trim();
        name = name.replace(/\s+/g, ' ').replace(/[^\w\sÀ-ỹĐđ]/g, '').trim();
        const words = name.split(/\s+/).filter(w => w.length > 0);
        
        if (words.length >= 2 && words.length <= 5 && name.length >= 5 && name.length <= 50) {
          // Check if it doesn't look like an address, date, or ID number
          if (!name.match(/\d{13}|\d{2}[\/\-]\d{2}[\/\-]\d{4}|CCCD|CMND|Số|Ngày|Địa|Address/i)) {
            info.fullName = name;
            break;
          }
        }
      }
    }
  }
  
  return info;
}

