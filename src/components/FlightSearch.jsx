import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const FlightSearch = ({ onSearchResults }) => {
  const [searchData, setSearchData] = useState({
    origin: '',
    destination: '',
    departureDate: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [originSuggestions, setOriginSuggestions] = useState([]);
  const [destSuggestions, setDestSuggestions] = useState([]);
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [apiStatus, setApiStatus] = useState(null);

  // Test API on component mount
  useEffect(() => {
    const testAPI = async () => {
      try {
        const response = await axios.get(`${API_URL}/flights/test-api`);
        setApiStatus(response.data.success ? 'connected' : 'error');
        console.log('API Status:', response.data);
      } catch (err) {
        setApiStatus('error');
        console.error('API Test failed:', err);
      }
    };
    testAPI();
  }, []);

  // Search airports as user types (triggered after 2 characters)
  const searchAirports = async (query, type) => {
    if (query.length < 2) {
      if (type === 'origin') setOriginSuggestions([]);
      else setDestSuggestions([]);
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/flights/airports/search`, {
        params: { query: query.toUpperCase() }
      });

      if (type === 'origin') {
        setOriginSuggestions(response.data || []);
      } else {
        setDestSuggestions(response.data || []);
      }
    } catch (err) {
      console.error('Error searching airports:', err);
      if (type === 'origin') setOriginSuggestions([]);
      else setDestSuggestions([]);
    }
  };

  const handleOriginChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); // Only letters
    setSearchData({ ...searchData, origin: value });
    if (value.length >= 2) {
      searchAirports(value, 'origin');
      setShowOriginSuggestions(true);
    } else {
      setOriginSuggestions([]);
      setShowOriginSuggestions(false);
    }
  };

  const handleDestChange = (e) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); // Only letters
    setSearchData({ ...searchData, destination: value });
    if (value.length >= 2) {
      searchAirports(value, 'dest');
      setShowDestSuggestions(true);
    } else {
      setDestSuggestions([]);
      setShowDestSuggestions(false);
    }
  };

  const selectAirport = (airport, type) => {
    if (type === 'origin') {
      setSearchData({ ...searchData, origin: airport.code });
      setShowOriginSuggestions(false);
    } else {
      setSearchData({ ...searchData, destination: airport.code });
      setShowDestSuggestions(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (searchData.origin === searchData.destination) {
      setError('Origin and destination cannot be the same');
      return;
    }

    if (searchData.origin.length < 3 || searchData.destination.length < 3) {
      setError('Please enter valid 3-letter airport codes (e.g., DEL, CCU, JFK, LAX)');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`${API_URL}/flights/search`, {
        params: {
          origin: searchData.origin.substring(0, 3).toUpperCase(),
          destination: searchData.destination.substring(0, 3).toUpperCase(),
          departureDate: searchData.departureDate
        }
      });
      
      if (response.data && response.data.length > 0) {
        onSearchResults(response.data);
        setError('');
      } else {
        onSearchResults([]);
        setError(`No flights found for ${searchData.origin} to ${searchData.destination} on ${searchData.departureDate}. 
                  Try different dates or check if the route exists.`);
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Search Flights</h2>
        {apiStatus && (
          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
            apiStatus === 'connected' 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {apiStatus === 'connected' ? '✓ API Connected' : '✗ API Error'}
          </div>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Enter 3-letter airport codes (e.g., DEL, CCU, JFK, LAX, LHR). Start typing to see suggestions.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From (Airport Code) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={searchData.origin}
              onChange={handleOriginChange}
              onFocus={() => setShowOriginSuggestions(true)}
              placeholder="e.g., JFK, LAX, LHR"
              maxLength={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
              required
            />
            {showOriginSuggestions && originSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {originSuggestions.map((airport, idx) => (
                  <div
                    key={idx}
                    onClick={() => selectAirport(airport, 'origin')}
                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100"
                  >
                    <div className="font-semibold">{airport.code} - {airport.name}</div>
                    <div className="text-sm text-gray-500">{airport.city}, {airport.country}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To (Airport Code) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={searchData.destination}
              onChange={handleDestChange}
              onFocus={() => setShowDestSuggestions(true)}
              placeholder="e.g., JFK, LAX, LHR"
              maxLength={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent uppercase"
              required
            />
            {showDestSuggestions && destSuggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {destSuggestions.map((airport, idx) => (
                  <div
                    key={idx}
                    onClick={() => selectAirport(airport, 'dest')}
                    className="px-4 py-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100"
                  >
                    <div className="font-semibold">{airport.code} - {airport.name}</div>
                    <div className="text-sm text-gray-500">{airport.city}, {airport.country}</div>
                  </div>
                ))}
              </div>
            )}
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