# ROOMEX - Smart Mess & Room Expense Manager

An ultra-modern, intuitive web application designed for roommates and flatmates to effortlessly track, manage, and settle shared living expenses, rent, groceries, cook salaries, and utilities.

![ROOMEX Logo](/public/logo.png)

---

## ✨ Key Features

- **Modern 3D Visual Identity**: Crisp neon geometric branding with custom app icons and PWA offline readiness.
- **Sign in with Google & Google One Tap**: Seamless instant login using Google Identity Services (GSI) with 1-click room profile synchronization.
- **Supabase Cloud Sync**: Real-time multi-device cloud database sync with offline-first local cache fallback.
- **Dynamic Split Calculations**: Rent-only, Mess-only, or combined split calculations with automatic debt settlement matrices.
- **PDF & Summary Export**: Print and download monthly expense sheets and settlement breakdowns.
- **Role-based Permissions**: Super Admin, Admin, Co-Admin, and Member roles with administrative delegation.

---

## 🚀 How to Deploy to Vercel via GitHub (1-Click)

### Step 1: Push Project to GitHub

1. Initialize git and commit your files:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: ROOMEX Expense Manager"
   ```
2. Create a new repository on [GitHub](https://github.com/new).
3. Link and push to your GitHub repo:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

---

### Step 2: Deploy on Vercel

1. Go to [Vercel](https://vercel.com/) and log in with your GitHub account.
2. Click **"Add New..."** ➜ **"Project"**.
3. Select your **`ROOMEX`** GitHub repository and click **Import**.
4. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. *(Optional)* Add Environment Variables in Vercel Project Settings:
   - `VITE_SUPABASE_URL`: Your Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon Key
   - `VITE_GOOGLE_CLIENT_ID`: Your Google OAuth Client ID
6. Click **Deploy**. Vercel will automatically build and publish your app with a production `.vercel.app` URL and automatic updates on every `git push`.

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start Vite development server
npm run dev

# Build for production
npm run build
```

---

## 👤 Credits

Developed with ❤️ by **sakeerputhan**
