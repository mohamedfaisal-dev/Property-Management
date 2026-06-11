import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '../../../../lib/auth';
import { supabaseAdmin } from '../../../../lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const currentAdmin = await verifyAuth(req);

    // Fetch total count
    const { count: totalProperties, error: countError } = await supabaseAdmin
      .from('properties')
      .select('*', { count: 'exact', head: true })
      .eq('admin_id', currentAdmin.id);

    if (countError) {
      return NextResponse.json({ success: false, error: countError.message }, { status: 500 });
    }

    // Retrieve all properties to compute groupings (Supabase/Postgres doesn't support grouping in JS easily without custom SQL/RPC, so fetching/grouping in JS is simple & reliable for standard datasets)
    const { data: properties, error: selectError } = await supabaseAdmin
      .from('properties')
      .select('property_type, city')
      .eq('admin_id', currentAdmin.id);

    if (selectError) {
      return NextResponse.json({ success: false, error: selectError.message }, { status: 500 });
    }

    const typeCounts: Record<string, number> = {};
    const cityCounts: Record<string, number> = {};

    for (const p of properties || []) {
      if (p.property_type) {
        typeCounts[p.property_type] = (typeCounts[p.property_type] || 0) + 1;
      }
      if (p.city) {
        cityCounts[p.city] = (cityCounts[p.city] || 0) + 1;
      }
    }

    const propertiesByType = Object.keys(typeCounts).map(k => ({
      property_type: k,
      count: typeCounts[k]
    }));

    const topCities = Object.keys(cityCounts)
      .map(k => ({ city: k, count: cityCounts[k] }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      success: true,
      data: {
        totalProperties: totalProperties || 0,
        propertiesByType,
        topCities
      }
    });

  } catch (error: any) {
    console.error('Get property stats error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 401 });
  }
}
