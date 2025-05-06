const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || '127.0.0.1',  // Menggunakan localhost jika variabel tidak ada
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '12345678',
  database: process.env.DB_NAME || 'elevate'
});
console.log('DB_HOST:', process.env.DB_HOST);   // Pastikan variabel terbaca dengan benar
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD:', process.env.DB_PASSWORD);
console.log('DB_NAME:', process.env.DB_NAME);


db.connect((err) => {
  if (err) {
    console.error('Koneksi DB error: ', err.message);  // Menampilkan pesan error yang lebih jelas
    return;
  }
  console.log('Terhubung ke database MySQL!');
});

module.exports = db;
