import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import dns from 'dns';
import { promisify } from 'util';

dotenv.config();

const resolveMx = promisify(dns.resolveMx);

class EmailService {
    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD
            },
            // Add debug option to get detailed SMTP logs
            debug: true,
            // Add logger to capture SMTP communication
            logger: true
        });

        // Set up bounce handling
        this.setupBounceHandling();
    }

    /**
     * Set up bounce handling
     */
    setupBounceHandling() {
        this.transporter.on('bounce', (bounce) => {
            console.error('Bounce received:', bounce);
            // Handle bounce notification
            if (bounce && bounce.recipient) {
                this.handleBounce(bounce.recipient);
            }
        });

        this.transporter.on('error', (error) => {
            console.error('SMTP error:', error);
        });
    }

    /**
     * Handle bounce notification
     * @param {string} recipient - Email address that bounced
     */
    handleBounce(recipient) {
        console.error(`Email bounced for recipient: ${recipient}`);
        // Here you could implement additional bounce handling logic
        // such as updating a database or notifying administrators
    }

    /**
     * Validate email address format
     * @param {string} email - Email address to validate
     * @returns {boolean} Whether email is valid
     */
    validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Verify if the email domain has valid MX records
     * @param {string} email - Email address to verify
     * @returns {Promise<boolean>} Whether domain has valid MX records
     */
    async verifyDomain(email) {
        try {
            const domain = email.split('@')[1];
            const mxRecords = await resolveMx(domain);
            return mxRecords && mxRecords.length > 0;
        } catch (error) {
            console.error('Error verifying domain:', error);
            return false;
        }
    }

    /**
     * Check if SMTP response indicates a non-existent email
     * @param {string} response - SMTP server response
     * @returns {boolean} Whether response indicates non-existent email
     */
    isNonExistentEmail(response) {
        // Common SMTP response codes for non-existent emails
        const nonExistentCodes = [
            '550', // Requested action not taken: mailbox unavailable
            '553', // Requested action not taken: mailbox name not allowed
            '554', // Transaction failed
            '5.1.1', // Bad destination mailbox address
            '5.1.2', // Bad destination system address
            '5.1.3', // Bad destination mailbox address syntax
            '5.1.6', // Bad destination mailbox address
            '5.1.7', // Bad sender's mailbox address syntax
            '5.1.8', // Bad sender's system address
            '5.2.1', // Mailbox disabled, not accepting messages
            '5.2.2', // Mailbox full
            '5.3.0', // Mail system full
            '5.4.0', // Network or routing problem
            '5.4.1', // No answer from host
            '5.4.2', // Bad connection
            '5.4.3', // Routing server failure
            '5.4.4', // Unable to route
            '5.4.5', // Network congestion
            '5.4.6', // Routing loop detected
            '5.4.7', // Too many hops
            '5.5.0', // Other or undefined mail system status
            '5.5.1', // Bad destination mailbox address syntax
            '5.5.2', // Bad destination system address
            '5.5.3', // Bad destination mailbox address syntax
            '5.5.4', // Bad destination mailbox address
            '5.5.5', // Bad destination system address
            '5.5.6', // Mailbox has moved
            '5.5.7', // Bad sender's mailbox address syntax
            '5.5.8', // Bad sender's system address
        ];

        return nonExistentCodes.some(code => response.includes(code));
    }

    /**
     * Send an email using the configured SMTP server
     * @param {Object} options - Email options
     * @param {string} options.to - Recipient email address
     * @param {string} options.subject - Email subject
     * @param {string} options.text - Plain text content
     * @param {string} [options.html] - HTML content (optional)
     * @param {Array} [options.attachments] - Array of attachments (optional)
     * @returns {Promise<Object>} - Promise resolving to the sent email info and status
     */
    async sendEmail({ to, subject, text, html, attachments }) {
        try {
            // Validate email format
            if (!this.validateEmail(to)) {
                throw new Error('Invalid email address format');
            }

            // Verify domain has valid MX records
            const hasValidDomain = await this.verifyDomain(to);
            if (!hasValidDomain) {
                throw new Error('Invalid email domain');
            }

            const mailOptions = {
                from: process.env.SMTP_FROM_EMAIL,
                to,
                subject,
                text,
                html,
                attachments,
                // Add headers to track delivery status
                headers: {
                    'X-Auto-Response-Suppress': 'OOF, AutoReply',
                    'Precedence': 'bulk',
                    'Return-Path': process.env.SMTP_FROM_EMAIL,
                    'X-Feedback-ID': `verify-email-${Date.now()}`,
                    'X-Mailer': 'DocuChain Email Service'
                },
                // Add message ID for tracking
                messageId: `<${Date.now()}.${Math.random().toString(36).substring(2)}@${process.env.SMTP_HOST}>`,
                // Add envelope for better bounce handling
                envelope: {
                    from: process.env.SMTP_FROM_EMAIL,
                    to: to
                }
            };

            // Send the email
            const info = await this.transporter.sendMail(mailOptions);
            
            // Check if the email was accepted by the server
            if (!info.accepted || info.accepted.length === 0) {
                throw new Error('Email was not accepted by the server');
            }

            // Check if the email was rejected
            if (info.rejected && info.rejected.length > 0) {
                throw new Error(`Email was rejected: ${info.rejected.join(', ')}`);
            }

            // Check SMTP response for non-existent email indicators
            if (info.response && this.isNonExistentEmail(info.response)) {
                throw new Error('Email address does not exist');
            }

            // Check for bounce notifications in the response
            if (info.response && (
                info.response.includes('bounce') || 
                info.response.includes('undeliverable') ||
                info.response.includes('not found') ||
                info.response.includes('couldn\'t be found')
            )) {
                throw new Error('Email address does not exist');
            }

            console.log('Email sent successfully:', info.messageId);
            return {
                success: true,
                messageId: info.messageId,
                accepted: info.accepted,
                rejected: info.rejected || [],
                response: info.response,
                domainVerified: hasValidDomain,
                // Add warning about potential delayed bounce
                warning: 'Email was accepted by the server. Please note that bounce notifications may be delayed.'
            };
        } catch (error) {
            console.error('Error sending email:', error);
            
            // Handle specific SMTP errors
            if (error.code === 'ESOCKET' || error.code === 'ETIMEDOUT') {
                throw new Error('Failed to connect to SMTP server');
            } else if (error.code === 'EAUTH') {
                throw new Error('SMTP authentication failed');
            } else if (error.code === 'EENVELOPE') {
                throw new Error('Invalid email envelope');
            } else if (error.code === 'EMESSAGE') {
                throw new Error('Invalid message format');
            } else if (error.code === 'ESTREAM') {
                throw new Error('SMTP connection error');
            }

            throw error;
        }
    }

    /**
     * Verify SMTP connection
     * @returns {Promise<boolean>} - Promise resolving to true if connection is successful
     */
    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('SMTP connection verified successfully');
            return true;
        } catch (error) {
            console.error('SMTP connection verification failed:', error);
            throw error;
        }
    }
}

export const emailService = new EmailService();
