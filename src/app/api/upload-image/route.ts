import { NextRequest, NextResponse } from 'next/server';
import ImageKit from 'imagekit';

// Initialize ImageKit (server-side only)
const getImageKit = () => {
    if (!process.env.IMAGEKIT_PRIVATE_KEY || !process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || !process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT) {
        throw new Error('ImageKit environment variables are not configured');
    }
    
    return new ImageKit({
        publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY,
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
        urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT,
    });
};

/**
 * Upload image API route using ImageKit
 */
export async function POST(request: NextRequest) {
    try {
        // Get the form data from the request
        const formData = await request.formData();
        const file = formData.get('image') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No image file provided', success: false },
                { status: 400 }
            );
        }

        // Initialize ImageKit
        const imagekit = getImageKit();

        // Convert File to Buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Upload to ImageKit
        const uploadResponse = await imagekit.upload({
            file: buffer,
            fileName: file.name,
            useUniqueFileName: true,
            folder: '/news-images', // Optional: organize files in folders
        });

        // Return response
        return NextResponse.json({
            success: true,
            data: {
                id: uploadResponse.fileId,
                url: uploadResponse.url,
                filePath: uploadResponse.filePath,
                name: uploadResponse.name,
                size: uploadResponse.size,
                title: file.name,
            }
        });
    } catch (error: any) {
        console.error('Error in upload-image API route:', error);
        return NextResponse.json(
            { 
                error: error.message || 'Internal server error',
                success: false
            },
            { status: 500 }
        );
    }
}
