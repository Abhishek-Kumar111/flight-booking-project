import pool from '../config/database.js';

export const searchFlights = async (req, res) => {
  try {
    const { origin, destination, departureDate } = req.query;

    if (!origin || !destination || !departureDate) {
      return res.status(400).json({ 
        error: 'Origin, destination, and departure date are required' 
      });
    }

    // Use case-insensitive search with LIKE for better matching
    const [flights] = await pool.execute(
      `SELECT * FROM flights 
       WHERE LOWER(origin) = LOWER(?) 
       AND LOWER(destination) = LOWER(?)
       AND DATE(departure_time) = ?
       AND available_seats > 0
       ORDER BY departure_time ASC`,
      [origin.trim(), destination.trim(), departureDate]
    );

    res.json(flights);
  } catch (error) {
    console.error('Error searching flights:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
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

// Get unique airports/cities for dropdown
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