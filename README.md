# WhatsApp REST API & Automation Server

A multi-device WhatsApp REST API and management automation service built with Node.js, Express, Baileys, and MongoDB.

---

## 🚀 Features

-   **Multi-Device Support**: Manage multiple WhatsApp instances concurrently with Baileys socket connections.
-   **RESTful Endpoints**:
    -   Send text messages, media (images, audio, video, documents), and contact cards.
    -   Instance lifecycle management (init, qr, status, delete, restart).
    -   Group management (info, create, update subject/description).
-   **Session Persistence**: Multi-file auth state and automated session restoration on server restart.
-   **Web UI & Dashboard**:
    -   Admin dashboard for monitoring instances and users.
    -   User portal for instance management, messaging, and plan status.
    -   Template scheduler with `{{variable}}` message templates, browser-only Excel import/export, JSON recipient storage, and editable future schedules.
    -   Admin-editable subscription plans with public pricing cards, plan-based scheduler limits, and message usage tracking.
    -   New accounts receive a 2-day trial, capped at 100 sent messages per UTC day and 10 unique phone-number recipients during the trial; unused contact reservations are released when future schedules are edited, cancelled, or deleted.
-   **Security & Authorization**:
    -   Token and cookie-based authentication.
    -   Admin token protection for instance administrative endpoints.
    -   Rate limiting and plan expiration enforcement.

---

## 🛠️ Prerequisites

-   **Node.js**: v18.x or v20.x
-   **MongoDB**: v5.x or higher running locally or via MongoDB Atlas
-   **FFmpeg**: Handled automatically via `@ffmpeg-installer/ffmpeg`

---

## 📦 Installation

1. **Clone the repository**:

    ```bash
    git clone <repository-url>
    cd whatsapp-akautomations
    ```

2. **Install dependencies**:

    ```bash
    npm install
    ```

3. **Configure environment variables**:
    ```bash
    cp .env.example .env
    ```
    Edit `.env` and fill in your configuration:
    - `PORT`: Server port (default: `3334`)
    - `ADMINTOKEN`: Secure administrative token for instance control
    - `SESSION_SECRET`: Secret key for express sessions
    - `COOKIE_SECRET`: Secret key for signed cookies
    - `JWT_SECRET`: Secret key for JWT verification
    - `MONGODB_URL`: MongoDB connection string

---

## 🚦 Running the Application

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

---

## 📁 Project Structure

```
├── src/
│   ├── server.js                 # Application entry point
│   ├── config/
│   │   ├── config.js             # Environment & app configuration
│   │   └── express.js            # Express app configuration & middleware setup
│   └── api/
│       ├── class/
│       │   ├── instance.js       # Core WhatsApp instance & Baileys socket handler
│       │   ├── session.js        # Session store & management
│       │   └── user.js           # User & message services
│       ├── controllers/          # Route controller handlers
│       ├── middlewares/          # Auth, cookies, admin, & error middlewares
│       ├── models/               # Mongoose schemas (User, Message)
│       ├── routes/               # API & UI routes
│       └── views/                # EJS templates (Admin dashboard, user portal)
├── .env.example                  # Environment template
├── .gitignore                    # Git ignore specifications
└── package.json                  # Dependencies & npm scripts
```

---

## 🔒 Security Recommendations

-   Never commit the `.env` file or session storage directories to Git.
-   Always use strong, randomly generated strings for `ADMINTOKEN`, `SESSION_SECRET`, and `JWT_SECRET` in production.
-   Ensure the admin endpoints are properly protected with the admin token.

---

## 📄 License

This project is licensed under the MIT License.
