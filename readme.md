# 🌊 Sistema de Monitoreo Hidrológico con Alertas WhatsApp

Sistema web para monitoreo de niveles de ríos y precipitaciones con alertas automáticas por WhatsApp Business API.

## 🎯 Características Principales

- 🗺️ **Mapa interactivo** con estaciones de monitoreo
- 📊 **Registro manual** de mediciones (niveles de río y precipitaciones)
- 📈 **Gráficos históricos** y tendencias
- 🚨 **Alertas automáticas** por WhatsApp Business API
- 👥 **Sistema de usuarios** con roles (admin/operador)
- 📱 **Diseño responsive** para móviles y tablets
- 🔒 **Autenticación segura** con JWT

## 🛠️ Stack Tecnológico

### Frontend (GitHub Pages)
- HTML5 + CSS3 + JavaScript Vanilla
- Leaflet.js - Mapas interactivos
- Chart.js - Gráficos
- Bootstrap 5 - UI Framework

### Backend (Railway)
- Node.js + Express
- JWT - Autenticación
- WhatsApp Business API (Meta Cloud API)

### Base de Datos (Supabase)
- PostgreSQL
- PostGIS (para datos geoespaciales)

## 📦 Instalación Local

### 1. Clonar repositorio
```bash
git clone https://github.com/TU_USUARIO/monitoreo-hidrico.git
cd monitoreo-hidrico