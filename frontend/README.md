# AI Study Hub — React Frontend Prototype

This is a prototype web interface built using React, Vite, and Ant Design to test and visualize the AI Study Hub backend APIs.

## 🛠️ Technology Stack

- **Framework:** React 18 & Vite (Development server)
- **Design System:** Ant Design 5 (Layout, Tables, Forms, Messages, Spinners, etc.)
- **Icons:** @ant-design/icons
- **Routing:** React Router v6
- **HTTP Client:** Axios (for interacting with backend APIs)

---

## 📂 Project Structure & Created Files

Under the `frontend/` directory:

- `package.json` — Defines dependencies and developer scripts.
- `vite.config.js` — Vite server configuration containing the API proxy settings.
- `index.html` — Main HTML page loading Outfit and Plus Jakarta Sans google fonts.
- `src/main.jsx` — Entry point setting up custom theme tokens via Ant Design's `ConfigProvider`.
- `src/index.css` — Global styles, scrollbar styling, card hover animations, and font settings.
- `src/api.js` — Structured Axios api instances representing all category and document requests.
- `src/App.jsx` — Core layout shell containing the Sidebar, Sider navigation, and Router pages.
- `src/pages/`
  - `Dashboard.jsx` — Welcome dashboard page displaying general stats and quick actions.
  - `CategoryList.jsx` — List of categories with edit and delete controls.
  - `CategoryForm.jsx` — Creation and editing form page for categories.
  - `DocumentList.jsx` — List of documents with pagination, real-time search, and soft-delete features.
  - `DocumentUpload.jsx` — Drag-and-drop file upload form supporting file validation.
  - `DocumentDetail.jsx` — Detailed view showing Document details alongside CloudFile metadata fields.

---

## 🔌 Connecting to the Backend (Proxy Setup)

To avoid CORS (Cross-Origin Resource Sharing) blockages in the browser without changing any code in the Spring Boot backend, we utilize **Vite's server proxy**:

In `vite.config.js`:
```js
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:8080',
      changeOrigin: true,
      secure: false,
    },
  },
}
```

This maps any frontend requests starting with `/api` (e.g. `http://localhost:3000/api/categories`) directly to the backend running at `http://localhost:8080/api/categories` through the local Dev Server.

---

## 🚀 How to Run the Frontend

### Prerequisites

Make sure you have Node.js and npm installed. You can verify this by running:
```bash
node -v
npm -v
```

---

### Step 1: Install Dependencies

Open a terminal at the `frontend/` directory and run:
```bash
cd frontend
npm install
```

---

### Step 2: Run in Development Mode

Run the development server:
```bash
npm run dev
```

Once started, the application will be accessible at:
👉 **[http://localhost:3000](http://localhost:3000)**

---

### Step 3: Run the Backend

Ensure your Spring Boot backend is running concurrently at port `8080`.
You can test the upload and check the generated files under `backend/uploads/` on successful uploads.
