import { getDownloadURL, ref, uploadBytesResumable, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

const BUSINESS_DOC_ROOT = 'localBusinessDocs';

const sanitizeFileName = (name) => name.replace(/[^\w.\-()+]/g, '_');

export const uploadBusinessDocument = (businessId, file, onProgress) => {
  if (!businessId) {
    return Promise.reject(new Error('businessId is required to upload documents.'));
  }

  return new Promise((resolve, reject) => {
    const fileRef = ref(
      storage,
      `${BUSINESS_DOC_ROOT}/${businessId}/${Date.now()}-${sanitizeFileName(file.name)}`
    );

    const uploadTask = uploadBytesResumable(fileRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        if (onProgress) {
          onProgress(progress);
        }
      },
      (error) => {
        reject(error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve({ downloadURL, path: uploadTask.snapshot.ref.fullPath });
      }
    );
  });
};

export const deleteStoredFile = async (path) => {
  if (!path) return;
  const fileRef = ref(storage, path);
  await deleteObject(fileRef);
};
