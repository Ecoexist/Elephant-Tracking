# 🐘 Ecoexist Elephant Tracking Dashboard

**Official elephant tracking dashboard for Ecoexist Trust**

Monitoring wildlife movement for conservation in Botswana.

## 🗺️ View the Dashboard

**Two dashboard versions available:**

- **`dashboard_public.html`** - Public dashboard with privacy-protected data (7-day averages)
- **`dashboard.html`** - Full dashboard with login (requires authentication)

## 📊 Data

The `data/` folder contains:
- **`awt_averaged_data.json`** - Privacy-protected elephant location data (7-day averages)
- GeoJSON files for populated places and roads
- Ecoexist logo and images
- Map overlay data

Dashboard loads live data from secure API endpoints.

## 🔒 Privacy Protection

Public dashboard shows 7-day rolling averages of GPS locations to protect elephants from poaching.

## 🚀 Hosting

Enable GitHub Pages to host this dashboard:
1. Go to Settings → Pages
2. Source: Deploy from branch `main`
3. Save

Dashboard will be live at: `https://ecoexist.github.io/Elephant-Tracking/dashboard_public.html`

## 📞 Contact

**Ecoexist Trust**
- Website: https://www.ecoexisttrust.org/
- Email: info@ecoexisttrust.org
- Tel: +267 6865083

---

*This repository is automatically updated daily from our secure backend system.*
*For technical inquiries, contact: gis@ecoexisttrust.org*
