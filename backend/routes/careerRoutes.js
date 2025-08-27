const express = require('express');
const path = require('path');  
const router = express.Router();
const careerCtrl = require(path.join(__dirname, '..', 'controllers', 'careerController.js'));
const jwt = require('jsonwebtoken');

function auth(req,res,next){
  const token = (req.cookies?.token) || (req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  if(!token) return res.status(401).json({ok:false,message:'Unauthorized'});
  try{
    const p = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    req.user = { _id: p.id, role: p.role, email: p.email, username: p.username };
    next();
  }catch(e){ return res.status(401).json({ok:false,message:'Invalid token'}); }
}

function isAdmin(req,res,next){
  if (!req.user) return res.status(401).json({ ok:false, message:'Unauthorized' });
  const role = (req.user.role||'').toString().toLowerCase();
  if (role.includes('admin') || role.includes('адмін')) return next();
  return res.status(403).json({ ok:false, message:'Forbidden' });
}

router.post('/', careerCtrl.create);
router.get('/',  careerCtrl.list);
router.put('/:id/assign', careerCtrl.assignMentor);

module.exports = router;