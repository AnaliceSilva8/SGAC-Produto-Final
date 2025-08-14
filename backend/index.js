// SGAC PROJETO/backend/index.js
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Servidor rodando!');
});

// --> VERIFIQUE SE ESTE BLOCO ESTÁ EXATAMENTE ASSIM <--
app.post('/login', (req, res) => { 
  const { email, password } = req.body;
  console.log('Tentativa de login recebida no backend:', { email, password });

  if (email === 'advogado@teste.com' && password === '123456') {
    res.json({ message: 'Login bem-sucedido! Bem-vindo!' });
  } else {
    res.status(401).json({ message: 'Email ou senha inválidos.' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor backend rodando na porta ${PORT}`);
});