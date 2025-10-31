import { Router } from "express";
import { requireJwtCookie } from "../middleware/auth.middleware.js";
import { policies } from '../middleware/policies.middleware.js';
import { orderController as ctrl } from '../controllers/order.controller.js';

const router = Router();

router.use(requireJwtCookie);

// Vistas
// Redirect to login if the user is not authenticated (cookie missing)
router.get('/orders', (req, res) => {
	// res.locals.user is populated by server-level middleware if JWT cookie present
	if (!req.cookies || !req.cookies.access_token) {
		return res.redirect('/auth/login');
	}
	return ctrl.listView(req, res);
});

// API REST
router.get('/api/orders', (req, res) => ctrl.listJSON(req, res));
router.get('/api/orders/:id', policies('admin', 'user'), (req, res) => ctrl.getById(req, res));
router.get('/api/orders/:code', policies('admin', 'user'), (req, res) => ctrl.getByCode(req, res));
router.post('/api/orders/', policies('admin'), (req, res) => ctrl.create(req, res));
router.put('/api/orders/:id', policies('admin'), (req, res) => ctrl.update(req, res));
router.delete('/api/orders/:id', policies('admin'), (req, res) => ctrl.remove(req, res));


// Semilla Base
router.post('/api/orders/seed', policies('admin', 'user'), (req, res) => ctrl.seed(req, res));

export default router;