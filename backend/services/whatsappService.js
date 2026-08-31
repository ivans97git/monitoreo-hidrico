const axios = require('axios');
const whatsappConfig = require('../config/whatsapp');

class WhatsAppService {
    constructor() {
        this.baseUrl = whatsappConfig.baseUrl;
        this.token = whatsappConfig.token;
        this.phoneNumberId = whatsappConfig.phoneNumberId;
    }

    async enviarMensaje(telefono, mensaje, tipo = 'texto') {
        try {
            if (!this.token || !this.phoneNumberId) {
                console.error('WhatsApp API no configurada');
                return { success: false, error: 'WhatsApp API no configurada' };
            }

            const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
            
            let data;
            if (tipo === 'plantilla_alerta') {
                data = whatsappConfig.templates.alerta({
                    telefono,
                    ...mensaje
                });
            } else if (tipo === 'plantilla_critica') {
                data = whatsappConfig.templates.alertaCritica({
                    telefono,
                    ...mensaje
                });
            } else {
                data = {
                    messaging_product: "whatsapp",
                    to: telefono,
                    type: "text",
                    text: { body: mensaje }
                };
            }

            const response = await axios.post(url, data, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log(`✅ WhatsApp enviado a ${telefono}:`, response.data.messages?.[0]?.id);
            return { success: true, data: response.data };
        } catch (error) {
            console.error(`❌ Error enviando WhatsApp a ${telefono}:`, error.response?.data || error.message);
            return { success: false, error: error.message };
        }
    }

    async enviarAlerta(telefono, datosAlerta) {
        const tipoPlantilla = datosAlerta.tipoAlerta === 'CRÍTICO' ? 'plantilla_critica' : 'plantilla_alerta';
        return await this.enviarMensaje(telefono, datosAlerta, tipoPlantilla);
    }

    // Verificar webhook de WhatsApp
    verifyWebhook(req, res) {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode === 'subscribe' && token === whatsappConfig.verifyToken) {
            console.log('✅ Webhook verificado');
            res.status(200).send(challenge);
        } else {
            console.error('❌ Webhook no verificado');
            res.sendStatus(403);
        }
    }

    // Manejar mensajes entrantes
    handleWebhook(req, res) {
        try {
            const body = req.body;
            
            if (body.object === 'whatsapp_business_account') {
                body.entry.forEach(entry => {
                    entry.changes.forEach(change => {
                        if (change.field === 'messages') {
                            const message = change.value.messages?.[0];
                            if (message) {
                                this.procesarMensajeEntrante(message);
                            }
                        }
                    });
                });
                
                res.sendStatus(200);
            } else {
                res.sendStatus(404);
            }
        } catch (error) {
            console.error('Error en webhook:', error);
            res.sendStatus(500);
        }
    }

    async procesarMensajeEntrante(message) {
        console.log('📨 Mensaje recibido:', message);
        
        // Aquí puedes implementar lógica para responder mensajes
        if (message.type === 'text') {
            const texto = message.text.body.toLowerCase();
            
            if (texto.includes('help') || texto.includes('ayuda')) {
                await this.enviarMensaje(message.from, 
                    'ℹ️ *Sistema de Monitoreo Hidrológico*\n\n' +
                    'Comandos disponibles:\n' +
                    '• HELP - Mostrar ayuda\n' +
                    '• ESTADO - Estado actual\n' +
                    '• ALERTAS - Últimas alertas'
                );
            }
        }
    }
}

module.exports = new WhatsAppService();