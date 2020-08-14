import sgMail from '@sendgrid/mail';
import axios from 'axios';

export const sendGridApiUrl = 'https://api.sendgrid.com/v3/mail/send';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export function sendAuthCode(email, name, code) {
    sendMail(email, name, code, process.env.SENDGRID_CONFIRMATION_TEMPLATE);
}

export function sendAccountRecoveryCode(email, name, code) {
    sendMail(email, name, code, process.env.SENDGRID_RECOVERY_TEMPLATE);
}

function sendMail(email, name, code, template_id) {
    axios.post(sendGridApiUrl, null, { 
        headers: {
            Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
        },
        data: {
            from: { email: process.env.SENDGRID_MAIL_FROM },
            personalizations: [{
                to: [{ email }],
                dynamic_template_data: {
                    code,
                    name
                }
            }],
            template_id
        }
    });
}