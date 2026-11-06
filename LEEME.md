# Web de CobbleUmbral

Sitio estático para GitHub Pages. Este repositorio es `cobbleumbral.fun`.

- Publicar: sube todo a la raíz de un repositorio nuevo y activa Pages (main / root). El archivo `CNAME` ya tiene el dominio.
- DNS en Hostinger: apunta `cobbleumbral.fun` a las IP de GitHub Pages y `www` a `TU-USUARIO.github.io`.
- `cobblemon/`: datos, modelos, texturas y miniaturas sacados de Cobblemon 1.8.1. No se editan a mano.
- La liga carga sus modelos desde este sitio, así que este repositorio se publica primero.

Al cambiar de versión de Cobblemon: extrae el jar y corre `herramientas/build_data.py <carpeta del jar> cobblemon`; después, con el sitio en localhost:8765 y una página `thumbs.html` que exponga `shot(key)`, corre `herramientas/thumbs.js`.
