// email-server.ts  
// 📧 INDEPENDENT SERVICE IMPLEMENTATION
//
// This demonstrates the MCP principle of SERVICE ISOLATION:
// - Independent deployment and scaling
// - Clear API boundaries and contracts
// - Self-contained error handling
// - Service-specific security and configuration
//
// In production MCP architectures, services like this would:
// - Run in separate containers/processes
// - Have their own authentication mechanisms
// - Implement circuit breakers and retry logic
// - Provide health checks and monitoring endpoints

import express, { Request, Response } from 'express';
import nodemailer from 'nodemailer';
import cors from 'cors';
import bodyParser from 'body-parser';
import { generateCalendarInvite, analyzeTimeExpression } from './calendar-utils';
import 'dotenv/config';

const app = express();
const port = 3002;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Email configuration
const createTransporter = () => {
    return nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS // Use app password for Gmail
        }
    });
};

// Email interfaces
interface SendEmailRequest {
    to: string;
    subject: string;
    text?: string;
    html?: string;
}

interface ReminderEmailRequest {
    to: string;
    reminderText: string;
    reminderTime: string;
    senderName?: string;
    includeCalendarInvite?: boolean; // New field for calendar integration
    eventDuration?: number; // Duration in minutes
    eventLocation?: string; // Event location
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'Email server is running', timestamp: new Date().toISOString() });
});

// Send generic email
app.post('/send-email', async (req: Request, res: Response) => {
    try {
        const { to, subject, text, html }: SendEmailRequest = req.body;

        if (!to || !subject || (!text && !html)) {
            return res.status(400).json({ 
                error: "Missing required fields: 'to', 'subject', and either 'text' or 'html'" 
            });
        }

        const transporter = createTransporter();
        
        const mailOptions = {
            from: `"Reminder Assistant" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text,
            html
        };

        console.log(`Sending email to: ${to}, Subject: ${subject}`);
        const info = await transporter.sendMail(mailOptions);
        
        res.json({ 
            success: true, 
            messageId: info.messageId,
            message: `Email sent successfully to ${to}`
        });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ 
            error: 'Failed to send email',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Send reminder email (specialized endpoint)
app.post('/send-reminder', async (req: Request, res: Response) => {
    try {
        const { 
            to, 
            reminderText, 
            reminderTime, 
            senderName,
            includeCalendarInvite = true, // Default to true for calendar invites
            eventDuration,
            eventLocation 
        }: ReminderEmailRequest = req.body;

        if (!to || !reminderText || !reminderTime) {
            return res.status(400).json({ 
                error: "Missing required fields: 'to', 'reminderText', 'reminderTime'" 
            });
        }

        const transporter = createTransporter();
        
        const subject = `🔔 Reminder: ${reminderText}`;
        const senderInfo = senderName ? ` from ${senderName}` : '';
        
        // Analyze the time expression for better calendar integration
        const timeAnalysis = analyzeTimeExpression(reminderTime);
        const formattedDateTime = timeAnalysis.parsedDate.toLocaleString();
        
        let calendarInfo = '';
        let attachments: any[] = [];
        
        // Generate calendar invite if requested
        if (includeCalendarInvite) {
            try {
                const calendarData = await generateCalendarInvite({
                    title: reminderText,
                    description: `Reminder: ${reminderText}\n\nScheduled via AI Assistant`,
                    startDateTime: reminderTime,
                    duration: eventDuration || timeAnalysis.suggestedDuration,
                    location: eventLocation,
                    attendeeEmail: to
                });
                
                attachments.push({
                    filename: calendarData.filename,
                    content: calendarData.content,
                    contentType: 'text/calendar; charset=utf-8; method=REQUEST'
                });
                
                calendarInfo = `
                    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #9f7aea; margin: 20px 0;">
                        <h3 style="color: #9f7aea; margin: 0 0 10px 0;">📅 Calendar Event:</h3>
                        <p style="font-size: 16px; color: #333; margin: 0;">
                            A calendar invite has been attached to this email.<br>
                            <strong>Time Interpretation:</strong> ${timeAnalysis.interpretation}<br>
                            <strong>Suggested Duration:</strong> ${timeAnalysis.suggestedDuration} minutes<br>
                            <strong>Confidence:</strong> ${timeAnalysis.confidence}
                        </p>
                    </div>
                `;
            } catch (calendarError) {
                console.error('Failed to generate calendar invite:', calendarError);
                calendarInfo = `
                    <div style="background: #fed7d7; padding: 20px; border-radius: 8px; border-left: 4px solid #e53e3e; margin: 20px 0;">
                        <h3 style="color: #e53e3e; margin: 0 0 10px 0;">⚠️ Calendar Note:</h3>
                        <p style="font-size: 16px; color: #333; margin: 0;">
                            Could not generate calendar invite. Please add this event manually to your calendar.
                        </p>
                    </div>
                `;
            }
        }
        
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">🔔 Reminder Alert</h1>
                </div>
                
                <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <h2 style="color: #333; margin-bottom: 20px;">You have a reminder${senderInfo}:</h2>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0;">
                        <h3 style="color: #667eea; margin: 0 0 10px 0;">Reminder:</h3>
                        <p style="font-size: 18px; color: #333; margin: 0;">${reminderText}</p>
                    </div>
                    
                    <div style="background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #48bb78; margin: 20px 0;">
                        <h3 style="color: #48bb78; margin: 0 0 10px 0;">Scheduled Time:</h3>
                        <p style="font-size: 16px; color: #333; margin: 0;">
                            <strong>Original:</strong> ${reminderTime}<br>
                            <strong>Parsed:</strong> ${formattedDateTime}
                        </p>
                    </div>
                    
                    ${calendarInfo}
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 14px; color: #718096; text-align: center;">
                        <p>This reminder was sent by your AI Assistant</p>
                        <p>Sent at: ${new Date().toLocaleString()}</p>
                    </div>
                </div>
            </div>
        `;

        const textContent = `
🔔 REMINDER ALERT

You have a reminder${senderInfo}:
${reminderText}

Scheduled Time: ${reminderTime}
Parsed Time: ${formattedDateTime}

${includeCalendarInvite ? '📅 Calendar invite attached to this email.' : ''}

---
This reminder was sent by your AI Assistant
Sent at: ${new Date().toLocaleString()}
        `;

        const mailOptions: any = {
            from: `"AI Reminder Assistant" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            text: textContent,
            html: htmlContent
        };

        // Add attachments if we have any
        if (attachments.length > 0) {
            mailOptions.attachments = attachments;
        }

        console.log(`Sending reminder email to: ${to}, Reminder: ${reminderText} at ${reminderTime} (parsed: ${formattedDateTime})`);
        if (includeCalendarInvite) {
            console.log(`📅 Including calendar invite with ${timeAnalysis.suggestedDuration}min duration`);
        }
        
        const info = await transporter.sendMail(mailOptions);
        
        res.json({ 
            success: true, 
            messageId: info.messageId,
            message: `Reminder email sent successfully to ${to}${includeCalendarInvite ? ' with calendar invite' : ''}`,
            reminder: {
                text: reminderText,
                time: reminderTime,
                parsedTime: formattedDateTime,
                recipient: to,
                calendarAttached: includeCalendarInvite,
                timeAnalysis: timeAnalysis
            }
        });
    } catch (error) {
        console.error('Error sending reminder email:', error);
        res.status(500).json({ 
            error: 'Failed to send reminder email',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Test email configuration
app.post('/test-config', async (req: Request, res: Response) => {
    try {
        const transporter = createTransporter();
        await transporter.verify();
        
        res.json({ 
            success: true, 
            message: 'Email configuration is valid',
            service: process.env.EMAIL_SERVICE || 'gmail',
            user: process.env.EMAIL_USER
        });
    } catch (error) {
        console.error('Email configuration test failed:', error);
        res.status(500).json({ 
            error: 'Email configuration is invalid',
            details: error instanceof Error ? error.message : 'Unknown error',
            suggestion: 'Please check your EMAIL_USER and EMAIL_PASS environment variables'
        });
    }
});

// Start the email server
app.listen(port, () => {
    console.log(`📧 Email server is running at http://localhost:${port}`);
    console.log(`Email service: ${process.env.EMAIL_SERVICE || 'gmail'}`);
    console.log(`Email user: ${process.env.EMAIL_USER || 'Not configured'}`);
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn('⚠️  WARNING: Email credentials not configured! Please set EMAIL_USER and EMAIL_PASS environment variables.');
    }
});

export default app;
