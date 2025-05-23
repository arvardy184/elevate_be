// src/docs/swagger.js
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Elevate API Documentation',
      version: '1.0.0',
      description: 'Dokumentasi REST API Elevate',
      contact: {
        name: 'API Support',
        email: 'support@ciet.site' // Ganti dengan email support kamu
      }
    },
    servers: [
      {
        url: 'http://localhost:3006',
        description: 'Development Server'
      },
      {
        url: 'http://test2.ciet.site/api',
        description: 'Production Server'
      }
    ],
    // Tambahan security definitions jika API kamu butuh authentication
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  // Sesuaikan path dengan struktur project kamu
  apis: [
    './src/controllers/*.js',  // Jika controllers ada di folder src
    './routes/*.js',           // Jika ada di folder routes
    './app.js'                 // Jika ada di root file
  ],
};

const swaggerSpec = swaggerJSDoc(options);

// Tambahan untuk handle CORS jika diperlukan
const swaggerOptions = {
  swaggerOptions: {
    persistAuthorization: true,
    docExpansion: 'none',
    filter: true
  }
};

module.exports = {
  swaggerUi,
  swaggerSpec,
  swaggerOptions
};
