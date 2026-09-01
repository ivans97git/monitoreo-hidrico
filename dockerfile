FROM node:20-slim

# Instalar Chrome y dependencias necesarias
RUN apt-get update && apt-get install -y wget gnupg ca-certificates
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add -
RUN echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list
RUN apt-get update && apt-get install -y google-chrome-stable
RUN apt-get install -y libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 libxss1 libxtst6 libnss3 libatk-bridge2.0-0 libgtk-3-0 libgbm-dev

# Configurar el directorio de trabajo
WORKDIR /app

# Copiar archivos del backend
COPY backend/package*.json ./
RUN npm install
COPY backend/ .

# Comando de inicio
CMD ["npm", "start"]
