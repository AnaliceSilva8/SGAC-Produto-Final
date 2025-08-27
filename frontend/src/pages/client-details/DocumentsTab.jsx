import React, { useState, useEffect } from 'react';
import { storage } from '../../firebase-config/config';
import { ref, uploadBytes, listAll, getDownloadURL, deleteObject, getMetadata } from 'firebase/storage';
import './DocumentsTab.css';
import Swal from 'sweetalert2';

// Função para formatar a data (sem alterações)
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).replace(',', ' -');
};

function DocumentsTab({ client }) {
  const [fileList, setFileList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [documentType, setDocumentType] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);

  const fetchFiles = async () => {
    setFileList([]);
    setIsLoading(true);
    try {
      if (!client || !client.id) {
        throw new Error("ID do cliente não encontrado.");
      }
      const folderRef = ref(storage, `clientes/${client.id}`);
      const res = await listAll(folderRef);

      const filesPromises = res.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        const metadata = await getMetadata(itemRef);
        const [type, ...nameParts] = metadata.name.split('___');

        return {
          name: nameParts.join('___'),
          type: type.replace(/-/g, ' '),
          url: url,
          fullPath: itemRef.fullPath,
          date: metadata.timeCreated
        };
      });

      const files = await Promise.all(filesPromises);
      files.sort((a, b) => new Date(b.date) - new Date(a.date));
      setFileList(files);

    } catch (error) {
      console.error("Erro ao buscar documentos:", error);
      Swal.fire({
        icon: 'error',
        title: 'Erro!',
        text: 'Falha ao buscar os documentos.',
      });
      setFileList([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [client]);

  // CORREÇÃO: Função handleFileChange restaurada
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !documentType.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Atenção!',
        text: 'Por favor, preencha o tipo e selecione um arquivo.',
      });
      return;
    }

    setIsUploading(true);
    
    // CORREÇÃO: As linhas que definem o caminho e a referência do arquivo foram restauradas
    const sanitizedType = documentType.trim().replace(/\s+/g, '-');
    const newFileName = `${sanitizedType}___${selectedFile.name}`;
    const filePath = `clientes/${client.id}/${newFileName}`;
    const fileRef = ref(storage, filePath);

    try {
      await uploadBytes(fileRef, selectedFile);
      Swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: 'Documento enviado com sucesso!',
      });
      resetAddForm(); // Esta chamada agora funcionará
      fetchFiles();
    } catch (error) {
      console.error("Erro ao enviar o documento:", error);
      Swal.fire({
        icon: 'error',
        title: 'Erro!',
        text: 'Falha ao enviar o documento.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (filePath) => {
    Swal.fire({
      title: 'Tem certeza?',
      text: "Esta ação não pode ser desfeita!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const fileRef = ref(storage, filePath);
          await deleteObject(fileRef);
          Swal.fire(
            'Excluído!',
            'O documento foi excluído com sucesso.',
            'success'
          );
          fetchFiles();
        } catch (error) {
          console.error("Erro ao excluir o documento:", error);
          Swal.fire({
            icon: 'error',
            title: 'Erro!',
            text: 'Falha ao excluir o documento.',
          });
        }
      }
    });
  };
  
  // CORREÇÃO: Função resetAddForm restaurada
  const resetAddForm = () => {
    setShowAddForm(false);
    setDocumentType('');
    setSelectedFile(null);
  };

  return (
    <div className="documents-tab-container">
      {/* O seu JSX (HTML) continua exatamente o mesmo aqui */}
      {/* ... */}
      <div className="documents-header">
        <h3>Documentos de {client.NOMECLIENTE}</h3>
        {!showAddForm && (
          <button onClick={() => setShowAddForm(true)} className="btn-add-document">
            + Adicionar documento
          </button>
        )}
      </div>

      {showAddForm && (
        <div className="add-document-form-container">
          <form onSubmit={handleUpload}>
            <h4>Novo Documento</h4>
            <div className="form-inputs">
              <div className="input-group">
                <label htmlFor="doc-type">Tipo do Documento</label>
                <input 
                  id="doc-type"
                  type="text" 
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  placeholder="Ex: RG, CPF, Comprovante de Residência"
                  required
                />
              </div>
              <div className="input-group">
                <label htmlFor="doc-file">Arquivo</label>
                <input 
                  id="doc-file"
                  type="file"
                  onChange={handleFileChange}
                  required
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn-save-document" disabled={isUploading}>
                {isUploading ? 'Enviando...' : 'Salvar Documento'}
              </button>
              <button type="button" className="btn-cancel-document" onClick={resetAddForm}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="documents-list-table">
        <div className="doc-table-header">
          <div className="doc-header-item col-type">Tipo</div>
          <div className="doc-header-item col-name">Nome do Arquivo</div>
          <div className="doc-header-item col-date">Data</div>
          <div className="doc-header-item col-actions">Visualizar</div>
          <div className="doc-header-item col-actions">Excluir</div>
        </div>
        
        {!isLoading && fileList.length === 0 && (
          <div className="table-message">Nenhum documento encontrado.</div>
        )}
        
        {fileList.map((file) => (
          <div key={file.fullPath} className="doc-table-row">
            <div className="doc-cell-item col-type">{file.type}</div>
            <div className="doc-cell-item col-name">{file.name}</div>
            <div className="doc-cell-item col-date">{formatDate(file.date)}</div>
            <div className="doc-cell-item col-actions">
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="action-icon">
                <i className="fa-regular fa-eye"></i>
              </a>
            </div>
            <div className="doc-cell-item col-actions">
              <button onClick={() => handleDeleteFile(file.fullPath)} className="action-icon delete-icon">
                <i className="fa-regular fa-trash-can"></i>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DocumentsTab;