import { useRef, useState, useCallback, useEffect } from "react";

// Use pdfjs from CDN (loaded in index.html)
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

interface PDFUploadProps {
  onTextExtracted: (text: string) => void;
  onError: (error: string | null) => void;
  label?: string;
}

export function PDFUpload({ onTextExtracted, onError, label }: PDFUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Configure pdfjs worker when component mounts
  useEffect(() => {
    if (typeof window !== "undefined" && window.pdfjsLib) {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.js`;
    }
  }, []);

  const extractTextFromPDF = useCallback(async (file: File) => {
    setIsExtracting(true);
    onError(null);

    try {
      // Wait for pdfjs to be available
      if (!window.pdfjsLib) {
        throw new Error("PDF.js library is not loaded. Please refresh the page.");
      }

      const pdfjsLib = window.pdfjsLib;
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = "";
      const numPages = pdf.numPages;

      // Extract text from all pages
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        
        // Combine all text items
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        
        fullText += pageText + "\n\n";
      }

      // Check if we got meaningful text (not just empty or very short)
      const trimmedText = fullText.trim();
      if (trimmedText.length < 50) {
        throw new Error(
          "Couldn't extract text from this PDF. Try copy-pasting the contract text instead."
        );
      }

      onTextExtracted(trimmedText);
    } catch (error: any) {
      console.error("PDF extraction error:", error);
      
      // Check if it's a known error type
      if (error.message && error.message.includes("Couldn't extract")) {
        onError(error.message);
      } else {
        onError(
          "Couldn't extract text from this PDF. Try copy-pasting the contract text instead."
        );
      }
    } finally {
      setIsExtracting(false);
    }
  }, [onTextExtracted, onError]);

  const handleFile = useCallback((file: File) => {
    if (file.type !== "application/pdf") {
      onError("Please upload a PDF file.");
      return;
    }
    extractTextFromPDF(file);
  }, [extractTextFromPDF, onError]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [handleFile]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div
      className={`pdf-upload-zone ${isDragging ? "is-dragging" : ""} ${isExtracting ? "is-extracting" : ""}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileInput}
        style={{ display: "none" }}
      />
      <div className="pdf-upload-content">
        {isExtracting ? (
          <>
            <div className="pdf-upload-icon">📄</div>
            <p className="pdf-upload-text">Extracting text from PDF...</p>
          </>
        ) : (
          <>
            <div className="pdf-upload-icon">📎</div>
            <p className="pdf-upload-text">
              {label || "Drag a PDF here or click to upload"}
            </p>
            <p className="pdf-upload-hint">PDF text will be extracted automatically</p>
          </>
        )}
      </div>
    </div>
  );
}
