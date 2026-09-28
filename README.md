# Dopa Drill

Dopa Drill es un cuaderno de ejercicios de cálculo en el que la puesta en escena y la música se intensifican cada vez que resuelves un problema. Funciona únicamente en el navegador.

La mascota "Dopakichi" transporta los números que introduces y te celebra cuando aciertas. A medida que avanzas en los problemas, la pantalla y los sonidos se multiplican, y al final es como un festival...

## Características

- 58 habilidades de cálculo para 1.º a 6.º de primaria (basadas en el plan de estudios). Sumas, restas, multiplicaciones, divisiones, entradas intermedias de operaciones en columna, decimales, fracciones, porcentajes, etc.
- Modo "Mi nivel": empieza según los resultados de un test de nivel y desbloquea la siguiente habilidad según tu progresión.
- Modo por curso, práctica, repaso y pantalla de árbol de habilidades.
- Si respondes todo correctamente obtienes 100 puntos. Si tu tasa de aciertos inicial es del 80% o más, puedes intentar superar los 100 puntos en una ronda extra con límite de tiempo.
- La música y los efectos de sonido se sintetizan completamente con la Web Audio API (no se usan archivos de audio).
- Compatible con pantalla vertical de smartphone y con PC. En PC puedes usar las teclas numéricas y Backspace para introducir números.
- Puedes ajustar la intensidad de las animaciones en la configuración. También hay opción de silenciar.
- Todos los registros se guardan en el dispositivo (localStorage) y no se envían a servidores externos.

## Cómo jugar (local)

No requiere compilación. Basta con servir estáticamente `app/`.

```bash
python3 -m http.server 8000 -d app
```

Abre `http://localhost:8000/` en tu navegador. Al usar ES Modules, no funciona abriéndolo directamente con `file://`.

## Tests

Se ejecuta con Node.js 20 o superior.

```bash
node --test tests/*.test.mjs
```

## Estructura

| Ruta | Contenido |
| --- | --- |
| `app/` | Juego principal (ES Modules sin bibliotecas externas) |
| `docs/SPEC.md` | Especificación |
| `docs/curriculum.md` | Currículum por curso y diseño del árbol de habilidades |
| `docs/dopakichi.svg` | Diseño original de Dopakichi |
| `tests/` | Tests unitarios |
| `tools/build_fonts.sh` | Regeneración del subconjunto de fuentes (ejecutar cuando se añadan textos en pantalla) |

## Licencia

- Código fuente: MIT License
- El personaje "Dopakichi" y el nombre/logo de "Dopa Drill" no están cubiertos por la MIT. Si no es con fines comerciales, puedes usarlos libremente para obras derivadas (ver más abajo)...
- Fuentes (`app/fonts/`): SIL Open Font License 1.1

Para más detalles, consulta [LICENSE](LICENSE).

### Sobre las obras derivadas de Dopakichi y Dopa Drill

Si no es con fines comerciales, puedes usarlo libremente sin avisar.

- Lo que puedes hacer: fan art, manga, novelas, animaciones, vídeos, publicaciones en redes sociales y publicar forks o versiones modificadas del juego con fines no comerciales.
- Vídeos de juego y streaming: permitidos. Está bien en plataformas con ingresos por publicidad o donaciones.
- Se requiere permiso previo para: producir mercancía para la venta, utilizarlo en productos o servicios de pago, o cualquier uso comercial (incluyendo publicidad).
- Prohibido: usos contrarios al orden público o que dañen la reputación del personaje o del proyecto.

Al publicar, indica que es no oficial. Si la versión en inglés de la LICENSE difiere, prevalece la versión en inglés.
