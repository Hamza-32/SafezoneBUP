import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database';

export async function GET() {
  try {
    const contacts = await Database.query(`
      SELECT * FROM emergency_contacts 
      WHERE isActive = true 
      ORDER BY displayOrder, name
    `);
    
    return NextResponse.json({ success: true, data: contacts });
  } catch (error) {
    console.error('Error fetching emergency contacts:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch emergency contacts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phoneNumber, email, department } = body;
    
    if (!name || !phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Name and phone number are required' },
        { status: 400 }
      );
    }
    
    const result = await Database.query(
      `INSERT INTO emergency_contacts (name, phoneNumber, email, department) 
       VALUES (?, ?, ?, ?)`,
      [name, phoneNumber, email, department]
    );
    
    return NextResponse.json({
      success: true,
      data: { id: result.insertId, name, phoneNumber, email, department }
    });
  } catch (error) {
    console.error('Error creating emergency contact:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create emergency contact' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, phoneNumber, email, department, isActive } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Contact ID is required' },
        { status: 400 }
      );
    }
    
    await Database.query(
      `UPDATE emergency_contacts 
       SET name = ?, phoneNumber = ?, email = ?, department = ?, isActive = ?, updatedAt = NOW()
       WHERE id = ?`,
      [name, phoneNumber, email, department, isActive, id]
    );
    
    return NextResponse.json({
      success: true,
      message: 'Emergency contact updated successfully'
    });
  } catch (error) {
    console.error('Error updating emergency contact:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update emergency contact' },
      { status: 500 }
    );
  }
}
