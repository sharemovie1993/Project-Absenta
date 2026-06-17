class NotificationService {
  async sendInApp(userId: string, subject: string, message: string) {
    console.log(`IN-APP NOTIFICATION to ${userId}: ${subject} - ${message}`);
    // Mock implementation
    return Promise.resolve();
  }

  async sendEmail(email: string, subject: string, message: string) {
    console.log(`EMAIL to ${email}: ${subject} - ${message}`);
    // Mock implementation
    return Promise.resolve();
  }

  async sendWhatsApp(phoneNumber: string, message: string) {
    console.log(`WHATSAPP to ${phoneNumber}: ${message}`);
    // Mock implementation
    return Promise.resolve();
  }
}

export const notificationService = new NotificationService();
