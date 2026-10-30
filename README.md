# Agente de Reels · The TechBridge Solution

Cada día, sin que nadie toque nada:

1. **Investiga.** Lee noticias reales de los blogs oficiales de Microsoft 365, Excel, Teams, SharePoint y Power BI, de OpenAI y de medios de tecnología, y se queda **solo con las que tratan de los productos con los que trabaja la empresa** (`config/brand.yaml` → `products`). Las noticias corporativas (despidos, resultados, demandas) se descartan.
2. **Escribe.** Claude elige el formato del día (noticia, dato, tendencia, truco, prompt del día, antes vs ahora, mito o realidad) y escribe el guion, el texto del post y los hashtags. Todo gira alrededor de los productos: no vende, pero quien lo ve piensa "esto mi equipo debería saber usarlo".
3. **Monta el vídeo en 3D.** Abre con la insignia 3D del formato (NOTICIA, TRUCO...) que llega volando y se queda en la esquina; detrás vive un plató 3D con el objeto del producto (una hoja de Excel que se convierte en gráfico, un sobre de Outlook, un mosaico de Teams, barras de Power BI...) y la cámara se mueve en cada escena. Encima, texto grande pensado para un público de 35 a 60 años, tarjetas que giran en 3D, clips de stock en pantallas flotantes, música y un diseño de sonido completo (whooshes en los cortes, golpe en la apertura, ticks en los contadores, tecleo en los prompts). Opcionalmente, voz en off con subtítulos.
4. **Prepara 3 historias al día** con la misma estética (noticia, truco rápido, ¿sabías que?, pregunta o aviso del Reel) que se publican a horas al azar entre las 9:00 y las 21:00.
5. **Prepara la publicación.** Cada vídeo lleva una portada con la misma plantilla que los anteriores (el color depende del formato, así el perfil queda ordenado) y una descripción con gancho, pasos prácticos, llamada a guardar o compartir, pregunta final, firma de la marca y 5 hashtags.
6. **Pide aprobación por email** y solo publica el Reel que la directora aprueba. Las historias salen solas, pero las ve en el correo y puede cancelarlas.

> **Instagram está desactivado por ahora.** Todo funciona igual, pero al aprobar un vídeo no se sube: a la hora de publicar llega un correo con el vídeo, la portada y el texto para subirlo a mano. Para activarlo, mira [Activar Instagram](#activar-instagram).

## El día a día (horario de Madrid)

| Hora | Qué pasa |
|---|---|
| **02:00** | Se genera el Reel del día y las 3 historias, y se reparten las historias a horas al azar entre las 9:00 y las 21:00. |
| **10:00** | Le llega un correo a la directora con el vídeo adjunto, la vista previa, el texto que se publicará y dos botones: **✅ Sí, publícalo** y **✏️ No, quiero otro**. |
| Si aprueba | Se publica a las **19:00** (o al momento si aprueba más tarde) y recibe un aviso con el enlace al post. |
| Si pide otro | Escribe en una frase qué quiere. A las **17:00** se genera una versión nueva según sus indicaciones y le llega **el mismo correo** otra vez. Puede repetirse las veces que quiera. Si lo pide después de las 17:00, la nueva versión llega al día siguiente a las 17:00. |
| Si no responde | No se publica el Reel. A las 02:00 de la noche siguiente se genera el del día nuevo. |
| **9:00-21:00** | Cada historia sale a su hora. |
| **15:00** | Se mira si ha salido algo importante sobre los productos; si lo hay, se añade una historia de **ÚLTIMA HORA** para la tarde y le llega un aviso. |

**Encargar el vídeo de mañana.** En el mismo correo hay un botón **📌 Pedir el vídeo de mañana**. Escribe en una frase lo que quiere y, si le apetece, **adjunta archivos** (PDF, Word, PowerPoint, Excel, fotos) o pega enlaces. Esos archivos son la fuente principal del guion: las cifras y los hechos salen de ahí. Esa noche, a las 02:00, se genera el vídeo sobre su encargo y a las 10:00 le llega como siempre. También puede escribir en cualquier momento un correo con el asunto **MAÑANA** o mandar archivos sueltos ("te paso esto para algún vídeo"). Si pide otro vídeo con "No, quiero otro", también puede adjuntar archivos.

**Historias.** En el correo de las 10:00 están las historias del día con su hora. Con **📲 Historias con esto** cuenta en una frase de qué las quiere y, si quiere, adjunta documentos o pega mensajes y enlaces: se preparan entre 1 y 3 historias sobre eso y le llega un correo con cómo quedan y a qué hora sale cada una. Con **🚫 Sin historias hoy** se cancelan las que quedan. También vale escribirlo con sus palabras ("no publiques más historias hoy").

**Claude y tus horas de trabajo.** El agente usa Claude con tu suscripción y **nunca entre las 4:00 y las 14:00** (`config/brand.yaml` → `claude`). El límite de la suscripción va por ventanas de 5 horas que empiezan con la primera petición, así que cualquier uso a partir de las 4:00 seguiría abierto a las 9:00. Por eso la generación nocturna arranca antes de las 3:45, las historias que se piden por la mañana se preparan a partir de las 14:00, y los correos que no traen botón se interpretan sin Claude en esa franja. Publicar, enviar correos y montar vídeos no usa Claude, así que eso sí ocurre a cualquier hora.

**Privacidad.** El repositorio es público, así que sus archivos **nunca se suben**: se quedan en el correo del agente y solo se descargan un momento al generar el vídeo. Lo que ella escribe se guarda **cifrado** en `data/state.json`. Los vídeos pendientes de revisión sí se guardan en *Releases*, que son visibles para quien entre al repositorio. Si eso te preocupa, con GitHub Pro (4 $/mes) el repositorio puede ser privado.

Para ella no hay ningún esfuerzo: pulsa un botón y se abre un correo ya preparado, solo tiene que darle a *Enviar*. También puede responder con sus palabras ("vale", "no, haz uno sobre Power BI") y el agente lo entiende.

Todo corre en **GitHub Actions**, gratis y en la nube. Cada 10 minutos se revisa el correo y la hora, y se decide qué toca. Los horarios se cambian en `config/brand.yaml` → `review`.

---

## Puesta en marcha (una sola vez, unos 30 minutos)

### 1. Instagram → token de acceso (solo cuando vayas a activarlo)
La cuenta de Instagram ya es profesional y **no hace falta vincularla a una página de Facebook**. Lo que sí necesitas es **una cuenta personal de Facebook** para entrar en el portal de desarrolladores de Meta: sin ella, los enlaces de este paso solo muestran la pantalla de inicio de sesión. Solo sirve para crear la app; no se publica nada en Facebook.

1. Con la sesión de Facebook iniciada, date de alta como desarrollador en <https://developers.facebook.com/async/registration>: acepta las condiciones y verifica el teléfono y el email. Se hace una sola vez.
2. Ve a <https://developers.facebook.com/apps/> → **Crear app**. Si no se abre, entra en <https://developers.facebook.com/> y pulsa **Mis apps**, arriba a la derecha.
3. Caso de uso: *"Gestionar mensajes y contenido en Instagram"*. Tipo: *Empresa*.
4. En la app, ve a **Instagram → Configuración de la API con inicio de sesión de Instagram**.
5. En el apartado **"Generar identificadores de acceso"**, pulsa **Añadir cuenta** e inicia sesión con la cuenta de Instagram de TechBridge. Acepta los permisos (`instagram_business_basic` e `instagram_business_content_publish`).
   Si da error al añadirla, ve a **Roles de la app → Roles → Añadir personas → Tester de Instagram** y escribe la cuenta de TechBridge. Después acepta la invitación desde Instagram en **Configuración → Apps y sitios web → Invitaciones de tester** y vuelve a intentarlo.
6. Pulsa **Generar identificador** y copia el token. Es tu `IG_ACCESS_TOKEN` y dura 60 días; el workflow `refresh-token` lo renueva solo cada mes.

> La app puede quedarse en modo desarrollo: para publicar en tu propia cuenta no necesitas pasar la revisión de Meta.

### 2. Claves de los servicios
| Secreto | Dónde se consigue | ¿Obligatorio? |
|---|---|---|
| `CLAUDE_CODE_OAUTH_TOKEN` | Tu suscripción de Claude (Pro o Max). Mira "Token de Claude" justo debajo | Sí |
| `PEXELS_API_KEY` | <https://www.pexels.com/api/> (gratis) | No. Clips de stock opcionales |
| `PIXABAY_API_KEY` | <https://pixabay.com/api/docs/> (gratis, con cuenta: la clave aparece en esa página) | No. Alternativa a Pexels |
| `IG_ACCESS_TOKEN` | Paso 1 | Solo con Instagram activado |
| `ELEVENLABS_API_KEY` | <https://elevenlabs.io> → Profile → API Keys | Solo si quieres voz en off |
| `ELEVENLABS_VOICE_ID` | ElevenLabs → Voice Library → elige una voz en español → "ID" | Solo con voz |
| `MAIL_USER` | Cuenta de Gmail **nueva y dedicada** al agente (ej. `reels.techbridge@gmail.com`) | Sí |
| `MAIL_APP_PASSWORD` | En esa cuenta: activa la verificación en 2 pasos → <https://myaccount.google.com/apppasswords> → crea una "contraseña de aplicación" (16 letras). **La contraseña normal de Gmail no funciona** | Sí |
| `BOSS_EMAIL` | Email de la directora (puedes poner varios separados por comas, p. ej. el tuyo para estar en copia) | Sí |
| `GH_PAT` | GitHub → Settings → Developer settings → Fine-grained tokens. Acceso solo a este repo, permiso **Secrets: Read and write** | Para renovar el token solo |

**Token de Claude (sin pagar la API).** El agente usa Claude a través de Claude Code con tu suscripción, no la API de pago.
1. Si no tienes el comando `claude`, instala Claude Code. En Windows, desde PowerShell: `irm https://claude.ai/install.ps1 | iex`.
2. Ejecuta `claude setup-token`, inicia sesión con tu cuenta de Claude y copia el token que te da.
3. Guárdalo como secreto `CLAUDE_CODE_OAUTH_TOKEN`. Dura un año: cuando caduque, repite estos pasos.

No crees `ANTHROPIC_API_KEY`. El agente la ignora a propósito para que nunca se cobre nada aparte de tu suscripción. Las consultas del agente cuentan para el mismo límite de uso que usas tú en Claude.

**Clips de stock.** Son opcionales. Sin clave de Pexels ni de Pixabay, las escenas usan el fondo animado de la marca.

### 3. GitHub
1. Crea un repositorio **público** (por ejemplo `techbridge-reels`) y sube todo el contenido de esta carpeta.
   *(Público porque GitHub Pages, que sirve el vídeo a Instagram durante unos minutos, es gratis en repos públicos. Las claves van en Secrets y nunca se ven.)*
2. **Settings → Pages** → Source: **GitHub Actions** (solo hace falta con Instagram activado).
3. **Settings → Actions → General** → Workflow permissions: **Read and write**.
4. **Settings → Secrets and variables → Actions** → añade los secretos de la tabla.

### 4. Música
Mete entre 5 y 10 pistas `.mp3` libres de derechos en `assets/music/` (en `assets/music/LEEME.md` tienes fuentes gratuitas). Si no pones ninguna, usa una base sintética de respaldo, pero con música real el resultado mejora muchísimo.

### 5. Primera prueba
1. Pon temporalmente **tu** email en `BOSS_EMAIL`.
2. **Actions → Reels con aprobación → Run workflow** → acción `generate`. Tarda entre 5 y 8 minutos.
3. Lánzalo otra vez con la acción `email`: te llegará el correo de revisión.
4. Pulsa **"No, quiero otro"**, escribe algo y envía. Luego lanza `regenerate` y comprueba que llega la versión nueva.
5. Pulsa **"Sí, publícalo"** y espera a las 19:00 (o lanza `publish`). Con Instagram desactivado te llega un correo con el vídeo, la portada y el texto.
6. Cuando todo funcione, cambia `BOSS_EMAIL` por el de la directora. Desde ese momento va solo.

> Los vídeos se guardan en *Releases* del repositorio. Así el de las 02:00 sigue disponible a las 10:00, a las 17:00 o cuando se apruebe.

### 6. Reloj fiable (recomendado, 5 minutos)
GitHub lanza el workflow "cada 10 minutos" solo cuando le viene bien: en un repositorio nuevo puede pasar horas sin
hacerlo, y entonces el correo de las 10:00 o las historias salen tarde. La solución gratuita es que un servicio externo
le dé el aviso cada 10 minutos:

1. **Token de GitHub.** GitHub → Settings → Developer settings → Fine-grained tokens → *Generate new token*.
   Acceso solo a este repositorio, permiso **Actions: Read and write**, caducidad de un año. Copia el token.
2. **Cuenta en <https://cron-job.org>** (gratis) → *Create cronjob*:
   - URL: `https://api.github.com/repos/alfonsocubillo/TheTechbridge_reel/actions/workflows/reels.yml/dispatches`
   - Cada 10 minutos.
   - En *Advanced*: método **POST**; cabeceras `Accept: application/vnd.github+json`,
     `Authorization: Bearer <tu token>` y `X-GitHub-Api-Version: 2022-11-28`; cuerpo `{"ref":"main"}`.
3. Guarda. En la pestaña *Actions* de GitHub verás una ejecución cada 10 minutos.

El horario interno de GitHub se queda como respaldo por si el servicio externo fallara.

### Activar Instagram
1. Consigue el token del paso 1 y guárdalo como secreto `IG_ACCESS_TOKEN`. Para el renovado automático, añade también `GH_PAT`.
2. Activa **Settings → Pages** → Source: **GitHub Actions**.
3. En **Settings → Secrets and variables → Actions → Variables**, pon `INSTAGRAM_PUBLISH` a `true`.

Desde ese momento, lo que apruebe la directora se publica solo con su portada. Para volver a desactivarlo, pon la variable a `false`.

---

## Personalizar
- **`config/brand.yaml`**: público, tono, colores, formatos, fuentes de noticias y proporción de vídeos con voz.
- **Horarios**: `config/brand.yaml` → `review` (generar, enviar a revisión, rehacer y publicar).
- **Portada**: `video/src/Cover.tsx`. Los colores de cada formato están en `config/brand.yaml` → `formats` → `accent`.
- **Firma y hashtags de marca de la descripción**: `config/brand.yaml` → `caption`.
- **Productos** (de qué trata todo el contenido) y su objeto 3D: `config/brand.yaml` → `products`.
- **Historias** (cuántas al día, ventana de horas y revisión de última hora): `config/brand.yaml` → `stories`.
- **Franja sin Claude**: `config/brand.yaml` → `claude`.
- **Diseño**: `video/src/scenes/Scenes.tsx` (escenas), `video/src/three/` (plató, objetos 3D de cada producto, insignias), `video/src/Story.tsx` (historias) y `video/src/Reel.tsx` (montaje y diseño de sonido). Los efectos están en `assets/sfx`. Para previsualizar en local: `cd video && npm install && npm run studio`.
- **Probar en local**: `python -m agent.main generate --storyboard ejemplo_storyboard.json` renderiza un guion fijo sin llamar a Claude. Para que escriba con Claude en local necesitas Claude Code instalado y con tu sesión iniciada.

## Coste aproximado al mes (1 vídeo/día)
- Claude: incluido en tu suscripción. Son unas pocas consultas al día dentro de tu límite de uso.
- Pexels, Pixabay y GitHub: gratis.
- ElevenLabs (opcional): plan Starter, unos 5 $/mes, suficiente para 30 vídeos.

## Notas importantes
- **Licencia de Remotion.** Remotion, la librería que monta los vídeos, es gratis para particulares y empresas de hasta 3 personas. Si The TechBridge Solution tiene 4 o más empleados, necesita una licencia de empresa (<https://www.remotion.pro>).
- **Veracidad.** El guionista solo puede usar cifras y novedades que aparezcan en la fuente. Los formatos "evergreen" (trucos, prompts, mitos) usan funciones reales de las herramientas. Es lo que protege la credibilidad de la cuenta.
- **Voz sintética.** Meta pide etiquetar como "información de IA" el audio realista generado con IA. Los vídeos sin voz (motion graphics, texto y música) no tienen ese problema.
- **Límites.** La API permite hasta 50 publicaciones cada 24 h; aquí se publica una.
