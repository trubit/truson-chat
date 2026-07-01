// MongoDB init script — runs once when container is first created
db = db.getSiblingDB('truson_chat');

db.createUser({
  user: 'truson_app',
  pwd: 'change_in_production',
  roles: [{ role: 'readWrite', db: 'truson_chat' }],
});

db.createCollection('users');
db.createCollection('profiles');
db.createCollection('sessions');

print('MongoDB initialized: truson_chat database and app user created.');
