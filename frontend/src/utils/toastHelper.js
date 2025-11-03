// frontend/src/utils/toastHelper.js
import Swal from 'sweetalert2';

// Este é o 'Toast' que você viu na imagem
const Toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
  didOpen: (toast) => {
    toast.addEventListener('mouseenter', Swal.stopTimer);
    toast.addEventListener('mouseleave', Swal.resumeTimer);
  }
});

// Função de sucesso que você vai chamar
export const showSuccessToast = (message) => {
  Toast.fire({
    icon: 'success',
    title: message
  });
};

// (Opcional) Uma função de erro no mesmo estilo
export const showErrorToast = (message) => {
  Toast.fire({
    icon: 'error',
    title: message
  });
};

// Este é o Modal de Confirmação (para Excluir)
// Ele continua sendo um modal normal
export const showDeleteConfirmation = (onConfirm) => {
  Swal.fire({
    title: 'Tem certeza?',
    text: "Você não poderá reverter esta ação!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Sim, excluir!',
    cancelButtonText: 'Cancelar'
  }).then((result) => {
    if (result.isConfirmed) {
      onConfirm(); // Executa a função de excluir que você passou
    }
  });
};