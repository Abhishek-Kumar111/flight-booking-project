import pool from '../config/database.js';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const AVIATIONSTACK_API_KEY = process.env.AVIATIONSTACK_API_KEY || 'aab180211f0588d2c6e20f1626349a6b';
const AVIATIONSTACK_BASE_URL = 'http://api.aviationstack.com/v1'; // Changed to http

// Add this fallback airport list
const FALLBACK_AIRPORTS = [
  { code: 'DEL', name: 'Indira Gandhi International Airport', city: 'Delhi', country: 'India' },
  { code: 'CCU', name: 'Netaji Subhas Chandra Bose International Airport', city: 'Kolkata', country: 'India' },
  { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj International Airport', city: 'Mumbai', country: 'India' },
  { code: 'MAA', name: 'Chennai International Airport', city: 'Chennai', country: 'India' },
  { code: 'BLR', name: 'Kempegowda International Airport', city: 'Bangalore', country: 'India' },
  { code: 'HYD', name: 'Rajiv Gandhi International Airport', city: 'Hyderabad', country: 'India' },
  { code: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'USA' },
  { code: 'LAX', name: 'Los Angeles International Airport', city: 'Los Angeles', country: 'USA' },
  { code: 'LHR', name: 'London Heathrow Airport', city: 'London', country: 'UK' },
  { code: 'DXB', name: 'Dubai International Airport', city: 'Dubai', country: 'UAE' },
];

// Search flights using Aviationstack API
export const searchFlights = async (req, res) => {
  try {
    const { origin, destination, departureDate } = req.query;

    if (!origin || !destination || !departureDate) {
      return res.status(400).json({ 
        error: 'Origin, destination, and departure date are required' 
      });
    }

    // Extract airport codes (3 letters, uppercase)
    const originCode = origin.trim().toUpperCase().substring(0, 3);
    const destCode = destination.trim().toUpperCase().substring(0, 3);

    console.log(`Searching flights: ${originCode} -> ${destCode} on ${departureDate}`);

    try {
      // Call Aviationstack API
      const response = await axios.get(`${AVIATIONSTACK_BASE_URL}/flights`, {
        params: {
          access_key: AVIATIONSTACK_API_KEY,
          dep_iata: originCode,
          arr_iata: destCode,
          flight_date: departureDate
        },
        timeout: 15000 // 15 second timeout
      });

      // Check for API errors first
      if (response.data.error) {
        console.error('API Error:', response.data.error);
        
        // If subscription plan doesn't support this, fallback to database
        if (response.data.error.code === 'function_access_restricted') {
          console.log('API subscription plan limitation - falling back to database');
          return await searchFlightsFromDatabase(origin, destination, departureDate, res);
        }
        
        return res.status(400).json({
          error: response.data.error.info || 'API error occurred',
          details: response.data.error
        });
      }

      if (response.data && response.data.data && response.data.data.length > 0) {
        // Transform Aviationstack data to our format
        const flights = response.data.data.map((flight, index) => {
          const depTime = flight.departure?.scheduled 
            ? new Date(flight.departure.scheduled) 
            : flight.departure?.estimated
            ? new Date(flight.departure.estimated)
            : new Date(`${departureDate}T12:00:00`);
          
          const arrTime = flight.arrival?.scheduled 
            ? new Date(flight.arrival.scheduled) 
            : flight.arrival?.estimated
            ? new Date(flight.arrival.estimated)
            : new Date(depTime.getTime() + 3 * 60 * 60 * 1000);

          return {
            id: `aviation_${index}_${Date.now()}`,
            flight_number: flight.flight?.iata || flight.flight?.number || `FL${index + 1}`,
            airline: flight.airline?.name || 'Unknown Airline',
            origin: flight.departure?.airport || originCode,
            destination: flight.arrival?.airport || destCode,
            origin_code: flight.departure?.iata || originCode,
            destination_code: flight.arrival?.iata || destCode,
            departure_time: depTime.toISOString(),
            arrival_time: arrTime.toISOString(),
            price: Math.floor(Math.random() * 300) + 150,
            total_seats: 180,
            available_seats: Math.floor(Math.random() * 100) + 50,
            flight_status: flight.flight_status || 'scheduled',
            _originalData: {
              flight_iata: flight.flight?.iata,
              flight_number: flight.flight?.number,
              airline_code: flight.airline?.iata,
              dep_iata: flight.departure?.iata,
              arr_iata: flight.arrival?.iata,
              dep_airport: flight.departure?.airport,
              arr_airport: flight.arrival?.airport
            }
          };
        });

        console.log(`Found ${flights.length} flights from API`);
        res.json(flights);
      } else {
        console.log('No flights found from API - falling back to database');
        return await searchFlightsFromDatabase(origin, destination, departureDate, res);
      }
    } catch (apiError) {
      console.error('Aviationstack API error:', {
        status: apiError.response?.status,
        data: apiError.response?.data,
        message: apiError.message
      });
      
      // Handle subscription plan limitation (403 error)
      if (apiError.response?.status === 403 || 
          apiError.response?.data?.error?.code === 'function_access_restricted') {
        console.log('Subscription plan limitation detected - using database fallback');
        return await searchFlightsFromDatabase(origin, destination, departureDate, res);
      }
      
      // Handle invalid API key
      if (apiError.response?.data?.error?.code === 'invalid_access_key') {
        console.log('Invalid API key - using database fallback');
        return await searchFlightsFromDatabase(origin, destination, departureDate, res);
      }
      
      // For other errors, also fallback to database
      console.log('API request failed - falling back to database');
      return await searchFlightsFromDatabase(origin, destination, departureDate, res);
    }
  } catch (error) {
    console.error('Error searching flights:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

// Helper function to search flights from database
const searchFlightsFromDatabase = async (origin, destination, departureDate, res) => {
  try {
    const [flights] = await pool.execute(
      `SELECT * FROM flights 
       WHERE (LOWER(origin) LIKE LOWER(?) OR origin LIKE ?)
       AND (LOWER(destination) LIKE LOWER(?) OR destination LIKE ?)
       AND DATE(departure_time) = ?
       AND available_seats > 0
       ORDER BY departure_time ASC`,
      [
        `%${origin.trim()}%`, 
        origin.trim().toUpperCase().substring(0, 3),
        `%${destination.trim()}%`, 
        destination.trim().toUpperCase().substring(0, 3),
        departureDate
      ]
    );

    if (flights.length > 0) {
      console.log(`Found ${flights.length} flights from database`);
      res.json(flights);
    } else {
      // If no flights in database, create some sample flights for the route
      console.log('No flights in database - creating sample flights');
      const sampleFlights = createSampleFlights(origin, destination, departureDate);
      res.json(sampleFlights);
    }
  } catch (dbError) {
    console.error('Database search error:', dbError);
    // Create sample flights as last resort
    const sampleFlights = createSampleFlights(origin, destination, departureDate);
    res.json(sampleFlights);
  }
};

// Create sample flights when API and database both fail
const createSampleFlights = (origin, destination, departureDate) => {
  const airlines = ['Air India', 'IndiGo', 'SpiceJet', 'Vistara', 'GoAir'];
  const times = ['08:00', '10:30', '14:00', '16:30', '19:00'];
  
  return times.map((time, index) => {
    const depTime = new Date(`${departureDate}T${time}:00`);
    const arrTime = new Date(depTime.getTime() + (2 + Math.random() * 2) * 60 * 60 * 1000);
    
    return {
      id: `sample_${Date.now()}_${index}`,
      flight_number: `${origin.substring(0, 2)}${100 + index}`,
      airline: airlines[index % airlines.length],
      origin: origin.toUpperCase().substring(0, 3),
      destination: destination.toUpperCase().substring(0, 3),
      departure_time: depTime.toISOString(),
      arrival_time: arrTime.toISOString(),
      price: Math.floor(Math.random() * 300) + 150,
      total_seats: 180,
      available_seats: Math.floor(Math.random() * 100) + 50
    };
  });
};

// Get airports from Aviationstack (for autocomplete) - with fallback
export const searchAirports = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 1) {
      return res.json([]);
    }

    const queryUpper = query.toUpperCase().trim();
    const results = [];

    // First, check fallback airports
    FALLBACK_AIRPORTS.forEach(airport => {
      if (
        airport.code.startsWith(queryUpper) ||
        airport.city.toUpperCase().startsWith(queryUpper) ||
        airport.name.toUpperCase().includes(queryUpper)
      ) {
        results.push(airport);
      }
    });

    // Then try API if available
    try {
      const response = await axios.get(`${AVIATIONSTACK_BASE_URL}/airports`, {
        params: {
          access_key: AVIATIONSTACK_API_KEY,
          search: queryUpper,
          limit: 50
        },
        timeout: 10000
      });

      if (!response.data.error && response.data && response.data.data) {
        response.data.data
          .filter(airport => airport.iata_code)
          .forEach(airport => {
            if (!results.find(r => r.code === airport.iata_code)) {
              results.push({
                code: airport.iata_code,
                name: airport.airport_name,
                city: airport.city_name || airport.airport_name,
                country: airport.country_name
              });
            }
          });
      }
    } catch (apiError) {
      // If API fails, just use fallback airports (already added above)
      console.log('Using fallback airports due to API error');
    }

    const uniqueResults = results
      .filter((airport, index, self) => 
        index === self.findIndex(a => a.code === airport.code)
      )
      .slice(0, 30);

    res.json(uniqueResults);
  } catch (error) {
    console.error('Error searching airports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Test API key functionality
export const testAviationstackAPI = async (req, res) => {
  try {
    console.log('Testing Aviationstack API...');
    
    // Test with a common route (JFK to LAX)
    const testResponse = await axios.get(`${AVIATIONSTACK_BASE_URL}/flights`, {
      params: {
        access_key: AVIATIONSTACK_API_KEY,
        dep_iata: 'JFK',
        arr_iata: 'LAX',
        flight_date: new Date().toISOString().split('T')[0]
      },
      timeout: 10000
    });

    if (testResponse.data.error) {
      return res.status(400).json({
        success: false,
        error: testResponse.data.error,
        message: 'API error - will use database fallback'
      });
    }

    res.json({
      success: true,
      message: 'API key is working correctly',
      data: {
        total_flights: testResponse.data.data?.length || 0,
        pagination: testResponse.data.pagination
      }
    });
  } catch (error) {
    console.error('API Test Error:', error.response?.data || error.message);
    res.json({
      success: false,
      message: 'API not available - will use database fallback',
      error: error.response?.data?.error || error.message
    });
  }
};

export const getAllFlights = async (req, res) => {
  try {
    const [flights] = await pool.execute(
      'SELECT * FROM flights WHERE available_seats > 0 ORDER BY departure_time ASC'
    );
    res.json(flights);
  } catch (error) {
    console.error('Error fetching flights:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getFlightById = async (req, res) => {
  try {
    const { id } = req.params;
    const [flights] = await pool.execute(
      'SELECT * FROM flights WHERE id = ?',
      [id]
    );

    if (flights.length === 0) {
      return res.status(404).json({ error: 'Flight not found' });
    }

    res.json(flights[0]);
  } catch (error) {
    console.error('Error fetching flight:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getAirports = async (req, res) => {
  try {
    const [origins] = await pool.execute(
      'SELECT DISTINCT origin FROM flights ORDER BY origin ASC'
    );
    const [destinations] = await pool.execute(
      'SELECT DISTINCT destination FROM flights ORDER BY destination ASC'
    );
    
    const airports = [...new Set([
      ...origins.map(r => r.origin),
      ...destinations.map(r => r.destination)
    ])].sort();

    res.json(airports);
  } catch (error) {
    console.error('Error fetching airports:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};