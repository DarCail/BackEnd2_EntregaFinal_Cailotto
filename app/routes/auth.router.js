import { Router } from "express";
import { User } from "../models/user.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { mailerService } from "../services/mailer.service.js";
import {requireJwtCookie } from "../middleware/auth.middleware.js";
import enviroment from '../config/env.config.js'

const router = new Router();

// Form view: registro
router.get('/register', (req, res) => {
    res.render('auth/register', { error: req.query.error, success: req.query.success });
});

/** Registro local usando bcrypt (desde formulario) */
router.post('/register', async (req, res) => {
    try {
        const { first_name, last_name, email, age, password } = req.body;
        if (!first_name || !last_name || !email || !password) {
            return res.status(400).render('auth/register', { error: 'Todos los datos son requeridos' });
        }

        const exist = await User.findOne({ email });
        if (exist) return res.status(400).render('auth/register', { error: 'El Email ingresado ya está registrado' });

        const hash = await bcrypt.hash(password, 10);

        const user = new User({ first_name, last_name, email, age, password: hash });
        await user.save();

        // Redirect to login with success message
        return res.redirect('/auth/jwt/login?success=Usuario registrado correctamente');
    } catch (error) {
        return res.status(500).render('auth/register', { error: error.message });
    }
});

/** JWT */
router.post("/jwt/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Check if request comes from HTML form or API
        const isFormRequest = req.get('Content-Type')?.includes('application/x-www-form-urlencoded');
        
        if (!email || !password) {
            if (isFormRequest) {
                return res.status(400).render('auth/login', { error: 'Faltan credenciales' });
            }
            return res.status(400).json({ error: "Faltan Credenciales" });
        }
        
        const u = await User.findOne({ email });
        if (!u) {
            if (isFormRequest) {
                return res.status(400).render('auth/login', { error: 'Credenciales inválidas' });
            }
            return res.status(400).json({ error: "Credenciales inválidas" });
        }
        
        const ok = await bcrypt.compare(password, u.password);
        if (!ok) {
            if (isFormRequest) {
                return res.status(400).render('auth/login', { error: 'Password inválido' });
            }
            return res.status(400).json({ error: "Password inválido" });
        }

        const payload = { sub: String(u._id), email: u.email, role: u.role, first_name: u.first_name, last_name: u.last_name };
        const token = jwt.sign(payload, enviroment.JWT_SECRET, { expiresIn: "1h" });

        // Cookie HttpOnly
        res.cookie('access_token', token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: false,
            maxAge: 60 * 60 * 1000,
            path: '/'
        });

        // Response based on request type
        if (isFormRequest) {
            return res.redirect('/orders');
        } else {
            return res.json({ message: "Login OK (JWT en Cookie)" });
        }
    } catch (err) {
        if (req.get('Content-Type')?.includes('application/x-www-form-urlencoded')) {
            return res.status(500).render('auth/login', { error: err.message });
        }
        return res.status(500).json({ error: err.message });
    }
});

// Form view: login
router.get('/jwt/login', (req, res) => {
    res.render('auth/login', { error: req.query.error, success: req.query.success });
});

// Form view: forgot password
router.get('/forgot', (req, res) => {
    res.render('auth/forgot', { error: req.query.error, success: req.query.success });
});

    // Handle forgot password form submission
    router.post('/forgot', async (req, res) => {
        try {
            const { email } = req.body || {};
            if (!email) return res.status(400).render('auth/forgot', { error: 'Ingresa un email' });

            const user = await User.findOne({ email });
            if (!user) {
                // Do not reveal whether email exists
                return res.render('auth/forgot', { success: 'Si existe una cuenta con ese email, recibirás un enlace para restablecer la contraseña.' });
            }

            // Generate token and expiry (1 hour)
            const token = crypto.randomBytes(32).toString('hex');
            const hashed = crypto.createHash('sha256').update(token).digest('hex');
            user.resetPasswordToken = hashed;
            user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour
            await user.save();

            const resetLink = `${req.protocol}://${req.get('host')}/auth/reset?token=${token}&id=${user._id}`;

            // Send email
            await mailerService.send({
                to: user.email,
                subject: 'Restablecer contraseña',
                template: 'password.reset',
                context: { first_name: user.first_name, resetLink }
            });

            return res.render('auth/forgot', { success: 'Si existe una cuenta con ese email, recibirás un enlace para restablecer la contraseña.' });
        } catch (err) {
            return res.status(500).render('auth/forgot', { error: err.message });
        }
    });

    // Reset password form (from email link)
    router.get('/reset', async (req, res) => {
        const { token, id } = req.query || {};
        if (!token || !id) return res.redirect('/auth/jwt/login');
        return res.render('auth/reset', { token, id });
    });

    // Handle reset submission
    router.post('/reset', async (req, res) => {
        try {
            const { token, id, password, passwordConfirm } = req.body || {};
            if (!token || !id) return res.redirect('/auth/jwt/login');
            if (!password || !passwordConfirm) return res.status(400).render('auth/reset', { error: 'Completa todos los campos', token, id });
            if (password !== passwordConfirm) return res.status(400).render('auth/reset', { error: 'Las contraseñas no coinciden', token, id });
            if (password.length < 6) return res.status(400).render('auth/reset', { error: 'La contraseña debe tener al menos 6 caracteres', token, id });

            const hashed = crypto.createHash('sha256').update(token).digest('hex');
            const user = await User.findOne({ _id: id, resetPasswordToken: hashed, resetPasswordExpires: { $gt: Date.now() } });
            if (!user) return res.status(400).render('auth/reset', { error: 'Enlace inválido o expirado', token, id });

            // Prevent reusing same password
            const same = await bcrypt.compare(password, user.password);
            if (same) return res.status(400).render('auth/reset', { error: 'La nueva contraseña no puede ser igual a la anterior', token, id });

            const newHash = await bcrypt.hash(password, 10);
            user.password = newHash;
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();

            return res.redirect('/auth/jwt/login?success=Contraseña restablecida correctamente');
        } catch (err) {
            return res.status(500).render('auth/reset', { error: err.message, token: req.body.token, id: req.body.id });
        }
    });

router.get("/jwt/me", requireJwtCookie, async (req, res) => {
    
    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ error: "Usuario No encontrado" });
    const { first_name, last_name, email, age, role } = user;
    res.json({ user: { first_name, last_name, email, age, role  } });
});

router.post('/jwt/logout', (req,res) => {
    res.clearCookie('access_token', {path: '/'});
    res.json({message: 'Logout OK - Cookie de JWT Borrada'})
})
// Logout from web (form/button) and redirect to login
router.post('/logout', (req, res) => {
    res.clearCookie('access_token', { path: '/' });
    res.redirect('/auth/jwt/login');
});


export default router;