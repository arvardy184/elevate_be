const db = require('../config/database');

class UserModel {
  static createUser({ name, email, password }) {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
      db.query(sql, [name, email, password], (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    });
  }

  static findByEmail(email) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE email = ?';
      db.query(sql, [email], (err, results) => {
        if (err) return reject(err);
        if (results.length > 0) {
          resolve(results[0]);
        } else {
          resolve(null);
        }
      });
    });
  }
}

module.exports = UserModel;
