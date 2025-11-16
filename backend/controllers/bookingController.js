import pool from '../config/database.js';

// Generate unique booking reference
const generateBookingReference = () => {
  const prefix = 'BK';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

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

      // Generate unique booking reference
      let bookingReference;
      let isUnique = false;
      let attempts = 0;
      
      while (!isUnique && attempts < 10) {
        bookingReference = generateBookingReference();
        const [existing] = await connection.execute(
          'SELECT id FROM bookings WHERE booking_reference = ?',
          [bookingReference]
        );
        if (existing.length === 0) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        await connection.rollback();
        return res.status(500).json({ error: 'Failed to generate booking reference' });
      }

      // Create booking with reference
      const [result] = await connection.execute(
        `INSERT INTO bookings (booking_reference, flight_id, passenger_name, passenger_email, passenger_phone, seats, booking_date, status)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), 'confirmed')`,
        [bookingReference, flightId, passengerName, passengerEmail, passengerPhone || null, seats]
      );

      // Update available seats
      await connection.execute(
        'UPDATE flights SET available_seats = available_seats - ? WHERE id = ?',
        [seats, flightId]
      );

      await connection.commit();

      // Fetch the created booking with flight details
      const [bookings] = await pool.execute(
        `SELECT b.*, f.flight_number, f.airline, f.origin, f.destination, 
                f.departure_time, f.arrival_time, f.price
         FROM bookings b
         JOIN flights f ON b.flight_id = f.id
         WHERE b.id = ?`,
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
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};

export const getBookings = async (req, res) => {
  try {
    const { email, bookingReference } = req.query;
    
    let query = `
      SELECT b.*, f.flight_number, f.airline, f.origin, f.destination, 
             f.departure_time, f.arrival_time, f.price
      FROM bookings b
      JOIN flights f ON b.flight_id = f.id
      WHERE 1=1
    `;
    
    const params = [];
    if (email) {
      query += ' AND b.passenger_email = ?';
      params.push(email);
    }
    if (bookingReference) {
      query += ' AND b.booking_reference = ?';
      params.push(bookingReference);
    }
    
    query += ' ORDER BY b.booking_date DESC';
    
    const [bookings] = await pool.execute(query, params);
    res.json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBookingByReference = async (req, res) => {
  try {
    const { reference } = req.params;
    
    const [bookings] = await pool.execute(
      `SELECT b.*, f.flight_number, f.airline, f.origin, f.destination, 
              f.departure_time, f.arrival_time, f.price
       FROM bookings b
       JOIN flights f ON b.flight_id = f.id
       WHERE b.booking_reference = ?`,
      [reference]
    );

    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    res.json(bookings[0]);
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const cancelBooking = async (req, res) => {
  try {
    const { reference } = req.params;
    
    console.log('Cancel booking called with reference:', reference); // Debug log

    if (!reference) {
      return res.status(400).json({ error: 'Booking reference is required' });
    }

    // Start transaction
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
      // Get booking details
      const [bookings] = await connection.execute(
        `SELECT b.*, f.id as flight_id 
         FROM bookings b
         JOIN flights f ON b.flight_id = f.id
         WHERE b.booking_reference = ? FOR UPDATE`,
        [reference]
      );

      if (bookings.length === 0) {
        await connection.rollback();
        connection.release();
        return res.status(404).json({ error: 'Booking not found' });
      }

      const booking = bookings[0];

      // Check if already cancelled
      if (booking.status === 'cancelled') {
        await connection.rollback();
        connection.release();
        return res.status(400).json({ error: 'Booking is already cancelled' });
      }

      // Update booking status to cancelled
      await connection.execute(
        'UPDATE bookings SET status = ? WHERE booking_reference = ?',
        ['cancelled', reference]
      );

      // Restore seats to the flight
      await connection.execute(
        'UPDATE flights SET available_seats = available_seats + ? WHERE id = ?',
        [booking.seats, booking.flight_id]
      );

      await connection.commit();

      // Fetch updated booking with flight details
      const [updatedBookings] = await pool.execute(
        `SELECT b.*, f.flight_number, f.airline, f.origin, f.destination, 
                f.departure_time, f.arrival_time, f.price
         FROM bookings b
         JOIN flights f ON b.flight_id = f.id
         WHERE b.booking_reference = ?`,
        [reference]
      );

      connection.release();

      res.json({
        message: 'Booking cancelled successfully',
        booking: updatedBookings[0]
      });
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};