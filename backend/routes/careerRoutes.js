const express = require('express');
const router = express.Router();
const careerCtrl = require(path.join(__dirname, '..', 'controllers', 'careerController.js'));
const jwt = require('jsonwebtoken');

function auth(req,res,next){
  const token = (req.cookies?.token) || (req.headers.authorization||'').replace(/^Bearer\s+/i,'');
  if(!token) return res.status(401).json({ok:false,message:'Unauthorized'});
  try{
    const p = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret');
    req.user = { _id: p.id, role: p.role, email: p.email };
    next();
  }catch(e){ return res.status(401).json({ok:false,message:'Invalid token'}); }
}

router.post('/', auth, careerCtrl.create);
router.get('/',  auth, careerCtrl.list);

module.exports = router;
