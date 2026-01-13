import { NextRequest, NextResponse } from 'next/server';
import { Database } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'lost' or 'found'
    const category = searchParams.get('category');
    const status = searchParams.get('status') || 'active';
    const search = searchParams.get('search');
    
    let query = `
      SELECT lf.*, u.firstName, u.lastName, u.email as userEmail
      FROM lost_and_found lf
      LEFT JOIN users u ON lf.userId = u.id
      WHERE lf.status = ?
    `;
    const params: any[] = [status];
    
    if (type) {
      query += ' AND lf.type = ?';
      params.push(type);
    }
    
    if (category) {
      query += ' AND lf.category = ?';
      params.push(category);
    }
    
    if (search) {
      query += ' AND (lf.title LIKE ? OR lf.description LIKE ? OR lf.location LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }
    
    query += ' ORDER BY lf.createdAt DESC';
    
    const items = await Database.query(query, params);
    
    // Parse contactInfo JSON and handle privacy
    const processedItems = items.map((item: any) => ({
      ...item,
      contactInfo: typeof item.contactInfo === 'string' 
        ? JSON.parse(item.contactInfo) 
        : item.contactInfo,
      // Hide sensitive user info if anonymous
      firstName: item.isAnonymous ? null : item.firstName,
      lastName: item.isAnonymous ? null : item.lastName,
      userEmail: item.isAnonymous ? null : item.userEmail
    }));
    
    return NextResponse.json({ 
      success: true, 
      data: processedItems 
    });
  } catch (error) {
    console.error('Error fetching lost and found items:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lost and found items' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      userId, 
      type, 
      title, 
      description, 
      category, 
      location, 
      dateLostFound, 
      imageUrl, 
      contactInfo, 
      isAnonymous 
    } = body;
    
    if (!userId || !type || !title || !description || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    if (!['lost', 'found'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Type must be either "lost" or "found"' },
        { status: 400 }
      );
    }
    
    // Set expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    const result = await Database.query(
      `INSERT INTO lost_and_found 
       (userId, type, title, description, category, location, dateReported, dateLostFound, imageUrl, contactInfo, isAnonymous, expiresAt) 
       VALUES (?, ?, ?, ?, ?, ?, CURDATE(), ?, ?, ?, ?, ?)`,
      [
        userId,
        type,
        title,
        description,
        category,
        location,
        dateLostFound || null,
        imageUrl || null,
        JSON.stringify(contactInfo || {}),
        isAnonymous || false,
        expiresAt.toISOString().slice(0, 19).replace('T', ' ')
      ]
    );
    
    return NextResponse.json({
      success: true,
      data: { 
        id: result.insertId, 
        userId,
        type,
        title,
        description,
        category,
        location,
        dateLostFound,
        imageUrl,
        contactInfo,
        isAnonymous,
        status: 'active'
      }
    });
  } catch (error) {
    console.error('Error creating lost and found item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create lost and found item' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status, resolvedBy } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Item ID is required' },
        { status: 400 }
      );
    }
    
    let updateQuery = 'UPDATE lost_and_found SET status = ?, updatedAt = NOW()';
    let params = [status];
    
    if (status === 'resolved' && resolvedBy) {
      updateQuery += ', resolvedBy = ?, resolvedAt = NOW()';
      params.push(resolvedBy);
    }
    
    updateQuery += ' WHERE id = ?';
    params.push(id);
    
    await Database.query(updateQuery, params);
    
    return NextResponse.json({
      success: true,
      message: 'Lost and found item updated successfully'
    });
  } catch (error) {
    console.error('Error updating lost and found item:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update lost and found item' },
      { status: 500 }
    );
  }
}
