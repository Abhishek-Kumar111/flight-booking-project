import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Fallback airports if API fails
const FALLBACK_AIRPORTS = [
  { code: 'NYC', name: 'New York', city: 'New York' },
  { code: 'LAX', name: 'Los Angeles', city: 'Los Angeles' },
  { code: 'CHI', name: 'Chicago', city: 'Chicago' },
  { code: 'MIA', name: 'Miami', city: 'Miami' },
  { code: 'LAS', name: 'Las Vegas', city: 'Las Vegas' },
];

const FlightSearch = ({ onSearchResults }) => {
  const [searchData, setSearchData] = useState({
    origin: '',
    destination: '',
    departureDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [airports, setAirports] = useState(FALLBACK_AIRPORTS);

  // Load airports from database on component mount
  useEffect(() => {
    const loadAirports = async () => {
      try {
        const response = await axios.get(`${API_URL}/flights/airports`);
        if (response.data && response.data.length > 0) {
          // Convert to airport format
          const airportList = response.data.map(city => ({
            code: city.substring(0, 3).toUpperCase(),
            name: city,
            city: city
          }));
          setAirports(airportList);
        }
      } catch (err) {
        console.warn('Could not load airports from API, using fallback');
        // Keep fallback airports
      }
    };
    loadAirports();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (searchData.origin === searchData.destination) {
      setError('Origin and destination cannot be the same');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`${API_URL}/flights/search`, {
        params: {
          origin: searchData.origin,
          destination: searchData.destination,
          departureDate: searchData.departureDate
        }
      });
      
      if (response.data && response.data.length > 0) {
        onSearchResults(response.data);
      } else {
        onSearchResults([]);
        setError('No flights found for the selected criteria. Please try different dates or routes.');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to search flights';
      setError(errorMessage);
      onSearchResults([]);
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Search Flights</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From <span className="text-red-500">*</span>
            </label>
            <select
              value={searchData.origin}
              onChange={(e) => setSearchData({ ...searchData, origin: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              required
            >
              <option value="">Select origin</option>
              {airports.map((airport) => (
                <option key={airport.code} value={airport.city}>
                  {airport.city} {airport.code && `(${airport.code})`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To <span className="text-red-500">*</span>
            </label>
            <select
              value={searchData.destination}
              onChange={(e) => setSearchData({ ...searchData, destination: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              required
            >
              <option value="">Select destination</option>
              {airports.map((airport) => (
                <option 
                  key={airport.code} 
                  value={airport.city}
                  disabled={airport.city === searchData.origin}
                >
                  {airport.city} {airport.code && `(${airport.code})`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Departure Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={searchData.departureDate}
              onChange={(e) => setSearchData({ ...searchData, departureDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
        </div>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading || !searchData.origin || !searchData.destination || !searchData.departureDate}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-200 disabled:bg-blue-400 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Searching...
            </span>
          ) : (
            'Search Flights'
          )}
        </button>
      </form>
    </div>
  );
};

export default FlightSearch;