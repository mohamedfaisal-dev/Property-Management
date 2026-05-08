export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { testConnection, syncDatabase, Admin } = await import('./server/models/index');
    const billScheduler = await import('./server/services/billScheduler');
    const cronService = await import('./server/services/cronService');

    try {
      await testConnection();
      await syncDatabase();

      billScheduler.default.start();
      console.log('✅ Bill scheduler started inside Next.js process');

      try {
        const adminCount = await (Admin as any).count();
        if (adminCount === 0) {
          await (Admin as any).create({
            name: process.env.ADMIN_NAME || 'Default Admin',
            email: process.env.ADMIN_EMAIL || 'admin@example.com',
            password: process.env.ADMIN_PASSWORD || 'admin123',
            role: 'SUPER_ADMIN',
            status: 'ACTIVE',
          });
        }
      } catch (err) {
        console.error('Failed to bootstrap default admin:', err);
      }

      cronService.default.initialize();
      console.log('> Database & CRON integrations loaded properly via Next.js instrumentation');
    } catch (error) {
      console.error('❌ Failed to start database/services:', error);
    }
  }
}
