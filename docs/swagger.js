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
    },
    servers: [
      {
        url: 'http://localhost:3006/',
      },
    ],
  },
  apis: ['./routes/*.js'], // Ubah sesuai path file route kamu
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = {
  swaggerUi,
  swaggerSpec,
};
