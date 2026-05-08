class CronService {
  static initialize() {
    console.log('CronService initialized');
  }

  static getJobStatuses() {
    return { status: 'running' };
  }

  static async triggerMonthlyBillGeneration(month: string) {
    return { success: true, message: `Triggered for ${month}` };
  }
}

export default CronService;
