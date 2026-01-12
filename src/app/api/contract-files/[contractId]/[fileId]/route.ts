import { NextRequest, NextResponse } from 'next/server';

const DATA_DOCS_URL = process.env.NEXT_PUBLIC_DATA_DOCS_URL || 'http://localhost:8082';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ contractId: string; fileId: string }> }
) {
  try {
    const { contractId, fileId } = await params;
    
    if (!contractId || !fileId) {
      return NextResponse.json(
        { error: 'Contract ID and File ID are required' },
        { status: 400 }
      );
    }

    // Get cookies from the request to forward authentication
    const cookies = request.headers.get('cookie') || '';
    
    // Forward the request to data-docs-service
    const fileUrl = `${DATA_DOCS_URL}/api/contracts/${contractId}/files/${fileId}/view`;
    
    const response = await fetch(fileUrl, {
      method: 'GET',
      headers: {
        'Cookie': cookies,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch file' },
        { status: response.status }
      );
    }

    // Get the file content and content type
    const blob = await response.blob();
    const contentType = response.headers.get('content-type') || 'application/octet-stream';

    // Return the file with proper headers
    return new NextResponse(blob, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': response.headers.get('content-disposition') || 'inline',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: any) {
    console.error('Error proxying contract file:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
























