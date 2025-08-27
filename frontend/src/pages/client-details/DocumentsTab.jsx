import React, { useState, useEffect } from 'react';
import { storage, auth, db } from '../../firebase-config/config';
import { ref, uploadBytes, listAll, getDownloadURL, deleteObject, getMetadata } from 'firebase/storage';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore';
import './DocumentsTab.css';
import Swal from 'sweetalert2';

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
  const [user] = useAuthState(auth);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (user) {
        const userDocRef = doc(db, 'usuarios', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setUserInfo(userDoc.data());
        }
      }
    };
    fetchUserInfo();
  }, [user]);

  const fetchFiles = async () => {
    // ... (lógica de busca de arquivos continua a mesma)
    setFileList([]);
    setIsLoading(true);
    try {
      if (!client || !client.id) throw new Error("ID do cliente não encontrado.");
      const folderRef = ref(storage, `clientes/${client.id}`);
      const res = await listAll(folderRef);
      const filesPromises = res.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        const metadata = await getMetadata(itemRef);
        const [type, ...nameParts] = metadata.name.split('___');
        const responsibleName = metadata.customMetadata?.responsibleUserName || 'Não identificado';
        const responsibleCargo = metadata.customMetadata?.responsibleUserCargo || '';
        const responsibleDisplay = responsibleCargo 
          ? `${responsibleCargo.toUpperCase()}: ${responsibleName.toUpperCase()}`
          : responsibleName.toUpperCase();
        return {
          name: nameParts.join('___'),
          type: type.replace(/-/g, ' '),
          url: url,
          fullPath: itemRef.fullPath,
          date: metadata.timeCreated,
          responsible: responsibleDisplay,
        };
      });
      const files = await Promise.all(filesPromises);
      files.sort((a, b) => new Date(b.date) - new Date(a.date));
      setFileList(files);
    } catch (error) {
      console.error("Erro ao buscar documentos:", error);
      Swal.fire("Erro!", "Falha ao buscar os documentos.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (client.id) {
        fetchFiles();
    }
  }, [client.id]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !documentType.trim()) {
      Swal.fire("Atenção!", "Por favor, preencha o tipo e selecione um arquivo.", "warning");
      return;
    }
    if (!userInfo) {
        Swal.fire("Erro!", "Não foi possível identificar o usuário. Por favor, tente novamente.", "error");
        return;
    }
    setIsUploading(true);
    const sanitizedType = documentType.trim().replace(/\s+/g, '-');
    const newFileName = `${sanitizedType}___${selectedFile.name}`;
    const filePath = `clientes/${client.id}/${newFileName}`;
    const fileRef = ref(storage, filePath);
    const metadata = {
      customMetadata: {
        'responsibleUserName': userInfo.nome,
        'responsibleUserCargo': userInfo.cargo || ''
      }
    };
    try {
      await uploadBytes(fileRef, selectedFile, metadata);
      Swal.fire('Sucesso!', 'Documento enviado com sucesso!', 'success');
      resetAddForm();
      fetchFiles();
    } catch (error) {
      console.error("Erro ao enviar o documento:", error);
      Swal.fire("Erro!", "Falha ao enviar o documento.", "error");
    } finally {
      setIsUploading(false);
    }
  };

  const confirmDelete = (filePath, fileName) => {
    Swal.fire({
      title: `Excluir "${fileName}"?`,
      text: "Esta ação não pode ser desfeita!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar'
    }).then(async (result) => {
      if (result.isConfirmed) {
        handleDeleteFile(filePath);
      }
    });
  };

  const handleDeleteFile = async (filePath) => {
    try {
      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);
      Swal.fire('Excluído!', 'O documento foi excluído com sucesso.', 'success');
      fetchFiles();
    } catch (error) {
      console.error("Erro ao excluir o documento:", error);
      Swal.fire("Erro!", "Falha ao excluir o documento.", "error");
    }
  };
  
  const resetAddForm = () => {
    setShowAddForm(false);
    setDocumentType('');
    setSelectedFile(null);
  };

  return (
    <div className="documents-tab-container">
      {/* ================================================================ */}
      {/* INÍCIO DA SEÇÃO QUE FOI RESTAURADA */}
      {/* ================================================================ */}
      <div className="documents-header">
        <h3>Documentos de {client.NOMECLIENTE}</h3>
        {!showAddForm && (
          <button onClick={() => setShowAddForm(true)} className="btn-add-document">
            + Adicionar documento
          </button>
        )}
      </div>
      {/* ================================================================ */}
      {/* FIM DA SEÇÃO RESTAURADA */}
      {/* ================================================================ */}

      {showAddForm && (
        <div className="add-document-form-container">
            <form onSubmit={handleUpload}>
                <h4>Novo Documento</h4>
                <div className="form-inputs">
                    <div className="input-group">
                        <label htmlFor="doc-type">Tipo do Documento</label>
                        <input 
                            id="doc-type" type="text" value={documentType}
                            onChange={(e) => setDocumentType(e.target.value)}
                            placeholder="Ex: RG, CPF, Comprovante de Residência" required
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="doc-file">Arquivo</label>
                        <input 
                            id="doc-file" type="file" onChange={handleFileChange} required
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
          <div className="doc-header-item col-date">Data de Envio</div>
          <div className="doc-header-item col-responsible">Responsável</div>
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
            <div className="doc-cell-item col-responsible">{file.responsible}</div>
            <div className="doc-cell-item col-actions">
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="action-icon">
                <i className="fa-regular fa-eye"></i>
              </a>
            </div>
            <div className="doc-cell-item col-actions">
              <button onClick={() => confirmDelete(file.fullPath, file.name)} className="action-icon delete-icon">
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