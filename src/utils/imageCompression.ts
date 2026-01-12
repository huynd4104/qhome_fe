/**
 * Image compression utility
 * Compresses images before upload to reduce file size and improve upload speed
 */

interface CompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    maxSizeMB?: number;
}

/**
 * Compress an image file
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Compressed File or original file if compression fails
 */
export async function compressImage(
    file: File,
    options: CompressionOptions = {}
): Promise<File> {
    const {
        maxWidth = 1920,
        maxHeight = 1920,
        quality = 0.8,
        maxSizeMB = 2
    } = options;

    // Only compress image files
    if (!file.type.startsWith('image/')) {
        return file;
    }

    // Skip if file is already small enough (< 500KB)
    // Also check if it's a small image that doesn't need compression
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size <= maxSizeBytes || file.size < 500 * 1024) {
        return file;
    }

    try {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    // Calculate new dimensions
                    let width = img.width;
                    let height = img.height;
                    let needsResize = false;

                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                        needsResize = true;
                    }

                    // If image is already small and doesn't need resize, just compress quality
                    if (!needsResize && file.size < 2 * 1024 * 1024) {
                        // For small images, just reduce quality without resizing
                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) {
                            resolve(file);
                            return;
                        }
                        ctx.drawImage(img, 0, 0, width, height);
                        canvas.toBlob(
                            (blob) => {
                                if (blob && blob.size < file.size) {
                                    resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
                                } else {
                                    resolve(file);
                                }
                            },
                            'image/jpeg',
                            quality
                        );
                        return;
                    }

                    // Create canvas and draw resized image
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');

                    if (!ctx) {
                        reject(new Error('Could not get canvas context'));
                        return;
                    }

                    // Use optimized image rendering (medium quality for speed)
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'medium'; // Changed from 'high' for faster processing
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to blob with compression
                    canvas.toBlob(
                        (blob) => {
                            if (!blob) {
                                // If compression fails, return original file
                                resolve(file);
                                return;
                            }

                            // Check if compressed size is actually smaller
                            if (blob.size >= file.size) {
                                // If compressed is larger, return original
                                resolve(file);
                                return;
                            }

                            // Create new File from blob
                            const compressedFile = new File(
                                [blob],
                                file.name,
                                {
                                    type: 'image/jpeg', // Always use JPEG for better compression
                                    lastModified: Date.now()
                                }
                            );

                            resolve(compressedFile);
                        },
                        'image/jpeg', // Use JPEG for better compression
                        quality
                    );
                };

                img.onerror = () => {
                    // If image load fails, return original file
                    resolve(file);
                };

                if (e.target?.result) {
                    img.src = e.target.result as string;
                } else {
                    resolve(file);
                }
            };

            reader.onerror = () => {
                // If read fails, return original file
                resolve(file);
            };

            reader.readAsDataURL(file);
        });
    } catch (error) {
        console.error('Error compressing image:', error);
        // Return original file if compression fails
        return file;
    }
}

/**
 * Compress multiple image files
 * @param files - Array of image files to compress
 * @param options - Compression options
 * @returns Array of compressed files
 */
export async function compressImages(
    files: File[],
    options: CompressionOptions = {}
): Promise<File[]> {
    const compressPromises = files.map(file => compressImage(file, options));
    return Promise.all(compressPromises);
}

