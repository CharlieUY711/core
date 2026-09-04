function cartKillSwitch(req, res, next) {
  const body = req.body || {};

  const hasLegacy = !!body.producto_id;
  const hasNew = !!body.store_product_id;

  // CASO IDEAL
  if (hasNew) return next();

  // LEGACY CONTROLADO
  if (hasLegacy) {
    console.warn("[LEGACY_CART]", {
      producto_id: body.producto_id,
      route: req.path,
      user: req.user?.id || null,
    });

    if (!body.store_product_id) {
      return res.status(200).json({
        warning: "legacy_product_id_used",
        legacy: true,
      });
    }
  }

  // KILL SWITCH GRADUAL
  const kill = process.env.CART_PRODUCT_ID_KILL === "true";

  if (kill && hasLegacy && !hasNew) {
    return res.status(400).json({
      error: "legacy_disabled",
    });
  }

  return next();
}

module.exports = cartKillSwitch;