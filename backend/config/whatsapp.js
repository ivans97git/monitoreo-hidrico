require('dotenv').config();

const whatsappConfig = {
    token: process.env.WHATSAPP_TOKEN,
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    version: process.env.WHATSAPP_VERSION || 'v17.0',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'mi_token_secreto_webhook',
    baseUrl: `https://graph.facebook.com/${process.env.WHATSAPP_VERSION || 'v17.0'}`,
    
    // Plantillas de mensajes
    templates: {
        alerta: (datos) => ({
            messaging_product: "whatsapp",
            to: datos.telefono,
            type: "text",
            text: {
                body: `🚨 *ALERTA HIDROLÓGICA* 🚨\n\n` +
                      `📍 *Estación:* ${datos.estacion}\n` +
                      `📊 *Nivel actual:* ${datos.valor} ${datos.unidad}\n` +
                      `⚠️ *Estado:* ${datos.tipoAlerta}\n` +
                      `🕐 *Fecha:* ${datos.fecha}\n\n` +
                      `Por favor tome las precauciones necesarias.\n` +
                      `Este es un mensaje automático del sistema de monitoreo.`
            }
        }),
        
        alertaCritica: (datos) => ({
            messaging_product: "whatsapp",
            to: datos.telefono,
            type: "text",
            text: {
                body: `🔴 *ALERTA CRÍTICA* 🔴\n\n` +
                      `🚨 *EVACUACIÓN RECOMENDADA*\n\n` +
                      `📍 *Estación:* ${datos.estacion}\n` +
                      `📊 *Nivel actual:* ${datos.valor} ${datos.unidad}\n` +
                      `⚠️ *Estado:* CRÍTICO\n` +
                      `🕐 *Fecha:* ${datos.fecha}\n\n` +
                      `⚠️ *ACCIONES INMEDIATAS:*\n` +
                      `1. Mantenga la calma\n` +
                      `2. Diríjase a zonas altas\n` +
                      `3. Siga instrucciones de autoridades\n` +
                      `4. Ayude a personas vulnerables\n\n` +
                      `Este es un mensaje automático de emergencia.`
            }
        }),
        
        registro: (datos) => ({
            messaging_product: "whatsapp",
            to: datos.telefono,
            type: "text",
            text: {
                body: `✅ *Registro exitoso*\n\n` +
                      `📍 *Estación:* ${datos.estacion}\n` +
                      `📊 *Valor registrado:* ${datos.valor} ${datos.unidad}\n` +
                      `🕐 *Fecha:* ${datos.fecha}\n\n` +
                      `Gracias por mantener informada a la comunidad.`
            }
        })
    }
};

module.exports = whatsappConfig;