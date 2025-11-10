"use client";

import React, { useState, useEffect } from 'react';

const HiddenMintButton = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const handleScroll = () => {
    const scrollPosition = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    // Show button if scrolled to the bottom (with a small threshold)
    if (scrollPosition + windowHeight >= documentHeight - 10) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    // Check initial position
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleButtonClick = () => {
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <>
      {/* Hidden Mint Button */}
      <div
        className={`fixed bottom-24 transition-all duration-300 ease-in-out ${
          isVisible ? 'right-4' : '-right-[300px]'
        }`}
        style={{ zIndex: 40 }}
      >
        <button
          onClick={handleButtonClick}
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold text-sm"
        >
          hidden mint comming soon......
        </button>
      </div>

      {/* Modal Popup */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4"
          style={{ zIndex: 50 }}
          onClick={handleCloseModal}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl transform transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-4 text-purple-700 text-center">
              Mint the Clue
            </h2>
            <p className="text-gray-700 text-center leading-relaxed mb-6">
              chill.... minting is coming soon. Glad you found the secret mint. Your brain is powerful. Hope you find the way to the next hidden clue.
            </p>
            <button
              onClick={handleCloseModal}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all duration-200 hover:scale-105"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default HiddenMintButton;
