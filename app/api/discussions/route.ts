import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database';

export async function GET() {
  try {
    const categories = await Database.query(`
      SELECT id, name, description, color, isActive
      FROM discussion_categories 
      WHERE isActive = true
      ORDER BY name
    `);
    
    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching discussion categories:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch discussion categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, color } = body;
    
    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Category name is required' },
        { status: 400 }
      );
    }
    
    const result = await Database.query(
      `INSERT INTO discussion_categories (name, description, color) VALUES (?, ?, ?)`,
      [name, description, color || '#3B82F6']
    );
    
    return NextResponse.json({
      success: true,
      data: { id: result.insertId, name, description, color }
    });
  } catch (error) {
    console.error('Error creating discussion category:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create discussion category' },
      { status: 500 }
    );
  }
}
