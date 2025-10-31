import { Router } from 'express';
import { requireJwtCookie } from '../middleware/auth.middleware.js';
import { policies } from '../middleware/policies.middleware.js';
import { cartController as ctrl } from '../controllers/cart.controller.js';

const router = Router();

// Vistas - Carrito del usuario
router.get('/cart', requireJwtCookie, policies('user'), (req, res) => ctrl.viewCart(req, res));

// API REST - Carrito (rutas específicas primero, luego parametrizadas)
router.get('/api/cart', requireJwtCookie, policies('user'), (req, res) => ctrl.getCart(req, res));
router.get('/api/cart/count', requireJwtCookie, policies('user'), (req, res) => ctrl.getCartCount(req, res));
router.post('/api/cart/purchase', requireJwtCookie, policies('user'), (req, res) => ctrl.purchase(req, res));
router.post('/api/cart/:productId', requireJwtCookie, policies('user'), (req, res) => ctrl.addItem(req, res));
router.put('/api/cart/:productId', requireJwtCookie, policies('user'), (req, res) => ctrl.updateItem(req, res));
router.delete('/api/cart/:productId', requireJwtCookie, policies('user'), (req, res) => ctrl.removeItem(req, res));

// Web - Formularios de carrito
router.post('/cart/:productId', requireJwtCookie, policies('user'), (req, res) => ctrl.addItemFromForm(req, res));

export default router;
