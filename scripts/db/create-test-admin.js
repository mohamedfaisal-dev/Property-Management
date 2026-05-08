// Create Test Super Admin Script
const bcrypt = require('bcryptjs');
const { Sequelize } = require('sequelize');
require('dotenv').config();

// Database configuration
const sequelize = new Sequelize(
  process.env.DB_NAME || 'property_rental',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'toor',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mariadb',
    logging: false
  }
);

async function createTestAdmin() {
  try {
    console.log('🔐 Creating test super admin...\n');

    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful');

    // Admin credentials
    const adminData = {
      name: 'Test Admin',
      email: 'admin@test.com',
      password: 'admin123',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE'
    };

    console.log('\n📋 Admin Details:');
    console.log('   Name:', adminData.name);
    console.log('   Email:', adminData.email);
    console.log('   Password:', adminData.password);
    console.log('   Role:', adminData.role);

    // Hash password
    const hashedPassword = await bcrypt.hash(adminData.password, 12);

    // Check if admin already exists
    const [existingAdmin] = await sequelize.query(
      'SELECT id, email FROM admins WHERE email = ?',
      {
        replacements: [adminData.email],
        type: Sequelize.QueryTypes.SELECT
      }
    );

    if (existingAdmin) {
      console.log('\n⚠️  Admin already exists!');
      console.log('   ID:', existingAdmin.id);
      console.log('   Email:', existingAdmin.email);
      
      // Update password
      await sequelize.query(
        'UPDATE admins SET password = ?, name = ?, role = ?, status = ?, updated_at = NOW() WHERE email = ?',
        {
          replacements: [hashedPassword, adminData.name, adminData.role, adminData.status, adminData.email]
        }
      );
      console.log('\n✅ Admin password updated successfully!');
    } else {
      // Insert new admin
      const [result] = await sequelize.query(
        `INSERT INTO admins (name, email, password, role, status, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
        {
          replacements: [adminData.name, adminData.email, hashedPassword, adminData.role, adminData.status]
        }
      );
      console.log('\n✅ Admin created successfully!');
      console.log('   Admin ID:', result);
    }

    // Verify admin was created/updated
    const [admin] = await sequelize.query(
      'SELECT id, name, email, role, status, created_at FROM admins WHERE email = ?',
      {
        replacements: [adminData.email],
        type: Sequelize.QueryTypes.SELECT
      }
    );

    console.log('\n📊 Verification:');
    console.log('   ID:', admin.id);
    console.log('   Name:', admin.name);
    console.log('   Email:', admin.email);
    console.log('   Role:', admin.role);
    console.log('   Status:', admin.status);

    console.log('\n' + '='.repeat(50));
    console.log('🎉 SUCCESS! Test admin is ready!');
    console.log('='.repeat(50));
    console.log('\n🔑 Login Credentials:');
    console.log('   Email: admin@test.com');
    console.log('   Password: admin123');
    console.log('\n🌐 Login URL: http://localhost:3000');
    console.log('='.repeat(50) + '\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the script
createTestAdmin();
