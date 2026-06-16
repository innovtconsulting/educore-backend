import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });
  }

  async sendMail(
    to: string,
    subject: string,
    html: string,
    options?: { fromName?: string },
  ) {
    // Vérifier si le destinataire est un email valide
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      console.warn(
        `[MAIL SKIP] Skipping email send to non-email address: ${to}`,
      );
      return;
    }

    const fromName = options?.fromName || 'Educore Administration';

    try {
      await this.transporter.sendMail({
        from: `"${fromName}" <${process.env.MAIL_USER}>`,
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error(`[MAIL ERROR] Failed to send email to ${to}:`, error);
    }
  }

  async sendPasswordResetEmail(
    to: string,
    token: string,
    etablissementName?: string,
  ) {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    const schoolName = etablissementName || 'votre établissement';
    const subject = `Réinitialisation de votre mot de passe - ${schoolName}`;
    const html = `
      <h1>Réinitialisation de mot de passe</h1>
      <p>Vous avez demandé la réinitialisation de votre mot de passe pour votre compte sur la plateforme ${schoolName}.</p>
      <p>Cliquez sur le lien ci-dessous pour définir un nouveau mot de passe :</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>Ce lien expirera dans 1 heure.</p>
      <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.</p>
    `;
    return this.sendMail(to, subject, html, {
      fromName: `${schoolName} Administration`,
    });
  }
}
