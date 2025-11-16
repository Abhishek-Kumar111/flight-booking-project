import express from 'express';
import { searchFlights, getAllFlights, getFlightById, getAirports } from '../controllers/flightController.js';

const router = express.Router();

router.get('/airports', getAirports);
router.get('/search', searchFlights);
router.get('/', getAllFlights);
router.get('/:id', getFlightById);

export default router;