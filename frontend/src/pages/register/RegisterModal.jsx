// frontend/src/pages/register/RegisterModal.jsx
//import React, { useState } from 'react';
// import './RegisterModal.css';
// import { auth } from '../../firebase-config/config';
// import { createUserWithEmailAndPassword } from 'firebase/auth';

// function RegisterModal({ onClose }) {
//   const [email, setEmail] = useState('');
//   const [password, setPassword] = useState('');

//   const handleRegister = async (e) => {
//     e.preventDefault();
//     try {
//       const userCredential = await createUserWithEmailAndPassword(auth, email, password);
//       alert(`Usuário ${userCredential.user.email} criado com sucesso!`);
//       onClose(); // Fecha o modal após o sucesso
//     } catch (error) {
//       alert(`Falha no cadastro: ${error.message}`);
//     }
//   };

//   return (
//     <div className="modal-overlay" onClick={onClose}>
//       <div className="modal-content" onClick={(e) => e.stopPropagation()}>
//         <form onSubmit={handleRegister}>
//           <h2>Criar Conta</h2>
//           <p>Preencha os campos para criar sua conta.</p>
//           <div className="input-group">
//             <label htmlFor="reg-email">E-mail</label>
//             <input id="reg-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
//           </div>
//           <div className="input-group">
//             <label htmlFor="reg-password">Senha</label>
//             <input id="reg-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
//           </div>
//           <button type="submit" className="btn-login">Cadastrar</button>
//           <button type="button" className="btn-register" onClick={onClose}>Cancelar</button>
//         </form>
//       </div>
//     </div>
//   );
// }

//export default RegisterModal;