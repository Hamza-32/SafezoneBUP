import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    
    let query = `
      SELECT id, title, description, category, content, contactInfo, priority
      FROM safety_resources 
      WHERE isActive = true
    `;
    const params: any[] = [];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY priority DESC, createdAt DESC';
    
    const resources = await Database.query(query, params);
    
    return NextResponse.json({ 
      success: true, 
      data: resources.map((resource: any) => ({
        ...resource,
        contactInfo: typeof resource.contactInfo === 'string' 
          ? JSON.parse(resource.contactInfo) 
          : resource.contactInfo
      }))
    });
  } catch (error) {
    console.error('Error fetching safety resources:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch safety resources' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, category, content, contactInfo } = body;
    
    if (!title || !category || !content) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const result = await Database.query(
      `INSERT INTO safety_resources (title, description, category, content, contactInfo) 
       VALUES (?, ?, ?, ?, ?)`,
      [title, description, category, content, JSON.stringify(contactInfo || {})]
    );
    
    return NextResponse.json({
      success: true,
      data: { id: result.insertId, title, description, category, content, contactInfo }
    });
  } catch (error) {
    console.error('Error creating safety resource:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create safety resource' },
      { status: 500 }
    );
  }
}
