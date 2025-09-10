// scripts/seedRoles.js
const mongoose = require('mongoose');
const Role = require('../models/Role');

(async ()=>{
  await mongoose.connect(process.env.MONGO_URL);

  const defs = [
    { name: 'admin',      active: true, permissions: ['forum:*'] },
    { name: 'mentor',     active: true, permissions: ['forum:read','forum:create','forum:reply','forum:edit_own','forum:delete_own','forum:moderate'] },
    { name: 'supervisor', active: true, permissions: ['forum:read','forum:create','forum:reply','forum:edit_own','forum:delete_own'] },
    { name: 'user',       active: true, permissions: ['forum:read','forum:create','forum:reply','forum:edit_own','forum:delete_own'] },
  ];

  for (const r of defs) {
    await Role.updateOne({ name: r.name }, { $set: r }, { upsert: true });
  }
  console.log('Roles seeded');
  process.exit(0);
})();