# ✨ OnThisAyer — Ayer App Marketing Hub & Public Web

Sistema automatizado de marketing y difusión pública para **[Ayer de Chapiware](https://www.chapiware.com/ayer/)** (la app de recuerdos fotográficos privados para **iOS  y Android 🤖**).

El proyecto integra:
1. **Extractor de Efemérides & Fotos HD:** Algoritmo de filtrado viral y selección de los 10 mejores años únicos con hasta 3 fotografías reales sin duplicados (`src/core/extractor.js`).
2. **Generador de Copys Virales:** Redacción de textos en inglés y español para Twitter/X ($\le 280$ caracteres, frases completas sin cortes) e Instagram/Threads (`src/core/copywriter.js`).
3. **Plantilla Visual & Renderizador Playwright:** Réplica pixel-perfect de la interfaz de Ayer con exportación en Ultra HD Retina (1100 × 2390 px) (`src/core/renderer.js`).
4. **Panel de Curación Web (Admin):** Interfaz visual local para navegar por los 366 días, seleccionar los 3 mejores momentos y previsualizar capturas (`src/admin-ui/`).
5. **Sitio Web Público (OnThisAyer en GitHub Pages):** Web estática lista para desplegarse gratis en GitHub Pages con descubrimiento diario, bloqueo de fechas futuras y enlaces de descarga (`website/`).

---

## 📁 Estructura del Proyecto

```text
tal-dia-como-hoy/
├── .github/
│   └── workflows/
│       └── deploy_pages.yml       # Despliegue automático a GitHub Pages
│
├── data/                          # Capa de datos y caché persistente
│   ├── curated.json               # Top 3 acontecimientos seleccionados por fecha
│   └── events/                    # Datos extraídos de Wikipedia (MM-DD.json)
│
├── output/                        # Capturas HD generadas (.PNG)
│
├── src/                           # Lógica de Negocio y Herramientas
│   ├── core/                      # Módulos centrales
│   │   ├── extractor.js           # Extracción Wikipedia + Score de Marketing
│   │   ├── copywriter.js          # Generador de textos para Twitter e Instagram
│   │   └── renderer.js            # Motor Playwright para capturas Retina
│   ├── cli/                       # Comandos de consola
│   │   ├── fetch.js               # Descarga efemérides (npm run fetch)
│   │   ├── render.js              # Genera captura HD (npm run render)
│   │   └── batch.js               # Curación en lote (npm run curate:batch)
│   ├── admin-ui/                  # Interfaz del Panel de Curación local
│   └── server.js                  # Servidor local y APIs
│
├── website/                       # Sitio Web Público para GitHub Pages
│   ├── index.html                 # Página principal con 'Today'
│   ├── styles.css                 # Estilos modernos dark/luxury
│   ├── app.js                     # Motor autónomo y calendario 366 días
│   ├── mockup.html                # Mockup interactivo de Ayer
│   └── mockup.css
│
├── package.json                   # Scripts y dependencias
└── README.md                      # Documentación
```

---

## 🚀 Guía de Inicio Rápido

### 1. Instalación de Dependencias
```bash
npm install
```

### 2. Iniciar el Servidor y Panel de Curación
```bash
npm start
```
- **Panel de Curación Admin:** [http://localhost:3000](http://localhost:3000)
- **Previsualización de la Web Pública:** [http://localhost:3000/website/](http://localhost:3000/website/)

---

## 🛠️ Comandos de Consola (CLI)

### 📸 Renderizar Capturas de Pantalla HD de Ayer
```bash
# Renderizar el 29 de Agosto:
npm run render -- --day=08-29

# Renderizar el 30 de Agosto:
npm run render -- --day=08-30
```
Las imágenes se guardan en `output/MM-DD.png` a resolución Retina (1100 × 2390 px).

### 📥 Extraer Efemérides desde Wikipedia
```bash
# Extraer un día concreto:
npm run fetch -- --day=08-29

# Extraer todos los 366 días del año:
npm run fetch:all
```

### ⚡ Curación en Lote (Próximas 2 semanas)
```bash
npm run curate:batch
```

---

## 🌐 Despliegue en GitHub Pages (Coste 0€)

1. Sube tu código al repositorio en GitHub:
   ```bash
   git add .
   git commit -m "Organize project and add public website"
   git push origin main
   ```
2. En GitHub, entra en tu repositorio $\rightarrow$ **Settings** $\rightarrow$ **Pages**.
3. En **Build and deployment** $\rightarrow$ **Source**, selecciona **GitHub Actions**.
4. Tu web estará publicada automáticamente en:
   `https://<tu-usuario>.github.io/<tu-repo>/`

---

## 📄 Licencia

Desarrollado para [Ayer App](https://www.chapiware.com/ayer/) por [Chapiware](https://www.chapiware.com).
MIT License.
