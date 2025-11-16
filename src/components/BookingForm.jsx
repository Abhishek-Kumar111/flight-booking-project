import { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const BookingForm = ({ flight, onBookingSuccess, onClose }) => {
  const [formData, setFormData] = useState({
    passengerName: '',
    passengerEmail: '',
    passengerPhone: '',
    seats: 1
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/bookings`, {
        flightId: flight.id,
        ...formData
      });
      alert(`Booking confirmed! Booking ID: ${response.data.id}`);
      onBookingSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  if (!flight) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Book Flight</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="font-semibold">{flight.flight_number} - {flight.airline}</p>
          <p className="text-sm text-gray-600">
            {flight.origin} → {flight.destination}
          </p>
          <p className="text-sm text-gray-600">
            ${flight.price} per seat | {flight.available_seats} seats available
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Passenger Name *
            </label>
            <input
              type="text"
              value={formData.passengerName}
              onChange={(e) => setFormData({ ...formData, passengerName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email *
            </label>
            <input
              type="email"
              value={formData.passengerEmail}
              onChange={(e) => setFormData({ ...formData, passengerEmail: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              value={formData.passengerPhone}
              onChange={(e) => setFormData({ ...formData, passengerPhone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Number of Seats *
            </label>
            <input
              type="number"
              min="1"
              max={flight.available_seats}
              value={formData.seats}
              onChange={(e) => setFormData({ ...formData, seats: parseInt(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg font-semibold hover:bg-gray-400 transition duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 disabled:bg-blue-400"
            >
              {loading ? 'Booking...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookingForm;