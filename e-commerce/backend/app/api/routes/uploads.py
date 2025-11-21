"""File upload API routes."""

from __future__ import annotations

import base64
from io import BytesIO

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.core.security import get_request_actor
from app.core.tenant import TenantContext, get_tenant_context
from uuid import UUID

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

router = APIRouter(prefix="/api/v1/uploads", tags=["Uploads"])

# Allowed image MIME types
ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
}

# Maximum file size: 5MB
MAX_FILE_SIZE = 5 * 1024 * 1024


@router.post("/images")
async def upload_image(
    file: UploadFile = File(...),
    tenant: TenantContext = Depends(get_tenant_context),
    actor_id: UUID = Depends(get_request_actor),
) -> dict[str, str]:
    """
    Upload an image file and return it as a base64 data URL.
    
    For now, this endpoint converts uploaded images to base64 data URLs.
    In production, you would typically:
    1. Save the file to cloud storage (S3, Cloudinary, etc.)
    2. Return the public URL
    """
    # Validate file type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed types: {', '.join(ALLOWED_IMAGE_TYPES)}",
        )

    # Read file content
    contents = await file.read()
    
    # Validate file size
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File size exceeds {MAX_FILE_SIZE / 1024 / 1024}MB limit",
        )

    try:
        # If PIL is available, validate and optionally optimize the image
        if HAS_PIL:
            # Validate it's actually an image by trying to open it
            image = Image.open(BytesIO(contents))
            image.verify()  # Verify it's a valid image
            
            # Reopen after verify (verify closes the image)
            image = Image.open(BytesIO(contents))
            
            # Convert to base64 data URL
            # Determine the format for the data URL
            format_map = {
                "JPEG": "image/jpeg",
                "PNG": "image/png",
                "WEBP": "image/webp",
                "GIF": "image/gif",
            }
            
            image_format = image.format or "JPEG"
            mime_type = format_map.get(image_format, "image/jpeg")
            
            # Convert image to bytes
            output = BytesIO()
            # Convert RGBA to RGB if necessary (for PNG with transparency)
            if image_format == "PNG" and image.mode == "RGBA":
                # Create a white background
                rgb_image = Image.new("RGB", image.size, (255, 255, 255))
                rgb_image.paste(image, mask=image.split()[3])  # Use alpha channel as mask
                rgb_image.save(output, format="JPEG", quality=85)
                mime_type = "image/jpeg"
            else:
                image.save(output, format=image_format, quality=85)
            
            image_bytes = output.getvalue()
        else:
            # If PIL is not available, use the original file content
            image_bytes = contents
            mime_type = file.content_type or "image/jpeg"
        
        # Convert to base64 data URL
        base64_encoded = base64.b64encode(image_bytes).decode("utf-8")
        data_url = f"data:{mime_type};base64,{base64_encoded}"
        
        return {
            "url": data_url,
            "filename": file.filename or "uploaded_image",
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid image file: {str(e)}",
        )

