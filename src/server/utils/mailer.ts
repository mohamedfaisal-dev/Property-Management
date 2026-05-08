import nodemailer, { Transporter, SendMailOptions } from 'nodemailer';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  attachments?: any[];
}

class Mailer {
  private transporter: Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter(): void {
    try {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      this.transporter.verify((error: Error | null) => {
        if (error) {
          console.error('❌ Email service initialization failed:', error);
        } else {
          console.log('✅ Email service ready');
        }
      });
    } catch (error) {
      console.error('Error initializing email service:', error);
    }
  }

  public async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      throw new Error('Email service not initialized');
    }

    try {
      const mailOptions: SendMailOptions = {
        from: `"Property Management System" <${process.env.EMAIL_USER}>`,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        attachments: options.attachments || [],
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`✅ Email sent successfully:`, result.messageId);
    } catch (error) {
      console.error('❌ Error sending email:', error);
      throw error;
    }
  }

  public async sendReceiptEmail(
    to: string | string[],
    subject: string,
    html: string,
    attachments?: any[]
  ): Promise<void> {
    await this.sendEmail({ to, subject, html, attachments });
  }
}

const mailer = new Mailer();

export const sendEmail = async (to: string | string[], subject: string, html: string): Promise<void> => {
  await mailer.sendEmail({ to, subject, html });
};

export { mailer };
