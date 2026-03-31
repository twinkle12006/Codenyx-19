import React, { useState } from 'react';
import api from '../utils/api';

export default function RatingModal({ volunteerId, sessionId, onClose }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!rating) return setError('Please select a rating');
    try {
      await api.post(`/volunteers/${volunteerId}/ratings`, { sessionId, rating, review });
      setSubmitted(true);
      setTimeout(onClose, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
        {submitted ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">🙏</div>
            <p className="font-semibold text-gray-700">Thank you for your feedback!</p>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-gray-800 mb-1">Rate your session</h2>
            <p className="text-sm text-gray-500 mb-4">How was your experience with this volunteer?</p>

            <div className="flex justify-center gap-2 mb-4">
              {[1, 2, 3, 4, 5].map(s => (
                <button key={s}
                  onMouseEnter={() => setHover(s)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(s)}
                  className={`text-3xl transition-transform hover:scale-110 ${
                    s <= (hover || rating) ? 'text-yellow-400' : 'text-gray-200'
                  }`}>
                  ★
                </button>
              ))}
            </div>

            <textarea value={review} onChange={e => setReview(e.target.value)}
              placeholder="Optional: share your thoughts..."
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-sahara-300 resize-none" />

            {error && <p className="text-red-500 text-xs mb-2">{error}</p>}

            <div className="flex gap-2">
              <button onClick={submit}
                className="flex-1 bg-sahara-500 text-white py-2 rounded-lg text-sm font-medium hover:bg-sahara-600">
                Submit
              </button>
              <button onClick={onClose}
                className="flex-1 border border-gray-200 text-gray-500 py-2 rounded-lg text-sm hover:bg-gray-50">
                Skip
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
