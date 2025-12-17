// components/Modal.tsx
import React from "react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
};

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay with transparency */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal content */}
      <div className="relative z-10 bg-white rounded-lg p-6 shadow-lg w-full max-w-lg	">
        <button
          onClick={onClose}
          className="cursor-pointer absolute top-2 right-2 text-gray-500 hover:text-red-600 text-xl mb-4 mr-4"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
};

export default Modal;
