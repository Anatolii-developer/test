// server/forum/forum.policy.js
const Role = require('../models/Role'); // твой Role.js
// Если у User роли как ссылки:
///   user.roles: [ObjectId<Role>]  ИЛИ как строки:
///   user.roles: ['admin', 'mentor']  (на всякий)

const PERMISSIONS_BY_ROLE = {
  // имена ролей -> список прав
  admin: [
    'forum:*', // суперправа
  ],
  mentor: [
    'forum:read', 'forum:create', 'forum:reply',
    'forum:edit_own', 'forum:delete_own',
    'forum:moderate', // закрыть/открыть, закрепить, удалить чужие
  ],
  supervisor: [
    'forum:read', 'forum:create', 'forum:reply',
    'forum:edit_own', 'forum:delete_own',
    // без глобальной модерации (при желании добавь)
  ],
  user: [
    'forum:read', 'forum:create', 'forum:reply',
    'forum:edit_own', 'forum:delete_own',
  ],
};

function norm(s=''){ return String(s).trim().toLowerCase(); }

async function getUserRoleNames(user) {
  if (!user) return [];
  // разные формы хранения ролей
  let roleNames = [];
  if (Array.isArray(user.roles) && user.roles.length) {
    // могут быть ObjectId (Role) или строки
    const objectIds = user.roles.filter(r => (r && typeof r==='object' && r._id) || String(r).match(/^[a-f0-9]{24}$/i));
    const stringNames = user.roles.filter(r => typeof r === 'string');

    if (objectIds.length) {
      const roles = await Role.find({ _id: { $in: objectIds }, active: true }).lean();
      roleNames.push(...roles.map(r => norm(r.name)));
    }
    if (stringNames.length) {
      roleNames.push(...stringNames.map(norm));
    }
  } else if (user.role) {
    // одиночная роль (строка или объект)
    if (typeof user.role === 'string') roleNames.push(norm(user.role));
    else if (user.role && user.role.name) roleNames.push(norm(user.role.name));
  }
  // дефолт — обычный пользователь
  if (!roleNames.length) roleNames = ['user'];
  return [...new Set(roleNames)];
}

async function getPermissions(user) {
  const names = await getUserRoleNames(user);
  const set = new Set();
  for (const roleName of names) {
    const list = PERMISSIONS_BY_ROLE[roleName] || [];
    list.forEach(p => set.add(p));
  }
  // если есть forum:* — даём все
  if (set.has('forum:*')) return new Proxy({}, { get:()=>true });

  // удобный предикат
  const has = (perm) => set.has(perm);
  return { has };
}

// sugar:
async function can(user, perm) {
  const perms = await getPermissions(user);
  if (perms.has === true) return true;        // wildcard
  return typeof perms.has === 'function' ? perms.has(perm) : !!perms[perm];
}
async function canModerate(user) {
  return (await can(user, 'forum:moderate')) || (await can(user, 'forum:*'));
}
async function canRead(user) {
  return (await can(user, 'forum:read')) || (await can(user, 'forum:*'));
}
async function canCreateTopic(user) {
  return (await can(user, 'forum:create')) || (await can(user, 'forum:*'));
}
async function canReply(user) {
  return (await can(user, 'forum:reply')) || (await can(user, 'forum:*'));
}
function isOwn(user, doc) {
  return user && doc && String(doc.authorId) === String(user._id);
}

async function canEditPost(user, post) {
  if (!user) return false;
  if (await canModerate(user)) return true;
  if (isOwn(user, post) && await can(user, 'forum:edit_own')) return true;
  return false;
}
async function canDeletePost(user, post) {
  if (!user) return false;
  if (await canModerate(user)) return true;
  if (isOwn(user, post) && await can(user, 'forum:delete_own')) return true;
  return false;
}

// Ограничение видимости категорий по ролям:
async function canSeeCategory(user, category) {
  if (!category?.allowedRoles?.length) return !!user; // если список пуст — любой авторизованный
  const userRoleNames = await getUserRoleNames(user);
  // найдём активные Role по category.allowedRoles и сравним с именами
  const roles = await Role.find({ _id: { $in: category.allowedRoles }, active: true }).lean();
  const allowedNames = roles.map(r => norm(r.name));
  return userRoleNames.some(n => allowedNames.includes(n));
}

module.exports = {
  can, canRead, canCreateTopic, canReply, canModerate, canEditPost, canDeletePost, canSeeCategory,
};