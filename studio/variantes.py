"""Variantes de color del catálogo: paleta de la marca y versión de cada aplicación con color propio."""
from __future__ import annotations

APP_SAMPLE = ["excel", "teams", "powerpoint"]

APP_COVERS = {
    "excel": ("EXCEL · FUNCIONES", "5 funciones de Excel que deberías dominar", "dominar"),
    "word": ("WORD · TRUCOS", "Escribe más rápido en Word", "más rápido"),
    "powerpoint": ("POWERPOINT · DISEÑO", "Presentaciones que no aburren", "no aburren"),
    "outlook": ("OUTLOOK · BANDEJA", "Tu bandeja a cero en 10 minutos", "a cero"),
    "teams": ("TEAMS · REUNIONES", "Reuniones más cortas con Teams", "más cortas"),
    "onenote": ("ONENOTE · NOTAS", "Organiza tus notas como un pro", "como un pro"),
    "sharepoint": ("SHAREPOINT · EQUIPOS", "Una intranet que sí se usa", "sí se usa"),
    "onedrive": ("ONEDRIVE · ARCHIVOS", "Comparte sin adjuntar archivos", "sin adjuntar"),
    "powerbi": ("POWER BI · DATOS", "Tu primer informe en Power BI", "primer informe"),
    "powerautomate": ("POWER AUTOMATE", "Automatiza la tarea más aburrida", "más aburrida"),
    "chatgpt": ("CHATGPT · NOVEDAD", "ChatGPT duplica sus límites de uso", "duplica"),
    "gemini": ("GOOGLE GEMINI", "Gemini ya edita tus documentos", "edita"),
    "github": ("GITHUB · DEVELOPERS", "Lo nuevo de GitHub en 1 minuto", "1 minuto"),
}

# Una foto de historia de cada modelo, con la app con la que se ve en color propio
STORY_STILLS = {
    "HF01": ({"kicker": "NOVEDAD", "title": "Teams ya resume las reuniones en directo", "highlight": "en directo", "body": "Ejemplo de titular con el color de la aplicación.", "source": "Ejemplo"}, "teams"),
    "HF02": ({"big": "1.048.576", "fact": "Son las filas que tiene cada hoja de Excel.", "detail": "Y 16.384 columnas."}, "excel"),
    "HF03": ({"app_name": "Excel", "keys": ["Ctrl", "T"], "title": "Convierte tus datos en tabla", "what": "Filtros, formato y fórmulas que se copian solas.", "os": ["Excel"]}, "excel"),
    "HF04": ({"app_name": "Copilot en PowerPoint", "prompt": "Crea 5 diapositivas a partir de este documento, con un mensaje principal por diapositiva.", "result": ["Estructura clara", "Un mensaje por diapositiva"], "tip": "pega tu documento"}, "powerpoint"),
    "HF05": ({"myth": "Excel no sirve para datos grandes", "reality": "Con Power Query y el modelo de datos maneja millones de filas.", "note": "Ejemplo con el color de la aplicación."}, "excel"),
    "HF06": ({"name": "Power Automate", "category": "Automatización de Microsoft", "what": "Conecta tus aplicaciones y automatiza tareas repetitivas.", "features": ["Plantillas listas", "Funciona con Outlook y Teams", "Sin programar"], "price": "Incluido en M365", "where": "Web"}, "powerautomate"),
}

TERMINAL_SAMPLE = {"tag": "GIT", "shell": "bash", "title": "Deshaz el último commit sin perder nada",
                   "lines": [{"cmd": "git reset --soft HEAD~1", "out": []}, {"cmd": "git status", "out": ["Changes to be committed"]}],
                   "explain": "Quita el último commit y deja los cambios preparados.", "cta": "Guárdalo"}
QUIZ_SAMPLE = {"question": "¿Qué atajo bloquea tu PC al instante?", "options": ["Win + L", "Ctrl + L", "Alt + F4"], "answer": 0,
               "explain": "Win + L bloquea la sesión. Úsalo cada vez que te levantes."}
HERO_APP = {"ia": None, "excel": "excel", "correo": "outlook", "reuniones": "teams", "datos": "powerbi", "documentos": "word",
            "presentaciones": "powerpoint", "automatizacion": "powerautomate"}


def color_jobs(still, video, carousel_sample: dict, pulso_visuals: list, models: dict) -> None:
    """Añade al catálogo las variantes de color (usa los callbacks still/video del constructor de trabajos)."""
    for app, (kicker, title, hl) in APP_COVERS.items():
        cover = {"family": "tutorial", "kicker": kicker, "title": title, "highlight": hl, "subtitle": "Con el color de la aplicación.",
                 "glyph": None, "layout": "a", "cta": None, "total": None, "app": app}
        still("Portadas_Apps", "StudioCoverReel", cover, f"portada-reel_{app}.jpg")
    for model, (slide, extra) in carousel_sample.items():
        apps = [None] if model == "CR03" else [None, *APP_SAMPLE]
        for app in apps:
            still("Carruseles_Colores", "StudioCarousel", {"model": model, "family": "tutorial", "cover": {"family": "tutorial", "kicker": "x", "title": "x"},
                                                           "slides": [slide, slide], "index": 1, "extra": extra, "app": app},
                  f"{model}_{models[model]['name'].replace(' ', '-')}_{app or 'marca'}.jpg")
    still("Carruseles_Colores", "StudioCarousel", {"model": "CR03", "family": "comparativa", "cover": {"family": "comparativa", "kicker": "x", "title": "x"},
                                                   "slides": [carousel_sample["CR03"][0]] * 2, "index": 1,
                                                   "extra": {"a": {"name": "Excel", "app": "excel"}, "b": {"name": "Power BI", "app": "powerbi"}}},
          "CR03_Comparativa_excel-vs-powerbi.jpg")
    for model, (data, app_example) in STORY_STILLS.items():
        name = models[model]["name"].replace(" ", "-").replace("¿", "").replace("?", "")
        for app in (None, app_example):
            still("Historias_Fotos", "StudioStoryStill", {"model": model, "data": {**data, "app": app}}, f"{model}_{name}_{app or 'marca'}.jpg")
    for app in ("excel", "teams"):
        data = {"hook": f"Un truco de {app.capitalize()}", "visual": pulso_visuals[0][1], "payoff": "Con el color de la aplicación cuando el tema va de ella.", "cta": "Pruébalo", "app": app}
        video("Historias_Pulso", "StudioStoryVideo", {"model": "HVPULSO", "data": data, "music": "lib/music/tb-deep-house.mp3", "musicStart": 10, "bpm": 118, "palette": 0},
              f"pulso_{app}_teclas.mp4")
    for model, data in (("HVTERMINAL", TERMINAL_SAMPLE), ("HVQUIZ", QUIZ_SAMPLE)):
        video("Historias_Otros_Videos", "StudioStoryVideo", {"model": model, "data": {**data, "app": None}, "music": "lib/music/tb-cyber-noir.mp3",
                                                             "musicStart": 5, "bpm": 90, "palette": 0}, f"{model}_marca.mp4")
    for hero, app_of_hero in HERO_APP.items():
        for app in dict.fromkeys([None, app_of_hero]):
            scenes = [{"type": "chapter", "label": (app or "marca").upper(), "title": f"Objeto 3D: {hero}", "body": "Paleta de la marca o color de la aplicación."}]
            still("Reels_Colores", "StudioReel", {"model": "RL01", "family": "tutorial", "hero": hero, "scenes": scenes, "extra": {}, "music": None, "app": app},
                  f"RL01_{hero}_{app or 'marca'}.jpg", frame=60)
    still("Reels_Colores", "StudioReel", {"model": "RL03", "family": "comparativa", "hero": None, "scenes": [{"type": "duel"}], "music": None, "app": None,
                                          "extra": {"a": {"name": "Copilot", "tagline": "Microsoft 365"}, "b": {"name": "ChatGPT", "tagline": "OpenAI", "app": "chatgpt"}}},
          "RL03_copilot-vs-chatgpt.jpg", frame=60)
