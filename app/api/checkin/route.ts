import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    const checkins = await Database.query(`
      SELECT sc.*, ec.name as emergencyContactName
      FROM safety_checkins sc
      LEFT JOIN emergency_contacts ec ON sc.emergencyContactId = ec.id
      WHERE sc.userId = ?
      ORDER BY sc.createdAt DESC
      LIMIT 10
    `, [userId]);
    
    return NextResponse.json({ success: true, data: checkins });
  } catch (error) {
    console.error('Error fetching safety checkins:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch safety checkins' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, expectedArrivalTime, location, emergencyContactId, notes } = body;
    
    if (!userId || !expectedArrivalTime || !location) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const result = await Database.query(
      `INSERT INTO safety_checkins (userId, expectedArrivalTime, location, emergencyContactId, notes) 
       VALUES (?, ?, ?, ?, ?)`,
      [userId, expectedArrivalTime, location, emergencyContactId, notes]
    );
    
    return NextResponse.json({
      success: true,
      data: { 
        id: result.insertId, 
        userId, 
        expectedArrivalTime, 
        location, 
        emergencyContactId, 
        notes,
        status: 'pending'
      }
    });
  } catch (error) {
    console.error('Error creating safety checkin:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create safety checkin' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, sosTriggered } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Checkin ID is required' },
        { status: 400 }
      );
    }
    
    await Database.query(
      `UPDATE safety_checkins SET status = ?, sosTriggered = ?, updatedAt = NOW() WHERE id = ?`,
      [status, sosTriggered || false, id]
    );
    
    return NextResponse.json({
      success: true,
      message: 'Safety checkin updated successfully'
    });
  } catch (error) {
    console.error('Error updating safety checkin:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update safety checkin' },
      { status: 500 }
    );
  }
}
