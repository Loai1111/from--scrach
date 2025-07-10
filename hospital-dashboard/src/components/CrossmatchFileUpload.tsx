import React, { useState } from 'react';
import axios from 'axios';

interface CrossmatchFileUploadProps {
  requestId: string;
  onUploadSuccess: () => void;
}

const CrossmatchFileUpload: React.FC<CrossmatchFileUploadProps> = ({ requestId, onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setMessage('Please select a file to upload.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      await axios.post(`/api/requests/${requestId}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage('File uploaded successfully.');
      onUploadSuccess();
    } catch (error) {
      setMessage('Error uploading file.');
      console.error('Error uploading file:', error);
    }
  };

  return (
    <div>
      <h3>Upload Cross-match Report</h3>
      <form onSubmit={handleSubmit}>
        <input type="file" onChange={handleFileChange} />
        <button type="submit">Upload</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
};

export default CrossmatchFileUpload;