const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Supabase environment variables are missing in .env');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function hashPassword(password) {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

async function createFaisalAdmin() {
  try {
    console.log('⚡ Connecting to Supabase...');
    
    const email = 'faisal@property.com';
    const plainPassword = 'faisal123';
    const hashedPassword = await hashPassword(plainPassword);

    // Check if user already exists
    const { data: existing, error: findError } = await supabaseAdmin
      .from('admins')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (findError) {
      throw findError;
    }

    if (existing) {
      console.log(`User ${email} already exists. Updating password...`);
      const { error: updateError } = await supabaseAdmin
        .from('admins')
        .update({
          password: hashedPassword,
          name: 'Faisal Admin',
          role: 'SUPER_ADMIN',
          status: 'ACTIVE',
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updateError) throw updateError;
      console.log(`✅ User password updated to "${plainPassword}" successfully.`);
    } else {
      console.log(`Creating new user ${email}...`);
      const { error: insertError } = await supabaseAdmin
        .from('admins')
        .insert({
          name: 'Faisal Admin',
          email: email,
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          status: 'ACTIVE'
        });

      if (insertError) throw insertError;
      console.log(`✅ Super Admin "${email}" created successfully with password "${plainPassword}".`);
    }
  } catch (err) {
    console.error('❌ Error creating Faisal admin:', err.message || err);
  } finally {
    process.exit();
  }
}

createFaisalAdmin();
