require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());

// Conexão com o banco
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'sabor_do_brasil',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Cadastro de usuário
app.post('/api/usuarios/cadastrar', async (req, res) => {
  const { nome, email, senha } = req.body;
  if (!nome || !email || !senha) return res.status(400).json({ erro: 'Preencha todos os campos.' });
  try {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    if (rows.length > 0) return res.status(409).json({ erro: 'Usuário já cadastrado.' });
    await pool.query('INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)', [nome, email, senha]);
    res.json({ sucesso: true });
  } catch (e) {
    res.status(500).json({ erro: 'Erro no servidor.' });
  }
});

// Login
app.post('/api/usuarios/login', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: 'Preencha todos os campos.' });
  try {
    const [rows] = await pool.query('SELECT * FROM usuarios WHERE email = ? AND senha = ?', [email, senha]);
    if (rows.length === 0) return res.status(401).json({ erro: 'Usuário ou senha incorretos.' });
    const usuario = rows[0];
    res.json({ nome: usuario.nome, email: usuario.email });
  } catch (e) {
    res.status(500).json({ erro: 'Erro no servidor.' });
  }
});

// Listar publicações (exemplo)
app.get('/api/publicacoes', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM publicacoes');
    res.json(rows);
  } catch (e) {
    res.status(500).json({ erro: 'Erro no servidor.' });
  }
});

// Like/Dislike/Comentário (exemplo simplificado)
app.post('/api/publicacoes/:id/interagir', async (req, res) => {
  const { tipo, comentario, usuario_email } = req.body;
  const idPublicacao = req.params.id;
  if (!usuario_email) return res.status(400).json({ erro: 'Usuário não informado.' });
  try {
    if (tipo === 'like' || tipo === 'dislike') {
      // Salva reação
      await pool.query('INSERT INTO reacoes_usuarios (idusuarios, idpublicacoes, reacoes) VALUES ((SELECT id FROM usuarios WHERE email = ?), ?, ?) ON DUPLICATE KEY UPDATE reacoes = ?', [usuario_email, idPublicacao, tipo, tipo]);
      res.json({ sucesso: true });
    } else if (tipo === 'comentario' && comentario) {
      await pool.query('INSERT INTO comentarios (idusuarios, idpublicacoes, texto) VALUES ((SELECT id FROM usuarios WHERE email = ?), ?, ?)', [usuario_email, idPublicacao, comentario]);
      res.json({ sucesso: true });
    } else {
      res.status(400).json({ erro: 'Tipo de interação inválido.' });
    }
  } catch (e) {
    res.status(500).json({ erro: 'Erro no servidor.' });
  }
});

// Listar comentários de uma publicação
app.get('/api/publicacoes/:id/comentarios', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT c.texto, c.data, u.nome FROM comentarios c JOIN usuarios u ON c.idusuarios = u.id WHERE c.idpublicacoes = ?', [req.params.id]);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ erro: 'Erro no servidor.' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log('Servidor rodando na porta', PORT));
