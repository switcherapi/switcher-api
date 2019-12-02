import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

export const sendWelcomeEmail = (email, name) => {
    // sgMail.send({
    //     to: email,
    //     from: 'rogerio.petruki@gmail.com',
    //     subject: 'Thanks for joining in!',
    //     text: `Welcome to the app, ${name}`
    // })
}

export const sendCancelationEmail = (email, name) => {
    // sgMail.send({
    //     to: email,
    //     from: 'rogerio.petruki@gmail.com',
    //     subject: 'We will miss you!',
    //     text: `Goodbye ${name}, thanks for using this app.`
    // })
}