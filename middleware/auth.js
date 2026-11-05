/**
 * middleware/auth.js
 * Autenticación stateless (JWT) + autorización por roles (RBAC).
 *
 * - authenticate: valida el header "Authorization: Bearer <token>".
 * - authorize:    exige que el rol del token esté entre los permitidos.
 * - signToken:    emite un token (usar en el endpoint de login).
 *
 * Stateless = no se consulta la base de datos en cada petición; el token
 * firma y valida solo con JWT_SECRET.
 */
const jwt = require("jsonwebtoken");
const config = require("../config");

const { jwt: jwtConfig, roles: ROLES } = config.auth;

/**
 * Middleware: exige un JWT válido.
 * Si es válido, deja el usuario en req.user.
 */
function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({
      ok: false,
      message: "Token no proporcionado. Usa: Authorization: Bearer <token>",
    });
  }

  try {
    // algorithms explícito → evita ataques de confusión de algoritmo (alg: none)
    const payload = jwt.verify(token, jwtConfig.secret, {
      algorithms: [jwtConfig.algorithm],
    });

    req.user = {
      id_usuario: payload.sub,
      rol: payload.rol,
      email: payload.email,
      iat: payload.iat,
      exp: payload.exp,
    };
    return next();
  } catch (err) {
    const expired = err.name === "TokenExpiredError";
    return res.status(401).json({
      ok: false,
      message: expired ? "Token expirado" : "Token inválido",
    });
  }
}

/**
 * Middleware factory: valida el rol del usuario (RBAC).
 *
 * Uso en rutas:
 *   router.get("/reportes", authenticate, authorize("ADMIN", "GERENTE"), h);
 *
 * Si no se pasa ningún rol, lanza error al definir la ruta (falla rápido).
 */
function authorize(...rolesPermitidos) {
  if (rolesPermitidos.length === 0) {
    throw new Error("authorize() requiere al menos un rol (authorize('ADMIN', ...))");
  }
  for (const rol of rolesPermitidos) {
    if (!ROLES.includes(rol)) {
      throw new Error(`Rol desconocido en authorize(): "${rol}". Válidos: ${ROLES.join(", ")}`);
    }
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, message: "No autenticado" });
    }
    if (!rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({
        ok: false,
        message: "No autorizado: rol insuficiente",
        requerido: rolesPermitidos,
        tu_rol: req.user.rol,
      });
    }
    return next();
  };
}

/**
 * Emite un JWT firmado. Usar en el login:
 *   const token = signToken({ id_usuario, rol, email });
 */
function signToken({ id_usuario, rol, email }) {
  return jwt.sign(
    { sub: id_usuario, rol, email },
    jwtConfig.secret,
    { algorithm: jwtConfig.algorithm, expiresIn: jwtConfig.expiresIn }
  );
}

module.exports = { authenticate, authorize, signToken, ROLES };
