import { Router } from "express";
import { requireJwtCookie } from "../middleware/auth.middleware.js";
import { User } from "../models/user.model.js";
import { UserDTO } from "../models/dto/user.dto.js";

const router = Router();

// Ruta /current que valida el JWT (por cookie) y devuelve datos del usuario como DTO
router.get('/current', requireJwtCookie, async (req, res) => {
  try {
    if (!req.user || !req.user._id) return res.status(401).json({ error: 'No autenticado' });
    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    
    // Convertir a DTO para enviar solo la información necesaria
    const userDTO = UserDTO.fromModel(user);
    res.json({ user: userDTO });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ruta /profile que renderiza una vista bonita del perfil del usuario (protegida)
router.get('/profile', requireJwtCookie, async (req, res) => {
  try {
    if (!req.user || !req.user._id) return res.redirect('/auth/login');
    const user = await User.findById(req.user._id).lean();
    if (!user) return res.redirect('/auth/login');

      const userDTO = UserDTO.fromModel(user);
      // Merge DTO with non-sensitive raw fields needed by the view (name parts and age)
      const viewUser = Object.assign({}, userDTO, {
        first_name: user.first_name,
        last_name: user.last_name,
        age: user.age,
      });
      return res.render('sessions/profile', { user: viewUser });
  } catch (error) {
    return res.status(500).render('sessions/profile', { error: error.message });
  }
});

export default router;
