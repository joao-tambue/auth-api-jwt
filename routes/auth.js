import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../supabase.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;

  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (existingUser) {
    return res.status(400).json({ error: 'Usuário já existe' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const { data, error } = await supabase
    .from('users')
    .insert([{ email, password: hashedPassword, name }]);

  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json({ message: 'Usuário registrado com sucesso' });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ error: 'Senha inválida' });

  const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
    expiresIn: '1d',
  });

  res.json({ token });
});

// PROTEGIDA
router.get('/me', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  const { data: user } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('id', userId)
    .single();

  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

  res.json(user);
});

export default router;