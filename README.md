# Asteroids

Clon del clásico arcade **Asteroids** implementado en canvas HTML5 puro, sin dependencias ni bundler.

## Descripción

Nave espacial en un campo de asteroides con envolvimiento de bordes (el espacio es toroidal). Destruye asteroides para sumar puntos: los grandes se parten en medianos, los medianos en pequeños. A veces aparece una estrella fugaz, rápida y fugaz, y también hay power-ups: uno de velocidad y uno de disparo triple.

## Tecnologías

- **HTML5 Canvas** — renderizado 2D
- **JavaScript (ES6+)** — lógica del juego en un solo archivo `game.js`
- Sin frameworks, sin bundler, sin dependencias

## Cómo correr

Abre `index.html` directamente en el navegador (doble clic), o usa un servidor local:

```bash
npx serve .
```

Luego visita `http://localhost:3000`.

## Controles

| Tecla     | Acción     |
| --------- | ---------- |
| `←` `→`   | Rotar nave |
| `↑`       | Propulsar  |
| `Espacio` | Disparar   |

## Puntuación

| Asteroide | Puntos |
| --------- | ------ |
| Grande    | 20     |
| Mediano   | 50     |
| Pequeño   | 100    |
| Estrella fugaz | 200 |

## Características

- 3 vidas con invencibilidad temporal al reaparecer (parpadeo)
- Asteroides se parten en fragmentos más pequeños al ser destruidos
- Partículas de explosión al destruir asteroides
- **Power-ups**: al destruir un asteroide hay un 15% de probabilidad de que suelte uno; si cae, hay un 50% de que sea de velocidad (rayo celeste) y un 50% de que sea de triple disparo (magenta). Cada uno puede recogerse varias veces para renovar su efecto
- Power-up **Velocidad**: al recogerlo la propulsión de la nave se duplica durante 5 segundos
- Power-up **Disparo triple**: al recogerlo, durante 5 segundos cada disparo lanza 3 balas en abanico: una central y dos desviadas ±30° (60° en total)
- **Estrella fugaz**: asteroide especial dorado; en cada nivel hay un 50% de probabilidad de que uno de los iniciales lo sea, y nunca pasan más de 3 niveles seguidos sin que aparezca (el HUD avisa con un mensaje parpadeante). Se mueve mucho más rápido, no se divide, otorga 200 puntos y desaparece sola a los 10 segundos (parpadea en los últimos 2.5 s)
