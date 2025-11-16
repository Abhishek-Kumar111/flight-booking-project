import express from 'express';
import { 
  searchFlights, 
  getAllFlights, 
  getFlightById, 
  getAirports, 
  searchAirports,
  testAviationstackAPI 
} from '../controllers/flightController.js';

const router = express.Router();

router.get('/test-api', testAviationstackAPI); // Test API endpoint
router.get('/airports/search', searchAirports);
router.get('/search', searchFlights);
router.get('/airports', getAirports);
router.get('/', getAllFlights);
router.get('/:id', getFlightById);

export default router;