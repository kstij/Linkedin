const bcrypt = require('bcryptjs');

const password = 'admin123';
const saltRounds = 10;

bcrypt.hash(password, saltRounds)
  .then(hash => {
    console.log('Password:', password);
    console.log('Hashed password:', hash);
    console.log('\nAdd this to your .env.local file:');
    console.log('ADMIN_PASSWORD=' + hash);
  })
  .catch(err => console.error('Error:', err)); 