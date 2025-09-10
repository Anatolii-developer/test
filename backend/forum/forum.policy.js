// backend/forum/forum.policy.js
const Role = require('../models/Role');

const PERMISSIONS_BY_ROLE = {
  admin:      ['forum:*'],
  mentor:     ['forum:read','forum:create','forum:reply','forum:edit_own','forum:delete_own','forum:moderate'],
  supervisor: ['forum:read','forum:create','forum:reply','forum:edit_own','forum:delete_own'],
  user:       ['forum:read','forum:create','forum:reply','forum:edit_own','forum:delete_own'],
};



function toCanonicalRole(name = '') {
  const n = String(name).trim().toLowerCase();

  if (n.includes('admin') || n.includes('адмін') || n.includes('адмініст')) return 'admin';
  if (n.includes('ментор')) return 'mentor';
  if (n.includes('супервізор')) return 'supervisor';
  if (n.includes('psy')) return 'user'; // або окрему гілку, якщо треба

  // за замовчуванням — звичайний користувач
  return 'user';
}

function norm(s=''){ return String(s).trim().toLowerCase(); }



// маппинг локализованных/сложных названий к базовым
function toBaseRole(name='') {
  const n = norm(name);
  if (n.includes('admin') || n.includes('адмін') || n.includes('администратор')) return 'admin';
  if (n.includes('ментор')) return 'mentor';
  if (n.includes('супервізор') || n.includes('супервизор')) return 'supervisor';
  // любые “психолог/спеціаліст/psy-*” отправим в базовую "user"
  if (n.includes('psy') || n.includes('псих') || n.includes('спеціаліст') || n.includes('специалист')) return 'user';
  // если явно одна из базовых — вернём как есть
  if (['admin','mentor','supervisor','user'].includes(n)) return n;
  return 'user'; // дефолт
}

async function getUserRoleNames(user) {
  if (!user) return [];
  let roleNames = [];
  if (Array.isArray(user.roles) && user.roles.length) {
    const objectIds = user.roles.filter(r => (r && typeof r==='object' && r._id) || String(r).match(/^[a-f0-9]{24}$/i));
    const stringNames = user.roles.filter(r => typeof r === 'string');

    if (objectIds.length) {
      const roles = await Role.find({ _id: { $in: objectIds }, active: true }).lean();
      roleNames.push(...roles.map(r => r?.name).filter(Boolean));
    }
    if (stringNames.length) roleNames.push(...stringNames);
  } else if (user.role) {
    roleNames.push(typeof user.role === 'string' ? user.role : user.role.name);
  }
  if (!roleNames.length) roleNames = ['user'];
  // ⇩ повертаємо вже канонічні ключі
  return [...new Set(roleNames.map(toCanonicalRole))];
}

async function getPermissions(user) {
  const names = await getUserRoleNames(user);
  const set = new Set();
  for (const canonical of names) {
    const list = PERMISSIONS_BY_ROLE[canonical] || [];
    list.forEach(p => set.add(p));
  }
  if (set.has('forum:*')) return new Proxy({}, { get:()=>true });
  const has = (perm) => set.has(perm);
  return { has };
}

async function can(user, perm) {
  const perms = await getPermissions(user);
  if (perms.has === true) return true;
  return perms.has(perm);
}
async function canModerate(user)   { return (await can(user,'forum:moderate')) || (await can(user,'forum:*')); }
async function canRead(user)       { return (await can(user,'forum:read'))      || (await can(user,'forum:*')); }
async function canCreateTopic(user){ return (await can(user,'forum:create'))    || (await can(user,'forum:*')); }
async function canReply(user)      { return (await can(user,'forum:reply'))     || (await can(user,'forum:*')); }

function isOwn(user, doc) { return user && doc && String(doc.authorId) === String(user._id); }
async function canEditPost(user, post)   { return (await canModerate(user)) || (isOwn(user,post) && await can(user,'forum:edit_own')); }
async function canDeletePost(user, post) { return (await canModerate(user)) || (isOwn(user,post) && await can(user,'forum:delete_own')); }

async function canSeeCategory(user, category) {
  if (!category?.allowedRoles?.length) return !!user;
  const userRoles = await getUserRoleNames(user);
  const roles = await Role.find({ _id: { $in: category.allowedRoles }, active: true }).lean();
  const allowed = roles.map(r => toBaseRole(r.name));
  return userRoles.some(n => allowed.includes(n));
}

module.exports = {
  can, canRead, canCreateTopic, canReply, canModerate, canEditPost, canDeletePost, canSeeCategory,
};