"""PDF text extraction endpoint."""

from fastapi import APIRouter, UploadFile, File, HTTPException
import io

pdf_router = APIRouter()

@pdf_router.post("/api/extract-pdf")
async def extract_pdf_text(file: UploadFile = File(...)):
    """Extract text from uploaded PDF file."""
    
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        # Read file contents
        contents = await file.read()
        
        # Try using PyPDF2 if available
        try:
            import PyPDF2
            
            pdf_reader = PyPDF2.PdfReader(io.BytesIO(contents))
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            
            return {"text": text.strip(), "filename": file.filename, "pages": len(pdf_reader.pages)}
            
        except ImportError:
            # Try pdfplumber if available
            try:
                import pdfplumber
                
                with pdfplumber.open(io.BytesIO(contents)) as pdf:
                    text = ""
                    for page in pdf.pages:
                        text += page.extract_text() or ""
                        text += "\n"
                
                return {"text": text.strip(), "filename": file.filename, "pages": len(pdf.pages)}
                
            except ImportError:
                raise HTTPException(
                    status_code=500, 
                    detail="PDF extraction requires PyPDF2 or pdfplumber. Install with: pip install PyPDF2"
                )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error extracting PDF: {str(e)}")
