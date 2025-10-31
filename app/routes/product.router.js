import { Router } from 'express';
import { requireJwtCookie } from '../middleware/auth.middleware.js';
import { policies } from '../middleware/policies.middleware.js';
import { productController as ctrl } from '../controllers/product.controller.js';

const router = Router();

// Public: list products (view)
router.get('/products', (req, res) => ctrl.listView(req, res));

// API REST - Productos
router.get('/api/products', (req, res) => ctrl.listJSON(req, res));
router.get('/api/products/:id', (req, res) => ctrl.getById(req, res));
router.post('/api/products', requireJwtCookie, policies('admin'), (req, res) => ctrl.create(req, res));
router.put('/api/products/:id', requireJwtCookie, policies('admin'), (req, res) => ctrl.update(req, res));
router.delete('/api/products/:id', requireJwtCookie, policies('admin'), (req, res) => ctrl.remove(req, res));

// Web: Formularios de productos (admin)
router.get('/products/new', requireJwtCookie, policies('admin'), (req, res) => ctrl.newForm(req, res));
router.post('/products/new', requireJwtCookie, policies('admin'), (req, res) => ctrl.createFromForm(req, res));
router.get('/products/:id/edit', requireJwtCookie, policies('admin'), (req, res) => ctrl.editForm(req, res));
router.post('/products/:id/edit', requireJwtCookie, policies('admin'), (req, res) => ctrl.updateFromForm(req, res));
router.post('/products/:id', requireJwtCookie, policies('admin'), (req, res) => ctrl.deleteFromForm(req, res));

export default router;
