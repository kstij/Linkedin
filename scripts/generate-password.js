const bcrypt = require('bcryptjs');

const password = 'admin123'; // Change this to your desired password
const saltRounds = 10;

bcrypt.hash(password, saltRounds, function(err, hash) {
  if (err) {
    console.error('Error generating hash:', err);
    return;
  }
  console.log('Password:', password);
  console.log('Hashed password:', hash);
}); 