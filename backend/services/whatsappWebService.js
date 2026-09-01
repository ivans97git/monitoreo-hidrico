const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        executablePath: '/usr/bin/google-chrome',   // ruta del Chrome instalado
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});



client.on('qr', qr => {
    console.log('📱 Escanea este código QR con tu WhatsApp:');
    qrcode.generate(qr, { small: true });
});

client.on('ready', () => {
    console.log('✅ WhatsApp Web listo para enviar mensajes');
});

client.on('disconnected', (reason) => {
    console.log('❌ WhatsApp Web desconectado:', reason);
});

client.initialize();

async function enviarWhatsApp(telefono, mensaje) {
    try {
        const chatId = `${telefono}@c.us`;
        const response = await client.sendMessage(chatId, mensaje);
        return { success: true, messageId: response.id.id };
    } catch (error) {
        console.error('Error enviando WhatsApp:', error);
        return { success: false, error: error.message };
    }
}

module.exports = { enviarWhatsApp, client };
