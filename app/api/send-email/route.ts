import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, type, message } = body;

    // Set up the email transporter using your Gmail credentials from .env.local
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Format how the email will look when it arrives in your inbox
    const mailOptions = {
      from: process.env.EMAIL_USER, 
      to: 'tekapoysha@gmail.com', // Where you want to receive it
      replyTo: email, // If you click "Reply", it replies to the user!
      subject: `TekaPoysha Alert: ${type} from ${name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 16px; overflow: hidden;">
          <div style="background-color: #2563eb; padding: 24px; text-align: center;">
            <h2 style="color: white; margin: 0; font-size: 24px;">New App Feedback</h2>
          </div>
          <div style="padding: 32px; background-color: #f9fafb;">
            <p style="margin: 0 0 16px 0;"><strong>From:</strong> ${name} (${email})</p>
            <p style="margin: 0 0 16px 0;"><strong>Category:</strong> ${type}</p>
            <div style="background-color: white; padding: 24px; border-radius: 12px; border: 1px solid #e5e7eb; margin-top: 24px;">
              <p style="margin: 0; color: #374151; line-height: 1.6;">${message}</p>
            </div>
          </div>
        </div>
      `,
    };

    // Send the email
    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ success: false, error: 'Failed to send email' }, { status: 500 });
  }
}