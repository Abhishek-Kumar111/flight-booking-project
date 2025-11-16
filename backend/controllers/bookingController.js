import pool from '../config/database.js';

export const createBooking = async (req, res) => {
  try {
    const { flightId, passengerName, passengerEmail, passengerPhone, seats } = req.body;

    if (!flightId || !passengerName || !passengerEmail || !seats) {
      return res.status(400).json({ 
        error: 'Flight ID, passenger name, email, and seats are required' 
      });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Check flight availability
      const [flights] = await connection.execute(
        'SELECT * FROM flights WHERE id = ? FOR UPDATE',
        [flightId]
      );

      if (flights.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: 'Flight not found' });
      }

      const flight = flights[0];

      if (flight.available_seats < seats) {
        await connection.rollback();
        return res.status(400).json({ 
          error: 'Not enough seats available' 
        });
      }

      // Create booking
      const [result] = await connection.execute(
        `INSERT INTO bookings (flight_id, passenger_name, passenger_email, passenger_phone, seats, booking_date, status)
         VALUES (?, ?, ?, ?, ?, NOW(), 'confirmed')`,
        [flightId, passengerName, passengerEmail, passengerPhone || null, seats]
      );

      // Update available seats
      await connection.execute(
        'UPDATE flights SET available_seats = available_seats - ? WHERE id = ?',
        [seats, flightId]
      );

      await connection.commit();

      // Fetch the created booking
      const [bookings] = await pool.execute(
        'SELECT * FROM bookings WHERE id = ?',
        [result.insertId]
      );

      res.status(201).json(bookings[0]);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBookings = async (req, res) => {
  try {
    const { email } = req.query;
    
    let query = `
      SELECT b.*, f.flight_number, f.origin, f.destination, 
             f.departure_time, f.arrival_time, f.price
      FROM bookings b
      JOIN flights f ON b.flight_id = f.id
    `;
    
    const params = [];
    if (email) {
      query += ' WHERE b.passenger_email = ?';
      params.push(email);
    }
    
    query += ' ORDER BY b.booking_date DESC';
    
    const [bookings] = await pool.execute(query, params);
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};