// backend/forum/forum.policy.js
const Role = require('../models/Role');

const PERMISSIONS_BY_ROLE = {
  admin:      ['forum:*'],
  mentor:     ['forum:read','forum:create','forum:reply','forum:edit_own','forum:delete_own','forum:moderate'],
  supervisor: ['forum:read','forum:create','forum:reply','forum:edit_own','forum:delete_own'],
  user:       ['forum:read','forum:create','forum:reply','forum:edit_own','forum:delete_own'],
};

const norm = (s='') => String(s).trim().toLowerCase();

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
  if (!user) return ['user'];

  let names = [];

  if (Array.isArray(user.roles) && user.roles.length) {
    // если в user.roles лежат ObjectId/объекты — подтянем роли из БД
    const ids = user.roles
      .map(r => (typeof r === 'object' && r?._id) ? r._id : r)
      .filter(v => String(v).match(/^[a-f0-9]{24}$/i));
    if (ids.length) {
      const docs = await Role.find({ _id: { $in: ids }, active: true }).lean();
      names.push(...docs.map(r => toBaseRole(r.name)));
    }
    // плюс возможные строковые названия
    names.push(...user.roles
      .filter(r => typeof r === 'string')
      .map(s => toBaseRole(s)));
  } else if (user.role) {
    names.push(toBaseRole(typeof user.role === 'string' ? user.role : user.role.name));
  }

  if (!names.length) names = ['user'];
  return [...new Set(names)];
}

async function getPermissions(user) {
  const roleNames = await getUserRoleNames(user);
  const set = new Set();
  for (const base of roleNames) {
    (PERMISSIONS_BY_ROLE[base] || []).forEach(p => set.add(p));
  }
  if (set.has('forum:*')) return new Proxy({}, { get: () => true });
  return { has: p => set.has(p) };
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