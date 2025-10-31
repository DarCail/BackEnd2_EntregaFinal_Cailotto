import passport from "passport";

// Requiere paspport-jwt leyendo la cookie 'access_token'
export const requireJwtCookie = passport.authenticate('jwt-cookie', {session: false});

// Autorizacion  por roles
export const requireRole = (...roles) => (req, res, next) => {
    // passport coloca al user en req.user
    if(!req.user) return res.status(401).json({error: 'No Autorizado'});
    if(!roles.includes(req.user.role)) return res.status(403).json({error: 'Acceso Prohibido'});
    next();
}