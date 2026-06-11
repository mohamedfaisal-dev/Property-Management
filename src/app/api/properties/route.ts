import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../lib/auth';
import { supabaseAdmin } from '../../../lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const currentAdmin = await verifyAuth(req);

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const search = searchParams.get('search') || '';
    const propertyType = searchParams.get('property_type') || '';
    const city = searchParams.get('city') || '';
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('properties')
      .select('*, admin:admins(id, name, email), tenants:tenants(id, name, email, status)', { count: 'exact' })
      .eq('admin_id', currentAdmin.id);

    if (search) {
      query = query.or(`title.ilike.%${search}%,address.ilike.%${search}%,city.ilike.%${search}%,country.ilike.%${search}%`);
    }

    if (propertyType) {
      query = query.eq('property_type', propertyType);
    }

    if (city) {
      query = query.ilike('city', `%${city}%`);
    }

    const { data: properties, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const totalItems = count || 0;
    const totalPages = Math.ceil(totalItems / limit);

    return NextResponse.json({
      success: true,
      data: {
        properties: properties || [],
        pagination: {
          currentPage: page,
          totalPages,
          totalItems,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      },
    });

  } catch (error: any) {
    console.error('Get properties error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentAdmin = await verifyAuth(req);
    const formData = await req.formData();

    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const address = formData.get('address') as string;
    const city = formData.get('city') as string;
    const state = formData.get('state') as string;
    const postalCode = formData.get('postal_code') as string;
    const country = formData.get('country') as string;
    const propertyType = formData.get('property_type') as string;
    const monthlyRent = formData.get('monthly_rent') ? parseFloat(formData.get('monthly_rent') as string) : null;

    // Optional counts
    const numberOfHalls = formData.get('number_of_halls') ? parseInt(formData.get('number_of_halls') as string, 10) : 0;
    const numberOfKitchens = formData.get('number_of_kitchens') ? parseInt(formData.get('number_of_kitchens') as string, 10) : 0;
    const numberOfBathrooms = formData.get('number_of_bathrooms') ? parseInt(formData.get('number_of_bathrooms') as string, 10) : 0;
    const numberOfParkingSpaces = formData.get('number_of_parking_spaces') ? parseInt(formData.get('number_of_parking_spaces') as string, 10) : 0;
    const numberOfRooms = formData.get('number_of_rooms') ? parseInt(formData.get('number_of_rooms') as string, 10) : 0;
    const numberOfGardens = formData.get('number_of_gardens') ? parseInt(formData.get('number_of_gardens') as string, 10) : 0;

    let photoUrl: string | null = null;
    const file = formData.get('photo') as File | null;

    if (file && file.size > 0) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const uniqueName = `properties/${Date.now()}-${Math.round(Math.random() * 1e9)}-${safeName}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('uploads')
        .upload(uniqueName, buffer, {
          contentType: file.type,
          duplex: 'half',
        });

      if (uploadError) {
        console.error('File upload error to Supabase Storage:', uploadError);
        return NextResponse.json({ success: false, error: 'Failed to upload image' }, { status: 500 });
      }

      const { data: urlData } = supabaseAdmin.storage
        .from('uploads')
        .getPublicUrl(uniqueName);

      photoUrl = urlData.publicUrl;
    }

    const { data: property, error: insertError } = await supabaseAdmin
      .from('properties')
      .insert({
        admin_id: currentAdmin.id,
        title,
        description,
        address,
        city,
        state,
        postal_code: postalCode,
        country,
        property_type: propertyType,
        monthly_rent: monthlyRent,
        photo: photoUrl,
        number_of_halls: numberOfHalls,
        number_of_kitchens: numberOfKitchens,
        number_of_bathrooms: numberOfBathrooms,
        number_of_parking_spaces: numberOfParkingSpaces,
        number_of_rooms: numberOfRooms,
        number_of_gardens: numberOfGardens,
      })
      .select('*, admin:admins(id, name, email)')
      .single();

    if (insertError || !property) {
      return NextResponse.json({ success: false, error: insertError?.message || 'Failed to create property' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Property created successfully',
      data: { property },
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create property error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
