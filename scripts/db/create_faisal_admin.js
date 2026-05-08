const { Admin, sequelize } = require('./src/server/models');
require('dotenv').config();

async function createFaisalAdmin() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Simple check if user already exists
        const existing = await Admin.findOne({ where: { email: 'faisal@property.com' } });
        if (existing) {
            console.log('User already exists, updating password to "faisal123"');
            existing.password = 'faisal123';
            await existing.save();
        } else {
            await Admin.create({
                name: 'Faisal Admin',
                email: 'faisal@property.com',
                password: 'faisal123',
                role: 'SUPER_ADMIN',
                status: 'ACTIVE'
            });
            console.log('Super Admin "faisal@property.com" created successfully with password "faisal123"');
        }
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await sequelize.close();
        process.exit();
    }
}

createFaisalAdmin();
